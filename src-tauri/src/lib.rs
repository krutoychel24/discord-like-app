use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use futures::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, sync::Arc};
use tokio::sync::{mpsc, RwLock};

// ── Types ──────────────────────────────────────────────────────────────────────

#[derive(Clone, Debug)]
struct ClientInfo {
    tx: mpsc::Sender<String>,
    name: String,
    avatar: String,
    room: Option<String>,
}

struct AppState {
    clients: RwLock<HashMap<String, ClientInfo>>,
    balances: RwLock<HashMap<String, u64>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type")]
enum WsMessage {
    Identify { user_id: String, name: String, avatar: String },
    JoinRoom { room_id: String },
    LeaveRoom {},
    ChatMessage { text: String },
    Offer { target: String, sdp: String, sender: String },
    Answer { target: String, sdp: String, sender: String },
    IceCandidate { target: String, candidate: String, sender: String },
    MarketPurchase { user_id: String, item_id: String, price: u64 },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type")]
enum WsResponse {
    Identified { success: bool },
    RoomUsers { users: Vec<RoomUser> },
    UserJoined { user_id: String, name: String, avatar: String },
    UserLeft { user_id: String },
    ChatMessage { user_id: String, name: String, avatar: String, text: String, timestamp: u64 },
    Offer { sender: String, sdp: String },
    Answer { sender: String, sdp: String },
    IceCandidate { sender: String, candidate: String },
    PurchaseResult { success: bool, new_balance: u64, message: String },
    Error { message: String },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct RoomUser {
    id: String,
    name: String,
    avatar: String,
}

// ── Tauri Entry-point ─────────────────────────────────────────────────────────

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Alo Duraki!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    std::thread::spawn(|| {
        let rt = tokio::runtime::Runtime::new().expect("Tokio runtime failed to start");
        rt.block_on(start_backend());
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ── Backend ───────────────────────────────────────────────────────────────────

async fn start_backend() {
    let state: Arc<AppState> = Arc::new(AppState {
        clients: RwLock::new(HashMap::new()),
        balances: RwLock::new(HashMap::new()),
    });

    let app = Router::new()
        .route("/ws", get(ws_handler))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3001")
        .await
        .expect("Failed to bind backend listener");

    println!("Alo Duraki backend listening on ws://127.0.0.1:3001/ws");
    axum::serve(listener, app)
        .await
        .expect("Axum server crashed");
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let (mut ws_sender, mut ws_receiver) = socket.split();
    let (tx, mut rx) = mpsc::channel::<String>(100);
    let mut current_user_id = String::new();

    let mut send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_sender.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    while let Some(result) = ws_receiver.next().await {
        let msg = match result {
            Ok(m) => m,
            Err(_) => break,
        };

        if let Message::Text(text) = msg {
            match serde_json::from_str::<WsMessage>(&text) {
                Ok(parsed) => {
                    handle_message(parsed, &state, &tx, &mut current_user_id).await;
                }
                Err(_) => {
                    let err = WsResponse::Error {
                        message: "Invalid message payload".to_string(),
                    };
                    let _ = tx.send(serde_json::to_string(&err).unwrap_or_default()).await;
                }
            }
        }
    }

    // Cleanup on disconnect
    send_task.abort();
    if !current_user_id.is_empty() {
        // Get room before removing client
        let room_id = {
            let clients = state.clients.read().await;
            clients.get(&current_user_id).and_then(|c| c.room.clone())
        };

        state.clients.write().await.remove(&current_user_id);

        // Broadcast UserLeft to room members
        if let Some(room) = room_id {
            broadcast_to_room(&state, &room, &current_user_id, WsResponse::UserLeft {
                user_id: current_user_id.clone(),
            }).await;
        }
    }
}

/// Broadcast a message to all users in a room, except the sender
async fn broadcast_to_room(state: &Arc<AppState>, room_id: &str, except_user: &str, msg: WsResponse) {
    let json = serde_json::to_string(&msg).unwrap_or_default();
    let clients = state.clients.read().await;
    for (uid, info) in clients.iter() {
        if uid != except_user && info.room.as_deref() == Some(room_id) {
            let _ = info.tx.send(json.clone()).await;
        }
    }
}

async fn handle_message(
    msg: WsMessage,
    state: &Arc<AppState>,
    tx: &mpsc::Sender<String>,
    current_user_id: &mut String,
) {
    match msg {
        WsMessage::Identify { user_id, name, avatar } => {
            *current_user_id = user_id.clone();
            state.clients.write().await.insert(user_id.clone(), ClientInfo {
                tx: tx.clone(),
                name,
                avatar,
                room: None,
            });
            let res = WsResponse::Identified { success: true };
            let _ = tx.send(serde_json::to_string(&res).unwrap_or_default()).await;

            // Init balance
            state.balances.write().await.entry(user_id).or_insert(1000);
        }

        WsMessage::JoinRoom { room_id } => {
            // First get this user's info
            let user_info = {
                let clients = state.clients.read().await;
                clients.get(current_user_id).cloned()
            };

            if let Some(info) = user_info {
                // Collect existing room users BEFORE mutating
                let existing_users: Vec<RoomUser> = {
                    let clients = state.clients.read().await;
                    clients.iter()
                        .filter(|(uid, c)| c.room.as_deref() == Some(&room_id) && *uid != current_user_id)
                        .map(|(uid, c)| RoomUser { id: uid.clone(), name: c.name.clone(), avatar: c.avatar.clone() })
                        .collect()
                };

                // Update this user's room
                {
                    let mut clients = state.clients.write().await;
                    if let Some(client) = clients.get_mut(current_user_id) {
                        client.room = Some(room_id.clone());
                    }
                }

                // Send current room users list back to the joiner
                let res = WsResponse::RoomUsers { users: existing_users };
                let _ = tx.send(serde_json::to_string(&res).unwrap_or_default()).await;

                // Broadcast this user joining to everyone else in the room
                broadcast_to_room(state, &room_id, current_user_id, WsResponse::UserJoined {
                    user_id: current_user_id.clone(),
                    name: info.name,
                    avatar: info.avatar,
                }).await;
            }
        }

        WsMessage::LeaveRoom {} => {
            let room_id = {
                let clients = state.clients.read().await;
                clients.get(current_user_id).and_then(|c| c.room.clone())
            };

            if let Some(room) = room_id {
                {
                    let mut clients = state.clients.write().await;
                    if let Some(client) = clients.get_mut(current_user_id) {
                        client.room = None;
                    }
                }
                broadcast_to_room(state, &room, current_user_id, WsResponse::UserLeft {
                    user_id: current_user_id.clone(),
                }).await;
            }
        }

        WsMessage::ChatMessage { text } => {
            // Get sender info and current room
            let sender_info = {
                let clients = state.clients.read().await;
                clients.get(current_user_id).cloned()
            };

            if let Some(info) = sender_info {
                if let Some(room) = &info.room {
                    let timestamp = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_millis() as u64;

                    let chat_msg = WsResponse::ChatMessage {
                        user_id: current_user_id.clone(),
                        name: info.name.clone(),
                        avatar: info.avatar.clone(),
                        text,
                        timestamp,
                    };

                    // Broadcast to all in room INCLUDING sender
                    let json = serde_json::to_string(&chat_msg).unwrap_or_default();
                    let clients = state.clients.read().await;
                    for (_, c) in clients.iter().filter(|(_, c)| c.room.as_deref() == Some(room.as_str())) {
                        let _ = c.tx.send(json.clone()).await;
                    }
                }
            }
        }

        WsMessage::Offer { target, sdp, sender } => {
            let clients = state.clients.read().await;
            if let Some(target_info) = clients.get(&target) {
                let res = WsResponse::Offer { sender, sdp };
                let _ = target_info.tx.send(serde_json::to_string(&res).unwrap_or_default()).await;
            }
        }

        WsMessage::Answer { target, sdp, sender } => {
            let clients = state.clients.read().await;
            if let Some(target_info) = clients.get(&target) {
                let res = WsResponse::Answer { sender, sdp };
                let _ = target_info.tx.send(serde_json::to_string(&res).unwrap_or_default()).await;
            }
        }

        WsMessage::IceCandidate { target, candidate, sender } => {
            let clients = state.clients.read().await;
            if let Some(target_info) = clients.get(&target) {
                let res = WsResponse::IceCandidate { sender, candidate };
                let _ = target_info.tx.send(serde_json::to_string(&res).unwrap_or_default()).await;
            }
        }

        WsMessage::MarketPurchase { user_id, item_id, price } => {
            let mut balances = state.balances.write().await;
            let balance = balances.entry(user_id).or_insert(0);

            let res = if *balance >= price {
                *balance -= price;
                WsResponse::PurchaseResult {
                    success: true,
                    new_balance: *balance,
                    message: format!("Successfully purchased item: {}", item_id),
                }
            } else {
                WsResponse::PurchaseResult {
                    success: false,
                    new_balance: *balance,
                    message: "Insufficient balance".to_string(),
                }
            };

            let _ = tx.send(serde_json::to_string(&res).unwrap_or_default()).await;
        }
    }
}

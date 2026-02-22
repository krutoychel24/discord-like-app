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
use std::sync::atomic::{AtomicUsize, Ordering};

// ── Types ──────────────────────────────────────────────────────────────────────

#[derive(Clone, Debug)]
struct ClientInfo {
    tx: mpsc::Sender<String>,
    user_id: Option<String>,
    name: String,
    avatar: String,
    room: Option<String>,
}

struct AppState {
    next_conn_id: AtomicUsize,
    clients: RwLock<HashMap<usize, ClientInfo>>,
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
    EditMessage { message_id: String, new_text: String },
    DeleteMessage { message_id: String },
    MessageRead { channel_id: String, timestamp: u64 },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type")]
enum WsResponse {
    Identified { success: bool },
    RoomUsers { users: Vec<RoomUser> },
    UserJoined { user_id: String, name: String, avatar: String },
    UserLeft { user_id: String },
    ChatMessage { user_id: String, name: String, avatar: String, text: String, timestamp: u64, channel_id: String },
    Offer { sender: String, sdp: String },
    Answer { sender: String, sdp: String },
    IceCandidate { sender: String, candidate: String },
    PurchaseResult { success: bool, new_balance: u64, message: String },
    Error { message: String },
    GlobalVoiceState { states: Vec<VoiceState> },
    VoiceStateUpdate { user_id: String, name: String, avatar: String, room_id: Option<String> },
    MessageEdited { message_id: String, new_text: String, channel_id: String },
    MessageDeleted { message_id: String, channel_id: String },
    MessageRead { user_id: String, channel_id: String, timestamp: u64 },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct VoiceState {
    user_id: String,
    name: String,
    avatar: String,
    room_id: String,
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
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ── Backend ───────────────────────────────────────────────────────────────────

async fn start_backend() {
    let state: Arc<AppState> = Arc::new(AppState {
        next_conn_id: AtomicUsize::new(1),
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
    let conn_id = state.next_conn_id.fetch_add(1, Ordering::Relaxed);
    let (mut ws_sender, mut ws_receiver) = socket.split();
    let (tx, mut rx) = mpsc::channel::<String>(100);

    // Register initial anonymous connection
    {
        state.clients.write().await.insert(conn_id, ClientInfo {
            tx: tx.clone(),
            user_id: None,
            name: String::new(),
            avatar: String::new(),
            room: None,
        });
    }

    let send_task = tokio::spawn(async move {
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
                    handle_message(parsed, &state, conn_id).await;
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
    let client_info = state.clients.write().await.remove(&conn_id);

    // Broadcast UserLeft to room members
    if let Some(info) = client_info {
        if let Some(uid) = info.user_id {
            if let Some(room) = info.room {
                broadcast_to_room(&state, &room, &uid, WsResponse::UserLeft {
                    user_id: uid.clone(),
                }).await;
                
                // Also broadcast global update
                broadcast_to_all(&state, WsResponse::VoiceStateUpdate {
                    user_id: uid.clone(),
                    name: info.name,
                    avatar: info.avatar,
                    room_id: None,
                }).await;
            }
        }
    }
}

async fn broadcast_to_all(state: &Arc<AppState>, msg: WsResponse) {
    let json = serde_json::to_string(&msg).unwrap_or_default();
    let clients = state.clients.read().await;
    for info in clients.values() {
        let _ = info.tx.send(json.clone()).await;
    }
}

/// Broadcast a message to all users in a room, except the sender
async fn broadcast_to_room(state: &Arc<AppState>, room_id: &str, except_user: &str, msg: WsResponse) {
    let json = serde_json::to_string(&msg).unwrap_or_default();
    let clients = state.clients.read().await;
    for info in clients.values() {
        if let Some(uid) = &info.user_id {
            if uid != except_user && info.room.as_deref() == Some(room_id) {
                let _ = info.tx.send(json.clone()).await;
            }
        }
    }
}

async fn handle_message(
    msg: WsMessage,
    state: &Arc<AppState>,
    conn_id: usize,
) {
    match msg {
        WsMessage::Identify { user_id, name, avatar } => {
            let tx = {
                let mut clients = state.clients.write().await;
                if let Some(client) = clients.get_mut(&conn_id) {
                    client.user_id = Some(user_id.clone());
                    client.name = name;
                    client.avatar = avatar;
                    Some(client.tx.clone())
                } else {
                    None
                }
            };
            
            if let Some(tx) = tx {
                let res = WsResponse::Identified { success: true };
                let _ = tx.send(serde_json::to_string(&res).unwrap_or_default()).await;
    
                // Send global voice states
                let states: Vec<VoiceState> = {
                    let clients = state.clients.read().await;
                    clients.values()
                        .filter_map(|c| {
                            if let (Some(uid), Some(rid)) = (&c.user_id, &c.room) {
                                Some(VoiceState {
                                    user_id: uid.clone(),
                                    name: c.name.clone(),
                                    avatar: c.avatar.clone(),
                                    room_id: rid.clone(),
                                })
                            } else {
                                None
                            }
                        })
                        .collect()
                };
                let _ = tx.send(serde_json::to_string(&WsResponse::GlobalVoiceState { states }).unwrap_or_default()).await;
            }

            // Init balance
            state.balances.write().await.entry(user_id).or_insert(1000);
        }

        WsMessage::JoinRoom { room_id } => {
            let (tx, user_id, name, avatar) = {
                let clients = state.clients.read().await;
                if let Some(info) = clients.get(&conn_id) {
                    if let Some(uid) = &info.user_id {
                        (Some(info.tx.clone()), Some(uid.clone()), Some(info.name.clone()), Some(info.avatar.clone()))
                    } else { (None, None, None, None) }
                } else { (None, None, None, None) }
            };

            if let (Some(tx), Some(current_user_id), Some(name), Some(avatar)) = (tx, user_id, name, avatar) {
                // Collect existing room users BEFORE mutating
                let existing_users: Vec<RoomUser> = {
                    let clients = state.clients.read().await;
                    clients.values()
                        .filter(|c| c.room.as_deref() == Some(&room_id) && c.user_id.as_deref() != Some(&current_user_id))
                        .filter_map(|c| c.user_id.as_ref().map(|uid| RoomUser { id: uid.clone(), name: c.name.clone(), avatar: c.avatar.clone() }))
                        .collect()
                };

                // Update this user's room
                {
                    let mut clients = state.clients.write().await;
                    if let Some(client) = clients.get_mut(&conn_id) {
                        client.room = Some(room_id.clone());
                    }
                }

                // Send current room users list back to the joiner
                let res = WsResponse::RoomUsers { users: existing_users };
                let _ = tx.send(serde_json::to_string(&res).unwrap_or_default()).await;

                // Broadcast this user joining to everyone else in the room
                broadcast_to_room(state, &room_id, &current_user_id, WsResponse::UserJoined {
                    user_id: current_user_id.clone(),
                    name: name.clone(),
                    avatar: avatar.clone(),
                }).await;

                // Broadcast global Voice state
                broadcast_to_all(state, WsResponse::VoiceStateUpdate {
                    user_id: current_user_id,
                    name,
                    avatar,
                    room_id: Some(room_id),
                }).await;
            }
        }

        WsMessage::LeaveRoom {} => {
            let (room_id, current_user_id, name, avatar) = {
                let clients = state.clients.read().await;
                if let Some(c) = clients.get(&conn_id) {
                    (c.room.clone(), c.user_id.clone(), c.name.clone(), c.avatar.clone())
                } else {
                    (None, None, String::new(), String::new())
                }
            };

            if let (Some(room), Some(uid)) = (room_id, current_user_id) {
                {
                    let mut clients = state.clients.write().await;
                    if let Some(client) = clients.get_mut(&conn_id) {
                        client.room = None;
                    }
                }
                broadcast_to_room(state, &room, &uid, WsResponse::UserLeft {
                    user_id: uid.clone(),
                }).await;

                broadcast_to_all(state, WsResponse::VoiceStateUpdate {
                    user_id: uid,
                    name,
                    avatar,
                    room_id: None,
                }).await;
            }
        }

        WsMessage::ChatMessage { text } => {
            let (room_id, uid, name, avatar) = {
                let clients = state.clients.read().await;
                if let Some(info) = clients.get(&conn_id) {
                    if let Some(uid) = &info.user_id {
                        (info.room.clone(), Some(uid.clone()), Some(info.name.clone()), Some(info.avatar.clone()))
                    } else { (None, None, None, None) }
                } else { (None, None, None, None) }
            };

            if let (Some(room), Some(current_user_id), Some(name), Some(avatar)) = (room_id, uid, name, avatar) {
                let timestamp = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64;

                let chat_msg = WsResponse::ChatMessage {
                    user_id: current_user_id,
                    name,
                    avatar,
                    text,
                    timestamp,
                    channel_id: room,
                };

                let json = serde_json::to_string(&chat_msg).unwrap_or_default();
                let clients = state.clients.read().await;
                for c in clients.values() {
                    let _ = c.tx.send(json.clone()).await;
                }
            }
        }

        WsMessage::EditMessage { message_id, new_text } => {
            let room_id = { state.clients.read().await.get(&conn_id).and_then(|info| info.room.clone()) };
            if let Some(room) = room_id {
                let res = WsResponse::MessageEdited { message_id, new_text, channel_id: room };
                let json = serde_json::to_string(&res).unwrap_or_default();
                let clients = state.clients.read().await;
                for c in clients.values() {
                    let _ = c.tx.send(json.clone()).await;
                }
            }
        }

        WsMessage::DeleteMessage { message_id } => {
            let room_id = { state.clients.read().await.get(&conn_id).and_then(|info| info.room.clone()) };
            if let Some(room) = room_id {
                let res = WsResponse::MessageDeleted { message_id, channel_id: room };
                let json = serde_json::to_string(&res).unwrap_or_default();
                let clients = state.clients.read().await;
                for c in clients.values() {
                    let _ = c.tx.send(json.clone()).await;
                }
            }
        }

        WsMessage::Offer { target, sdp, sender } => {
            let clients = state.clients.read().await;
            for info in clients.values() {
                if info.user_id.as_deref() == Some(&target) {
                    let res = WsResponse::Offer { sender: sender.clone(), sdp: sdp.clone() };
                    let _ = info.tx.send(serde_json::to_string(&res).unwrap_or_default()).await;
                }
            }
        }

        WsMessage::Answer { target, sdp, sender } => {
            let clients = state.clients.read().await;
            for info in clients.values() {
                if info.user_id.as_deref() == Some(&target) {
                    let res = WsResponse::Answer { sender: sender.clone(), sdp: sdp.clone() };
                    let _ = info.tx.send(serde_json::to_string(&res).unwrap_or_default()).await;
                }
            }
        }

        WsMessage::IceCandidate { target, candidate, sender } => {
            let clients = state.clients.read().await;
            for info in clients.values() {
                if info.user_id.as_deref() == Some(&target) {
                    let res = WsResponse::IceCandidate { sender: sender.clone(), candidate: candidate.clone() };
                    let _ = info.tx.send(serde_json::to_string(&res).unwrap_or_default()).await;
                }
            }
        }

        WsMessage::MessageRead { channel_id, timestamp } => {
            let uid = { state.clients.read().await.get(&conn_id).and_then(|info| info.user_id.clone()) };
            if let Some(user_id) = uid {
                let res = WsResponse::MessageRead { user_id, channel_id, timestamp };
                let json = serde_json::to_string(&res).unwrap_or_default();
                let clients = state.clients.read().await;
                for c in clients.values() {
                    let _ = c.tx.send(json.clone()).await;
                }
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

            let tx = {
                let clients = state.clients.read().await;
                clients.get(&conn_id).map(|c| c.tx.clone())
            };
            if let Some(tx) = tx {
                let _ = tx.send(serde_json::to_string(&res).unwrap_or_default()).await;
            }
        }
    }
}

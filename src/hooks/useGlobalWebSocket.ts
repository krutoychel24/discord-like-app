import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

export const useGlobalWebSocket = () => {
    const { currentUser, setSendWsMessage } = useAppStore();
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!currentUser) return;

        const connect = () => {
            if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) return;

            ws.current = new WebSocket('ws://127.0.0.1:3001/ws');

            ws.current.onopen = () => {
                ws.current?.send(JSON.stringify({
                    type: 'Identify',
                    user_id: currentUser.id,
                    name: currentUser.name,
                    avatar: currentUser.avatar,
                }));

                setSendWsMessage((msg) => {
                    if (ws.current?.readyState === WebSocket.OPEN) {
                        ws.current.send(JSON.stringify(msg));
                    }
                });
            };

            ws.current.onmessage = (event) => {
                const msg = JSON.parse(event.data);

                switch (msg.type) {
                    case 'GlobalVoiceState': {
                        const states: Record<string, { roomId: string, name: string, avatar: string }> = {};
                        msg.states.forEach((s: { user_id: string; room_id: string; name: string; avatar: string }) => {
                            states[s.user_id] = { roomId: s.room_id, name: s.name, avatar: s.avatar };
                        });
                        useAppStore.getState().setGlobalVoiceState(states);
                        break;
                    }
                    case 'VoiceStateUpdate': {
                        useAppStore.getState().updateGlobalVoiceState(msg.user_id, msg.room_id || null, msg.name, msg.avatar);
                        break;
                    }
                    case 'ChatMessage': {
                        useAppStore.getState().addMessage({
                            id: `${msg.timestamp}-${msg.user_id}`,
                            userId: msg.user_id,
                            name: msg.name,
                            avatar: msg.avatar,
                            text: msg.text,
                            timestamp: msg.timestamp,
                            isSelf: msg.user_id === currentUser.id,
                            channelId: msg.channel_id,
                        });
                        break;
                    }
                    case 'MessageEdited': {
                        useAppStore.getState().editMessage(msg.message_id, msg.new_text);
                        break;
                    }
                    case 'MessageDeleted': {
                        useAppStore.getState().deleteMessage(msg.message_id);
                        break;
                    }
                    case 'MessageRead': {
                        useAppStore.getState().updateRoomRead(msg.channel_id, msg.user_id, msg.timestamp);
                        break;
                    }
                }
            };

            ws.current.onclose = () => {
                ws.current = null;
                setSendWsMessage(null);
                // Reconnect logic could go here
            };
        };

        connect();

        return () => {
            ws.current?.close();
            ws.current = null;
            setSendWsMessage(null);
        };
    }, [currentUser, setSendWsMessage]);
};

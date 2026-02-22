import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore, User } from '../store/useAppStore';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

interface RoomUser {
    id: string;
    name: string;
    avatar: string;
}

export const useWebRTC = (roomId: string | null, channelType: 'voice' | 'text' = 'voice') => {
    const { currentUser, setUsersInRoom, audioSettings } = useAppStore();

    const localStream = useRef<MediaStream | null>(null);
    const localStreamReady = useRef<Promise<MediaStream> | null>(null);
    const pendingMuted = useRef(false); // stores mute intent before stream is ready
    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const peerStates = useRef<Map<string, string>>(new Map());
    const ws = useRef<WebSocket | null>(null);
    const audioContext = useRef<AudioContext | null>(null);
    const gainNode = useRef<GainNode | null>(null);
    const voiceActivityInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    const [isSpeaking, setIsSpeaking] = useState(false);
    const [peerConnectionStates, setPeerConnectionStates] = useState<Record<string, string>>({});
    const [mutedUsers, setMutedUsers] = useState<Record<string, boolean>>({});

    const userId = currentUser?.id || '';
    const userName = currentUser?.name || '';
    const userAvatar = currentUser?.avatar || '';

    // --- Mic acquire ---
    const ensureLocalStream = useCallback(async (): Promise<MediaStream> => {
        if (localStream.current) return localStream.current;

        if (channelType === 'text') {
            const emptyStream = new MediaStream();
            localStream.current = emptyStream;
            return emptyStream;
        }

        if (!localStreamReady.current) {
            const constraints: MediaStreamConstraints = {
                audio: {
                    echoCancellation: audioSettings.echoCancellation,
                    noiseSuppression: audioSettings.noiseSuppression,
                    autoGainControl: audioSettings.autoGainControl,
                    ...(audioSettings.inputDeviceId ? { deviceId: { exact: audioSettings.inputDeviceId } } : {}),
                },
                video: false,
            };
            localStreamReady.current = navigator.mediaDevices.getUserMedia(constraints);
        }

        const stream = await localStreamReady.current;
        localStream.current = stream;

        // Apply pending mute immediately after mic grant
        stream.getAudioTracks().forEach(t => { t.enabled = !pendingMuted.current; });

        // Voice activity via Web Audio API
        const ctx = new AudioContext();
        audioContext.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;

        const gain = ctx.createGain();
        gain.gain.value = audioSettings.micVolume / 100;
        gainNode.current = gain;
        source.connect(gain);
        gain.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);
        const threshold = audioSettings.voiceThreshold;
        voiceActivityInterval.current = setInterval(() => {
            analyser.getByteFrequencyData(data);
            const avg = data.reduce((a, b) => a + b, 0) / data.length;
            setIsSpeaking(pendingMuted.current ? false : avg > threshold);
        }, 80);

        return stream;
    }, [audioSettings, channelType]);

    // --- Peer state tracking ---
    const updatePeerState = useCallback((peerId: string, state: string) => {
        peerStates.current.set(peerId, state);
        setPeerConnectionStates({ ...Object.fromEntries(peerStates.current) });
    }, []);

    // --- Create RTCPeerConnection ---
    const createPeerConnection = useCallback(async (targetId: string, isInitiator: boolean) => {
        peerConnections.current.get(targetId)?.close();

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current.set(targetId, pc);
        updatePeerState(targetId, 'connecting');

        const stream = await ensureLocalStream();
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
            let audio = document.getElementById(`peer-audio-${targetId}`) as HTMLAudioElement;
            if (!audio) {
                audio = new Audio();
                audio.id = `peer-audio-${targetId}`;
                audio.setAttribute('data-peer-id', targetId);
                document.body.appendChild(audio);
            }
            audio.srcObject = event.streams[0];
            audio.autoplay = true;

            // Apply current mute state if they were already muted previously
            setMutedUsers(prev => {
                if (prev[targetId]) audio.muted = true;
                return prev;
            });

            audio.play().catch(() => { });
        };

        pc.onicecandidate = (event) => {
            if (event.candidate && ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({
                    type: 'IceCandidate',
                    target: targetId,
                    sender: userId,
                    candidate: JSON.stringify(event.candidate),
                }));
            }
        };

        pc.onconnectionstatechange = () => updatePeerState(targetId, pc.connectionState);

        if (isInitiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.current?.send(JSON.stringify({
                type: 'Offer',
                target: targetId,
                sender: userId,
                sdp: offer.sdp,
            }));
        }

        return pc;
    }, [userId, ensureLocalStream, updatePeerState]);

    // --- WebSocket ---
    const connectWebSocket = useCallback(() => {
        if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) return;

        ws.current = new WebSocket('ws://127.0.0.1:3001/ws');

        ws.current.onopen = () => {
            ws.current?.send(JSON.stringify({
                type: 'Identify',
                user_id: userId,
                name: userName,
                avatar: userAvatar,
            }));
        };

        ws.current.onmessage = async (event: MessageEvent) => {
            const msg = JSON.parse(event.data);

            switch (msg.type) {
                case 'Identified':
                    if (roomId) ws.current?.send(JSON.stringify({ type: 'JoinRoom', room_id: roomId }));
                    break;

                case 'RoomUsers': {
                    const existing: User[] = (msg.users as RoomUser[]).map((u: RoomUser) => ({
                        id: u.id, name: u.name, avatar: u.avatar, balance: 0, isPremium: false,
                    }));
                    setUsersInRoom(existing);
                    for (const u of existing) await createPeerConnection(u.id, true);
                    break;
                }

                case 'UserJoined': {
                    const cur = useAppStore.getState().usersInRoom;
                    if (!cur.find((u: User) => u.id === msg.user_id)) {
                        setUsersInRoom([...cur, { id: msg.user_id, name: msg.name, avatar: msg.avatar, balance: 0, isPremium: false }]);
                    }
                    await createPeerConnection(msg.user_id, false);
                    break;
                }

                case 'UserLeft':
                    setUsersInRoom(useAppStore.getState().usersInRoom.filter((u: User) => u.id !== msg.user_id));
                    peerConnections.current.get(msg.user_id)?.close();
                    peerConnections.current.delete(msg.user_id);
                    peerStates.current.delete(msg.user_id);
                    setPeerConnectionStates({ ...Object.fromEntries(peerStates.current) });

                    const audioEl = document.getElementById(`peer-audio-${msg.user_id}`);
                    if (audioEl) audioEl.remove();
                    break;

                case 'Offer': {
                    let pc = peerConnections.current.get(msg.sender);
                    if (!pc) pc = await createPeerConnection(msg.sender, false);
                    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: msg.sdp }));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    ws.current?.send(JSON.stringify({ type: 'Answer', target: msg.sender, sender: userId, sdp: answer.sdp }));
                    break;
                }

                case 'Answer': {
                    const pc = peerConnections.current.get(msg.sender);
                    if (pc) await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: msg.sdp }));
                    break;
                }

                case 'IceCandidate': {
                    const pc = peerConnections.current.get(msg.sender);
                    if (pc && pc.remoteDescription) {
                        await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(msg.candidate)));
                    }
                    break;
                }
            }
        };

        ws.current.onclose = () => setUsersInRoom([]);
    }, [userId, userName, userAvatar, roomId, createPeerConnection, setUsersInRoom]);

    // --- Lifecycle ---
    useEffect(() => {
        if (!userId || !roomId) return;

        ensureLocalStream()
            .then(() => connectWebSocket())
            .catch((err: Error) => console.error('Mic denied:', err));

        return () => {
            if (ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ type: 'LeaveRoom' }));
            }
            ws.current?.close();
            ws.current = null;
            setUsersInRoom([]);
            peerConnections.current.forEach((pc: RTCPeerConnection, id: string) => {
                pc.close();
                const audioEl = document.getElementById(`peer-audio-${id}`);
                if (audioEl) audioEl.remove();
            });
            peerConnections.current.clear();
            peerStates.current.clear();
            if (voiceActivityInterval.current) clearInterval(voiceActivityInterval.current);
            localStream.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
            localStream.current = null;
            localStreamReady.current = null;
        };
    }, [userId, roomId, ensureLocalStream, connectWebSocket, setUsersInRoom]);

    // --- Controls ---

    // Real mute: store in ref (for before-stream scenarios) and apply immediately
    const setMuted = useCallback((muted: boolean) => {
        pendingMuted.current = muted;
        localStream.current?.getAudioTracks().forEach((track: MediaStreamTrack) => {
            track.enabled = !muted;
        });
        if (muted) setIsSpeaking(false);
    }, []);

    const sendChat = useCallback((text: string) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'ChatMessage', text }));
        }
    }, []);

    const editMessage = useCallback((messageId: string, newText: string) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'EditMessage', message_id: messageId, new_text: newText }));
        }
    }, []);

    const deleteMessage = useCallback((messageId: string) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'DeleteMessage', message_id: messageId }));
        }
    }, []);

    const purchaseItem = useCallback((itemId: string, price: number) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'MarketPurchase', user_id: userId, item_id: itemId, price }));
        }
    }, [userId]);

    const toggleUserMute = useCallback((targetId: string) => {
        setMutedUsers(prev => {
            const isTargetMuted = !prev[targetId];
            const next = { ...prev, [targetId]: isTargetMuted };

            // Find the audio element for this user and apply mute
            const audioElements = document.querySelectorAll(`audio[data-peer-id="${targetId}"]`);
            audioElements.forEach(el => {
                (el as HTMLAudioElement).muted = isTargetMuted;
            });

            return next;
        });
    }, []);

    return { isSpeaking, peerConnectionStates, setMuted, sendChat, editMessage, deleteMessage, purchaseItem, toggleUserMute, mutedUsers };
};

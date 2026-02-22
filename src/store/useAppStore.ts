import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
    id: string;
    name: string;
    avatar: string;
    balance: number;
    isPremium: boolean;
    premiumExpiresAt?: number;
}

export interface Channel {
    id: string;
    name: string;
    type: 'text' | 'voice';
}

export interface Server {
    id: string;
    name: string;
    icon?: string; // emoji or first 2 chars of name
    channels: Channel[];
    ownerId: string;
}

export interface Friend {
    name: string;
    addedAt: number;
}

export interface ChatMessage {
    id: string;
    userId: string;
    name: string;
    avatar: string;
    text: string;
    timestamp: number;
    isSelf: boolean;
    channelId?: string;
}

export interface AudioSettings {
    noiseSuppression: boolean;
    echoCancellation: boolean;
    autoGainControl: boolean;
    micVolume: number;
    voiceThreshold: number;
    inputDeviceId: string | null;
    outputDeviceId: string | null;
}

const DEFAULT_AUDIO: AudioSettings = {
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true,
    micVolume: 100,
    voiceThreshold: 12,
    inputDeviceId: null,
    outputDeviceId: null,
};

interface AppState {
    // Auth
    currentUser: User | null;
    setCurrentUser: (user: User | null) => void;

    // View Profile
    viewProfileId: string | null;
    setViewProfileId: (id: string | null) => void;

    // Servers
    servers: Server[];
    activeServerId: string | null;
    addServer: (server: Server) => void;
    setActiveServer: (id: string | null) => void;

    // Channels (derived from active server, but keeping activeRoom independent)
    activeRoom: string | null;
    setActiveRoom: (roomId: string | null) => void;
    openDM: (dmId: string) => void;
    addChannel: (serverId: string, channel: Channel) => void;

    // Voice room users
    usersInRoom: User[];
    setUsersInRoom: (users: User[]) => void;

    // Global voice states (userId -> { roomId, name, avatar })
    globalVoiceStates: Record<string, { roomId: string; name: string; avatar: string }>;
    setGlobalVoiceState: (states: Record<string, { roomId: string; name: string; avatar: string }>) => void;
    updateGlobalVoiceState: (userId: string, roomId: string | null, name?: string, avatar?: string) => void;

    // Chat
    messages: ChatMessage[];
    addMessage: (msg: ChatMessage) => void;
    editMessage: (id: string, newText: string) => void;
    deleteMessage: (id: string) => void;
    clearMessages: () => void;

    // Unread State
    lastRead: Record<string, number>;
    markRead: (channelId: string) => void;
    // Other users' read states: channelId -> userId -> timestamp
    roomReads: Record<string, Record<string, number>>;
    updateRoomRead: (channelId: string, userId: string, timestamp: number) => void;

    // Websocket ref
    sendWsMessage: ((msg: any) => void) | null;
    setSendWsMessage: (fn: ((msg: any) => void) | null) => void;

    // Friends
    friends: Friend[];
    addFriend: (name: string) => void;
    removeFriend: (name: string) => void;

    // Audio
    audioSettings: AudioSettings;
    setAudioSettings: (patch: Partial<AudioSettings>) => void;

    // Legacy compat
    audioInputDeviceId: string | null;
    audioOutputDeviceId: string | null;
    setAudioInput: (id: string | null) => void;
    setAudioOutput: (id: string | null) => void;

    updateBalance: (balance: number) => void;
}

const DEFAULT_SERVER: Server = {
    id: 'default',
    name: 'Мой сервер',
    channels: [
        { id: 'general-text', name: 'основной', type: 'text' },
        { id: 'general', name: 'General Lounge', type: 'voice' },
        { id: 'gaming', name: 'Gaming Hub', type: 'voice' },
    ],
    ownerId: '',
};

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            currentUser: null,
            setCurrentUser: (user) => set({ currentUser: user }),

            viewProfileId: null,
            setViewProfileId: (id) => set({ viewProfileId: id }),

            servers: [DEFAULT_SERVER],
            activeServerId: null,
            addServer: (server) => set((s) => ({ servers: [...s.servers, server], activeServerId: server.id })),
            setActiveServer: (id) => set({ activeServerId: id, activeRoom: null }),

            activeRoom: null,
            setActiveRoom: (roomId) => set({ activeRoom: roomId }),
            openDM: (dmId) => set({ activeServerId: null, activeRoom: dmId }),
            addChannel: (serverId, channel) => set((s) => ({
                servers: s.servers.map(sv =>
                    sv.id === serverId ? { ...sv, channels: [...sv.channels, channel] } : sv
                )
            })),

            usersInRoom: [],
            setUsersInRoom: (users) => set({ usersInRoom: users }),

            globalVoiceStates: {},
            setGlobalVoiceState: (states) => set({ globalVoiceStates: states }),
            updateGlobalVoiceState: (userId, roomId, name, avatar) => set((s) => {
                const next = { ...s.globalVoiceStates };
                if (roomId && name && avatar) {
                    next[userId] = { roomId, name, avatar };
                } else if (roomId && next[userId]) {
                    next[userId].roomId = roomId; // Just update room
                } else {
                    delete next[userId];
                }
                return { globalVoiceStates: next };
            }),

            messages: [],
            addMessage: (msg) => set((s) => {
                if (s.messages.some(m => m.id === msg.id)) return s;
                return { messages: [...s.messages.slice(-300), msg] };
            }),
            editMessage: (id, newText) => set((s) => ({
                messages: s.messages.map(m => m.id === id ? { ...m, text: newText } : m)
            })),
            deleteMessage: (id) => set((s) => ({
                messages: s.messages.filter(m => m.id !== id)
            })),
            clearMessages: () => set({ messages: [] }),

            lastRead: {},
            markRead: (channelId) => set((s) => {
                const channelMessages = s.messages.filter(m => m.channelId === channelId);
                const maxTime = channelMessages.length > 0 ? channelMessages[channelMessages.length - 1].timestamp : 0;
                const timeToMark = Math.max(Date.now(), maxTime);

                if (s.sendWsMessage) {
                    s.sendWsMessage({ type: 'MessageRead', channel_id: channelId, timestamp: timeToMark });
                }

                return {
                    lastRead: { ...s.lastRead, [channelId]: timeToMark }
                };
            }),
            roomReads: {},
            updateRoomRead: (channelId, userId, timestamp) => set((s) => ({
                roomReads: {
                    ...s.roomReads,
                    [channelId]: {
                        ...(s.roomReads[channelId] || {}),
                        [userId]: Math.max(s.roomReads[channelId]?.[userId] || 0, timestamp)
                    }
                }
            })),

            sendWsMessage: null,
            setSendWsMessage: (fn) => set({ sendWsMessage: fn }),

            friends: [],
            addFriend: (name) => set((s) => {
                if (s.friends.find(f => f.name.toLowerCase() === name.toLowerCase())) return s;
                return { friends: [...s.friends, { name, addedAt: Date.now() }] };
            }),
            removeFriend: (name) => set((s) => ({ friends: s.friends.filter(f => f.name !== name) })),

            audioSettings: DEFAULT_AUDIO,
            setAudioSettings: (patch) => set((s) => ({
                audioSettings: { ...s.audioSettings, ...patch },
                audioInputDeviceId: patch.inputDeviceId !== undefined ? patch.inputDeviceId : s.audioInputDeviceId,
                audioOutputDeviceId: patch.outputDeviceId !== undefined ? patch.outputDeviceId : s.audioOutputDeviceId,
            })),

            audioInputDeviceId: null,
            audioOutputDeviceId: null,
            setAudioInput: (id) => set((s) => ({ audioInputDeviceId: id, audioSettings: { ...s.audioSettings, inputDeviceId: id } })),
            setAudioOutput: (id) => set((s) => ({ audioOutputDeviceId: id, audioSettings: { ...s.audioSettings, outputDeviceId: id } })),

            updateBalance: (balance) => set((s) => ({
                currentUser: s.currentUser ? { ...s.currentUser, balance } : null
            })),
        }),
        {
            name: 'alo-duraki-v3',
            partialize: (s) => ({
                audioSettings: s.audioSettings,
                servers: s.servers,
                friends: s.friends,
                messages: s.messages,
                lastRead: s.lastRead, // Persist lastRead state
                roomReads: s.roomReads, // Persist other users' read states
            }),
        }
    )
);

// Convenience selector
const EMPTY_CHANNELS: Channel[] = [];
export const useActiveServer = () => useAppStore(s => s.servers.find(sv => sv.id === s.activeServerId) ?? null);
export const useActiveChannels = () => useAppStore(s => {
    const sv = s.servers.find(sv => sv.id === s.activeServerId);
    return sv?.channels ?? EMPTY_CHANNELS;
});

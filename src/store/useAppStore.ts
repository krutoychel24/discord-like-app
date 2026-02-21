import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
    id: string;
    name: string;
    avatar: string;
    balance: number;
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

    // Servers
    servers: Server[];
    activeServerId: string | null;
    addServer: (server: Server) => void;
    setActiveServer: (id: string | null) => void;

    // Channels (derived from active server, but keeping activeRoom independent)
    activeRoom: string | null;
    setActiveRoom: (roomId: string | null) => void;
    addChannel: (serverId: string, channel: Channel) => void;

    // Voice room users
    usersInRoom: User[];
    setUsersInRoom: (users: User[]) => void;

    // Chat
    messages: ChatMessage[];
    addMessage: (msg: ChatMessage) => void;
    clearMessages: () => void;

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

            servers: [DEFAULT_SERVER],
            activeServerId: 'default',
            addServer: (server) => set((s) => ({ servers: [...s.servers, server], activeServerId: server.id })),
            setActiveServer: (id) => set({ activeServerId: id, activeRoom: null }),

            activeRoom: null,
            setActiveRoom: (roomId) => set({ activeRoom: roomId }),
            addChannel: (serverId, channel) => set((s) => ({
                servers: s.servers.map(sv =>
                    sv.id === serverId ? { ...sv, channels: [...sv.channels, channel] } : sv
                )
            })),

            usersInRoom: [],
            setUsersInRoom: (users) => set({ usersInRoom: users }),

            messages: [],
            addMessage: (msg) => set((s) => ({ messages: [...s.messages.slice(-300), msg] })),
            clearMessages: () => set({ messages: [] }),

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
            }),
        }
    )
);

// Convenience selector
export const useActiveServer = () => useAppStore(s => s.servers.find(sv => sv.id === s.activeServerId) ?? null);
export const useActiveChannels = () => useAppStore(s => {
    const sv = s.servers.find(sv => sv.id === s.activeServerId);
    return sv?.channels ?? [];
});

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Hash } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useWebRTC } from '../hooks/useWebRTC';
import { ChatPanel } from './ChatPanel';

interface TextRoomProps {
    roomId: string;
}

export const TextRoom: React.FC<TextRoomProps> = ({ roomId }) => {
    const { servers, activeServerId, markRead } = useAppStore();
    const allChannels = servers.find(s => s.id === activeServerId)?.channels ?? [];
    const currentChannel = allChannels.find((c: { id: string; name: string }) => c.id === roomId) || { name: roomId };

    // We pass roomId to useWebRTC just to initialize Chat, we pass type text so it doesn't request mic
    const { sendChat, editMessage, deleteMessage } = useWebRTC(roomId, 'text');

    useEffect(() => {
        markRead(roomId);
    }, [roomId, markRead]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col h-full bg-[#090909]"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.07] bg-black/30 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-2">
                    <Hash size={20} className="text-zinc-500" />
                    <div>
                        <h2 className="text-sm font-bold text-white">{currentChannel.name}</h2>
                        <p className="text-xs text-zinc-500">Текстовый канал</p>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-hidden">
                <ChatPanel sendChat={sendChat} editMessage={editMessage} deleteMessage={deleteMessage} fullWidth={true} />
            </div>
        </motion.div>
    );
};

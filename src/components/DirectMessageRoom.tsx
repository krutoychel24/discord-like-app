import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useDMChat } from '../hooks/useDMChat';
import { ChatPanel } from './ChatPanel';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface DirectMessageRoomProps {
    roomId: string;
}

export const DirectMessageRoom: React.FC<DirectMessageRoomProps> = ({ roomId }) => {
    const { currentUser, markRead } = useAppStore();
    const [friend, setFriend] = useState<{ name: string; avatar: string; isPremium?: boolean } | null>(null);
    const [loading, setLoading] = useState(true);

    // Extract friend ID from roomId (format: dm_id1_id2)
    useEffect(() => {
        if (!currentUser) return;
        const parts = roomId.split('_');
        const friendId = parts[1] === currentUser.id ? parts[2] : parts[1];

        if (friendId) {
            getDoc(doc(db, 'users', friendId)).then(docSnap => {
                if (docSnap.exists()) {
                    setFriend({
                        name: docSnap.data().nickname || 'Unknown',
                        avatar: docSnap.data().avatar || '',
                        isPremium: docSnap.data().isPremium || false
                    });
                }
                setLoading(false);
            });
        }
    }, [roomId, currentUser]);

    // Use the new hook for DM chats via Firebase
    const { sendChat, editMessage, deleteMessage } = useDMChat(roomId);

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
                <div className="flex items-center gap-3">
                    <MessageSquare size={20} className="text-zinc-500" />
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin text-zinc-500" />
                            <span className="text-sm font-bold text-zinc-500">Загрузка...</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            {friend?.avatar ? (
                                <img src={friend.avatar} alt="" className="w-6 h-6 rounded-full" />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400">
                                    {friend?.name?.slice(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                    {friend?.name}
                                    {friend?.isPremium && (
                                        <span className="px-1.5 pt-0.5 pb-[3px] rounded bg-amber-500/20 text-amber-400 text-[8px] font-bold border border-amber-500/30">
                                            PREMIUM
                                        </span>
                                    )}
                                </h2>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-hidden">
                <ChatPanel sendChat={sendChat} editMessage={editMessage} deleteMessage={deleteMessage} fullWidth={true} />
            </div>
        </motion.div>
    );
};

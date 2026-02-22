import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Hash, X } from 'lucide-react';
import { useAppStore, ChatMessage } from '../store/useAppStore';
import { UserContextMenu } from './UserContextMenu';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface ChatPanelProps {
    sendChat: (text: string) => void;
    editMessage?: (id: string, text: string) => void;
    deleteMessage?: (id: string) => void;
    fullWidth?: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ sendChat, editMessage, deleteMessage, fullWidth }) => {
    const { messages, activeRoom, setViewProfileId, markRead, currentUser, roomReads } = useAppStore();
    const [input, setInput] = useState('');
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ pos: { x: number, y: number }, msg: ChatMessage } | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const roomMessages = messages.filter(m => m.channelId === activeRoom);

    useEffect(() => {
        if (activeRoom) {
            markRead(activeRoom);
            if (activeRoom.startsWith('dm_') && currentUser) {
                setDoc(doc(db, 'directMessages', activeRoom, 'reads', currentUser.id), { timestamp: Date.now() }, { merge: true });
            }
        }
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [roomMessages.length, activeRoom, markRead, currentUser]);

    const handleSend = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const text = input.trim();
        if (!text) return;

        if (editingMessageId && editMessage) {
            editMessage(editingMessageId, text);
            setEditingMessageId(null);
        } else {
            sendChat(text);
        }
        setInput('');
    }, [input, sendChat, editMessage, editingMessageId]);

    const handleContextMenu = (e: React.MouseEvent, msg: ChatMessage) => {
        e.preventDefault();
        setContextMenu({ pos: { x: e.clientX, y: e.clientY }, msg });
    };

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    };

    const grouped: Array<ChatMessage & { isGroupStart: boolean; isGroupEnd: boolean }> = roomMessages.map((msg, i) => ({
        ...msg,
        isGroupStart: i === 0 || roomMessages[i - 1].userId !== msg.userId,
        isGroupEnd: i === roomMessages.length - 1 || roomMessages[i + 1].userId !== msg.userId,
    }));

    const renderTextWithLinks = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.split(urlRegex).map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#64b5f6] hover:underline">
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    return (
        <div
            className={`flex flex-col h-full border-l border-white/[0.07] bg-[#0c0c0c] ${fullWidth ? 'w-full' : ''}`}
            style={fullWidth ? {} : { minWidth: 280, maxWidth: 320 }}
        >
            <div className="px-4 py-3 border-b border-white/[0.07] flex items-center gap-2 bg-[#0c0c0c] shrink-0">
                <Hash size={16} className="text-zinc-500" />
                <span className="text-sm font-bold text-zinc-100">Чат</span>
                {messages.length > 0 && (
                    <span className="ml-auto text-[11px] font-medium text-zinc-500">{messages.length} сообщений</span>
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
                {roomMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <p className="text-zinc-500 text-sm font-medium">Пока нет сообщений в этом канале</p>
                        <p className="text-zinc-600 text-xs mt-1">Напишите первым!</p>
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {grouped.map((msg) => {
                        const isRead = activeRoom ? Object.entries(roomReads[activeRoom] || {}).some(([uid, ts]) => uid !== currentUser?.id && ts >= msg.timestamp) : false;
                        const isSelf = msg.isSelf;

                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, scale: 0.98, originX: isSelf ? 1 : 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onContextMenu={(e) => handleContextMenu(e, msg)}
                                className={`flex w-full ${isSelf ? 'justify-end' : 'justify-start'} ${msg.isGroupStart ? 'mt-3' : 'mt-1'} ${editingMessageId === msg.id ? 'opacity-50' : ''}`}
                            >
                                {/* Avatar for others (shown on the last message of the group) */}
                                {!isSelf && (
                                    <div className="w-8 flex-shrink-0 mr-2 flex items-end pb-1">
                                        {msg.isGroupEnd ? (
                                            <img
                                                src={msg.avatar}
                                                alt={msg.name}
                                                className="w-8 h-8 rounded-full cursor-pointer hover:opacity-80 transition-opacity object-cover"
                                                onClick={(e) => { e.stopPropagation(); setViewProfileId(msg.userId); }}
                                            />
                                        ) : (
                                            <div className="w-8 h-8" />
                                        )}
                                    </div>
                                )}

                                {/* Message bubble container */}
                                <div className={`flex flex-col max-w-[85%] ${isSelf ? 'items-end' : 'items-start'}`}>
                                    {/* Author Name for others */}
                                    {msg.isGroupStart && !isSelf && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setViewProfileId(msg.userId); }}
                                            className="text-[14px] font-bold text-indigo-400 hover:underline mb-1 ml-1 truncate max-w-full"
                                        >
                                            {msg.name}
                                        </button>
                                    )}

                                    {/* Bubble */}
                                    <div className={`relative px-3 py-2 shadow-sm text-[15px] leading-snug break-words ${isSelf
                                            ? 'bg-[#2b5278] text-white rounded-l-2xl rounded-tr-2xl rounded-br-sm'
                                            : 'bg-[#182533] text-zinc-100 rounded-r-2xl rounded-tl-2xl rounded-bl-sm'
                                        }`}
                                    >
                                        <div className="whitespace-pre-wrap">
                                            {renderTextWithLinks(msg.text)}
                                            {/* Spacer to push text so it doesn't overlap the absolute time at bottom right */}
                                            <span className="inline-block" style={{ width: isSelf ? '3.5rem' : '2.5rem', height: '1rem' }} />
                                        </div>

                                        {/* Inline Time and Ticks */}
                                        <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[11px] select-none text-[#7da3c5]">
                                            <span>{formatTime(msg.timestamp)}</span>
                                            {isSelf && (
                                                <span className={`text-[12px] leading-none -ml-0.5 tracking-tighter ${isRead ? 'text-[#5eb5f7]' : 'text-[#7da3c5]'}`}>
                                                    {isRead ? '✓✓' : '✓'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="px-3 py-3 border-t border-white/[0.07] shrink-0 bg-[#0c0c0c]">
                {editingMessageId && (
                    <div className="flex items-center justify-between mb-2 px-2">
                        <span className="text-xs font-medium text-indigo-400">Редактирование сообщения...</span>
                        <button type="button" onClick={() => { setEditingMessageId(null); setInput(''); }} className="text-zinc-500 hover:text-white transition-colors">
                            <X size={14} />
                        </button>
                    </div>
                )}
                <div className="flex gap-2 relative">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={editingMessageId ? "Отредактируйте текст..." : "Написать..."}
                        maxLength={500}
                        className={`flex-1 bg-[#1c1c1c] rounded-2xl px-4 py-2.5 text-sm font-medium text-zinc-200 placeholder:text-zinc-500 focus:outline-none transition-colors border-transparent focus:bg-[#222]`}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-[#2b5278] text-white hover:bg-[#386a92] disabled:opacity-0 disabled:pointer-events-none transition-all shrink-0 absolute right-1 top-0.5"
                    >
                        <Send size={16} className={input.trim() ? "translate-x-[-1px] translate-y-[1px]" : ""} />
                    </button>
                </div>
            </form>

            <AnimatePresence>
                {contextMenu && (
                    <UserContextMenu
                        user={{ id: contextMenu.msg.userId, name: contextMenu.msg.name, avatar: contextMenu.msg.avatar }}
                        isSelf={contextMenu.msg.isSelf}
                        position={contextMenu.pos}
                        onClose={() => setContextMenu(null)}
                        onEditMessage={editMessage ? () => {
                            setEditingMessageId(contextMenu.msg.id);
                            setInput(contextMenu.msg.text);
                        } : undefined}
                        onDeleteMessage={deleteMessage ? () => deleteMessage(contextMenu.msg.id) : undefined}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Hash } from 'lucide-react';
import { useAppStore, ChatMessage } from '../store/useAppStore';

interface ChatPanelProps {
    sendChat: (text: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ sendChat }) => {
    const { messages } = useAppStore();
    const [input, setInput] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const text = input.trim();
        if (!text) return;
        sendChat(text);
        setInput('');
    }, [input, sendChat]);

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    };

    // Group consecutive messages from the same user
    const grouped: Array<ChatMessage & { isGroupStart: boolean }> = messages.map((msg, i) => ({
        ...msg,
        isGroupStart: i === 0 || messages[i - 1].userId !== msg.userId,
    }));

    return (
        <div className="flex flex-col h-full border-l border-white/[0.07] bg-[#080808]" style={{ minWidth: 280, maxWidth: 320 }}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/[0.07] flex items-center gap-2 bg-black/20 shrink-0">
                <Hash size={14} className="text-zinc-500" />
                <span className="text-sm font-semibold text-zinc-300">Чат</span>
                {messages.length > 0 && (
                    <span className="ml-auto text-[10px] text-zinc-600">{messages.length} сообщений</span>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <p className="text-zinc-600 text-sm">Пока нет сообщений</p>
                        <p className="text-zinc-700 text-xs mt-1">Напишите первым!</p>
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {grouped.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex gap-2.5 ${msg.isGroupStart ? 'mt-3' : 'mt-0.5'}`}
                        >
                            {/* Avatar — only show on group start */}
                            <div className="w-8 flex-shrink-0 flex items-start mt-0.5">
                                {msg.isGroupStart ? (
                                    <img src={msg.avatar} alt={msg.name} className="w-7 h-7 rounded-lg" />
                                ) : null}
                            </div>

                            <div className="flex-1 min-w-0">
                                {msg.isGroupStart && (
                                    <div className="flex items-baseline gap-2 mb-0.5">
                                        <span className={`text-xs font-semibold ${msg.isSelf ? 'text-indigo-400' : 'text-zinc-300'}`}>
                                            {msg.isSelf ? 'Вы' : msg.name}
                                        </span>
                                        <span className="text-[10px] text-zinc-700">{formatTime(msg.timestamp)}</span>
                                    </div>
                                )}
                                <div className={`inline-block max-w-full rounded-lg px-3 py-1.5 text-sm leading-relaxed break-words ${msg.isSelf
                                    ? 'bg-indigo-500/15 text-indigo-100 border border-indigo-500/20'
                                    : 'bg-white/[0.04] text-zinc-200 border border-white/[0.06]'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="px-3 py-3 border-t border-white/[0.07] shrink-0">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Написать..."
                        maxLength={500}
                        className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </form>
        </div>
    );
};

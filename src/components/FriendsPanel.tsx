import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Users, UserCheck, UserMinus, Search } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const TABS = [
    { id: 'all', label: 'Все друзья' },
    { id: 'add', label: 'Добавить друга' },
];

export const FriendsPanel: React.FC = () => {
    const { friends, addFriend, removeFriend } = useAppStore();
    const [activeTab, setActiveTab] = useState('all');
    const [query, setQuery] = useState('');
    const [addInput, setAddInput] = useState('');
    const [addStatus, setAddStatus] = useState<{ type: 'success' | 'error' | null; msg: string }>({ type: null, msg: '' });

    const handleAdd = () => {
        const name = addInput.trim();
        if (!name) return;
        const exists = friends.some(f => f.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            setAddStatus({ type: 'error', msg: 'Этот пользователь уже у тебя в друзьях' });
        } else {
            addFriend(name);
            setAddStatus({ type: 'success', msg: `${name} добавлен в друзья!` });
            setAddInput('');
        }
        setTimeout(() => setAddStatus({ type: null, msg: '' }), 3000);
    };

    const filtered = friends.filter(f => f.name.toLowerCase().includes(query.toLowerCase()));

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-1 px-6 py-3.5 border-b border-white/[0.07] shrink-0 bg-black/20">
                <Users size={16} className="text-zinc-400 mr-2" />
                <span className="text-sm font-bold text-white">Друзья</span>
                <div className="flex gap-1 ml-4">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`px-3 py-1 rounded-md text-sm transition-colors ${activeTab === t.id
                                    ? 'bg-white/10 text-white font-semibold'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* All Friends */}
            {activeTab === 'all' && (
                <div className="flex-1 overflow-y-auto px-4 py-4">
                    {/* Search */}
                    <div className="relative mb-4">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input
                            type="text"
                            placeholder="Поиск..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            className="w-full bg-black/30 border border-white/[0.07] rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/40"
                        />
                    </div>

                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Users size={40} className="text-zinc-700 mb-3" />
                            <p className="text-zinc-500 text-sm font-medium">
                                {friends.length === 0 ? 'Список друзей пуст' : 'Никого не найдено'}
                            </p>
                            <p className="text-zinc-700 text-xs mt-1">
                                {friends.length === 0 ? 'Добавь друзей по нику' : 'Попробуй другой запрос'}
                            </p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                                Все друзья — {filtered.length}
                            </p>
                            <div className="space-y-0.5">
                                {filtered.map(f => (
                                    <motion.div
                                        key={f.name}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] group transition-colors"
                                    >
                                        {/* Avatar placeholder — initials */}
                                        <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300 flex-shrink-0">
                                            {f.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-white truncate">{f.name}</p>
                                            <p className="text-xs text-zinc-600">Добавлен вручную</p>
                                        </div>
                                        <button
                                            onClick={() => removeFriend(f.name)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                            title="Удалить из друзей"
                                        >
                                            <UserMinus size={14} />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Add Friend */}
            {activeTab === 'add' && (
                <div className="flex-1 overflow-y-auto px-6 py-8">
                    <div className="max-w-lg">
                        <UserPlus size={36} className="text-indigo-400 mb-4" />
                        <h2 className="text-xl font-bold text-white mb-1">Добавить друга</h2>
                        <p className="text-sm text-zinc-500 mb-6">
                            Введи ник пользователя — он добавится в список друзей.
                        </p>
                        <div className="flex gap-3">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Ник пользователя"
                                value={addInput}
                                onChange={e => setAddInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
                            />
                            <button
                                onClick={handleAdd}
                                disabled={!addInput.trim()}
                                className="px-5 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold disabled:opacity-40 transition-colors flex items-center gap-2"
                            >
                                <UserCheck size={16} />
                                Добавить
                            </button>
                        </div>

                        <AnimatePresence>
                            {addStatus.type && (
                                <motion.p
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className={`text-sm mt-3 ${addStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}
                                >
                                    {addStatus.msg}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </div>
    );
};

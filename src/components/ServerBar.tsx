import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, UserRound } from 'lucide-react';
import { useAppStore, Server } from '../store/useAppStore';

function ServerIcon({ server, active, onClick }: { server: Server; active: boolean; onClick: () => void }) {
    const label = server.icon || server.name.slice(0, 2).toUpperCase();

    return (
        <div className="relative flex justify-center group" title={server.name}>
            {/* Active pill */}
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-white transition-all duration-200 ${active ? 'h-9' : 'h-0 group-hover:h-5'}`} />
            <button
                onClick={onClick}
                className={`w-12 h-12 rounded-[28px] group-hover:rounded-2xl transition-all duration-200 font-bold text-sm flex items-center justify-center select-none ${active
                    ? 'rounded-2xl bg-indigo-500 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-indigo-500 hover:text-white'
                    }`}
            >
                {label}
            </button>
        </div>
    );
}

export const ServerBar: React.FC = () => {
    const { servers, activeServerId, setActiveServer, addServer, currentUser } = useAppStore();
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');

    const handleCreate = () => {
        if (!newName.trim()) return;
        const server: Server = {
            id: `srv-${Date.now()}`,
            name: newName.trim(),
            channels: [
                { id: `txt-${Date.now()}`, name: 'основной', type: 'text' },
                { id: `vc-${Date.now()}`, name: 'Голосовой', type: 'voice' },
            ],
            ownerId: currentUser?.id || '',
        };
        addServer(server);
        setNewName('');
        setShowCreate(false);
    };

    return (
        <div className="w-[72px] bg-[#030303] border-r border-white/[0.06] flex flex-col items-center py-3 gap-2 overflow-y-auto shrink-0">

            {/* DM / Friends */}
            <div className="relative flex justify-center group w-full" title="Друзья">
                <button
                    onClick={() => useAppStore.getState().setActiveServer(null)}
                    className={`w-12 h-12 rounded-[28px] group-hover:rounded-2xl transition-all duration-200 flex items-center justify-center ${activeServerId === null ? 'rounded-2xl bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-indigo-500 hover:text-white'
                        }`}
                >
                    <UserRound size={20} />
                </button>
            </div>

            {/* Divider */}
            <div className="w-8 h-px bg-zinc-700/60 my-1" />

            {/* Servers */}
            {servers.map(sv => (
                <ServerIcon
                    key={sv.id}
                    server={sv}
                    active={sv.id === activeServerId}
                    onClick={() => setActiveServer(sv.id)}
                />
            ))}

            {/* Divider */}
            <div className="w-8 h-px bg-zinc-700/60 my-1" />

            {/* Create Server */}
            <div className="relative flex justify-center group w-full" title="Создать сервер">
                <button
                    onClick={() => setShowCreate(true)}
                    className="w-12 h-12 rounded-[28px] group-hover:rounded-2xl transition-all duration-200 bg-zinc-800 text-green-400 hover:bg-green-500 hover:text-white flex items-center justify-center"
                >
                    <Plus size={20} />
                </button>
            </div>

            {/* Create Server Modal */}
            <AnimatePresence>
                {showCreate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowCreate(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#111] border border-white/10 rounded-2xl p-6 w-80 shadow-2xl"
                        >
                            <h2 className="text-base font-bold text-white mb-1">Создать сервер</h2>
                            <p className="text-xs text-zinc-500 mb-4">Автоматически создаётся текстовый и голосовой канал</p>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Название сервера..."
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 mb-4"
                            />
                            <div className="flex gap-2">
                                <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-xl text-sm text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors">
                                    Отмена
                                </button>
                                <button onClick={handleCreate} disabled={!newName.trim()} className="flex-1 py-2 rounded-xl text-sm font-semibold bg-indigo-500 hover:bg-indigo-400 text-white transition-colors disabled:opacity-40">
                                    Создать
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Trash2, Save } from 'lucide-react';
import { useAppStore, Server } from '../store/useAppStore';

interface ServerSettingsModalProps {
    server: Server;
    onClose: () => void;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({ server, onClose }) => {
    const { servers, setActiveServer } = useAppStore();
    const [name, setName] = useState(server.name);

    const handleSave = () => {
        // Implement save logic in Zustand if needed, for MVP we can just close
        useAppStore.setState({
            servers: servers.map(s => s.id === server.id ? { ...s, name } : s)
        });
        onClose();
    };

    const handleDelete = () => {
        if (window.confirm(`Вы уверены, что хотите удалить сервер "${server.name}"? Это действие необратимо.`)) {
            useAppStore.setState({
                servers: servers.filter(s => s.id !== server.id)
            });
            setActiveServer(null);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                className="w-full max-w-md bg-[#111] border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] bg-black/30 shrink-0">
                    <h2 className="text-base font-bold text-white">
                        Настройки сервера
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Название сервера</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                        />
                    </div>

                    <div className="h-px bg-white/5 my-6" />

                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <Trash2 size={16} />
                            Удалить сервер
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={!name.trim() || name === server.name}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-indigo-500 hover:bg-indigo-400 text-white disabled:opacity-50 transition-colors"
                        >
                            <Save size={16} />
                            Сохранить
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

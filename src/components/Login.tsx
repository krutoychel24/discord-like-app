import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Hexagon, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const Login: React.FC = () => {
    const [nickname, setNickname] = useState('');
    const setCurrentUser = useAppStore(state => state.setCurrentUser);

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nickname.trim()) return;

        // Simulate joining logic
        setCurrentUser({
            id: `user-${Date.now()}`,
            name: nickname.trim(),
            avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${nickname.trim()}`,
            balance: 1000, // Starting balance
        });
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-black relative overflow-hidden">
            {/* Glow Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="strict-panel p-10 w-full max-w-md z-10 flex flex-col items-center"
            >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/10 border border-indigo-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                    <Hexagon size={32} className="text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                    Alo Duraki
                </h1>
                <p className="text-sm text-zinc-400 mb-8 text-center balance">
                    Encrypted, low-latency communication. <br /> Enter a nickname to join the node.
                </p>

                <form onSubmit={handleJoin} className="w-full flex flex-col gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">Nickname</label>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="e.g. Maverick"
                            maxLength={20}
                            className="strict-input w-full text-base py-3 bg-white/5"
                            autoFocus
                        />
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={!nickname.trim()}
                        className="w-full mt-2 relative overflow-hidden rounded-lg bg-indigo-500 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-indigo-400 hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-2"
                    >
                        Connect Node
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
};

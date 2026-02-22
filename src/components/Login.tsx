import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hexagon, ArrowRight, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export const Login: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const setCurrentUser = useAppStore(state => state.setCurrentUser);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                // Login Flow
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));

                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setCurrentUser({
                        id: userCredential.user.uid,
                        name: data.nickname || 'Unknown',
                        avatar: data.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${data.nickname || 'Unknown'}`,
                        balance: data.balance || 0,
                        isPremium: data.isPremium || false,
                        premiumExpiresAt: data.premiumExpiresAt,
                    });
                } else {
                    throw new Error("User data not found in database.");
                }
            } else {
                // Registration Flow
                if (!nickname.trim()) throw new Error("Nickname is required");

                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const uid = userCredential.user.uid;

                const defaultAvatar = `https://api.dicebear.com/7.x/shapes/svg?seed=${nickname.trim()}`;

                // Create user document in Firestore
                await setDoc(doc(db, 'users', uid), {
                    nickname: nickname.trim(),
                    email: email.trim(),
                    avatar: defaultAvatar,
                    balance: 1000, // starting balance
                    isPremium: false,
                    createdAt: Date.now()
                });

                setCurrentUser({
                    id: uid,
                    name: nickname.trim(),
                    avatar: defaultAvatar,
                    balance: 1000,
                    isPremium: false,
                });
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Authentication error');
        } finally {
            setLoading(false);
        }
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
                <p className="text-sm text-zinc-400 mb-6 text-center balance">
                    Encrypted, low-latency communication. <br /> Connect to the node.
                </p>

                {/* Tabs */}
                <div className="flex w-full mb-6 bg-white/5 rounded-lg p-1">
                    <button
                        onClick={() => setIsLogin(true)}
                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${isLogin ? 'bg-white/10 text-white shadow' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => setIsLogin(false)}
                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${!isLogin ? 'bg-white/10 text-white shadow' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Register
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
                    <AnimatePresence mode="popLayout">
                        {!isLogin && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-1.5 overflow-hidden"
                            >
                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">Nickname</label>
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    placeholder="e.g. Maverick"
                                    maxLength={20}
                                    className="strict-input w-full text-base py-3 bg-white/5"
                                    required={!isLogin}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="agent@node.com"
                            className="strict-input w-full text-base py-3 bg-white/5"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="strict-input w-full text-base py-3 bg-white/5"
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm text-center font-medium bg-red-400/10 py-2 rounded-lg border border-red-400/20">
                            {error}
                        </p>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading || (!isLogin && !nickname.trim())}
                        className="w-full mt-2 relative overflow-hidden rounded-lg bg-indigo-500 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-indigo-400 hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : (
                            <>
                                {isLogin ? 'Initialize Uplink' : 'Connect Node'}
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
};

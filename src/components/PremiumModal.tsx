import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, X, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface PremiumModalProps {
    onClose: () => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({ onClose }) => {
    const currentUser = useAppStore(state => state.currentUser);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleBuy = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            // Mock payment delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Update Firestore
            const userRef = doc(db, 'users', currentUser.id);
            const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

            await updateDoc(userRef, {
                isPremium: true,
                premiumExpiresAt: expiresAt
            });

            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (error) {
            console.error("Error buying premium", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            >
                {/* Header Graphic */}
                <div className="h-32 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-transparent"></div>
                    <Crown size={48} className="text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)] z-10" />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 rounded-lg bg-black/40 text-white/60 hover:text-white hover:bg-black/60 transition-colors z-20"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6">
                    <h2 className="text-2xl font-black text-white text-center mb-1">Alo Duraki <span className="text-amber-400">Premium</span></h2>
                    <p className="text-zinc-500 text-sm text-center mb-6">Unlock exclusive features for just $1/month.</p>

                    <ul className="space-y-4 mb-8">
                        {[
                            'Golden name badge everywhere',
                            'HD Voice Quality up to 128kbps',
                            'Animated avatars support',
                            'Support independent development'
                        ].map((feat, i) => (
                            <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                                <div className="p-1 rounded bg-amber-500/10">
                                    <Check size={14} className="text-amber-500" />
                                </div>
                                {feat}
                            </li>
                        ))}
                    </ul>

                    {success ? (
                        <div className="w-full py-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-bold flex items-center justify-center gap-2">
                            <Check size={18} />
                            Оплата прошла успешно!
                        </div>
                    ) : (
                        <button
                            onClick={handleBuy}
                            disabled={loading || currentUser?.isPremium}
                            className="w-full relative group overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3.5 text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : (
                                currentUser?.isPremium ? 'Уже Premium' : 'Оформить за $1.00'
                            )}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

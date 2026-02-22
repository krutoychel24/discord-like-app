import React, { useState, useEffect } from 'react';
import { UserPlus, UserMinus, ShieldAlert, Crown, User as UserIcon, Loader2, MessageSquare, UserCheck, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

interface UserProfileProps {
    userId: string;
    onClose?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId, onClose }) => {
    const { currentUser, openDM } = useAppStore();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Check if the viewed user is a friend of the current user
    const [isFriend, setIsFriend] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                const docRef = doc(db, 'users', userId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setProfile({ id: docSnap.id, ...docSnap.data() });
                }

                // Check friendship status from the current user's document
                if (currentUser) {
                    const myDoc = await getDoc(doc(db, 'users', currentUser.id));
                    if (myDoc.exists()) {
                        const myFriends = myDoc.data().friends || [];
                        setIsFriend(myFriends.includes(userId));
                    }
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [userId, currentUser]);

    const handleToggleFriend = async () => {
        if (!currentUser || !profile) return;

        setActionLoading(true);
        try {
            const myRef = doc(db, 'users', currentUser.id);
            const theirRef = doc(db, 'users', profile.id);

            if (isFriend) {
                // Remove friend
                await updateDoc(myRef, { friends: arrayRemove(profile.id) });
                await updateDoc(theirRef, { friends: arrayRemove(currentUser.id) });
                setIsFriend(false);
            } else {
                // Add friend
                await updateDoc(myRef, { friends: arrayUnion(profile.id) });
                await updateDoc(theirRef, { friends: arrayUnion(currentUser.id) });
                setIsFriend(true);
            }
        } catch (error) {
            console.error("Error toggling friend:", error);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#090909]">
                <Loader2 size={32} className="text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#090909]">
                <UserIcon size={48} className="text-zinc-700 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Профиль не найден</h2>
            </div>
        );
    }

    const isSelf = currentUser?.id === profile.id;

    return (
        <div className="flex-1 flex flex-col bg-[#090909] overflow-y-auto relative">
            {/* Banner */}
            <div className={`h-48 w-full relative overflow-hidden ${profile.isPremium ? 'bg-indigo-900/40' : 'bg-zinc-800/40'}`}>
                {profile.isPremium && (
                    <>
                        <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl"></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-3xl"></div>
                    </>
                )}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/40 rounded-full text-white/70 hover:text-white hover:bg-black/80 transition shadow-lg"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Profile Info Card */}
            <div className="px-8 pb-8 relative -mt-16 flex flex-col max-w-4xl mx-auto w-full">
                <div className="flex justify-between items-end mb-4">
                    {/* Avatar */}
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full border-[6px] border-[#090909] bg-black overflow-hidden flex items-center justify-center">
                            {profile.avatar ? (
                                <img src={profile.avatar} alt={profile.nickname} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold text-indigo-300">
                                    {profile.nickname?.slice(0, 2).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-[#090909] rounded-full" />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pb-2">
                        {!isSelf && (
                            <>
                                <button
                                    onClick={() => {
                                        if (!currentUser) return;
                                        const dmId = `dm_${[currentUser.id, profile.id].sort().join('_')}`;
                                        openDM(dmId);
                                        onClose?.();
                                    }}
                                    className="p-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white transition-colors flex items-center gap-2 font-medium text-sm shadow-lg shadow-indigo-500/20"
                                >
                                    <MessageSquare size={16} />
                                    Написать
                                </button>
                                <button
                                    onClick={handleToggleFriend}
                                    disabled={actionLoading}
                                    className={`p-2.5 rounded-lg flex items-center gap-2 font-medium text-sm transition-colors ${isFriend
                                        ? 'bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400'
                                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                        }`}
                                >
                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : (
                                        isFriend ? (
                                            <>
                                                <UserMinus size={16} className="group-hover:block hidden" />
                                                <UserCheck size={16} className="group-hover:hidden" />
                                                {/* Text changes on hover via CSS logic or we just keep it simple */}
                                                Удалить
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus size={16} />
                                                Добавить в друзья
                                            </>
                                        )
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Profile Details Box */}
                <div className="bg-[#111] border border-white/5 rounded-2xl p-6 mt-2">
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-bold text-white">{profile.nickname}</h1>
                        {profile.isPremium && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black tracking-wider uppercase shadow-[0_0_15px_rgba(251,191,36,0.15)]">
                                <Crown size={12} />
                                Premium
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-zinc-500 mb-6">{profile.email}</p>

                    <div className="grid grid-cols-1 gap-3 mb-6">
                        <div className="bg-black/20 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center">
                            <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Друзья</span>
                            <span className="text-xl font-bold text-white">{profile.friends?.length || 0}</span>
                        </div>
                    </div>

                    <div className="h-px w-full bg-white/5 mb-6" />

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Обо мне</h3>
                            <p className="text-sm text-zinc-300">Пользователь платформы Alo Duraki. Зарегистрирован {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'недавно'}.</p>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Статусы и значки</h3>
                            <div className="flex flex-wrap gap-2">
                                <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center" title="Ранний доступ">
                                    <ShieldAlert size={20} className="text-indigo-400" />
                                </div>
                                {profile.isPremium && (
                                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.1)]" title="Premium Подписчик">
                                        <Crown size={20} className="text-amber-400" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

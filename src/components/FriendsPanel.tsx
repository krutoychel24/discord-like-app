import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Users, UserCheck, UserMinus, Search, Loader2, MessageSquare, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, onSnapshot, getDoc } from 'firebase/firestore';

const TABS = [
    { id: 'all', label: 'Все друзья' },
    { id: 'requests', label: 'Запросы' },
    { id: 'add', label: 'Добавить друга' },
];

export const FriendsPanel: React.FC = () => {
    const { currentUser, setViewProfileId, openDM } = useAppStore();
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [addInput, setAddInput] = useState('');
    const [addStatus, setAddStatus] = useState<{ type: 'success' | 'error' | null; msg: string }>({ type: null, msg: '' });
    const [isSearching, setIsSearching] = useState(false);

    // Realtime Friends from Firestore
    const [firebaseFriends, setFirebaseFriends] = useState<any[]>([]);
    const [firebaseRequests, setFirebaseRequests] = useState<any[]>([]);

    useEffect(() => {
        if (!currentUser) return;

        const userRef = doc(db, 'users', currentUser.id);
        const unsubscribe = onSnapshot(userRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const friendIds: string[] = data.friends || [];
                const requestIds: string[] = data.friendRequests || [];

                // Fetch profiles of all friends
                const friendProfiles = [];
                for (const fid of friendIds) {
                    const fDoc = await getDoc(doc(db, 'users', fid));
                    if (fDoc.exists()) friendProfiles.push({ id: fDoc.id, ...fDoc.data() });
                }
                setFirebaseFriends(friendProfiles);

                // Fetch profiles of all requests
                const requestProfiles = [];
                for (const rid of requestIds) {
                    const rDoc = await getDoc(doc(db, 'users', rid));
                    if (rDoc.exists()) requestProfiles.push({ id: rDoc.id, ...rDoc.data() });
                }
                setFirebaseRequests(requestProfiles);
            }
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleSearchAdd = async () => {
        const name = addInput.trim();
        if (!name || !currentUser) return;

        if (name.toLowerCase() === currentUser.name.toLowerCase()) {
            setAddStatus({ type: 'error', msg: 'Нельзя добавить самого себя.' });
            return;
        }

        setIsSearching(true);
        setAddStatus({ type: null, msg: '' });

        try {
            const q = query(collection(db, 'users'), where('nickname', '==', name));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setAddStatus({ type: 'error', msg: 'Пользователь не найден.' });
            } else {
                const friendDoc = querySnapshot.docs[0];
                const friendId = friendDoc.id;

                // Send request by adding our ID to their friendRequests array
                const theirRef = doc(db, 'users', friendId);
                await updateDoc(theirRef, {
                    friendRequests: arrayUnion(currentUser.id)
                });

                setAddStatus({ type: 'success', msg: `Запрос отправлен пользователю ${name}!` });
                setAddInput('');
            }
        } catch (error) {
            console.error("Error adding friend:", error);
            setAddStatus({ type: 'error', msg: 'Ошибка при добавлении. Попробуйте позже.' });
        } finally {
            setIsSearching(false);
            setTimeout(() => setAddStatus({ type: null, msg: '' }), 4000);
        }
    };

    const handleAcceptRequest = async (requesterId: string) => {
        if (!currentUser) return;
        try {
            const myRef = doc(db, 'users', currentUser.id);
            await updateDoc(myRef, {
                friendRequests: arrayRemove(requesterId),
                friends: arrayUnion(requesterId)
            });

            const theirRef = doc(db, 'users', requesterId);
            await updateDoc(theirRef, {
                friends: arrayUnion(currentUser.id)
            });
        } catch (err) {
            console.error("Error accepting request:", err);
        }
    };

    const handleDeclineRequest = async (requesterId: string) => {
        if (!currentUser) return;
        try {
            const myRef = doc(db, 'users', currentUser.id);
            await updateDoc(myRef, {
                friendRequests: arrayRemove(requesterId)
            });
        } catch (err) {
            console.error("Error declining request:", err);
        }
    };

    const handleRemoveFriend = async (friendId: string, friendName: string) => {
        if (!currentUser) return;

        if (window.confirm(`Вы уверены, что хотите удалить ${friendName}?`)) {
            try {
                const myRef = doc(db, 'users', currentUser.id);
                await updateDoc(myRef, {
                    friends: arrayRemove(friendId)
                });

                const theirRef = doc(db, 'users', friendId);
                await updateDoc(theirRef, {
                    friends: arrayRemove(currentUser.id)
                });
            } catch (err) {
                console.error("Error removing friend:", err);
            }
        }
    };

    const filteredFriends = firebaseFriends.filter(f => f.nickname?.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-1 px-6 py-3.5 border-b border-white/[0.07] shrink-0 bg-black/20">
                <Users size={16} className="text-zinc-400 mr-2" />
                <span className="text-sm font-bold text-white">Друзья</span>
                <div className="flex gap-1 ml-4 relative">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`px-3 py-1 rounded-md text-sm transition-colors relative ${activeTab === t.id
                                ? 'bg-white/10 text-white font-semibold'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                                }`}
                        >
                            {t.label}
                            {t.id === 'requests' && firebaseRequests.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border border-black z-10">
                                    {firebaseRequests.length}
                                </span>
                            )}
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
                            placeholder="Поиск по друзьям..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-black/30 border border-white/[0.07] rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/40"
                        />
                    </div>

                    {filteredFriends.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <MessageSquare size={48} className="text-zinc-700 mb-4" />
                            <p className="text-white text-lg font-bold mb-2">
                                {firebaseFriends.length === 0 ? 'У тебя пока нет открытых чатов.' : 'Никого не найдено'}
                            </p>
                            <p className="text-zinc-500 text-sm mb-6">
                                {firebaseFriends.length === 0 ? 'Добавь друга, чтобы начать переписку!' : 'Попробуй изменить поисковой запрос.'}
                            </p>
                            {firebaseFriends.length === 0 && (
                                <button
                                    onClick={() => setActiveTab('add')}
                                    className="px-6 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-semibold transition-colors shadow-lg shadow-indigo-500/20"
                                >
                                    Добавить друга
                                </button>
                            )}
                        </div>
                    ) : (
                        <div>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                                Все друзья — {filteredFriends.length}
                            </p>
                            <div className="space-y-0.5">
                                {filteredFriends.map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setViewProfileId(f.id)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] group transition-colors text-left"
                                    >
                                        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-indigo-500/20 border border-indigo-500/30 flex flex-col justify-center items-center">
                                            {f.avatar ? (
                                                <img src={f.avatar} alt={f.nickname} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs font-bold text-indigo-300">
                                                    {f.nickname?.slice(0, 2).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 flex items-center gap-2">
                                            <p className="text-sm font-semibold text-white truncate">{f.nickname}</p>
                                            {f.isPremium && (
                                                <span className="px-1.5 pt-0.5 pb-[3px] rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                                                    PREMIUM
                                                </span>
                                            )}
                                        </div>
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const dmId = `dm_${[currentUser?.id, f.id].sort().join('_')}`;
                                                openDM(dmId);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all mr-1"
                                            title="Написать сообщение"
                                        >
                                            <MessageSquare size={14} />
                                        </div>
                                        <div
                                            onClick={(e) => { e.stopPropagation(); handleRemoveFriend(f.id, f.nickname); }}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                            title="Удалить из друзей"
                                        >
                                            <UserMinus size={14} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Friend Requests */}
            {activeTab === 'requests' && (
                <div className="flex-1 overflow-y-auto px-4 py-8">
                    {firebaseRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Users size={48} className="text-zinc-700 mb-4" />
                            <p className="text-white text-lg font-bold mb-2">Запросов пока нет</p>
                            <p className="text-zinc-500 text-sm mb-6">Тебе не отправляли новых запросов в друзья.</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-w-2xl mx-auto">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">
                                Входящие запросы — {firebaseRequests.length}
                            </p>
                            {firebaseRequests.map(req => (
                                <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-500/20 flex flex-col justify-center items-center">
                                            {req.avatar ? (
                                                <img src={req.avatar} alt={req.nickname} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs font-bold text-indigo-300">
                                                    {req.nickname?.slice(0, 2).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white flex items-center gap-2">
                                                {req.nickname}
                                                {req.isPremium && (
                                                    <span className="px-1.5 pt-0.5 pb-[3px] rounded bg-amber-500/20 text-amber-400 text-[8px] font-bold border border-amber-500/30">
                                                        PREMIUM
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-zinc-500">Хочет добавить тебя в друзья</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleAcceptRequest(req.id)} className="w-9 h-9 flex items-center justify-center rounded-full bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors" title="Принять">
                                            <UserCheck size={16} />
                                        </button>
                                        <button onClick={() => handleDeclineRequest(req.id)} className="w-9 h-9 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors" title="Отклонить">
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
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
                            Введи ник пользователя из базы данных Alo Duraki, чтобы добавить его в друзья.
                        </p>
                        <div className="flex gap-3">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Ник пользователя (точное совпадение)"
                                value={addInput}
                                onChange={e => setAddInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearchAdd()}
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
                            />
                            <button
                                onClick={handleSearchAdd}
                                disabled={!addInput.trim() || isSearching}
                                className="px-5 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold disabled:opacity-40 transition-colors flex items-center gap-2"
                            >
                                {isSearching ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                                Добавить
                            </button>
                        </div>

                        <AnimatePresence>
                            {addStatus.type && (
                                <motion.p
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className={`text-sm mt-3 font-medium ${addStatus.type === 'success' ? 'text-green-400 bg-green-400/10 p-2 rounded-lg border border-green-400/20' : 'text-red-400 bg-red-400/10 p-2 rounded-lg border border-red-400/20'}`}
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

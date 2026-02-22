import React, { useState } from 'react';
import { Plus, Settings, Hash, Volume2, ChevronDown, ChevronRight, Crown, Link, DoorOpen, Users } from 'lucide-react';
import { useAppStore, useActiveServer, useActiveChannels } from '../store/useAppStore';
import { PremiumModal } from './PremiumModal';
import { AnimatePresence, motion } from 'framer-motion';
import { InviteModal } from './InviteModal';
import { ServerSettingsModal } from './ServerSettingsModal';
import { db } from '../lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

interface SidebarProps {
    onSettingsClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onSettingsClick }) => {
    const { currentUser, activeRoom, setActiveRoom, addChannel, activeServerId, openDM, messages, lastRead } = useAppStore();
    const globalVoiceStates = useAppStore(state => state.globalVoiceStates);
    const activeServer = useActiveServer();
    const channels = useActiveChannels();
    const [textOpen, setTextOpen] = useState(true);
    const [voiceOpen, setVoiceOpen] = useState(true);
    const [addingText, setAddingText] = useState(false);
    const [addingVoice, setAddingVoice] = useState(false);
    const [newName, setNewName] = useState('');
    const [showPremium, setShowPremium] = useState(false);
    const [serverMenuOpen, setServerMenuOpen] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [showServerSettings, setShowServerSettings] = useState(false);
    const [dmFriends, setDmFriends] = useState<any[]>([]);

    const textChannels = channels.filter(c => c.type === 'text');
    const voiceChannels = channels.filter(c => c.type === 'voice');

    // Fetch friends to show in DM list
    React.useEffect(() => {
        if (!currentUser || activeServer) return;

        const userRef = doc(db, 'users', currentUser.id);
        const unsubscribe = onSnapshot(userRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const friendIds: string[] = data.friends || [];

                const friendProfiles = [];
                for (const fid of friendIds) {
                    const fDoc = await getDoc(doc(db, 'users', fid));
                    if (fDoc.exists()) friendProfiles.push({ id: fDoc.id, ...fDoc.data() });
                }
                setDmFriends(friendProfiles);
            }
        });
        return () => unsubscribe();
    }, [currentUser, activeServer]);

    const handleAddChannel = (type: 'text' | 'voice') => {
        if (!newName.trim() || !activeServerId) return;
        addChannel(activeServerId, {
            id: `${type}-${Date.now()}`,
            name: newName.trim().toLowerCase().replace(/\s+/g, '-'),
            type,
        });
        setNewName('');
        newName === 'text' ? setAddingText(false) : setAddingVoice(false);
    };

    const unreadCount = (channelId: string) => {
        if (activeRoom === channelId) return 0;
        const channelMessages = messages.filter(m => m.channelId === channelId);
        if (channelMessages.length === 0) return 0;
        const readTime = lastRead[channelId] || 0;
        return channelMessages.filter(m => m.timestamp > readTime).length;
    };

    const handleOpenSelfProfile = () => {
        if (currentUser) {
            useAppStore.getState().setViewProfileId(currentUser.id);
        }
    };

    return (
        <div className="w-72 bg-[#070707] border-r border-white/[0.06] flex flex-col shrink-0">
            {/* Server Name */}
            <div className="relative">
                <button
                    onClick={() => setServerMenuOpen(!serverMenuOpen)}
                    className="w-full px-4 py-3.5 border-b border-white/[0.07] flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                >
                    <p className="font-bold text-sm text-white truncate">{activeServer?.name ?? 'Личные сообщения'}</p>
                    {activeServer && (
                        <ChevronDown size={14} className={`text-zinc-500 flex-shrink-0 transition-transform ${serverMenuOpen ? 'rotate-180' : ''}`} />
                    )}
                </button>

                <AnimatePresence>
                    {serverMenuOpen && activeServer && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setServerMenuOpen(false)} />
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute top-[100%] left-2 right-2 mt-1 bg-[#111] border border-white/10 rounded-xl shadow-xl z-20 py-1"
                            >
                                <button
                                    onClick={() => {
                                        setShowInvite(true);
                                        setServerMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors"
                                >
                                    <Link size={14} />
                                    Пригласить друзей
                                </button>
                                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 transition-colors" onClick={() => { setShowServerSettings(true); setServerMenuOpen(false); }}>
                                    <Settings size={14} />
                                    Настройки сервера
                                </button>
                                <div className="h-px bg-white/10 my-1 mx-2" />
                                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors" onClick={() => { alert('Покинуть сервер нельзя – владелец не может выйти, а роли пока не реализованы (MVP)'); setServerMenuOpen(false); }}>
                                    <DoorOpen size={14} />
                                    Покинуть сервер
                                </button>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Channels */}
            <div className="flex-1 overflow-y-auto py-2 space-y-1">
                {activeServer ? (
                    <>
                        {/* Text Channels */}
                        <div>
                            <div
                                onClick={() => setTextOpen(!textOpen)}
                                className="w-full flex items-center gap-1 px-4 py-1 group cursor-pointer"
                            >
                                {textOpen ? <ChevronDown size={11} className="text-zinc-500" /> : <ChevronRight size={11} className="text-zinc-500" />}
                                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-300 transition-colors flex-1 text-left">
                                    Текстовые каналы
                                </span>
                                <button
                                    onClick={e => { e.stopPropagation(); setAddingText(true); setNewName(''); }}
                                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white transition-all flex-shrink-0"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>

                            {textOpen && (
                                <>
                                    {textChannels.map(ch => {
                                        const count = unreadCount(ch.id);
                                        return (
                                            <button
                                                key={ch.id}
                                                onClick={() => setActiveRoom(ch.id)}
                                                className={`w-full flex items-center justify-between px-5 py-1.5 rounded-md mx-2 text-sm transition-colors ${activeRoom === ch.id
                                                    ? 'bg-white/10 text-white font-medium'
                                                    : count > 0
                                                        ? 'text-zinc-200 font-medium hover:bg-white/[0.05]'
                                                        : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05]'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <Hash size={14} className="flex-shrink-0" />
                                                    <span className="truncate">{ch.name}</span>
                                                </div>
                                                {count > 0 && (
                                                    <div className="min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 ml-2">
                                                        {count > 99 ? '99+' : count}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}

                                    {addingText && (
                                        <div className="mx-2 mt-1">
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="название-канала"
                                                value={newName}
                                                onChange={e => setNewName(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleAddChannel('text');
                                                    if (e.key === 'Escape') setAddingText(false);
                                                }}
                                                onBlur={() => { if (!newName) setAddingText(false); }}
                                                className="w-full bg-black/40 border border-white/10 rounded-md px-2 py-1 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/40"
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Voice Channels */}
                        <div>
                            <div
                                onClick={() => setVoiceOpen(!voiceOpen)}
                                className="w-full flex items-center gap-1 px-4 py-1 mt-2 group cursor-pointer"
                            >
                                {voiceOpen ? <ChevronDown size={11} className="text-zinc-500" /> : <ChevronRight size={11} className="text-zinc-500" />}
                                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-300 transition-colors flex-1 text-left">
                                    Голосовые каналы
                                </span>
                                <button
                                    onClick={e => { e.stopPropagation(); setAddingVoice(true); setNewName(''); }}
                                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white transition-all flex-shrink-0"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>

                            {voiceOpen && (
                                <>
                                    {voiceChannels.map(ch => {
                                        const isActive = activeRoom === ch.id;
                                        return (
                                            <div key={ch.id}>
                                                <button
                                                    onClick={() => setActiveRoom(ch.id)}
                                                    className={`w-full flex items-center gap-2 px-5 py-1.5 rounded-md mx-2 text-sm transition-colors ${isActive
                                                        ? 'bg-white/10 text-white font-medium'
                                                        : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05]'
                                                        }`}
                                                >
                                                    <Volume2 size={14} className="flex-shrink-0" />
                                                    <span className="flex-1 text-left truncate">{ch.name}</span>
                                                </button>

                                                {/* Show voice members under channel */}
                                                {(() => {
                                                    const channelUsers = Object.entries(globalVoiceStates)
                                                        .filter(([_, s]) => s.roomId === ch.id)
                                                        .map(([uid, s]) => ({ id: uid, ...s }));

                                                    if (channelUsers.length === 0) return null;

                                                    return (
                                                        <div className="ml-8 mr-2 mb-1 space-y-0.5">
                                                            {channelUsers.map(u => (
                                                                <div key={u.id} className="flex items-center gap-2 py-0.5 px-1 rounded text-xs text-zinc-400">
                                                                    <img src={u.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                                                                    <span className={`truncate ${u.id === currentUser?.id ? 'text-zinc-200' : ''}`}>{u.name}</span>
                                                                    {u.id === currentUser?.id ? null : <span className="ml-auto text-green-500 text-[8px]">●</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        );
                                    })}

                                    {addingVoice && (
                                        <div className="mx-2 mt-1">
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Голосовой..."
                                                value={newName}
                                                onChange={e => setNewName(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleAddChannel('voice');
                                                    if (e.key === 'Escape') setAddingVoice(false);
                                                }}
                                                onBlur={() => { if (!newName) setAddingVoice(false); }}
                                                className="w-full bg-black/40 border border-white/10 rounded-md px-2 py-1 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/40"
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        {/* DM / Friends View */}
                        <div className="px-2 pt-2">
                            <button
                                onClick={() => setActiveRoom(null)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${!activeRoom
                                    ? 'bg-white/10 text-white font-medium'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]'
                                    }`}
                            >
                                <Users size={18} className={!activeRoom ? 'text-white' : ''} />
                                <span>Друзья</span>
                            </button>
                        </div>
                        <div className="px-5 pt-4 pb-2">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-zinc-300 transition-colors cursor-default">
                                Личные сообщения
                            </p>
                        </div>
                        {/* DM List */}
                        <div className="px-2 space-y-0.5 mt-1">
                            {dmFriends.map(f => {
                                const dmId = `dm_${[currentUser?.id, f.id].sort().join('_')}`;
                                const isActive = activeRoom === dmId;
                                const count = unreadCount(dmId);
                                return (
                                    <button
                                        key={f.id}
                                        onClick={() => openDM(dmId)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors group ${isActive
                                            ? 'bg-white/10 text-white'
                                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 truncate">
                                            <div className="relative flex-shrink-0">
                                                {f.avatar ? (
                                                    <img src={f.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex flex-col justify-center items-center">
                                                        <span className="text-[10px] font-bold text-indigo-300">
                                                            {f.nickname?.slice(0, 2).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 text-left truncate">
                                                <span className={`text-sm ${count > 0 && !isActive ? 'font-bold text-white' : 'font-medium'}`}>{f.nickname}</span>
                                            </div>
                                        </div>
                                        {count > 0 && !isActive && (
                                            <div className="min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 ml-2">
                                                {count > 99 ? '99+' : count}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        {dmFriends.length === 0 && !activeRoom && (
                            <div className="px-5 py-2">
                                <p className="text-xs text-zinc-600">Выберите друга, чтобы начать чат.</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* User panel at bottom */}
            {currentUser && (
                <div className="border-t border-white/[0.06] flex flex-col bg-black/30 w-full shrink-0">
                    {!currentUser.isPremium && (
                        <button
                            onClick={() => setShowPremium(true)}
                            className="mx-3 mt-3 py-1.5 px-2 text-[11px] font-bold rounded bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-1.5"
                        >
                            <Crown size={12} /> Get Premium - $1/mo
                        </button>
                    )}
                    <div className="px-3 py-2.5 flex items-center justify-between group">
                        <button
                            onClick={handleOpenSelfProfile}
                            className="flex items-center gap-2 flex-1 min-w-0 text-left hover:bg-white/5 p-1 rounded-lg transition-colors"
                        >
                            <div className="relative flex-shrink-0">
                                <img src={currentUser.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#070707]" />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex items-center gap-1.5">
                                    <p className={`text-xs font-semibold truncate ${currentUser.isPremium ? 'text-amber-400' : 'text-white'}`}>
                                        {currentUser.name}
                                    </p>
                                </div>
                                <p className="text-[10px] text-zinc-600 truncate leading-tight">в сети</p>
                            </div>
                        </button>
                        <button onClick={onSettingsClick} className="text-zinc-500 hover:text-white transition-colors p-1.5 rounded-md hover:bg-white/10 flex-shrink-0">
                            <Settings size={16} />
                        </button>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {showPremium && <PremiumModal onClose={() => setShowPremium(false)} />}
            </AnimatePresence>
            <AnimatePresence>
                {showInvite && activeServer && <InviteModal serverId={activeServer.id} onClose={() => setShowInvite(false)} />}
            </AnimatePresence>
            <AnimatePresence>
                {showServerSettings && activeServer && <ServerSettingsModal server={activeServer} onClose={() => setShowServerSettings(false)} />}
            </AnimatePresence>
        </div>
    );
};

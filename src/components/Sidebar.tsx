import React, { useState } from 'react';
import { Plus, Settings, Hash, Volume2, ChevronDown, ChevronRight } from 'lucide-react';
import { useAppStore, useActiveServer, useActiveChannels } from '../store/useAppStore';

interface SidebarProps {
    onSettingsClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onSettingsClick }) => {
    const { currentUser, activeRoom, setActiveRoom, addChannel, activeServerId, usersInRoom } = useAppStore();
    const activeServer = useActiveServer();
    const channels = useActiveChannels();
    const [textOpen, setTextOpen] = useState(true);
    const [voiceOpen, setVoiceOpen] = useState(true);
    const [addingText, setAddingText] = useState(false);
    const [addingVoice, setAddingVoice] = useState(false);
    const [newName, setNewName] = useState('');

    const textChannels = channels.filter(c => c.type === 'text');
    const voiceChannels = channels.filter(c => c.type === 'voice');

    const handleAddChannel = (type: 'text' | 'voice') => {
        if (!newName.trim() || !activeServerId) return;
        addChannel(activeServerId, {
            id: `${type}-${Date.now()}`,
            name: newName.trim().toLowerCase().replace(/\s+/g, '-'),
            type,
        });
        setNewName('');
        type === 'text' ? setAddingText(false) : setAddingVoice(false);
    };

    return (
        <div className="w-60 bg-[#070707] border-r border-white/[0.06] flex flex-col shrink-0">
            {/* Server Name */}
            <div className="px-4 py-3.5 border-b border-white/[0.07] flex items-center justify-between bg-black/20">
                <p className="font-bold text-sm text-white truncate">{activeServer?.name ?? 'Личные сообщения'}</p>
                <ChevronDown size={14} className="text-zinc-500 flex-shrink-0" />
            </div>

            {/* Channels */}
            <div className="flex-1 overflow-y-auto py-2 space-y-1">

                {/* Text Channels */}
                <div>
                    <button
                        onClick={() => setTextOpen(!textOpen)}
                        className="w-full flex items-center gap-1 px-2 py-1 group"
                    >
                        {textOpen ? <ChevronDown size={11} className="text-zinc-500" /> : <ChevronRight size={11} className="text-zinc-500" />}
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-300 transition-colors flex-1 text-left">
                            Текстовые каналы
                        </span>
                        <button
                            onClick={e => { e.stopPropagation(); setAddingText(true); setNewName(''); }}
                            className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white transition-all"
                        >
                            <Plus size={14} />
                        </button>
                    </button>

                    {textOpen && (
                        <>
                            {textChannels.map(ch => (
                                <button
                                    key={ch.id}
                                    onClick={() => setActiveRoom(ch.id)}
                                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md mx-1 text-sm transition-colors ${activeRoom === ch.id
                                        ? 'bg-white/10 text-white font-medium'
                                        : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05]'
                                        }`}
                                >
                                    <Hash size={14} className="flex-shrink-0" />
                                    {ch.name}
                                </button>
                            ))}

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
                    <button
                        onClick={() => setVoiceOpen(!voiceOpen)}
                        className="w-full flex items-center gap-1 px-2 py-1 mt-2 group"
                    >
                        {voiceOpen ? <ChevronDown size={11} className="text-zinc-500" /> : <ChevronRight size={11} className="text-zinc-500" />}
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-300 transition-colors flex-1 text-left">
                            Голосовые каналы
                        </span>
                        <button
                            onClick={e => { e.stopPropagation(); setAddingVoice(true); setNewName(''); }}
                            className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white transition-all"
                        >
                            <Plus size={14} />
                        </button>
                    </button>

                    {voiceOpen && (
                        <>
                            {voiceChannels.map(ch => {
                                const isActive = activeRoom === ch.id;
                                return (
                                    <div key={ch.id}>
                                        <button
                                            onClick={() => setActiveRoom(ch.id)}
                                            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md mx-1 text-sm transition-colors ${isActive
                                                ? 'bg-white/10 text-white font-medium'
                                                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05]'
                                                }`}
                                        >
                                            <Volume2 size={14} className="flex-shrink-0" />
                                            <span className="flex-1 text-left truncate">{ch.name}</span>
                                        </button>

                                        {/* Show voice members under active channel */}
                                        {isActive && currentUser && (
                                            <div className="ml-8 mr-2 mb-1 space-y-0.5">
                                                {/* Self */}
                                                <div className="flex items-center gap-2 py-0.5 px-1 rounded text-xs text-zinc-400">
                                                    <img src={currentUser.avatar} alt="" className="w-5 h-5 rounded-full" />
                                                    <span className="truncate">{currentUser.name}</span>
                                                </div>
                                                {/* Others */}
                                                {usersInRoom.map(u => (
                                                    <div key={u.id} className="flex items-center gap-2 py-0.5 px-1 rounded text-xs text-zinc-400">
                                                        <img src={u.avatar} alt="" className="w-5 h-5 rounded-full" />
                                                        <span className="truncate">{u.name}</span>
                                                        <span className="ml-auto text-green-500">●</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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
            </div>

            {/* User panel at bottom */}
            {currentUser && (
                <div className="border-t border-white/[0.06] px-3 py-2.5 flex items-center gap-2 bg-black/30">
                    <div className="relative">
                        <img src={currentUser.avatar} alt="" className="w-8 h-8 rounded-full" />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#070707]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
                        <p className="text-[10px] text-zinc-600 truncate">в сети</p>
                    </div>
                    <button onClick={onSettingsClick} className="text-zinc-500 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10">
                        <Settings size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

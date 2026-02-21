import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Headphones, VolumeX, Wifi, WifiOff, Loader, MessageSquare, PhoneOff } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useWebRTC } from '../hooks/useWebRTC';
import { springConfig } from '../utils/animations';
import { ChatPanel } from './ChatPanel';
import { UserContextMenu } from './UserContextMenu';

interface VoiceRoomProps {
  roomId: string;
}

function ConnectionBadge({ state }: { state?: string }) {
  if (!state || state === 'new' || state === 'connecting') {
    return <span className="text-[10px] text-yellow-400 flex items-center gap-1"><Loader size={9} className="animate-spin" /> Подключение...</span>;
  }
  if (state === 'connected') {
    return <span className="text-[10px] text-green-400 flex items-center gap-1"><Wifi size={9} /> В канале</span>;
  }
  return <span className="text-[10px] text-red-400 flex items-center gap-1"><WifiOff size={9} /> Нет связи</span>;
}

interface ContextState {
  user: { id: string; name: string; avatar: string } | null;
  isSelf: boolean;
  x: number;
  y: number;
}

export const VoiceRoom: React.FC<VoiceRoomProps> = ({ roomId }) => {
  const { currentUser, usersInRoom, setActiveRoom, servers, activeServerId, clearMessages } = useAppStore();
  const allChannels = servers.find(s => s.id === activeServerId)?.channels ?? [];
  const currentChannel = allChannels.find((c: { id: string; name: string }) => c.id === roomId) || { name: roomId };

  const { isSpeaking, peerConnectionStates, setMuted, sendChat } = useWebRTC(roomId);

  const [isMuted, setIsMutedState] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextState>({ user: null, isSelf: false, x: 0, y: 0 });

  const handleMute = useCallback(() => {
    const next = !isMuted;
    setIsMutedState(next);
    setMuted(next);
  }, [isMuted, setMuted]);

  const handleLeave = useCallback(() => {
    clearMessages();
    setActiveRoom(null);
  }, [clearMessages, setActiveRoom]);

  const openContext = (e: React.MouseEvent, user: { id: string; name: string; avatar: string }, isSelf: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ user, isSelf, x: e.clientX, y: e.clientY });
  };

  const totalUsers = usersInRoom.length + 1;

  const ControlBtn = ({ onClick, active, danger, children, title }: {
    onClick: () => void; active?: boolean; danger?: boolean; children: React.ReactNode; title: string;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-150 border text-lg ${danger
        ? 'bg-red-500 hover:bg-red-400 border-transparent text-white shadow-lg shadow-red-500/30'
        : active
          ? 'bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25'
          : 'bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:bg-white/[0.1] hover:text-white'
        }`}
    >
      {children}
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col h-full bg-[#090909]"
      onClick={() => contextMenu.user && setContextMenu(c => ({ ...c, user: null }))}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.07] bg-black/30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <div>
            <h2 className="text-sm font-bold text-white">{currentChannel.name}</h2>
            <p className="text-xs text-zinc-500">
              {totalUsers} {totalUsers === 1 ? 'участник' : totalUsers < 5 ? 'участника' : 'участников'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowChat(!showChat)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${showChat ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' : 'bg-white/[0.04] border-white/[0.07] text-zinc-400 hover:text-zinc-200'
            }`}
        >
          <MessageSquare size={13} />
          Чат
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">

        {/* Voice user tiles */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="flex flex-wrap gap-4 justify-center items-center max-w-3xl">

            {/* Self */}
            {currentUser && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-2.5 cursor-pointer"
                onContextMenu={e => openContext(e, currentUser, true)}
                onClick={e => openContext(e, currentUser, true)}
              >
                <div className="relative">
                  <motion.div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    animate={isSpeaking && !isMuted ? {
                      boxShadow: ['0 0 0 0px rgba(99,102,241,0.8)', '0 0 0 8px rgba(99,102,241,0)'],
                    } : { boxShadow: '0 0 0 0px rgba(99,102,241,0)' }}
                    transition={{ duration: 0.5, repeat: isSpeaking && !isMuted ? Infinity : 0 }}
                  />
                  <div className={`w-32 h-32 rounded-2xl overflow-hidden border-2 transition-all duration-200 ${isMuted || isDeafened
                    ? 'border-red-500/40 brightness-50'
                    : isSpeaking
                      ? 'border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                      : 'border-white/15'
                    }`}>
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                    {(isMuted || isDeafened) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        {isDeafened ? <VolumeX size={28} className="text-red-400" /> : <MicOff size={28} className="text-red-400" />}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">{currentUser.name}</p>
                  <p className="text-[11px] text-zinc-600">Вы</p>
                </div>
              </motion.div>
            )}

            {/* Others */}
            <AnimatePresence>
              {usersInRoom.map(user => {
                const s = peerConnectionStates[user.id];
                const connected = s === 'connected';
                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={springConfig}
                    className="flex flex-col items-center gap-2.5 cursor-pointer"
                    onContextMenu={e => openContext(e, user, false)}
                    onClick={e => openContext(e, user, false)}
                  >
                    <div className="relative">
                      <div className={`w-32 h-32 rounded-2xl overflow-hidden border-2 transition-all duration-300 ${connected ? 'border-green-500 shadow-[0_0_14px_rgba(34,197,94,0.3)]' : 'border-yellow-500/40'
                        }`}>
                        <img src={user.avatar} alt={user.name || '?'} className="w-full h-full object-cover" />
                        {!connected && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Loader size={22} className="text-yellow-400 animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-white">{user.name}</p>
                      <ConnectionBadge state={s} />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {usersInRoom.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-zinc-700 text-sm">
                <p>Ожидание других участников...</p>
                <p className="text-xs mt-1 text-zinc-800">Поделись ссылкой или попроси друга зайти в канал</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Chat */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={springConfig}
              className="shrink-0 h-full"
              style={{ width: 300 }}
            >
              <ChatPanel sendChat={sendChat} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls — Discord-style bottom bar */}
      <div className="px-6 py-5 border-t border-white/[0.05] bg-black/30 shrink-0">
        <div className="flex items-center justify-center gap-3">
          <ControlBtn onClick={handleMute} active={isMuted} title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}>
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </ControlBtn>
          <ControlBtn onClick={() => setIsDeafened(!isDeafened)} active={isDeafened} title={isDeafened ? 'Включить звук' : 'Выключить звук'}>
            {isDeafened ? <VolumeX size={22} /> : <Headphones size={22} />}
          </ControlBtn>
          <ControlBtn onClick={handleLeave} danger title="Завершить звонок">
            <PhoneOff size={22} />
          </ControlBtn>
        </div>

        {/* Voice status bar */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs text-green-400 font-medium">Голосовая связь подключена</span>
          <span className="text-zinc-700">·</span>
          <span className="text-xs text-zinc-600">{currentChannel.name}</span>
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu.user && (
          <UserContextMenu
            user={contextMenu.user}
            isSelf={contextMenu.isSelf}
            position={{ x: contextMenu.x, y: contextMenu.y }}
            onClose={() => setContextMenu(c => ({ ...c, user: null }))}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

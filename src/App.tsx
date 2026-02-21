import { ServerBar } from './components/ServerBar';
import { Sidebar } from './components/Sidebar';
import { VoiceRoom } from './components/VoiceRoom';
import { Login } from './components/Login';
import { Settings } from './components/Settings';
import { FriendsPanel } from './components/FriendsPanel';
import { useAppStore } from './store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

function App() {
  const currentUser = useAppStore(state => state.currentUser);
  const activeRoom = useAppStore(state => state.activeRoom);
  const activeServerId = useAppStore(state => state.activeServerId);
  const [showSettings, setShowSettings] = useState(false);

  if (!currentUser) {
    return <Login />;
  }

  const showFriends = activeServerId === null && !activeRoom;
  const showEmptyState = !showFriends && !activeRoom;

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-[#ededed] overflow-hidden font-sans">

      {/* Far-left server bar (72px) */}
      <ServerBar />

      {/* Left channel sidebar (240px) */}
      <Sidebar onSettingsClick={() => setShowSettings(true)} />

      {/* Main area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#090909]">
        <AnimatePresence mode="wait">

          {/* Friends panel (when no server selected) */}
          {showFriends && (
            <motion.div
              key="friends"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <FriendsPanel />
            </motion.div>
          )}

          {/* Active voice room */}
          {activeRoom && (
            <VoiceRoom key={activeRoom} roomId={activeRoom} />
          )}

          {/* Empty state — server selected but no channel */}
          {showEmptyState && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center"
            >
              <div className="absolute inset-0 bg-indigo-500/3 rounded-full blur-[150px] pointer-events-none" />
              <h1 className="text-2xl font-extrabold tracking-tight text-white/60 z-10">
                Выбери канал
              </h1>
              <p className="text-zinc-600 mt-2 text-sm z-10">Нажми на любой канал в боковом меню</p>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Settings modal */}
      <AnimatePresence>
        {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      </AnimatePresence>
    </div>
  );
}

export default App;

import { ServerBar } from './components/ServerBar';
import { Sidebar } from './components/Sidebar';
import { VoiceRoom } from './components/VoiceRoom';
import { TextRoom } from './components/TextRoom';
import { DirectMessageRoom } from './components/DirectMessageRoom';
import { Login } from './components/Login';
import { Settings } from './components/Settings';
import { FriendsPanel } from './components/FriendsPanel';
import { UserProfile } from './components/UserProfile';
import { useAppStore } from './store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useGlobalWebSocket } from './hooks/useGlobalWebSocket';
import { useGlobalDMs } from './hooks/useGlobalDMs';

function App() {
  const currentUser = useAppStore(state => state.currentUser);
  const setCurrentUser = useAppStore(state => state.setCurrentUser);
  const activeRoom = useAppStore(state => state.activeRoom);
  const servers = useAppStore(state => state.servers);
  const activeServerId = useAppStore(state => state.activeServerId);
  const viewProfileId = useAppStore(state => state.viewProfileId);
  const setViewProfileId = useAppStore(state => state.setViewProfileId);
  const [showSettings, setShowSettings] = useState(false);

  useGlobalWebSocket();
  useGlobalDMs();

  const activeServer = servers.find(s => s.id === activeServerId);
  const currentChannel = activeServer?.channels.find(c => c.id === activeRoom);

  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch latest user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setCurrentUser({
            id: firebaseUser.uid,
            name: data.nickname || 'Unknown',
            avatar: data.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${data.nickname || 'Unknown'}`,
            balance: data.balance || 0,
            isPremium: data.isPremium || false,
            premiumExpiresAt: data.premiumExpiresAt,
          });
        }
      } else {
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, [setCurrentUser]);

  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <div className="w-8 h-8 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  const isDM = activeServerId === null && activeRoom?.startsWith('dm_');
  const showFriends = activeServerId === null && !activeRoom;
  const showEmptyState = !showFriends && !isDM && !activeRoom;

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

          {/* Active room */}
          {activeRoom && currentChannel?.type === 'text' && !isDM && (
            <TextRoom key={activeRoom} roomId={activeRoom} />
          )}
          {activeRoom && currentChannel?.type === 'voice' && !isDM && (
            <VoiceRoom key={activeRoom} roomId={activeRoom} />
          )}

          {/* Direct Message Room */}
          {isDM && activeRoom && (
            <DirectMessageRoom key={activeRoom} roomId={activeRoom} />
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

        {/* Global User Profile Overlay (Outside wait mode to allow overlapping) */}
        <AnimatePresence>
          {viewProfileId && (
            <motion.div
              key="profileOverlay"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="absolute inset-0 z-40 flex bg-[#090909]"
            >
              <UserProfile userId={viewProfileId} onClose={() => setViewProfileId(null)} />
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

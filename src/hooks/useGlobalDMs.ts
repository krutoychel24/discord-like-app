import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';

export const useGlobalDMs = () => {
    const { currentUser, addMessage } = useAppStore();

    useEffect(() => {
        if (!currentUser) return;

        // Note: Firebase doesn't allow querying across multiple unknown subcollections easily.
        // But we know the user's DMs are determined by their friends list!
        // We listen to the user's document to get the friends list, then set up snapshot listeners for each DM room.

        let dmUnsubscribes: (() => void)[] = [];

        const userRef = doc(db, 'users', currentUser.id);
        const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const friendIds: string[] = data.friends || [];

                // Clear old subs
                dmUnsubscribes.forEach(unsub => unsub());
                dmUnsubscribes = [];

                friendIds.forEach(friendId => {
                    const roomId = `dm_${[currentUser.id, friendId].sort().join('_')}`;
                    const q = query(
                        collection(db, 'directMessages', roomId, 'messages'),
                        orderBy('timestamp', 'asc')
                    );

                    const unsubRoom = onSnapshot(q, (snapshot) => {
                        snapshot.docChanges().forEach((change) => {
                            const data = change.doc.data();
                            if (change.type === 'added') {
                                const state = useAppStore.getState();
                                const existingMessage = state.messages.find(m => m.id === change.doc.id);
                                if (!existingMessage) {
                                    state.addMessage({
                                        id: change.doc.id,
                                        userId: data.userId,
                                        name: data.name,
                                        avatar: data.avatar,
                                        text: data.text,
                                        timestamp: data.timestamp?.toMillis() || Date.now(),
                                        isSelf: data.userId === currentUser.id,
                                        channelId: roomId,
                                    });
                                }
                            } else if (change.type === 'modified') {
                                useAppStore.getState().editMessage(change.doc.id, data.text);
                            } else if (change.type === 'removed') {
                                useAppStore.getState().deleteMessage(change.doc.id);
                            }
                        });
                    });
                    dmUnsubscribes.push(unsubRoom);

                    // Listen to read receipts for this DM
                    const readsQ = query(collection(db, 'directMessages', roomId, 'reads'));
                    const unsubReads = onSnapshot(readsQ, (snapshot) => {
                        snapshot.docChanges().forEach((change) => {
                            if (change.type === 'added' || change.type === 'modified') {
                                const data = change.doc.data();
                                useAppStore.getState().updateRoomRead(roomId, change.doc.id, data.timestamp);
                            }
                        });
                    });
                    dmUnsubscribes.push(unsubReads);
                });
            }
        });

        return () => {
            unsubscribeUser();
            dmUnsubscribes.forEach(unsub => unsub());
        };
    }, [currentUser, addMessage]);
};

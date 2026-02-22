import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, deleteDoc, doc } from 'firebase/firestore';

export const useDMChat = (roomId: string | null) => {
    const { currentUser } = useAppStore();

    const sendChat = useCallback(async (text: string) => {
        if (!roomId || !currentUser) return;

        try {
            await addDoc(collection(db, 'directMessages', roomId, 'messages'), {
                userId: currentUser.id,
                name: currentUser.name,
                avatar: currentUser.avatar,
                text,
                timestamp: serverTimestamp(),
            });
        } catch (error) {
            console.error("Error sending DM:", error);
        }
    }, [roomId, currentUser]);

    const editMessage = useCallback(async (messageId: string, newText: string) => {
        if (!roomId || !currentUser) return;
        try {
            await updateDoc(doc(db, 'directMessages', roomId, 'messages', messageId), { text: newText });
        } catch (error) {
            console.error("Error editing DM:", error);
        }
    }, [roomId, currentUser]);

    const deleteMessage = useCallback(async (messageId: string) => {
        if (!roomId || !currentUser) return;
        try {
            await deleteDoc(doc(db, 'directMessages', roomId, 'messages', messageId));
        } catch (error) {
            console.error("Error deleting DM:", error);
        }
    }, [roomId, currentUser]);

    return { sendChat, editMessage, deleteMessage };
};

import {useState, useEffect} from 'react';
import {useAuth} from '../context/AuthContext';
import firestore from '@react-native-firebase/firestore';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

/**
 * Hook to track unread chat count across all chat rooms
 * Updates in real-time as messages arrive
 */
export const useUnreadChatCount = (): number => {
  const {user} = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    try {
      const db = firestore();
      if (!db) {
        console.warn('[useUnreadChatCount] Firestore not available');
        return;
      }

      const userIdStr = user.id.toString();

      // Listen to all chat rooms where user is a participant
      const unsubscribe = db
        .collection('chats')
        .where('participants', 'array-contains', userIdStr)
        .onSnapshot(
          (snapshot) => {
            try {
              let totalUnread = 0;

              snapshot.docs.forEach((doc) => {
                const data = doc.data();
                const readStatus = data.readStatus || {};
                const myReadStatus = readStatus[userIdStr];

                // Count as unread if status is 'new' or undefined
                if (myReadStatus === 'new' || myReadStatus === undefined) {
                  totalUnread += 1;
                }
              });

              setUnreadCount(totalUnread);
            } catch (error) {
              console.error('[useUnreadChatCount] Error processing snapshot:', error);
            }
          },
          (error) => {
            console.error('[useUnreadChatCount] Listener error:', error);
            setUnreadCount(0);
          }
        );

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } catch (error) {
      console.error('[useUnreadChatCount] Error setting up listener:', error);
      setUnreadCount(0);
      return;
    }
  }, [user?.id]);

  return unreadCount;
};

/**
 * Firebase Cloud Messaging (FCM) Notification Service
 * Handles push notifications for new chat messages
 */

import messaging from '@react-native-firebase/messaging';
import {Alert, Platform} from 'react-native';

class NotificationService {
  private fcmToken: string | null = null;
  private chatListRefreshCallback: (() => void) | null = null;

  /**
   * Request notification permissions and get FCM token
   */
  async requestPermission(): Promise<string | null> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('[Notifications] Authorization status:', authStatus);
        
        // Get FCM token
        const token = await messaging().getToken();
        this.fcmToken = token;
        console.log('[Notifications] FCM Token:', token);
        
        // TODO: Send token to backend to associate with user
        // await api.post('/users/fcm-token', { fcmToken: token });
        
        return token;
      } else {
        console.log('[Notifications] Permission not granted');
        return null;
      }
    } catch (error) {
      console.error('[Notifications] Error requesting permission:', error);
      return null;
    }
  }

  /**
   * Get current FCM token
   */
  async getToken(): Promise<string | null> {
    try {
      if (!this.fcmToken) {
        this.fcmToken = await messaging().getToken();
      }
      return this.fcmToken;
    } catch (error) {
      console.error('[Notifications] Error getting token:', error);
      return null;
    }
  }

  /**
   * Register a callback to refresh chat list when notifications arrive
   */
  setChatListRefreshCallback(callback: (() => void) | null) {
    this.chatListRefreshCallback = callback;
    console.log('[Notifications] Chat list refresh callback registered');
  }

  /**
   * Trigger chat list refresh if callback is registered
   */
  private triggerChatListRefresh() {
    if (this.chatListRefreshCallback) {
      console.log('[Notifications] Triggering chat list refresh');
      this.chatListRefreshCallback();
    }
  }

  /**
   * Initialize notification listeners
   */
  initialize() {
    // Foreground message handler - app is open
    messaging().onMessage(async remoteMessage => {
      console.log('[Notifications] Message received in foreground:', remoteMessage);
      
      // Trigger chat list refresh when new message notification arrives
      if (remoteMessage.data?.type === 'chat' || remoteMessage.notification) {
        this.triggerChatListRefresh();
      }
      
      if (remoteMessage.notification) {
        // Show local notification when app is in foreground
        Alert.alert(
          remoteMessage.notification.title || 'New Message',
          remoteMessage.notification.body || 'You have a new message',
          [{text: 'OK'}],
        );
      }
    });

    // Note: Background message handler is registered in index.js
    // This is required for React Native Firebase - must be at top level

    // Notification opened from quit state
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('[Notifications] Notification opened from quit state:', remoteMessage);
          // Handle navigation to chat if needed
        }
      });

    // Notification opened from background state
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('[Notifications] Notification opened from background:', remoteMessage);
      // Trigger refresh when notification is opened
      if (remoteMessage.data?.type === 'chat' || remoteMessage.notification) {
        this.triggerChatListRefresh();
      }
      // Handle navigation to chat if needed
    });

    // Token refresh handler
    messaging().onTokenRefresh(token => {
      console.log('[Notifications] FCM Token refreshed:', token);
      this.fcmToken = token;
      // TODO: Update token in backend
      // await api.post('/users/fcm-token', { fcmToken: token });
    });
  }

  /**
   * Create notification channel for Android (required for Android 8.0+)
   */
  async createNotificationChannel() {
    if (Platform.OS === 'android') {
      // Android notification channels are created automatically by React Native Firebase
      // But you can customize them if needed
      console.log('[Notifications] Android notification channel will be created automatically');
    }
  }
}

export const notificationService = new NotificationService();

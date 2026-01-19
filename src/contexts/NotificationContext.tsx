import React, {createContext, useContext, useState, useCallback} from 'react';
import {View, StyleSheet} from 'react-native';
import CustomNotification from '../components/common/CustomNotification';

interface Notification {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
}

interface NotificationContextType {
  showNotification: (
    title: string,
    message: string,
    type?: 'info' | 'success' | 'error' | 'warning',
    duration?: number,
  ) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback(
    (
      title: string,
      message: string,
      type: 'info' | 'success' | 'error' | 'warning' = 'info',
      duration: number = 4000,
    ) => {
      const id = `${Date.now()}-${Math.random()}`;
      const notification: Notification = {
        id,
        title,
        message,
        type,
        duration,
      };

      setNotifications(prev => [...prev, notification]);
    },
    [],
  );

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{showNotification}}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {notifications.map((notification, index) => {
          // Calculate position with safe area offset and stacking
          const topOffset = 50 + index * 90;
          return (
            <View
              key={notification.id}
              style={[
                styles.notificationWrapper,
                {top: topOffset},
              ]}>
              <CustomNotification
                id={notification.id}
                title={notification.title}
                message={notification.message}
                type={notification.type}
                duration={notification.duration}
                onDismiss={dismissNotification}
              />
            </View>
          );
        })}
      </View>
    </NotificationContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  notificationWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
  },
});

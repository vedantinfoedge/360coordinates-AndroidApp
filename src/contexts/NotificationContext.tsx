import React, {createContext, useContext, useState, useCallback} from 'react';
import {View, StyleSheet, ImageSourcePropType} from 'react-native';
import CustomNotification from '../components/common/CustomNotification';

interface Notification {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
  image?: ImageSourcePropType | string;
  onPress?: () => void;
}

interface NotificationContextType {
  showNotification: (
    title: string,
    message: string,
    type?: 'info' | 'success' | 'error' | 'warning',
    duration?: number,
    image?: ImageSourcePropType | string,
    onPress?: () => void,
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
      image?: ImageSourcePropType | string,
      onPress?: () => void,
    ) => {
      const id = `${Date.now()}-${Math.random()}`;
      const notification: Notification = {
        id,
        title,
        message,
        type,
        duration,
        image,
        onPress,
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
          const topOffset = 50 + index * 95;
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
                image={notification.image}
                onPress={notification.onPress}
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

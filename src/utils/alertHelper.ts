import {AlertButton} from 'react-native';
import {useNotification} from '../contexts/NotificationContext';

// Store reference to showNotification function
let showNotificationFn: ReturnType<typeof useNotification>['showNotification'] | null = null;
let showAlertModalFn: ((title: string, message: string, buttons?: AlertButton[]) => void) | null = null;

// Set the notification function from context
export const setNotificationFunction = (
  fn: ReturnType<typeof useNotification>['showNotification'],
) => {
  showNotificationFn = fn;
};

// Set the alert modal function
export const setAlertModalFunction = (
  fn: (title: string, message: string, buttons?: AlertButton[]) => void,
) => {
  showAlertModalFn = fn;
};

// Determine notification type from title
const getNotificationType = (title: string): 'info' | 'success' | 'error' | 'warning' => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('success') || lowerTitle.includes('saved') || lowerTitle.includes('updated')) {
    return 'success';
  }
  if (lowerTitle.includes('error') || lowerTitle.includes('failed') || lowerTitle.includes('denied')) {
    return 'error';
  }
  if (lowerTitle.includes('warning') || lowerTitle.includes('wait')) {
    return 'warning';
  }
  return 'info';
};

// Custom Alert implementation that uses custom notifications
export const CustomAlert = {
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: {cancelable?: boolean},
  ) => {
    // If there are buttons (confirmation dialogs), use the modal
    if (buttons && buttons.length > 0) {
      if (showAlertModalFn) {
        showAlertModalFn(title, message || '', buttons);
      } else {
        // Fallback to default Alert if modal not initialized
        const {Alert} = require('react-native');
        Alert.alert(title, message, buttons, options);
      }
    } else {
      // Simple alert - use custom notification
      const notificationType = getNotificationType(title);
      if (showNotificationFn) {
        showNotificationFn(
          title,
          message || '',
          notificationType,
          4000,
        );
      } else {
        // Fallback to default Alert if notification not initialized
        const {Alert} = require('react-native');
        Alert.alert(title, message, buttons, options);
      }
    }
  },
};

export default CustomAlert;

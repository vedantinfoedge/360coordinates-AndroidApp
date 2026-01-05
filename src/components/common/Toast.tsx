import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
}

const Toast: React.FC<ToastProps> = ({message, type = 'info'}) => {
  return (
    <View style={[styles.toast, styles[type]]}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  toast: {
    padding: 16,
    borderRadius: 8,
    margin: 16,
  },
  success: {
    backgroundColor: '#43A047',
  },
  error: {
    backgroundColor: '#E53935',
  },
  info: {
    backgroundColor: '#022b5f',
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});

export default Toast;


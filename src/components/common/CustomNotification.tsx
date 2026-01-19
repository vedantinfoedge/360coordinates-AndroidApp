import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, typography, spacing, borderRadius} from '../../theme';

const {width} = Dimensions.get('window');

interface NotificationProps {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
  onDismiss: (id: string) => void;
}

const CustomNotification: React.FC<NotificationProps> = ({
  id,
  title,
  message,
  type = 'info',
  duration = 4000,
  onDismiss,
}) => {
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -200,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(id);
    });
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  const getGradientColors = () => {
    switch (type) {
      case 'success':
        return ['#4CAF50', '#45a049'];
      case 'error':
        return ['#F44336', '#e53935'];
      case 'warning':
        return ['#FF9800', '#fb8c00'];
      default:
        return [colors.primary, colors.secondary];
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{translateY: slideAnim}],
          opacity: opacityAnim,
        },
      ]}>
      <View style={styles.shadowContainer}>
        <LinearGradient
          colors={getGradientColors()}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={styles.gradient}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{getIcon()}</Text>
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.message} numberOfLines={2}>
                {message}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleDismiss}
              style={styles.closeButton}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Text style={styles.closeIcon}>×</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    zIndex: 9999,
    elevation: 10,
  },
  shadowContainer: {
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradient: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 70,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 20,
    color: colors.surface,
    fontWeight: 'bold',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...typography.h3,
    color: colors.surface,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  message: {
    ...typography.body,
    color: colors.surface,
    opacity: 0.95,
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  closeIcon: {
    fontSize: 28,
    color: colors.surface,
    fontWeight: '300',
    lineHeight: 28,
  },
});

export default CustomNotification;

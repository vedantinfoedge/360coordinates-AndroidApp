import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
} from 'react-native';
import {colors, typography, spacing, borderRadius} from '../../theme';

interface NotificationProps {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
  onDismiss: (id: string) => void;
  image?: ImageSourcePropType | string;
  onPress?: () => void;
}

const CustomNotification: React.FC<NotificationProps> = ({
  id,
  title,
  message,
  type = 'info',
  duration = 4000,
  onDismiss,
  image,
  onPress,
}) => {
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    // Enhanced slide in animation with scale
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
    ]).start();

    // Progress bar animation
    if (duration > 0 && !isPaused) {
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: duration,
        useNativeDriver: false,
      }).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, isPaused]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(id);
    });
  };

  const handlePause = () => {
    if (duration > 0) {
      setIsPaused(true);
      progressAnim.stopAnimation();
    }
  };

  const handleResume = () => {
    if (duration > 0 && isPaused) {
      setIsPaused(false);
      progressAnim.stopAnimation((value) => {
        const remaining = duration * (1 - value);
        if (remaining > 0) {
          Animated.timing(progressAnim, {
            toValue: 1,
            duration: remaining,
            useNativeDriver: false,
          }).start();
          setTimeout(() => {
            handleDismiss();
          }, remaining);
        }
      });
    }
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

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      case 'warning':
        return '#FF9800';
      default:
        return colors.primary;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#E8F5E9';
      case 'error':
        return '#FFEBEE';
      case 'warning':
        return '#FFF3E0';
      default:
        return '#E3F2FD';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return '#2E7D32';
      case 'error':
        return '#C62828';
      case 'warning':
        return '#E65100';
      default:
        return colors.text;
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const NotificationContent = (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {translateY: slideAnim},
            {scale: scaleAnim},
          ],
          opacity: opacityAnim,
        },
      ]}>
      <View style={styles.shadowContainer}>
        <View style={[styles.cardContainer, {backgroundColor: getBackgroundColor()}]}>
          {/* Left Border Accent */}
          <View style={[styles.leftBorder, {backgroundColor: getIconColor()}]} />
          
          {/* Content */}
          <View style={styles.content}>
            {/* Icon/Image Container */}
            <View style={styles.leftSection}>
              {image ? (
                <View style={styles.imageContainer}>
                  <Image
                    source={typeof image === 'string' ? {uri: image} : image}
                    style={styles.image}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <View style={[styles.iconContainer, {backgroundColor: getIconColor()}]}>
                  <Text style={styles.icon}>{getIcon()}</Text>
                </View>
              )}
            </View>

            {/* Text Content */}
            <TouchableOpacity
              style={styles.textContainer}
              onPress={onPress}
              activeOpacity={onPress ? 0.7 : 1}>
              <Text style={[styles.title, {color: getTextColor()}]} numberOfLines={1}>
                {title}
              </Text>
              <Text style={[styles.message, {color: getTextColor()}]} numberOfLines={2}>
                {message}
              </Text>
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity
              onPress={handleDismiss}
              style={styles.closeButton}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <View style={styles.closeButtonInner}>
                <Text style={[styles.closeIcon, {color: getTextColor()}]}>×</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          {duration > 0 && (
            <View style={styles.progressBarContainer}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressWidth,
                    backgroundColor: getIconColor(),
                  },
                ]}
              />
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );

  return NotificationContent;
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    zIndex: 9999,
    elevation: 10,
  },
  shadowContainer: {
    borderRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  cardContainer: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  leftBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    zIndex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.md,
    paddingLeft: spacing.md + 8,
    minHeight: 80,
  },
  leftSection: {
    marginRight: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    fontSize: 24,
    color: colors.surface,
    fontWeight: 'bold',
  },
  imageContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.round,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: spacing.xs,
  },
  title: {
    ...typography.h3,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs / 2,
    letterSpacing: 0.2,
  },
  message: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.85,
  },
  closeButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  closeButtonInner: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 20,
    fontWeight: '300',
    lineHeight: 20,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
});

export default CustomNotification;

import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, spacing, typography, borderRadius} from '../theme';

const HEADER_HEIGHT = 64;

interface AgentHeaderProps {
  onProfilePress?: () => void;
  onSupportPress?: () => void;
  onLogoutPress?: () => void;
  subscriptionDays?: number;
  scrollY?: InstanceType<typeof Animated.Value>; // For hide/show on scroll
}

const AgentHeader: React.FC<AgentHeaderProps> = ({
  onProfilePress,
  onSupportPress,
  onLogoutPress,
  subscriptionDays,
  scrollY,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Use Animated.diffClamp for scroll direction-based hiding
  const clampedScrollY = scrollY
    ? Animated.diffClamp(scrollY, 0, HEADER_HEIGHT + insets.top)
    : new Animated.Value(0);

  // Header animation: starts hidden (translateY negative), shows when scrolling down
  const headerTranslateY = clampedScrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT + insets.top],
    outputRange: [-(HEADER_HEIGHT + insets.top), 0], // Hidden -> Visible
    extrapolate: 'clamp',
  });
  
  // Pulse animation for urgent trial badge
  useEffect(() => {
    if (subscriptionDays !== undefined && subscriptionDays <= 7 && subscriptionDays > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [subscriptionDays]);
  
  // Slide animation for menu
  useEffect(() => {
    if (menuVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 200,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();
    }
  }, [menuVisible]);

  return (
    <Animated.View 
      style={[
        styles.safeArea, 
        styles.stickyHeader, 
        {
          paddingTop: insets.top,
          transform: scrollY ? [{translateY: headerTranslateY}] : [],
        }
      ]}>
      <View style={styles.header}>
        {/* Logo */}
        <TouchableOpacity
          style={styles.logoContainer}
          onPress={() => {
            // Navigate to dashboard if needed
          }}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Free Trial Badge - Now properly positioned inside header */}
        {subscriptionDays !== undefined && subscriptionDays > 0 && (
          <Animated.View
            style={[
              styles.trialBadge,
              subscriptionDays <= 7 && styles.trialBadgeUrgent,
              subscriptionDays <= 7 && {transform: [{scale: pulseAnim}]},
            ]}>
            <Text style={styles.trialBadgeText}>
              {subscriptionDays} {subscriptionDays === 1 ? 'day' : 'days'} left
            </Text>
          </Animated.View>
        )}

        {/* Hamburger Menu */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}>
          <View style={styles.hamburger}>
            <View style={[styles.hamburgerLine, menuVisible && styles.hamburgerLineActive]} />
            <View style={[styles.hamburgerLine, menuVisible && styles.hamburgerLineActive]} />
            <View style={[styles.hamburgerLine, menuVisible && styles.hamburgerLineActive]} />
          </View>
        </TouchableOpacity>

        {/* Dropdown Menu Modal */}
        <Modal
          visible={menuVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}>
            <Animated.View 
              style={[
                styles.menuContainer, 
                {transform: [{translateX: slideAnim}]}
              ]} 
              onStartShouldSetResponder={() => true}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  setTimeout(() => onProfilePress?.(), 100);
                }}>
                <Text style={styles.menuItemIcon}>👤</Text>
                <Text style={styles.menuItemText}>Profile</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  setTimeout(() => onSupportPress?.(), 100);
                }}>
                <Text style={styles.menuItemIcon}>💬</Text>
                <Text style={styles.menuItemText}>Support</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  setTimeout(() => onLogoutPress?.(), 100);
                }}>
                <Text style={styles.menuItemIcon}>🚪</Text>
                <Text style={[styles.menuItemText, styles.logoutText]}>
                  Logout
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background, // Clean off-white
    zIndex: 1000,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    ...Platform.select({
      android: {
        elevation: 8,
      },
      ios: {
        shadowColor: colors.secondary,
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
    }),
  },
  stickyHeader: {
    // For absolute positioning
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: HEADER_HEIGHT,
    backgroundColor: colors.background, // Clean off-white
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(29, 36, 43, 0.08)',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginLeft: -spacing.md,
  },
  logoImage: {
    width: 220,
    height: 66,
  },
  menuButton: {
    padding: spacing.sm,
    borderRadius: 10,
    backgroundColor: 'rgba(29, 36, 43, 0.08)',
  },
  hamburger: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: '100%',
    height: 2.5,
    backgroundColor: colors.secondary, // Dark navy blue
    borderRadius: 2,
  },
  hamburgerLineActive: {
    backgroundColor: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 70,
    paddingRight: spacing.md,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 12,
  },
  menuItemIcon: {
    fontSize: 18,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    letterSpacing: 0.1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 0,
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  trialBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: spacing.md,
  },
  trialBadgeUrgent: {
    backgroundColor: '#EF4444',
  },
  trialBadgeText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default AgentHeader;


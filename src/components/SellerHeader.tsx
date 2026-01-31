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

interface SellerHeaderProps {
  onProfilePress?: () => void;
  onSupportPress?: () => void;
  onLogoutPress?: () => void;
  onSubscriptionPress?: () => void;
  onBuyPropertyPress?: () => void; // Switch to buyer dashboard to browse properties
  subscriptionDays?: number;
  scrollY?: InstanceType<typeof Animated.Value>; // For hide/show on scroll
}

const HEADER_HEIGHT = 48;

const SellerHeader: React.FC<SellerHeaderProps> = ({
  onProfilePress,
  onSupportPress,
  onLogoutPress,
  onSubscriptionPress,
  onBuyPropertyPress,
  subscriptionDays,
  scrollY,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Use Animated.diffClamp for scroll direction-based hiding
  // This creates a value that only changes when scrolling in one direction
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

        {/* Right side buttons container */}
        <View style={styles.rightButtons}>
          {/* Free Trial Badge */}
          {subscriptionDays !== undefined && subscriptionDays > 0 && (
            <Animated.View
              style={[
                styles.trialBadge,
                subscriptionDays <= 7 && styles.trialBadgeUrgent,
                subscriptionDays <= 7 && {transform: [{scale: pulseAnim}]},
              ]}>
              <Text style={styles.trialBadgeText}>
                {subscriptionDays}d
              </Text>
            </Animated.View>
          )}

          {/* Buy Property Button - Switch to buyer dashboard */}
          {onBuyPropertyPress && (
            <TouchableOpacity
              style={styles.buyPropertyButton}
              onPress={onBuyPropertyPress}
              activeOpacity={0.7}>
              <Text style={styles.buyPropertyText}>Buy</Text>
            </TouchableOpacity>
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
        </View>

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
                {
                  transform: [{translateX: slideAnim}],
                },
              ]}
              onStartShouldSetResponder={() => true}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onProfilePress?.();
                }}
                activeOpacity={0.7}>
                <Text style={styles.menuIcon}>👤</Text>
                <Text style={styles.menuItemText}>Profile</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onSupportPress?.();
                }}
                activeOpacity={0.7}>
                <Text style={styles.menuIcon}>💬</Text>
                <Text style={styles.menuItemText}>Support</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onSubscriptionPress?.();
                }}
                activeOpacity={0.7}>
                <Text style={styles.menuIcon}>⭐</Text>
                <Text style={styles.menuItemText}>Subscription</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onLogoutPress?.();
                }}
                activeOpacity={0.7}>
                <Text style={styles.menuIcon}>🚪</Text>
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
    // position handled in safeArea
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 48,
    backgroundColor: colors.background, // Clean off-white
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(29, 36, 43, 0.08)',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginLeft: -12,
    flex: 1,
  },
  logoImage: {
    width: 120,
    height: 36,
  },
  trialBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  trialBadgeUrgent: {
    backgroundColor: '#FF4444',
  },
  trialBadgeText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  buyPropertyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary, // Dark navy blue
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    shadowColor: colors.secondary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  buyPropertyText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.surface, // White text
  },
  menuButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(29, 36, 43, 0.08)',
  },
  hamburger: {
    width: 18,
    height: 12,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: '100%',
    height: 2,
    backgroundColor: colors.secondary, // Dark navy blue
    borderRadius: 1,
  },
  hamburgerLineActive: {
    backgroundColor: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: spacing.lg,
  },
  menuContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  menuIcon: {
    fontSize: 18,
    marginRight: spacing.md,
  },
  menuItemText: {
    ...typography.body,
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: spacing.md,
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '600',
  },
});

export default SellerHeader;

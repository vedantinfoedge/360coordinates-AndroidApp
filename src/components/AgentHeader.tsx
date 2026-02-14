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
import {colors, spacing, typography, borderRadius, shadows} from '../theme';
import {TabIcon} from './navigation/TabIcons';
import {verticalScale} from '../utils/responsive';

const HEADER_HEIGHT = verticalScale(56);

interface AgentHeaderProps {
  onProfilePress?: () => void;
  onSupportPress?: () => void;
  onSubscriptionPress?: () => void;
  onLogoutPress?: () => void;
  subscriptionDays?: number;
  scrollY?: InstanceType<typeof Animated.Value>; // For hide/show on scroll
}

const AgentHeader: React.FC<AgentHeaderProps> = ({
  onProfilePress,
  onSupportPress,
  onSubscriptionPress,
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
        {
          paddingTop: insets.top,
          transform: scrollY ? [{translateY: headerTranslateY}] : [],
        }
      ]}>
      <View style={styles.header}>
        {/* Logo + Title */}
        <View style={styles.logoSection}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.brandText}>
            <Text style={styles.brandTitle} numberOfLines={1}>Agent</Text>
            <Text style={styles.brandSubtitle} numberOfLines={1}>Portal</Text>
          </View>
        </View>

        {/* Right: Badge + Menu */}
        <View style={styles.rightItems}>
          {subscriptionDays !== undefined && subscriptionDays > 0 && (
            <Animated.View
              style={[
                styles.trialBadge,
                subscriptionDays <= 7 && styles.trialBadgeUrgent,
                subscriptionDays <= 7 && {transform: [{scale: pulseAnim}]},
              ]}>
              <Text style={styles.trialBadgeText}>{subscriptionDays}d</Text>
            </Animated.View>
          )}
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.6}>
            <View style={styles.hamburger}>
              <View style={[styles.hamburgerLine, menuVisible && styles.hamburgerLineActive]} />
              <View style={[styles.hamburgerLine, styles.hamburgerLineMiddle, menuVisible && styles.hamburgerLineActive]} />
              <View style={[styles.hamburgerLine, menuVisible && styles.hamburgerLineActive]} />
            </View>
          </TouchableOpacity>
        </View>

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
              style={[styles.menuContainer, {transform: [{translateX: slideAnim}]}]} 
              onStartShouldSetResponder={() => true}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuHeaderTitle}>Menu</Text>
                <TouchableOpacity style={styles.menuCloseButton} onPress={() => setMenuVisible(false)}>
                  <TabIcon name="close" color={colors.textSecondary} size={16} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setTimeout(() => onProfilePress?.(), 100); }}>
                <View style={[styles.menuItemIconBox, {backgroundColor: colors.accentLighter}]}>
                  <TabIcon name="profile" color="#0284C7" size={18} />
                </View>
                <Text style={styles.menuItemText}>Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setTimeout(() => onSupportPress?.(), 100); }}>
                <View style={[styles.menuItemIconBox, {backgroundColor: '#FEF3C7'}]}>
                  <TabIcon name="support" color="#B45309" size={18} />
                </View>
                <Text style={styles.menuItemText}>Support</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setTimeout(() => onSubscriptionPress?.(), 100); }}>
                <View style={[styles.menuItemIconBox, {backgroundColor: '#F3E8FF'}]}>
                  <TabIcon name="subscription" color="#7C3AED" size={18} />
                </View>
                <Text style={styles.menuItemText}>Subscription</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setTimeout(() => onLogoutPress?.(), 100); }}>
                <View style={[styles.menuItemIconBox, {backgroundColor: '#FEE2E2'}]}>
                  <TabIcon name="logout" color="#DC2626" size={18} />
                </View>
                <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
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
    backgroundColor: colors.surface,
    zIndex: 1000,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    ...shadows.subtle,
    ...Platform.select({
      android: {elevation: 2},
      ios: {
        shadowColor: '#1D242B',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    minHeight: HEADER_HEIGHT,
    backgroundColor: colors.surface,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  logoImage: {
    width: 100,
    height: 32,
  },
  brandText: {
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  brandTitle: {
    ...typography.captionSemibold,
    fontSize: 15,
    color: colors.text,
    letterSpacing: 0.2,
  },
  brandSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 0,
    fontSize: 11,
  },
  rightItems: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hamburger: {
    width: 20,
    height: 14,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: '100%',
    height: 2,
    backgroundColor: colors.textSecondary,
    borderRadius: 1,
  },
  hamburgerLineMiddle: {
    width: '75%',
    alignSelf: 'flex-end',
  },
  hamburgerLineActive: {
    backgroundColor: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(29, 36, 43, 0.35)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: spacing.lg,
  },
  menuContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    minWidth: 260,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.card,
    ...Platform.select({
      android: {elevation: 8},
      ios: {
        shadowColor: '#1D242B',
        shadowOffset: {width: -2, height: 4},
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
    }),
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  menuHeaderTitle: {
    ...typography.captionSemibold,
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCloseText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  menuItemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemIcon: {
    fontSize: 16,
  },
  menuItemText: {
    ...typography.body,
    fontWeight: '500',
    color: colors.text,
    fontSize: 15,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
    marginHorizontal: spacing.lg,
  },
  logoutText: {
    color: colors.error,
    fontWeight: '600',
  },
  trialBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
    minWidth: 36,
    alignItems: 'center',
  },
  trialBadgeUrgent: {
    backgroundColor: colors.error,
  },
  trialBadgeText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default AgentHeader;


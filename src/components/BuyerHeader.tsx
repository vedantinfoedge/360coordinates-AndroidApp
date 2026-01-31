import React, {useState, useEffect, useMemo, useRef} from 'react';
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

interface BuyerHeaderProps {
  onProfilePress?: () => void;
  onSupportPress?: () => void;
  onLogoutPress?: () => void;
  onSignInPress?: () => void;
  onSignUpPress?: () => void;
  onAddPropertyPress?: () => void; // Switch to seller dashboard to add property
  showProfile?: boolean;
  showLogout?: boolean;
  showSignIn?: boolean;
  showSignUp?: boolean;
  /** When provided, header shows on scroll down and hides at top */
  scrollY?: InstanceType<typeof Animated.Value>;
  /** Header height (optional, for consistency) */
  headerHeight?: number;
}

const BuyerHeader: React.FC<BuyerHeaderProps> = ({
  onProfilePress,
  onSupportPress,
  onLogoutPress,
  onSignInPress,
  onSignUpPress,
  onAddPropertyPress,
  showProfile = false,
  showLogout = false,
  showSignIn = false,
  showSignUp = false,
  scrollY,
  headerHeight: _headerHeight, // Unused but accepted for consistency
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-300)).current;

  // Use Animated.diffClamp for scroll direction-based hiding (same as SellerHeader)
  const clampedScrollY = scrollY
    ? Animated.diffClamp(scrollY, 0, HEADER_HEIGHT + insets.top)
    : new Animated.Value(0);

  // Header animation: starts hidden (translateY negative), shows when scrolling down
  const headerTranslateY = clampedScrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT + insets.top],
    outputRange: [-(HEADER_HEIGHT + insets.top), 0], // Hidden -> Visible
    extrapolate: 'clamp',
  });
  
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

  // Determine if user is logged in based on props
  const isLoggedIn = Boolean(showLogout && onLogoutPress);
  const showProfileFinal = isLoggedIn && showProfile && Boolean(onProfilePress);
  const showLogoutFinal = isLoggedIn && Boolean(showLogout && onLogoutPress);
  const showSignInFinal = !isLoggedIn && (showSignIn || Boolean(onSignInPress));
  const showSignUpFinal = !isLoggedIn && (showSignUp || Boolean(onSignUpPress));
  
  // Build menu items array dynamically using useMemo
  const menuItems = useMemo(() => {
    const items: Array<{label: string; onPress: () => void; isLogout?: boolean}> = [];
    
    // Add Profile for logged-in users (first)
    if (showProfileFinal && onProfilePress) {
      items.push({
        label: 'View Profile',
        onPress: () => {
          setMenuVisible(false);
          // Small delay to ensure modal closes before navigation
          setTimeout(() => {
            onProfilePress();
          }, 100);
        },
      });
    }
    
    // Always add Support
    if (onSupportPress) {
      items.push({
        label: 'Support',
        onPress: () => {
          setMenuVisible(false);
          onSupportPress();
        },
      });
    }
    
    // Add Sign Up and Login for guest users (Sign Up first, then Login)
    if (!isLoggedIn) {
      if (showSignUpFinal && onSignUpPress) {
        items.push({
          label: 'Sign Up',
          onPress: () => {
            console.log('[BuyerHeader] Sign Up pressed');
            setMenuVisible(false);
            // Small delay to ensure modal closes before navigation
            setTimeout(() => {
              onSignUpPress();
            }, 100);
          },
        });
      }
      if (showSignInFinal && onSignInPress) {
        items.push({
          label: 'Login',
          onPress: () => {
            console.log('[BuyerHeader] Login pressed');
            setMenuVisible(false);
            // Small delay to ensure modal closes before navigation
            setTimeout(() => {
              onSignInPress();
            }, 100);
          },
        });
      }
    }
    
    // Add Logout for logged-in users (last)
    if (showLogoutFinal && onLogoutPress) {
      items.push({
        label: 'Logout',
        onPress: () => {
          console.log('[BuyerHeader] Logout pressed');
          setMenuVisible(false);
          // Small delay to ensure modal closes before logout action
          setTimeout(() => {
            onLogoutPress();
          }, 100);
        },
        isLogout: true,
      });
    }
    
    return items;
  }, [showProfileFinal, showLogoutFinal, showSignInFinal, showSignUpFinal, isLoggedIn, onProfilePress, onSupportPress, onSignInPress, onSignUpPress, onLogoutPress]);

  // Debug logs (MANDATORY DEBUG)
  useEffect(() => {
    console.log('[BuyerHeader] Props received:');
    console.log('  - showProfile:', showProfile);
    console.log('  - showLogout:', showLogout);
    console.log('  - showSignIn:', showSignIn);
    console.log('  - showSignUp:', showSignUp);
    console.log('  - showProfileFinal:', showProfileFinal);
    console.log('  - showLogoutFinal:', showLogoutFinal);
    console.log('  - showSignInFinal:', showSignInFinal);
    console.log('  - showSignUpFinal:', showSignUpFinal);
    console.log('  - onSignInPress:', onSignInPress ? 'defined' : 'undefined');
    console.log('  - onSignUpPress:', onSignUpPress ? 'defined' : 'undefined');
    console.log('  - onLogoutPress:', onLogoutPress ? 'defined' : 'undefined');
    console.log('  - isLoggedIn (computed):', isLoggedIn);
    console.log('  - menuItems count:', menuItems.length);
    console.log('  - menuItems:', menuItems.map(item => item.label));
  }, [showProfile, showLogout, showSignIn, showSignUp, showProfileFinal, showLogoutFinal, showSignInFinal, showSignUpFinal, isLoggedIn, menuItems, onSignInPress, onSignUpPress, onLogoutPress]);

  // Get icon for menu item
  const getMenuIcon = (label: string): string => {
    switch (label) {
      case 'View Profile': return '👤';
      case 'Support': return '💬';
      case 'Sign Up': return '✨';
      case 'Login': return '🔑';
      case 'Logout': return '🚪';
      default: return '•';
    }
  };

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
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Right side buttons container */}
        <View style={styles.rightButtons}>
          {/* Add Property Button - Only show when callback is provided (logged in users) */}
          {onAddPropertyPress && (
            <TouchableOpacity
              style={styles.addPropertyButton}
              onPress={onAddPropertyPress}
              activeOpacity={0.7}>
              <Text style={styles.addPropertyText}>+ Add</Text>
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
                {transform: [{translateX: slideAnim}]}
              ]} 
              onStartShouldSetResponder={() => true}>
              {menuItems.map((item, index) => (
                <React.Fragment key={item.label}>
                  {index > 0 && <View style={styles.menuDivider} />}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={item.onPress}>
                    <Text style={styles.menuItemIcon}>{getMenuIcon(item.label)}</Text>
                    <Text style={item.isLogout ? [styles.menuItemText, styles.logoutText] : styles.menuItemText}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
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
    marginLeft: -spacing.xxxl-spacing.md,
  },
  logoImage: {
    width: 220,
    height: 66,
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addPropertyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary, // Dark navy blue
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    shadowColor: colors.secondary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addPropertyText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.surface, // White text
    letterSpacing: 0.3,
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
  logoutText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 0,
  },
});

export default BuyerHeader;


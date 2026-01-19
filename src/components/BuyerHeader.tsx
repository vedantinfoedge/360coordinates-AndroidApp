import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, spacing, typography, borderRadius} from '../theme';

interface BuyerHeaderProps {
  onProfilePress?: () => void;
  onSupportPress?: () => void;
  onLogoutPress?: () => void;
  onSignInPress?: () => void;
  onSignUpPress?: () => void;
  showProfile?: boolean;
  showLogout?: boolean;
  showSignIn?: boolean;
  showSignUp?: boolean;
}

const BuyerHeader: React.FC<BuyerHeaderProps> = ({
  onProfilePress,
  onSupportPress,
  onLogoutPress,
  onSignInPress,
  onSignUpPress,
  showProfile = false,
  showLogout = false,
  showSignIn = false,
  showSignUp = false,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const insets = useSafeAreaInsets();

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
          onProfilePress();
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
    
    // Add Login and Sign Up for guest users
    if (!isLoggedIn) {
      if (showSignInFinal && onSignInPress) {
        items.push({
          label: 'Login',
          onPress: () => {
            console.log('[BuyerHeader] Login pressed');
            setMenuVisible(false);
            onSignInPress();
          },
        });
      }
      if (showSignUpFinal && onSignUpPress) {
        items.push({
          label: 'Sign Up',
          onPress: () => {
            console.log('[BuyerHeader] Sign Up pressed');
            setMenuVisible(false);
            onSignUpPress();
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
          onLogoutPress();
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

  return (
    <View style={[styles.safeArea, styles.stickyHeader]}>
      <View style={[styles.header, {paddingTop: insets.top}]}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Hamburger Menu */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}>
          <View style={styles.hamburger}>
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
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
            <View style={styles.menuContainer} onStartShouldSetResponder={() => true}>
              {menuItems.map((item, index) => (
                <React.Fragment key={item.label}>
                  {index > 0 && <View style={styles.menuDivider} />}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={item.onPress}>
                    <Text style={item.isLogout ? [styles.menuItemText, styles.logoutText] : styles.menuItemText}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#022b5f', // Navbar bg color
    zIndex: 1000,
    ...Platform.select({
      android: {
        elevation: 4,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
    }),
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 60,
    backgroundColor: '#022b5f', // Navbar bg color
    borderBottomWidth: 0,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  logoImage: {
    width: 140,
    height: 40,
  },
  menuButton: {
    padding: spacing.xs,
  },
  hamburger: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: '100%',
    height: 2,
    backgroundColor: colors.surface, // White color for visibility on purple background
    borderRadius: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: spacing.md,
  },
  menuContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    padding: spacing.md,
  },
  menuItemText: {
    ...typography.body,
    color: colors.text,
  },
  logoutText: {
    color: colors.error,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
});

export default BuyerHeader;


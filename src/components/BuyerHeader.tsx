import React, {useState, useEffect} from 'react';
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

  // Debug logs to verify props received
  useEffect(() => {
    console.log('[BuyerHeader] Props received:');
    console.log('  - showProfile:', showProfile);
    console.log('  - showLogout:', showLogout);
    console.log('  - showSignIn:', showSignIn);
    console.log('  - showSignUp:', showSignUp);
    console.log('  - onSignInPress exists:', !!onSignInPress);
    console.log('  - onSignUpPress exists:', !!onSignUpPress);
    console.log('  - onLogoutPress exists:', !!onLogoutPress);
  }, [showProfile, showLogout, showSignIn, showSignUp, onSignInPress, onSignUpPress, onLogoutPress]);

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
              {showProfile && onProfilePress && (
                <>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                      onProfilePress();
                }}>
                <Text style={styles.menuItemText}>View Profile</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
                </>
              )}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onSupportPress?.();
                }}>
                <Text style={styles.menuItemText}>Support</Text>
              </TouchableOpacity>
              {/* Login option - show for guest users */}
              {Boolean(showSignIn) && onSignInPress ? (
                <>
                  <View style={styles.menuDivider} />
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      console.log('[BuyerHeader] Login pressed');
                      setMenuVisible(false);
                      onSignInPress();
                    }}>
                    <Text style={styles.menuItemText}>Login</Text>
                  </TouchableOpacity>
                </>
              ) : null}
              {/* Sign Up option - show for guest users */}
              {Boolean(showSignUp) && onSignUpPress ? (
                <>
                  <View style={styles.menuDivider} />
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      console.log('[BuyerHeader] Sign Up pressed');
                      setMenuVisible(false);
                      onSignUpPress();
                    }}>
                    <Text style={styles.menuItemText}>Sign Up</Text>
                  </TouchableOpacity>
                </>
              ) : null}
              {/* Logout option - show for logged-in users only */}
              {Boolean(showLogout) && onLogoutPress ? (
                <>
                  <View style={styles.menuDivider} />
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      console.log('[BuyerHeader] Logout pressed');
                      setMenuVisible(false);
                      onLogoutPress();
                    }}>
                    <Text style={[styles.menuItemText, styles.logoutText]}>
                      Logout
                    </Text>
                  </TouchableOpacity>
                </>
              ) : null}
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


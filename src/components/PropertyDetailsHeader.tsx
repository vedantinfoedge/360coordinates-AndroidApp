import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { TabIcon, TabIconName } from './navigation/TabIcons';

interface PropertyDetailsHeaderProps {
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

const PropertyDetailsHeader: React.FC<PropertyDetailsHeaderProps> = ({
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
  const slideAnim = useRef(new Animated.Value(-300)).current;

  const isLoggedIn = Boolean(showLogout && onLogoutPress);
  const showProfileFinal = isLoggedIn && showProfile && Boolean(onProfilePress);
  const showLogoutFinal = isLoggedIn && Boolean(showLogout && onLogoutPress);
  const showSignInFinal = !isLoggedIn && (showSignIn || Boolean(onSignInPress));
  const showSignUpFinal = !isLoggedIn && (showSignUp || Boolean(onSignUpPress));

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

  const menuItems: Array<{ label: string; onPress: () => void; isLogout?: boolean }> = [];
  if (showProfileFinal && onProfilePress) {
    menuItems.push({
      label: 'View Profile',
      onPress: () => {
        setMenuVisible(false);
        setTimeout(() => onProfilePress(), 100);
      },
    });
  }
  if (onSupportPress) {
    menuItems.push({
      label: 'Support',
      onPress: () => {
        setMenuVisible(false);
        onSupportPress();
      },
    });
  }
  if (!isLoggedIn) {
    if (showSignUpFinal && onSignUpPress) {
      menuItems.push({
        label: 'Sign Up',
        onPress: () => {
          setMenuVisible(false);
          setTimeout(() => onSignUpPress(), 100);
        },
      });
    }
    if (showSignInFinal && onSignInPress) {
      menuItems.push({
        label: 'Login',
        onPress: () => {
          setMenuVisible(false);
          setTimeout(() => onSignInPress(), 100);
        },
      });
    }
  }
  if (showLogoutFinal && onLogoutPress) {
    menuItems.push({
      label: 'Logout',
      onPress: () => {
        setMenuVisible(false);
        setTimeout(() => onLogoutPress(), 100);
      },
      isLogout: true,
    });
  }

  const getMenuIconName = (label: string): TabIconName => {
    switch (label) {
      case 'View Profile': return 'profile';
      case 'Support': return 'support';
      case 'Sign Up': return 'sparkles';
      case 'Login': return 'key';
      case 'Logout': return 'logout';
      default: return 'chevron-right';
    }
  };

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Logo: 360° COORDINATES */}
        <View style={styles.logoWrap}>
          <View style={styles.logoRow}>
            <Text style={styles.logo360}>360</Text>
            <View style={styles.logoPinWrap}>
              <TabIcon name="location" color="#E53935" size={18} />
            </View>
          </View>
          <Text style={styles.logoCoords}>COORDINATES</Text>
        </View>

        {/* Hamburger menu */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}>
          <View style={styles.hamburger}>
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}>
          <Animated.View
            style={[styles.menuContainer, { transform: [{ translateX: slideAnim }] }]}
            onStartShouldSetResponder={() => true}>
            {menuItems.map((item, index) => (
              <React.Fragment key={item.label}>
                {index > 0 && <View style={styles.menuDivider} />}
                <TouchableOpacity style={styles.menuItem} onPress={item.onPress}>
                  <View style={styles.menuItemIconBox}>
                    <TabIcon name={getMenuIconName(item.label)} color={colors.primary} size={20} />
                  </View>
                  <Text style={item.isLogout ? [styles.menuItemText, styles.logoutText] : styles.menuItemText}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderRef,
  },
  logoWrap: {
    flexDirection: 'column',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  logo360: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -1,
    lineHeight: 28,
  },
  logoPinWrap: {
    marginLeft: -2,
    marginBottom: 2,
  },
  logoCoords: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.sub,
    letterSpacing: 2,
    marginTop: 2,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburger: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: '100%',
    height: 2.5,
    backgroundColor: colors.secondary,
    borderRadius: 2,
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
    shadowOffset: { width: 0, height: 8 },
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
  menuItemIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.accentLighter,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
});

export default PropertyDetailsHeader;

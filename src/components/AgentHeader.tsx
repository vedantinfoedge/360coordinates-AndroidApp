import React, {useState} from 'react';
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

interface AgentHeaderProps {
  onProfilePress?: () => void;
  onSupportPress?: () => void;
  onLogoutPress?: () => void;
  subscriptionDays?: number;
}

const AgentHeader: React.FC<AgentHeaderProps> = ({
  onProfilePress,
  onSupportPress,
  onLogoutPress,
  subscriptionDays,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.safeArea, styles.stickyHeader, {paddingTop: insets.top}]}>
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

        {/* Free Trial Badge */}
        {subscriptionDays !== undefined && subscriptionDays > 0 && (
          <View
            style={[
              styles.trialBadge,
              subscriptionDays <= 7 && styles.trialBadgeUrgent,
            ]}>
            <Text style={styles.trialBadgeText}>
              {subscriptionDays} {subscriptionDays === 1 ? 'day' : 'days'} left
            </Text>
          </View>
        )}

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
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onProfilePress?.();
                }}>
                <Text style={styles.menuItemText}>Profile</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onSupportPress?.();
                }}>
                <Text style={styles.menuItemText}>Support</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onLogoutPress?.();
                }}>
                <Text style={[styles.menuItemText, styles.logoutText]}>
                  Logout
                </Text>
              </TouchableOpacity>
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
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 70,
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
    backgroundColor: colors.surface,
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
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  logoutText: {
    color: colors.error,
  },
  trialBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  trialBadgeUrgent: {
    backgroundColor: colors.error,
  },
  trialBadgeText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 10,
    fontWeight: '600',
  },
});

export default AgentHeader;


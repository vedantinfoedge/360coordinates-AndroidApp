import React, {useRef, useCallback} from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, typography} from '../../theme';
import {moderateScale, scale} from '../../utils/responsive';
import CustomAlert from '../../utils/alertHelper';
import {useAuth} from '../../context/AuthContext';
import {useUnreadChatCount} from '../../hooks/useUnreadChatCount';
import {TabIcon} from './TabIcons';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const TAB_BAR_HEIGHT = 56;
const FAB_SIZE = SCREEN_WIDTH <= 375 ? scale(48) : scale(52);
const FAB_ELEVATION = -18;
const FAB_COOLDOWN_MS = 800;

const FOCUSED_COLOR = '#1565C0';
const UNFOCUSED_COLOR = '#8A97A8';
const MIN_TOUCH = 44;

const SELLER_TAB_CONFIG = [
  {name: 'Home', label: 'Home', icon: 'home' as const},
  {name: 'AllListings', label: 'All Listings', icon: 'list' as const},
  {name: 'Search', label: '', icon: 'search' as const},
  {name: 'Chat', label: 'Chat', icon: 'chats' as const},
  {name: 'Profile', label: 'Profile', icon: 'profile' as const},
];

export default function SellerCustomTabBar({state, descriptors, navigation}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const {switchUserRole} = useAuth();
  const unreadCount = useUnreadChatCount();
  const fabCooldownRef = useRef(false);
  const barHeight = TAB_BAR_HEIGHT + insets.bottom;

  const onFABPress = useCallback(() => {
    if (fabCooldownRef.current) return;
    fabCooldownRef.current = true;
    setTimeout(() => {
      fabCooldownRef.current = false;
    }, FAB_COOLDOWN_MS);

    (async () => {
      try {
        await switchUserRole('buyer');
        // AppNavigator useEffect reacts to user change and navigates to Buyer/MainTabs
      } catch (error: any) {
        console.error('[SellerCustomTabBar] Error switching to buyer:', error);
        CustomAlert.alert(
          'Switch Failed',
          error?.message || 'Could not switch to Buyer dashboard. Please try again.',
        );
      }
    })();
  }, [switchUserRole]);

  return (
    <View style={[styles.wrapper, {height: barHeight, paddingBottom: insets.bottom}]}>
      <View style={styles.bar}>
        {SELLER_TAB_CONFIG.map(config => {
          const route = state.routes.find(r => r.name === config.name);
          if (!route) return null;

          if (config.name === 'Search') {
            return (
              <View key={route.key} style={styles.fabSlot}>
                <Pressable
                  style={[
                    styles.fab,
                    {
                      width: FAB_SIZE,
                      height: FAB_SIZE,
                      borderRadius: FAB_SIZE / 2,
                      marginTop: FAB_ELEVATION,
                    },
                  ]}
                  onPress={onFABPress}
                  accessibilityRole="button"
                  accessibilityLabel="Switch to Buyer (search properties)">
                  {/* @ts-expect-error - LinearGradient children types */}
                  <LinearGradient
                    colors={['#1E88E5', '#1565C0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fabGradient}>
                    <TabIcon name="search" color={colors.surface} size={moderateScale(20)} />
                  </LinearGradient>
                </Pressable>
              </View>
            );
          }

          const index = state.routes.findIndex(r => r.key === route.key);
          const isFocused = state.index === index;
          const color = isFocused ? FOCUSED_COLOR : UNFOCUSED_COLOR;

          const onPress = () => {
            navigation.navigate(config.name);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[styles.tab, {minHeight: MIN_TOUCH}]}
              accessibilityRole="button"
              accessibilityState={{selected: isFocused}}
              accessibilityLabel={config.label}>
              <View style={styles.tabIconWrap}>
                <TabIcon name={config.icon} color={color} size={moderateScale(21)} />
                {config.name === 'Chat' && unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
                {isFocused && <View style={styles.navDot} />}
              </View>
              <Text style={[styles.tabLabel, {color}]} numberOfLines={1}>
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderTopColor: 'rgba(0,0,0,0.06)',
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: -4},
        shadowOpacity: 0.06,
        shadowRadius: 18,
      },
      android: {elevation: 8},
    }),
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    paddingTop: 4,
    minHeight: TAB_BAR_HEIGHT,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    minWidth: 44,
  },
  tabIconWrap: {
    position: 'relative',
    marginBottom: 4,
  },
  navDot: {
    width: 4,
    height: 4,
    backgroundColor: FOCUSED_COLOR,
    borderRadius: 2,
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#FF385C',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tabLabel: {
    ...typography.small,
    fontSize: moderateScale(10),
    fontWeight: '600',
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 999,
    ...Platform.select({
      ios: {
        shadowColor: '#1565C0',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.4,
        shadowRadius: 14,
      },
      android: {elevation: 8},
    }),
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
});

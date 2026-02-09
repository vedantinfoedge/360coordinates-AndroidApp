import React, {useRef, useCallback} from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useArcFAB} from '../../context/ArcFABContext';
import {useAuth} from '../../context/AuthContext';
import {useUnreadChatCount} from '../../hooks/useUnreadChatCount';
import {colors, typography} from '../../theme';
import {moderateScale, scale} from '../../utils/responsive';
import CustomAlert from '../../utils/alertHelper';
import {TabIcon} from './TabIcons';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const TAB_BAR_HEIGHT = 56;
const FAB_SIZE_SMALL = 56;
const FAB_SIZE_BASE = 62;
const FAB_SIZE_LARGE = 66;
const FAB_ELEVATION = -18;

function getFABSize(): number {
  if (SCREEN_WIDTH <= 375) return scale(FAB_SIZE_SMALL);
  if (SCREEN_WIDTH >= 428) return scale(FAB_SIZE_LARGE);
  return scale(FAB_SIZE_BASE);
}

const FOCUSED_COLOR = '#1976d2';
const UNFOCUSED_COLOR = '#757575';
const FAB_COLOR = '#1976d2';
const FAB_OPEN_COLOR = '#424242';
const FAB_SWITCH_COOLDOWN_MS = 800;

const MIN_TOUCH = 48;
const HIT_SLOP = {top: 20, bottom: 20, left: 16, right: 16};
const FAB_HIT_SLOP = {top: 28, bottom: 28, left: 28, right: 28};

type MeasurableView = {
  measureInWindow(callback: (x: number, y: number, width: number, height: number) => void): void;
};

const TAB_CONFIG = [
  {name: 'Home', label: 'Home', icon: 'home' as const},
  {name: 'Search', label: 'Search', icon: 'search' as const},
  {name: 'Add', label: '', icon: 'plus' as const},
  {name: 'Chats', label: 'Chat', icon: 'chats' as const},
  {name: 'Profile', label: 'Profile', icon: 'profile' as const},
];

export default function BuyerCustomTabBar({state, descriptors, navigation}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const {isAuthenticated, switchRole} = useAuth();
  const unreadCount = useUnreadChatCount();
  const {openMenu, closeMenu, isMenuOpen, setOnRoleSelect} = useArcFAB();
  const fabRef = useRef<MeasurableView | null>(null);
  const fabRotate = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);
  const fabSwitchCooldownRef = useRef(false);

  const barHeight = TAB_BAR_HEIGHT + insets.bottom;
  const fabSize = getFABSize();

  // Root: when tab nav is inside Buyer stack, go up twice; when tab nav is direct child (MainTabs), parent is root.
  const getRootNav = useCallback(() => {
    const parent = navigation.getParent();
    return parent?.getParent() ?? parent ?? undefined;
  }, [navigation]);

  React.useEffect(() => {
    setOnRoleSelect((role: 'agent' | 'builder' | 'seller') => {
      closeMenu();
      const root = getRootNav();
      (root as any)?.navigate('Auth', {
        screen: 'Register',
        params: {role},
      });
    });
    return () => setOnRoleSelect(null);
  }, [closeMenu, getRootNav, setOnRoleSelect]);

  React.useEffect(() => {
    Animated.timing(fabRotate, {
      toValue: isMenuOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isMenuOpen, fabRotate]);

  const measureFAB = useCallback(() => {
    fabRef.current?.measureInWindow((x, y, width, height) => {
      openMenu({x: x + width / 2, y: y + height / 2});
    });
  }, [openMenu]);

  const onFABPress = useCallback(() => {
    if (isAnimating.current) return;
    if (isMenuOpen) {
      closeMenu();
      return;
    }
    // Logged-in user (e.g. buyer): FAB switches to Seller (same session). Cooldown to avoid double-tap.
    if (isAuthenticated) {
      if (fabSwitchCooldownRef.current) return;
      fabSwitchCooldownRef.current = true;
      setTimeout(() => {
        fabSwitchCooldownRef.current = false;
      }, FAB_SWITCH_COOLDOWN_MS);

      const root = getRootNav();
      (async () => {
        try {
          await AsyncStorage.setItem('@target_dashboard', 'seller');
          await AsyncStorage.setItem('@user_dashboard_preference', 'seller');
          await switchRole('seller');
          if (root) {
            (root as any).reset({
              index: 0,
              routes: [{name: 'Seller'}],
            });
          }
        } catch (error: any) {
          console.error('[BuyerCustomTabBar] Error switching to seller:', error);
          CustomAlert.alert(
            'Switch Failed',
            error?.message || 'Could not switch to Seller dashboard. Please try again.',
          );
        }
      })();
      return;
    }
    // Not logged in: open arc menu for role selection (Register flow).
    isAnimating.current = true;
    measureFAB();
    setTimeout(() => {
      isAnimating.current = false;
    }, 400);
  }, [isAuthenticated, isMenuOpen, closeMenu, getRootNav, measureFAB, switchRole]);

  return (
    <View style={[styles.wrapper, {height: barHeight, paddingBottom: insets.bottom}]}>
      <View style={styles.bar}>
        {TAB_CONFIG.map(config => {
          const route = state.routes.find(r => r.name === config.name);
          if (!route) return null;

          if (config.name === 'Add') {
            const openColor = isMenuOpen ? FAB_OPEN_COLOR : FAB_COLOR;
            const rotateDeg = fabRotate.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '45deg'],
            });
            return (
              <View key={route.key} style={styles.fabSlot}>
                <Animated.View
                  ref={fabRef}
                  style={[
                    styles.fab,
                    {
                      width: fabSize,
                      height: fabSize,
                      borderRadius: fabSize / 2,
                      marginTop: FAB_ELEVATION,
                      backgroundColor: openColor,
                      transform: [{rotate: rotateDeg}],
                    },
                  ]}>
                  <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={onFABPress}
                    hitSlop={FAB_HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel={isMenuOpen ? 'Close menu' : 'Open role menu'}
                    accessibilityState={{expanded: isMenuOpen}}
                  />
                  <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.fabIconWrap]} collapsable={false}>
                    <TabIcon name="plus" color={colors.surface} size={moderateScale(26)} />
                  </View>
                </Animated.View>
              </View>
            );
          }

          const index = state.routes.findIndex(r => r.key === route.key);
          const isFocused = state.index === index;
          const color = isFocused ? FOCUSED_COLOR : UNFOCUSED_COLOR;

          const onPress = () => {
            if (config.name === 'Chats') {
              // #region agent log
              fetch('http://127.0.0.1:7243/ingest/46268aef-e207-4f37-bc15-922b8a7a4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BuyerCustomTabBar.tsx:onPress',message:'Chat tab pressed',data:{routeName:config.name,target:'Chats',screen:'ChatList'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
              // #endregion
              navigation.navigate('Chats', {screen: 'ChatList'});
            } else {
              navigation.navigate(config.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[styles.tab, {minHeight: MIN_TOUCH}]}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityState={{selected: isFocused}}
              accessibilityLabel={config.label}>
              <View style={styles.tabIconWrap}>
                <TabIcon name={config.icon} color={color} size={moderateScale(24)} />
                {config.name === 'Chats' && unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
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
    borderTopColor: '#e0e0e0',
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: -2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
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
    marginBottom: 2,
  },
  tabIcon: {
    fontSize: moderateScale(22),
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
    fontSize: moderateScale(11),
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    color: colors.surface,
    fontWeight: '300',
  },
});

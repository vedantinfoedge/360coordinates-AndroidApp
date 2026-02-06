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
import {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, typography} from '../../theme';
import {moderateScale, scale} from '../../utils/responsive';
import {TabIcon} from './TabIcons';
import {useBuilderArcFAB} from '../../context/BuilderArcFABContext';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const TAB_BAR_HEIGHT = 56;
const FAB_SIZE_SMALL = 48;
const FAB_SIZE_BASE = 52;
const FAB_SIZE_LARGE = 56;
const FAB_ELEVATION = -18;

function getFABSize(): number {
  if (SCREEN_WIDTH <= 375) return scale(FAB_SIZE_SMALL);
  if (SCREEN_WIDTH >= 428) return scale(FAB_SIZE_LARGE);
  return scale(FAB_SIZE_BASE);
}

const FOCUSED_COLOR = '#1976d2';
const UNFOCUSED_COLOR = '#757575';
const FAB_COLOR = '#ed6c02';
const FAB_OPEN_COLOR = '#424242';
const MIN_TOUCH = 44;

const BUILDER_TAB_CONFIG = [
  {name: 'Home', label: 'Home', icon: 'home' as const},
  {name: 'Listings', label: 'All Listings', icon: 'list' as const},
  {name: 'Add', label: '', icon: 'plus' as const},
  {name: 'Chat', label: 'Chat', icon: 'chats' as const},
  {name: 'Profile', label: 'Profile', icon: 'profile' as const},
];

export default function BuilderCustomTabBar({state, descriptors, navigation}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const {openMenu, closeMenu, isMenuOpen} = useBuilderArcFAB();
  const fabRef = useRef<View>(null);
  const fabRotate = useRef(new Animated.Value(0)).current;
  const barHeight = TAB_BAR_HEIGHT + insets.bottom;
  const fabSize = getFABSize();

  React.useEffect(() => {
    Animated.timing(fabRotate, {
      toValue: isMenuOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isMenuOpen, fabRotate]);

  const measureFAB = useCallback(() => {
    fabRef.current?.measureInWindow((x, y, w, h) => {
      openMenu({x: x + w / 2, y: y + h / 2});
    });
  }, [openMenu]);

  const onFABPress = useCallback(() => {
    if (isMenuOpen) {
      closeMenu();
      return;
    }
    measureFAB();
  }, [isMenuOpen, closeMenu, measureFAB]);

  return (
    <View style={[styles.wrapper, {height: barHeight, paddingBottom: insets.bottom}]}>
      <View style={styles.bar}>
        {BUILDER_TAB_CONFIG.map(config => {
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
                    accessibilityRole="button"
                    accessibilityLabel={isMenuOpen ? 'Close menu' : 'Add Project or Property'}
                    accessibilityState={{expanded: isMenuOpen}}
                  />
                  <TabIcon name="plus" color={colors.surface} size={moderateScale(26)} />
                </Animated.View>
              </View>
            );
          }

          const index = state.routes.findIndex(r => r.key === route.key);
          const isFocused = state.index === index;
          const color = isFocused ? FOCUSED_COLOR : UNFOCUSED_COLOR;

          const onPress = () => {
            if (config.name === 'Chat') {
              navigation.navigate('Chat', {screen: 'ChatList'});
            } else {
              navigation.navigate(config.name);
            }
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
                <TabIcon name={config.icon} color={color} size={moderateScale(24)} />
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
    marginBottom: 2,
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
      android: {elevation: 8},
    }),
  },
});

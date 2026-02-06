import React, {useRef, useCallback, useState} from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
  Modal,
  TouchableOpacity,
} from 'react-native';
import {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, typography, spacing} from '../../theme';
import {moderateScale, scale} from '../../utils/responsive';
import {TabIcon} from './TabIcons';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const TAB_BAR_HEIGHT = 56;
const FAB_SIZE = SCREEN_WIDTH <= 375 ? scale(48) : scale(52);
const FAB_ELEVATION = -18;
const FAB_COOLDOWN_MS = 800;

const FOCUSED_COLOR = '#1976d2';
const UNFOCUSED_COLOR = '#757575';
const FAB_COLOR = '#1976d2';
const MIN_TOUCH = 44;

const AGENT_TAB_CONFIG = [
  {name: 'Home', label: 'Home', icon: 'home' as const},
  {name: 'Listings', label: 'All Listings', icon: 'list' as const},
  {name: 'Add', label: '', icon: 'plus' as const},
  {name: 'Chat', label: 'Chat', icon: 'chats' as const},
  {name: 'Profile', label: 'Profile', icon: 'profile' as const},
];

export default function AgentCustomTabBar({state, descriptors, navigation}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const fabCooldownRef = useRef(false);
  const barHeight = TAB_BAR_HEIGHT + insets.bottom;

  const getParentStack = useCallback(() => {
    return navigation.getParent();
  }, [navigation]);

  const [showFABMenu, setShowFABMenu] = useState(false);
  
  const onFABPress = useCallback(() => {
    if (fabCooldownRef.current) return;
    fabCooldownRef.current = true;
    setTimeout(() => {
      fabCooldownRef.current = false;
    }, FAB_COOLDOWN_MS);
    setShowFABMenu(true);
  }, []);

  const handleAddProperty = useCallback(() => {
    setShowFABMenu(false);
    const parent = getParentStack();
    (parent as any)?.navigate('AddProperty');
  }, [getParentStack]);

  const handleAddProject = useCallback(() => {
    setShowFABMenu(false);
    const parent = getParentStack();
    (parent as any)?.navigate('AddProject');
  }, [getParentStack]);

  return (
    <>
      <View style={[styles.wrapper, {height: barHeight, paddingBottom: insets.bottom}]}>
        <View style={styles.bar}>
          {AGENT_TAB_CONFIG.map(config => {
            const route = state.routes.find(r => r.name === config.name);
            if (!route) return null;

            if (config.name === 'Add') {
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
                        backgroundColor: FAB_COLOR,
                      },
                    ]}
                    onPress={onFABPress}
                    accessibilityRole="button"
                    accessibilityLabel="Add Property or Project">
                    <TabIcon name="plus" color={colors.surface} size={moderateScale(24)} />
                  </Pressable>
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
      
      {/* FAB Menu Modal */}
      <Modal
        visible={showFABMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFABMenu(false)}>
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowFABMenu(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleAddProperty}
              activeOpacity={0.7}>
              <Text style={styles.menuItemIcon}>🏠</Text>
              <Text style={styles.menuItemText}>Add Property</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleAddProject}
              activeOpacity={0.7}>
              <Text style={styles.menuItemIcon}>🏗️</Text>
              <Text style={styles.menuItemText}>Add Project</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
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
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 100,
  },
  menuContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
  menuItemIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  menuItemText: {
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: spacing.md,
  },
});

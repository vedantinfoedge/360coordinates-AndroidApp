import React from 'react';
import {View, StyleSheet, Text} from 'react-native';

interface TabBarIconProps {
  name: 'home' | 'search' | 'chat' | 'profile' | 'favorites' | 'dashboard' | 'properties' | 'settings';
  color: string;
  focused: boolean;
  size?: number;
}

/**
 * Airbnb-style tab bar icons
 * Uses clean, minimal design with outline/filled states
 */
const TabBarIcon: React.FC<TabBarIconProps> = ({name, color, focused, size = 24}) => {
  const iconSize = size;
  const strokeWidth = focused ? 0 : 1.5;

  const renderIcon = () => {
    switch (name) {
      case 'home':
        return (
          <View style={[styles.iconContainer, {width: iconSize, height: iconSize}]}>
            {/* House roof */}
            <View
              style={[
                styles.homeRoof,
                {
                  borderLeftWidth: iconSize / 2,
                  borderRightWidth: iconSize / 2,
                  borderBottomWidth: iconSize * 0.4,
                  borderBottomColor: focused ? color : 'transparent',
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                },
              ]}
            />
            {!focused && (
              <View
                style={[
                  styles.homeRoofOutline,
                  {
                    width: 0,
                    height: 0,
                    borderLeftWidth: iconSize / 2 - 2,
                    borderRightWidth: iconSize / 2 - 2,
                    borderBottomWidth: iconSize * 0.35,
                    borderBottomColor: 'white',
                    borderLeftColor: 'transparent',
                    borderRightColor: 'transparent',
                    position: 'absolute',
                    top: 2,
                  },
                ]}
              />
            )}
            {/* House body */}
            <View
              style={[
                styles.homeBody,
                {
                  width: iconSize * 0.7,
                  height: iconSize * 0.45,
                  backgroundColor: focused ? color : 'transparent',
                  borderWidth: focused ? 0 : 1.5,
                  borderColor: color,
                  borderTopWidth: 0,
                  marginTop: -2,
                },
              ]}
            />
          </View>
        );

      case 'search':
        return (
          <View style={[styles.iconContainer, {width: iconSize, height: iconSize}]}>
            {/* Magnifying glass circle */}
            <View
              style={[
                styles.searchCircle,
                {
                  width: iconSize * 0.6,
                  height: iconSize * 0.6,
                  borderRadius: iconSize * 0.3,
                  backgroundColor: focused ? color : 'transparent',
                  borderWidth: focused ? 0 : 2,
                  borderColor: color,
                },
              ]}
            />
            {/* Handle */}
            <View
              style={[
                styles.searchHandle,
                {
                  width: iconSize * 0.35,
                  height: 2.5,
                  backgroundColor: color,
                  transform: [{rotate: '45deg'}],
                  position: 'absolute',
                  bottom: iconSize * 0.1,
                  right: iconSize * 0.05,
                },
              ]}
            />
          </View>
        );

      case 'chat':
        return (
          <View style={[styles.iconContainer, {width: iconSize, height: iconSize}]}>
            {/* Chat bubble */}
            <View
              style={[
                styles.chatBubble,
                {
                  width: iconSize * 0.9,
                  height: iconSize * 0.65,
                  borderRadius: iconSize * 0.15,
                  backgroundColor: focused ? color : 'transparent',
                  borderWidth: focused ? 0 : 1.8,
                  borderColor: color,
                },
              ]}
            />
            {/* Tail */}
            <View
              style={[
                styles.chatTail,
                {
                  width: 0,
                  height: 0,
                  borderLeftWidth: iconSize * 0.15,
                  borderRightWidth: iconSize * 0.15,
                  borderTopWidth: iconSize * 0.15,
                  borderTopColor: focused ? color : 'transparent',
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  position: 'absolute',
                  bottom: iconSize * 0.08,
                  left: iconSize * 0.15,
                },
              ]}
            />
            {!focused && (
              <View
                style={{
                  position: 'absolute',
                  bottom: iconSize * 0.12,
                  left: iconSize * 0.18,
                  width: iconSize * 0.2,
                  height: 1.8,
                  backgroundColor: color,
                  transform: [{rotate: '-45deg'}],
                }}
              />
            )}
          </View>
        );

      case 'profile':
        return (
          <View style={[styles.iconContainer, {width: iconSize, height: iconSize}]}>
            {/* Head */}
            <View
              style={[
                styles.profileHead,
                {
                  width: iconSize * 0.4,
                  height: iconSize * 0.4,
                  borderRadius: iconSize * 0.2,
                  backgroundColor: focused ? color : 'transparent',
                  borderWidth: focused ? 0 : 1.8,
                  borderColor: color,
                  marginBottom: 2,
                },
              ]}
            />
            {/* Body */}
            <View
              style={[
                styles.profileBody,
                {
                  width: iconSize * 0.7,
                  height: iconSize * 0.35,
                  borderTopLeftRadius: iconSize * 0.35,
                  borderTopRightRadius: iconSize * 0.35,
                  backgroundColor: focused ? color : 'transparent',
                  borderWidth: focused ? 0 : 1.8,
                  borderColor: color,
                  borderBottomWidth: 0,
                },
              ]}
            />
          </View>
        );

      case 'favorites':
        return (
          <View style={[styles.iconContainer, {width: iconSize, height: iconSize}]}>
            <Text
              style={{
                fontSize: iconSize * 0.9,
                color: color,
                lineHeight: iconSize,
                textAlign: 'center',
              }}>
              {focused ? '♥' : '♡'}
            </Text>
          </View>
        );

      case 'dashboard':
        return (
          <View style={[styles.iconContainer, {width: iconSize, height: iconSize}]}>
            <View style={styles.dashboardGrid}>
              {/* Top left */}
              <View
                style={[
                  styles.dashboardSquare,
                  {
                    width: iconSize * 0.4,
                    height: iconSize * 0.4,
                    backgroundColor: focused ? color : 'transparent',
                    borderWidth: focused ? 0 : 1.5,
                    borderColor: color,
                    borderRadius: 3,
                  },
                ]}
              />
              {/* Top right */}
              <View
                style={[
                  styles.dashboardSquare,
                  {
                    width: iconSize * 0.4,
                    height: iconSize * 0.4,
                    backgroundColor: focused ? color : 'transparent',
                    borderWidth: focused ? 0 : 1.5,
                    borderColor: color,
                    borderRadius: 3,
                  },
                ]}
              />
              {/* Bottom left */}
              <View
                style={[
                  styles.dashboardSquare,
                  {
                    width: iconSize * 0.4,
                    height: iconSize * 0.4,
                    backgroundColor: focused ? color : 'transparent',
                    borderWidth: focused ? 0 : 1.5,
                    borderColor: color,
                    borderRadius: 3,
                  },
                ]}
              />
              {/* Bottom right */}
              <View
                style={[
                  styles.dashboardSquare,
                  {
                    width: iconSize * 0.4,
                    height: iconSize * 0.4,
                    backgroundColor: focused ? color : 'transparent',
                    borderWidth: focused ? 0 : 1.5,
                    borderColor: color,
                    borderRadius: 3,
                  },
                ]}
              />
            </View>
          </View>
        );

      case 'properties':
        return (
          <View style={[styles.iconContainer, {width: iconSize, height: iconSize}]}>
            {/* Building */}
            <View
              style={[
                styles.building,
                {
                  width: iconSize * 0.7,
                  height: iconSize * 0.8,
                  backgroundColor: focused ? color : 'transparent',
                  borderWidth: focused ? 0 : 1.5,
                  borderColor: color,
                  borderRadius: 2,
                },
              ]}>
              {/* Windows */}
              {!focused && (
                <>
                  <View style={[styles.window, {backgroundColor: color, top: 4, left: 4}]} />
                  <View style={[styles.window, {backgroundColor: color, top: 4, right: 4}]} />
                  <View style={[styles.window, {backgroundColor: color, top: 12, left: 4}]} />
                  <View style={[styles.window, {backgroundColor: color, top: 12, right: 4}]} />
                </>
              )}
            </View>
          </View>
        );

      case 'settings':
        return (
          <View style={[styles.iconContainer, {width: iconSize, height: iconSize}]}>
            {/* Gear outer */}
            <View
              style={[
                styles.settingsOuter,
                {
                  width: iconSize * 0.8,
                  height: iconSize * 0.8,
                  borderRadius: iconSize * 0.4,
                  backgroundColor: focused ? color : 'transparent',
                  borderWidth: focused ? 0 : 1.8,
                  borderColor: color,
                },
              ]}>
              {/* Inner circle */}
              <View
                style={{
                  width: iconSize * 0.3,
                  height: iconSize * 0.3,
                  borderRadius: iconSize * 0.15,
                  backgroundColor: focused ? '#FFFFFF' : 'transparent',
                  borderWidth: focused ? 0 : 1.5,
                  borderColor: color,
                }}
              />
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return <View style={styles.container}>{renderIcon()}</View>;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeRoof: {
    width: 0,
    height: 0,
  },
  homeRoofOutline: {},
  homeBody: {
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  searchCircle: {},
  searchHandle: {},
  chatBubble: {},
  chatTail: {},
  profileHead: {},
  profileBody: {},
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  dashboardSquare: {},
  building: {
    position: 'relative',
  },
  window: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 1,
  },
  settingsOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TabBarIcon;

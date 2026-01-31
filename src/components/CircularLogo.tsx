import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {colors} from '../theme';

interface CircularLogoProps {
  size?: number;
  style?: ViewStyle;
}

const CircularLogo: React.FC<CircularLogoProps> = ({
  size = 120,
  style,
}) => {
  return (
    <View style={[styles.container, {width: size, height: size}, style]}>
      {/* Dark Blue Circle Background */}
      <View style={[styles.circle, {width: size, height: size, borderRadius: size / 2}]}>
        {/* House Icon (Purple) */}
        <View style={styles.houseContainer}>
          <View style={styles.house}>
            {/* Roof */}
            <View style={styles.houseRoof} />
            {/* Base */}
            <View style={styles.houseBase}>
              {/* Door */}
              <View style={styles.houseDoor} />
            </View>
          </View>
        </View>

        {/* Main Text */}
        <Text style={[styles.mainText, {fontSize: size * 0.15}]}>
          360Coordinates
        </Text>

        {/* Purple Underline */}
        <View style={styles.underline} />

        {/* Subtitle */}
        <Text style={[styles.subtitle, {fontSize: size * 0.08}]}>
          REAL ESTATE
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    backgroundColor: colors.primary, // Dark blue
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  houseContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
  },
  house: {
    alignItems: 'center',
  },
  houseRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#A78BFA', // Purple
    marginBottom: -1,
  },
  houseBase: {
    width: 16,
    height: 12,
    backgroundColor: '#A78BFA', // Purple
    alignItems: 'center',
    justifyContent: 'center',
  },
  houseDoor: {
    width: 4,
    height: 6,
    backgroundColor: colors.primary,
  },
  mainText: {
    color: colors.surface,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  underline: {
    width: '85%',
    height: 2,
    backgroundColor: '#A78BFA', // Purple
    marginTop: 4,
    marginBottom: 4,
  },
  subtitle: {
    color: colors.surface,
    fontWeight: '500',
    letterSpacing: 1,
  },
});

export default CircularLogo;


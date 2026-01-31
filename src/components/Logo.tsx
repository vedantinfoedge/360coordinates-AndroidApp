import React from 'react';
import {View, Text, StyleSheet, ViewStyle, TextStyle} from 'react-native';
import {colors, typography} from '../theme';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showSubtitle?: boolean;
  style?: ViewStyle;
  textColor?: string;
  houseColor?: string;
}

const Logo: React.FC<LogoProps> = ({
  size = 'medium',
  showSubtitle = true,
  style,
  textColor = colors.surface,
  houseColor = '#A78BFA', // Light purple/lavender
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          mainText: {fontSize: 18, fontWeight: '700' as const},
          subtitleText: {fontSize: 8},
          houseHeight: 2,
          houseOffset: 2,
        };
      case 'large':
        return {
          mainText: {fontSize: 36, fontWeight: '700' as const},
          subtitleText: {fontSize: 14},
          houseHeight: 4,
          houseOffset: 4,
        };
      default:
        return {
          mainText: {fontSize: 24, fontWeight: '700' as const},
          subtitleText: {fontSize: 10},
          houseHeight: 3,
          houseOffset: 3,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View style={[styles.container, style]}>
      {/* Main Logo with House Outline */}
      <View style={[styles.logoContainer, {paddingLeft: sizeStyles.houseHeight * 2}]}>
        {/* House Left Vertical Line */}
        <View
          style={[
            styles.houseLeftLine,
            {
              width: sizeStyles.houseHeight,
              backgroundColor: houseColor,
            },
          ]}
        />

        {/* House Roof (triangular above "India") */}
        <View
          style={[
            styles.houseRoof,
            {
              borderLeftWidth: sizeStyles.houseHeight * 3,
              borderRightWidth: sizeStyles.houseHeight * 3,
              borderBottomWidth: sizeStyles.houseHeight * 4,
              borderBottomColor: houseColor,
              top: -sizeStyles.houseOffset * 2,
            },
          ]}
        />

        {/* Main Text */}
        <Text style={[styles.mainText, sizeStyles.mainText, {color: textColor}]}>
          360Coordinates
        </Text>

        {/* House Base (underline beneath "propertys") */}
        <View
          style={[
            styles.houseBase,
            {
              height: sizeStyles.houseHeight,
              backgroundColor: houseColor,
            },
          ]}
        />
      </View>

      {/* Subtitle */}
      {showSubtitle && (
        <Text style={[styles.subtitle, sizeStyles.subtitleText, {color: textColor}]}>
          REAL ESTATE
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  houseLeftLine: {
    position: 'absolute',
    left: 0,
    top: '30%',
    height: '40%',
    borderRadius: 1,
  },
  mainText: {
    letterSpacing: 0.5,
  },
  houseRoof: {
    position: 'absolute',
    left: 0,
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
  },
  houseBase: {
    width: '85%',
    marginTop: 2,
    borderRadius: 1,
    alignSelf: 'flex-start',
  },
  subtitle: {
    marginTop: 4,
    letterSpacing: 1,
    fontWeight: '500' as const,
  },
});

export default Logo;


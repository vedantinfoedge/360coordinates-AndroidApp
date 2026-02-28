import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  BackHandler,
  Keyboard,
} from 'react-native';
import {useArcFAB, ArcRole} from '../../context/ArcFABContext';
import {scale, moderateScale} from '../../utils/responsive';
import {colors, spacing, typography, borderRadius, shadows} from '../../theme';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const MIN_TOUCH = 44;
const ARC_RADIUS_BASE = 140;
const ARC_RADIUS_SMALL = 120;
const ARC_RADIUS_LARGE = 150;

function getArcRadius(): number {
  if (SCREEN_WIDTH <= 375) return scale(ARC_RADIUS_SMALL);
  if (SCREEN_WIDTH >= 428) return scale(ARC_RADIUS_LARGE);
  return scale(ARC_RADIUS_BASE);
}

// Colors and layout match second reference: Builder orange, Agent light blue, Seller green; pills horizontal (no rotation)
const ROLES: {role: ArcRole; angleDeg: number; label: string; icon: string; color: string}[] = [
  {role: 'agent', angleDeg: 160, label: 'Agent', icon: '💼', color: '#5BA4D4'},
  {role: 'builder', angleDeg: 90, label: 'Builder', icon: '🏗️', color: '#ed6c02'},
  {role: 'seller', angleDeg: 20, label: 'Seller', icon: '👤', color: '#2e7d32'},
];

function polarToCartesian(radius: number, angleDeg: number): {x: number; y: number} {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: radius * Math.cos(rad),
    y: -radius * Math.sin(rad),
  };
}

const STAGGER_MS = 65;
const PILL_WIDTH = 100;
const PILL_HEIGHT = 44;

export default function BuyerArcFABMenu() {
  const {isMenuOpen, closeMenu, fabCenter, onRoleSelect} = useArcFAB();
  const radius = getArcRadius();

  useEffect(() => {
    if (!isMenuOpen) return;
    Keyboard.dismiss();
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeMenu();
      return true;
    });
    return () => sub.remove();
  }, [isMenuOpen, closeMenu]);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const fabRotate = useRef(new Animated.Value(0)).current;
  const pillAnims = useRef(
    ROLES.map(() => ({
      progress: new Animated.Value(0),
      scale: new Animated.Value(0.75),
      opacity: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    if (!isMenuOpen) return;

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(fabRotate, {
        toValue: 1,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
      ...pillAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(i * STAGGER_MS),
          Animated.parallel([
            Animated.spring(anim.progress, {
              toValue: 1,
              friction: 7,
              tension: 60,
              useNativeDriver: true,
            }),
            Animated.spring(anim.scale, {
              toValue: 1,
              friction: 6,
              tension: 80,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 280,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ),
    ]).start();
  }, [isMenuOpen]);

  useEffect(() => {
    if (isMenuOpen) return;
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(fabRotate, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      ...pillAnims.map(anim =>
        Animated.parallel([
          Animated.timing(anim.progress, {toValue: 0, duration: 150, useNativeDriver: true}),
          Animated.timing(anim.scale, {toValue: 0.75, duration: 150, useNativeDriver: true}),
          Animated.timing(anim.opacity, {toValue: 0, duration: 120, useNativeDriver: true}),
        ]),
      ),
    ]).start();
  }, [isMenuOpen]);

  if (!isMenuOpen) return null;

  const arcContainerStyle = {
    position: 'absolute' as const,
    left: fabCenter.x - radius,
    top: fabCenter.y - 2 * radius,
    width: 2 * radius,
    height: 2 * radius,
  };

  const overlayBlur = <View style={[StyleSheet.absoluteFill, {backgroundColor: colors.overlay}]} />;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: overlayOpacity,
            zIndex: 1000,
          },
        ]}
        pointerEvents="box-none">
        {overlayBlur}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(0,0,0,0.35)',
              opacity: overlayOpacity,
            },
          ]}
        />
      </Animated.View>

      {/* Full-screen tap target on top of blur + pills; tapping anywhere (including over the FAB/X) closes the menu */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={closeMenu}
        accessibilityLabel="Close menu"
      />

      <View style={[styles.pillsContainer, arcContainerStyle]} pointerEvents="box-none">
        {ROLES.map((item, index) => {
          const {progress, scale: scaleAnim, opacity} = pillAnims[index];
          const endPos = polarToCartesian(radius, item.angleDeg);

          return (
            <Animated.View
              key={item.role}
              style={[
                styles.pillWrap,
                {
                  left: radius + endPos.x - PILL_WIDTH / 2,
                  top: radius + endPos.y - PILL_HEIGHT / 2,
                  width: PILL_WIDTH,
                  height: PILL_HEIGHT,
                  transform: [
                    {
                      translateX: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-endPos.x, 0],
                      }),
                    },
                    {
                      translateY: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-endPos.y, 0],
                      }),
                    },
                    {scale: scaleAnim},
                  ],
                  opacity,
                },
              ]}
              pointerEvents="box-none">
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.pill, {backgroundColor: item.color, minHeight: MIN_TOUCH}]}
                onPress={() => {
                  closeMenu();
                  onRoleSelect(item.role);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Register as ${item.label}`}>
                <View style={styles.pillInner}>
                  <Text style={styles.pillIcon}>{item.icon}</Text>
                  <Text style={styles.pillLabel}>{item.label}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pillsContainer: {
    zIndex: 1001,
  },
  pillWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.round,
    minWidth: moderateScale(100),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    ...shadows.card,
  },
  pillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pillIcon: {
    fontSize: 18,
  },
  pillLabel: {
    ...typography.captionSemibold,
    color: colors.surface,
  },
});

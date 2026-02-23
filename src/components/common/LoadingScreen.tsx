import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, Pattern, Line, Rect, Path, Circle } from 'react-native-svg';
import { fonts } from '../../theme/colors';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

const { width: WIDTH, height: HEIGHT } = Dimensions.get('window');

// Design tokens from HTML
const COLORS = {
  bg: '#060E1C',
  bgGradStart: '#05101F',
  bgGradMid: '#091525',
  bgGradEnd: '#060E1A',
  glow: 'rgba(21,101,192,0.11)',
  phoneBody: ['#192840', '#0D1C2E'],
  phoneBorder: 'rgba(255,255,255,0.13)',
  topbar: '#0B1F3A',
  slotBg: 'rgba(255,255,255,0.04)',
  activeBuyer: 'rgba(21,101,192,0.18)',
  activeSeller: 'rgba(255,120,0,0.16)',
  activeAgent: 'rgba(124,77,255,0.16)',
  activeBuilder: 'rgba(0,180,130,0.16)',
  buyerAccent: '#1565C0',
  sellerAccent: '#FF8C00',
  agentAccent: '#7C4DFF',
  builderAccent: '#00B482',
  blueDot: '#64B5F6',
  orangeDot: '#FFAB40',
  purpleDot: '#B39DDB',
  tealDot: '#80CBC4',
  logoBlue: '#2196F3',
  textMuted: 'rgba(255,255,255,0.25)',
  textFaint: 'rgba(255,255,255,0.12)',
};

const LOADING_MESSAGES = [
  'Connecting buyers, sellers, agents & builders…',
  'Loading property listings across Maharashtra…',
  'Fetching agent & builder profiles…',
  'Syncing seller dashboards…',
  'Preparing your 360° experience…',
];

type LoadingScreenProps = {
  message?: string;
  /** If provided, overrides cycling messages */
  customMessage?: string;
};

const GridPattern: React.FC = () => (
  <Svg width={WIDTH} height={HEIGHT} style={StyleSheet.absoluteFill} pointerEvents="none">
    <Defs>
      <Pattern id="grid" width={32} height={32} patternUnits="userSpaceOnUse">
        <Line x1={0} y1={0} x2={0} y2={32} stroke="rgba(255,255,255,1)" strokeWidth={1} />
        <Line x1={0} y1={0} x2={32} y2={0} stroke="rgba(255,255,255,1)" strokeWidth={1} />
      </Pattern>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#grid)" opacity={0.028} />
  </Svg>
);

// Flying card data
const FLYING_CARDS = [
  { type: 'buyer', bg: '#E3F2FD', tag: 'BUY', emoji: '🏢', title: '3BHK Apartment', loc: 'Baner, Pune', price: '₹2.0 Cr', priceColor: '#1565C0' },
  { type: 'seller', name: 'Priya Desai', role: 'Seller / Owner', emoji: '👩', badge: 'Posted', badgeBg: '#FFF3E0', prop: '2BHK – Nashik', propPrice: '₹85 L' },
  { type: 'agent', name: 'Rahul Mehta', role: 'Certified Agent', emoji: '🤝', badge: 'RERA Certified', badgeBg: '#EDE7F6', stats: ['48', '4.8★', '120+'] },
  { type: 'builder', emoji: '🏗️', project: 'Skyline Residency', dev: 'by Vedant Builders', price: '₹45L–₹1.2Cr', units: '12 units' },
  { type: 'buyer', bg: '#E8F5E9', tag: 'RENT', emoji: '🏠', title: '1BHK Flat', loc: 'Kothrud, Pune', price: '₹14K/mo', priceColor: '#2E7D32' },
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message, customMessage }) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const [slotIndex, setSlotIndex] = useState(0);

  const glowOpacity = useRef(new Animated.Value(0.8)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const msgOpacity = useRef(new Animated.Value(1)).current;
  const dotAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0.18))).current;

  const cardAnims = useRef(
    [0, 1, 2, 3, 4].map(() => ({
      opacity: new Animated.Value(0),
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      scale: new Animated.Value(0.6),
    }))
  ).current;

  // Glow pulse
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.8,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glowOpacity]);

  // Progress bar
  useEffect(() => {
    progressWidth.setValue(0);
    Animated.timing(progressWidth, {
      toValue: 0.97,
      duration: 5000,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start();
  }, [progressWidth]);

  // Cycling loading messages (only when no custom/message prop)
  useEffect(() => {
    if (customMessage ?? message) return;
    const id = setInterval(() => {
      Animated.timing(msgOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setMsgIndex(i => (i + 1) % LOADING_MESSAGES.length);
        Animated.timing(msgOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    }, 2400);
    return () => clearInterval(id);
  }, [customMessage, msgOpacity]);

  // Slot cycle: buyer → seller → agent → builder
  useEffect(() => {
    const id = setInterval(() => {
      setSlotIndex(i => (i >= 3 ? 0 : i + 1));
    }, 1100);
    return () => clearInterval(id);
  }, []);

  // Animated dots
  useEffect(() => {
    const anims = dotAnims.map((val, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: 1,
            duration: 700,
            delay: i * 90,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0.18,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [dotAnims]);

  // Flying card animation (simplified - stagger a few cards)
  useEffect(() => {
    const runCard = (idx: number, delay: number) => {
      const c = cardAnims[idx];
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(c.opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(c.translateX, {
            toValue: 1,
            duration: 2400,
            easing: Easing.bezier(0.4, 0, 0.3, 1),
            useNativeDriver: true,
          }),
          Animated.timing(c.translateY, {
            toValue: 1,
            duration: 2400,
            easing: Easing.bezier(0.4, 0, 0.3, 1),
            useNativeDriver: true,
          }),
          Animated.timing(c.scale, {
            toValue: 0.85,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setTimeout(() => {
            Animated.parallel([
              Animated.timing(c.opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
              Animated.timing(c.translateX, { toValue: 0, duration: 200, useNativeDriver: true }),
              Animated.timing(c.translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
              Animated.timing(c.scale, { toValue: 0.15, duration: 200, useNativeDriver: true }),
            ]).start(() => {
              c.translateX.setValue(0);
              c.translateY.setValue(0);
              c.scale.setValue(0.6);
              runCard(idx, 3500);
            });
          }, 800);
        });
      }, delay);
    };
    [0, 1, 2, 3, 4].forEach((i, d) => runCard(i, d * 700));
  }, [cardAnims]);

  const displayMessage = customMessage ?? message ?? LOADING_MESSAGES[msgIndex];

  const getSlotStyle = (i: number) => {
    if (slotIndex !== i) return styles.phSlot;
    if (i === 0) return [styles.phSlot, styles.activeBuyer];
    if (i === 1) return [styles.phSlot, styles.activeSeller];
    if (i === 2) return [styles.phSlot, styles.activeAgent];
    return [styles.phSlot, styles.activeBuilder];
  };

  const renderFlyingCard = (idx: number) => {
    const card = FLYING_CARDS[idx];
    const c = cardAnims[idx];
    const tx = c.translateX.interpolate({
      inputRange: [0, 1],
      outputRange: idx % 2 === 0 ? [-scale(80), 0] : [scale(80), 0],
    });
    const ty = c.translateY.interpolate({
      inputRange: [0, 1],
      outputRange: [-verticalScale(90), 0],
    });

    if (card.type === 'buyer') {
      return (
        <Animated.View
          key={idx}
          style={[
            styles.fc,
            styles.buyerCard,
            {
              opacity: c.opacity,
              transform: [{ translateX: tx }, { translateY: ty }, { scale: c.scale }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={[styles.bcImg, { backgroundColor: card.bg }]}>
            <Text style={styles.bcEmoji}>{card.emoji}</Text>
            <View style={[styles.bcTag, { backgroundColor: card.priceColor }]}>
              <Text style={styles.bcTagText}>{card.tag}</Text>
            </View>
          </View>
          <View style={styles.bcBody}>
            <Text style={styles.bcTitle}>{card.title}</Text>
            <Text style={styles.bcLoc}>📍 {card.loc}</Text>
            <Text style={[styles.bcPrice, { color: card.priceColor }]}>{card.price}</Text>
          </View>
        </Animated.View>
      );
    }
    if (card.type === 'seller') {
      return (
        <Animated.View
          key={idx}
          style={[
            styles.fc,
            styles.sellerCard,
            {
              opacity: c.opacity,
              transform: [{ translateX: tx }, { translateY: ty }, { scale: c.scale }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.scHead}>
            <View style={[styles.scAvatar, { backgroundColor: card.badgeBg }]}>
              <Text style={styles.scEmoji}>{card.emoji}</Text>
            </View>
            <View>
              <Text style={styles.scName}>{card.name}</Text>
              <Text style={styles.scRole}>{card.role}</Text>
            </View>
          </View>
          <View style={[styles.scBadge, { backgroundColor: card.badgeBg }]}>
            <Text style={styles.scBadgeText}>📤 {card.badge}</Text>
          </View>
          <View style={styles.scProp}>
            <Text style={styles.scPropName}>{card.prop}</Text>
            <Text style={styles.scPropPrice}>{card.propPrice}</Text>
          </View>
        </Animated.View>
      );
    }
    if (card.type === 'agent') {
      return (
        <Animated.View
          key={idx}
          style={[
            styles.fc,
            styles.agentCard,
            {
              opacity: c.opacity,
              transform: [{ translateX: tx }, { translateY: ty }, { scale: c.scale }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.acHead}>
            <View style={[styles.acAvatar, { backgroundColor: card.badgeBg }]}>
              <Text style={styles.acEmoji}>{card.emoji}</Text>
            </View>
            <View>
              <Text style={styles.acName}>{card.name}</Text>
              <Text style={styles.acRole}>{card.role}</Text>
            </View>
          </View>
          <View style={[styles.acBadge, { backgroundColor: card.badgeBg }]}>
            <Text style={styles.acBadgeText}>✅ {card.badge}</Text>
          </View>
          <View style={styles.acStats}>
            {(card.stats as string[]).map((s, i) => (
              <View key={i} style={styles.acStat}>
                <Text style={styles.acStatVal}>{s}</Text>
                <Text style={styles.acStatLabel}>
                  {i === 0 ? 'Listings' : i === 1 ? 'Rating' : 'Deals'}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      );
    }
    if (card.type === 'builder') {
      return (
        <Animated.View
          key={idx}
          style={[
            styles.fc,
            styles.builderCard,
            {
              opacity: c.opacity,
              transform: [{ translateX: tx }, { translateY: ty }, { scale: c.scale }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={[styles.bldrImg, { backgroundColor: '#E0F2F1' }]}>
            <Text style={styles.bldrEmoji}>{card.emoji}</Text>
            <View style={styles.bldrBadge}>
              <Text style={styles.bldrBadgeText}>BUILDER</Text>
            </View>
          </View>
          <View style={styles.bldrBody}>
            <Text style={styles.bldrProject}>{card.project}</Text>
            <Text style={styles.bldrDev}>{card.dev}</Text>
            <View style={styles.bldrRow}>
              <Text style={styles.bldrPrice}>{card.price}</Text>
              <Text style={styles.bldrUnits}>{card.units}</Text>
            </View>
          </View>
        </Animated.View>
      );
    }
    return null;
  };

  return (
    <View style={styles.outer}>
      <LinearGradient
        colors={[COLORS.bgGradStart, COLORS.bgGradMid, COLORS.bgGradEnd]}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.55, 1]}
      />
      <GridPattern />
      <Animated.View style={[styles.bgGlow, { opacity: glowOpacity }]} />

      {/* Stage */}
      <View style={styles.stage}>
        {[0, 1, 2, 3, 4].map(renderFlyingCard)}

        {/* Illustrated Phone */}
        <View style={styles.iPhone}>
          <View style={styles.phBody}>
            <View style={styles.phNotch} />
            <View style={styles.phScreen}>
              <View style={styles.phTopbar}>
                <View style={styles.phTbDot} />
                <View style={styles.phTbBar} />
                <Text style={styles.phTbLbl}>360°</Text>
              </View>
              <View style={getSlotStyle(0)}>
                <View style={[styles.phSlotIco, { backgroundColor: '#E3F2FD' }]}>
                  <Text style={styles.phSlotEmoji}>🏢</Text>
                </View>
                <View style={styles.phSlotLines}>
                  <View style={styles.phSlotLine} />
                  <View style={[styles.phSlotLine, { width: '60%' }]} />
                </View>
                <Text style={[styles.phSlotTag, slotIndex === 0 && styles.phSlotTagBuyer]}>Buyer 👁</Text>
              </View>
              <View style={getSlotStyle(1)}>
                <View style={[styles.phSlotIco, { backgroundColor: '#FFF3E0' }]}>
                  <Text style={styles.phSlotEmoji}>👩</Text>
                </View>
                <View style={styles.phSlotLines}>
                  <View style={styles.phSlotLine} />
                  <View style={[styles.phSlotLine, { width: '55%' }]} />
                </View>
                <Text style={[styles.phSlotTag, slotIndex === 1 && styles.phSlotTagSeller]}>Seller 📤</Text>
              </View>
              <View style={getSlotStyle(2)}>
                <View style={[styles.phSlotIco, { backgroundColor: '#EDE7F6' }]}>
                  <Text style={styles.phSlotEmoji}>🤝</Text>
                </View>
                <View style={styles.phSlotLines}>
                  <View style={styles.phSlotLine} />
                  <View style={[styles.phSlotLine, { width: '58%' }]} />
                </View>
                <Text style={[styles.phSlotTag, slotIndex === 2 && styles.phSlotTagAgent]}>Agent ✅</Text>
              </View>
              <View style={getSlotStyle(3)}>
                <View style={[styles.phSlotIco, { backgroundColor: '#E0F2F1' }]}>
                  <Text style={styles.phSlotEmoji}>🏗️</Text>
                </View>
                <View style={styles.phSlotLines}>
                  <View style={styles.phSlotLine} />
                  <View style={[styles.phSlotLine, { width: '52%' }]} />
                </View>
                <Text style={[styles.phSlotTag, slotIndex === 3 && styles.phSlotTagBuilder]}>Builder 🏗️</Text>
              </View>
            </View>
            <View style={styles.phHomekey} />
            <View style={styles.phSidekey} />
          </View>
        </View>
      </View>

      {/* Role pills */}
      <View style={styles.rolePills}>
        <View style={styles.rpill}>
          <View style={[styles.rpdot, { backgroundColor: COLORS.blueDot }]} />
          <Text style={styles.rplbl}>Buyers</Text>
        </View>
        <View style={styles.rpill}>
          <View style={[styles.rpdot, { backgroundColor: COLORS.orangeDot }]} />
          <Text style={styles.rplbl}>Sellers</Text>
        </View>
        <View style={styles.rpill}>
          <View style={[styles.rpdot, { backgroundColor: COLORS.purpleDot }]} />
          <Text style={styles.rplbl}>Agents</Text>
        </View>
        <View style={styles.rpill}>
          <View style={[styles.rpdot, { backgroundColor: COLORS.tealDot }]} />
          <Text style={styles.rplbl}>Builders</Text>
        </View>
      </View>

      {/* Bottom */}
      <View style={styles.bottom}>
        <View style={styles.bLogo}>
          <View style={styles.bLogoText}>
            <Text style={styles.bLogo3}>3</Text>
            <Text style={styles.bLogo60}>60</Text>
            <Svg width={scale(18)} height={scale(14)} viewBox="0 0 100 80" style={styles.bLogoPin}>
              <Path d="M88 4C83.6 4 80 7.6 80 12C80 17.8 88 28 88 28C88 28 96 17.8 96 12C96 7.6 92.4 4 88 4Z" fill="#2196F3" />
              <Circle cx={88} cy={12} r={3.5} fill="white" />
            </Svg>
          </View>
          <Text style={styles.bName}>360Coordinates</Text>
        </View>
        <Text style={styles.bTag}>Your Property, Your Coordinates</Text>
        <View style={styles.bDots}>
          {dotAnims.map((val, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  opacity: val,
                  transform: [
                    {
                      scale: val.interpolate({
                        inputRange: [0.18, 1],
                        outputRange: [1, 1.4],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.bProg}>
          <Animated.View
            style={[
              styles.bPfill,
              {
                width: progressWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, scale(247)],
                }),
              },
            ]}
          />
        </View>
        <Animated.Text style={[styles.bMsg, { opacity: msgOpacity }]}>{displayMessage}</Animated.Text>
        <Text style={styles.bCo}>Vedant Infoedge India LLP</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(20),
  },
  bgGlow: {
    position: 'absolute',
    width: scale(400),
    height: scale(400),
    borderRadius: scale(200),
    backgroundColor: COLORS.glow,
    top: '42%',
    left: '50%',
    marginLeft: -scale(200),
    marginTop: -scale(200),
  },
  stage: {
    width: scale(340),
    height: verticalScale(430),
    alignItems: 'center',
    justifyContent: 'center',
  },
  fc: {
    position: 'absolute',
    zIndex: 20,
  },
  buyerCard: {
    width: scale(80),
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 24 }, android: { elevation: 8 }, default: {} }),
  },
  bcImg: {
    height: scale(30),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bcEmoji: { fontSize: 15 },
  bcTag: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  bcTagText: { fontSize: 9, fontWeight: '800', color: 'white' },
  bcBody: { padding: 4 },
  bcTitle: { fontSize: 10, fontWeight: '800', color: '#0D1B2E' },
  bcLoc: { fontSize: 8, color: '#8A97A8' },
  bcPrice: { fontSize: 11, fontWeight: '800' },
  sellerCard: {
    width: scale(86),
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 7,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 24 }, android: { elevation: 8 }, default: {} }),
  },
  scHead: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  scAvatar: { width: 20, height: 20, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  scEmoji: { fontSize: 10 },
  scName: { fontSize: 10, fontWeight: '800', color: '#0D1B2E' },
  scRole: { fontSize: 8, color: '#8A97A8' },
  scBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 4 },
  scBadgeText: { fontSize: 9, fontWeight: '800', color: '#E65100' },
  scProp: { backgroundColor: '#F8F9FB', borderRadius: 6, padding: 4 },
  scPropName: { fontSize: 9, fontWeight: '800', color: '#0D1B2E' },
  scPropPrice: { fontSize: 10, fontWeight: '800', color: '#1565C0' },
  agentCard: {
    width: scale(84),
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 7,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 24 }, android: { elevation: 8 }, default: {} }),
  },
  acHead: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  acAvatar: { width: 22, height: 22, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  acEmoji: { fontSize: 11 },
  acName: { fontSize: 10, fontWeight: '800', color: '#0D1B2E' },
  acRole: { fontSize: 8, color: '#8A97A8' },
  acBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 4 },
  acBadgeText: { fontSize: 9, fontWeight: '800', color: '#6A1B9A' },
  acStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 4 },
  acStat: { flex: 1, alignItems: 'center' },
  acStatVal: { fontSize: 12, fontWeight: '800', color: '#0D1B2E' },
  acStatLabel: { fontSize: 7, color: '#8A97A8' },
  builderCard: {
    width: scale(84),
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 24 }, android: { elevation: 8 }, default: {} }),
  },
  bldrImg: {
    height: scale(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bldrEmoji: { fontSize: 14 },
  bldrBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#00897B',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  bldrBadgeText: { fontSize: 8, fontWeight: '800', color: 'white' },
  bldrBody: { padding: 4 },
  bldrProject: { fontSize: 10, fontWeight: '800', color: '#0D1B2E' },
  bldrDev: { fontSize: 8, color: '#8A97A8' },
  bldrRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bldrPrice: { fontSize: 10, fontWeight: '800', color: '#00897B' },
  bldrUnits: { fontSize: 8, color: '#8A97A8', backgroundColor: '#F0FBF9', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3, fontWeight: '700' },
  iPhone: {
    position: 'relative',
    zIndex: 10,
    width: scale(114),
    height: verticalScale(208),
  },
  phBody: {
    flex: 1,
    width: '100%',
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: COLORS.phoneBorder,
    overflow: 'hidden',
    backgroundColor: '#192840',
  },
  phNotch: {
    width: scale(34),
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    alignSelf: 'center',
  },
  phScreen: {
    flex: 1,
    padding: 5,
  },
  phTopbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.topbar,
    borderRadius: 5,
    height: 13,
    paddingHorizontal: 5,
    marginBottom: 3,
  },
  phTbDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2196F3',
  },
  phTbBar: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1, marginHorizontal: 3 },
  phTbLbl: { fontSize: 6, fontWeight: '800', color: 'rgba(255,255,255,0.35)' },
  phSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    marginBottom: 3,
    backgroundColor: COLORS.slotBg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  activeBuyer: { backgroundColor: COLORS.activeBuyer, borderColor: 'rgba(30,136,229,0.4)' },
  activeSeller: { backgroundColor: COLORS.activeSeller, borderColor: 'rgba(255,140,0,0.4)' },
  activeAgent: { backgroundColor: COLORS.activeAgent, borderColor: 'rgba(150,100,255,0.4)' },
  activeBuilder: { backgroundColor: COLORS.activeBuilder, borderColor: 'rgba(0,196,140,0.4)' },
  phSlotIco: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phSlotEmoji: { fontSize: 10 },
  phSlotLines: { flex: 1, marginLeft: 4 },
  phSlotLine: {
    height: 2.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 1.5,
    marginBottom: 2,
  },
  phSlotTag: {
    fontSize: 7,
    fontWeight: '800',
    opacity: 0,
  },
  phSlotTagBuyer: { opacity: 1, backgroundColor: 'rgba(30,136,229,0.25)', color: '#90CAF9', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3 },
  phSlotTagSeller: { opacity: 1, backgroundColor: 'rgba(255,140,0,0.22)', color: '#FFCC80', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3 },
  phSlotTagAgent: { opacity: 1, backgroundColor: 'rgba(150,100,255,0.22)', color: '#CE93D8', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3 },
  phSlotTagBuilder: { opacity: 1, backgroundColor: 'rgba(0,196,140,0.2)', color: '#80CBC4', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3 },
  phHomekey: {
    width: scale(28),
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 5,
  },
  phSidekey: {
    position: 'absolute',
    right: -3,
    top: verticalScale(46),
    width: 3,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderRadius: 2,
  },
  rolePills: {
    flexDirection: 'row',
    gap: 7,
    marginTop: -6,
  },
  rpill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  rpdot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rplbl: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.38)',
  },
  bottom: {
    width: scale(255),
    alignItems: 'center',
    gap: 7,
    marginTop: 8,
  },
  bLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  bLogoText: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bLogo3: {
    fontSize: moderateScale(20),
    fontFamily: fonts.extraBold,
    fontWeight: '800',
    color: '#2196F3',
  },
  bLogo60: {
    fontSize: moderateScale(20),
    fontFamily: fonts.extraBold,
    fontWeight: '800',
    color: 'white',
  },
  bLogoPin: {
    marginLeft: 2,
  },
  bName: {
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: COLORS.logoBlue,
  },
  bTag: {
    fontSize: moderateScale(10.5),
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  bDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E88E5',
  },
  bProg: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  bPfill: {
    height: '100%',
    backgroundColor: COLORS.buyerAccent,
    borderRadius: 3,
  },
  bMsg: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  bCo: {
    fontSize: moderateScale(9),
    color: COLORS.textFaint,
    fontWeight: '500',
  },
});

export default LoadingScreen;

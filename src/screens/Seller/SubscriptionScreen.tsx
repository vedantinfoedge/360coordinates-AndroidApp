import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {SellerTabParamList} from '../../components/navigation/SellerTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import SellerHeader from '../../components/SellerHeader';
import {sellerService, DashboardStats} from '../../services/seller.service';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

type SubscriptionScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<SellerTabParamList, 'Subscription'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: SubscriptionScreenNavigationProp;
};

interface TimerState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

interface SubscriptionPlan {
  name: string;
  description: string;
  price: string;
  duration: string;
  planType: string; // Database value: 'basic', 'pro', 'premium'
  features: string[];
  popular: boolean;
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    name: 'Basic',
    description: 'Perfect for getting started with property listings',
    price: '999',
    duration: '/month',
    planType: 'basic',
    features: [
      'Up to 5 Property Listings',
      'Basic Analytics',
      'Email Support',
      'Standard Visibility',
      '30 Days Listing Duration',
    ],
    popular: false,
  },
  {
    name: 'Professional',
    description: 'Best for serious sellers with multiple properties',
    price: '2,499',
    duration: '/month',
    planType: 'pro',
    features: [
      'Up to 20 Property Listings',
      'Advanced Analytics & Insights',
      'Priority Support 24/7',
      'Featured Listings',
      '90 Days Listing Duration',
      'Social Media Promotion',
    ],
    popular: true,
  },
  {
    name: 'Enterprise',
    description: 'For agencies and high-volume sellers',
    price: '4,999',
    duration: '/month',
    planType: 'premium',
    features: [
      'Unlimited Property Listings',
      'Premium Analytics Dashboard',
      'Dedicated Account Manager',
      'Top Search Placement',
      '1 Year Listing Duration',
      'Marketing Campaign Support',
    ],
    popular: false,
  },
];

const SubscriptionScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout} = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<DashboardStats['subscription'] | null>(null);
  const [timerState, setTimerState] = useState<TimerState>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const clockRotation = useRef(new Animated.Value(0)).current;

  // Animate clock icon rotation
  useEffect(() => {
    const rotateClock = () => {
      Animated.loop(
        Animated.timing(clockRotation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ).start();
    };
    rotateClock();
  }, []);

  const clockInterpolate = clockRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    loadSubscriptionData();
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const response: any = await sellerService.getDashboardStats();
      if (response && response.success && response.data) {
        const sub = response.data.subscription;
        setSubscription(sub);
        
        if (sub && sub.end_date) {
          startTimer(sub.end_date);
        } else {
          // No subscription - default to 3 months from now
          const defaultEndDate = new Date();
          defaultEndDate.setMonth(defaultEndDate.getMonth() + 3);
          startTimer(defaultEndDate.toISOString());
        }
      } else {
        // Fallback to 3 months from now
        const defaultEndDate = new Date();
        defaultEndDate.setMonth(defaultEndDate.getMonth() + 3);
        startTimer(defaultEndDate.toISOString());
      }
    } catch (error: any) {
      console.error('Error loading subscription data:', error);
      Alert.alert('Error', 'Failed to load subscription data');
      // Fallback to 3 months from now
      const defaultEndDate = new Date();
      defaultEndDate.setMonth(defaultEndDate.getMonth() + 3);
      startTimer(defaultEndDate.toISOString());
    } finally {
      setLoading(false);
    }
  };

  const startTimer = (endDateString: string) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    const updateTimer = () => {
      try {
        const endDate = new Date(endDateString);
        const now = new Date();
        const distance = endDate.getTime() - now.getTime();

        if (distance <= 0) {
          setTimerState({
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            isExpired: true,
          });
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
          }
        } else {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);

          setTimerState({
            days,
            hours,
            minutes,
            seconds,
            isExpired: false,
          });
        }
      } catch (error) {
        console.error('Error calculating timer:', error);
      }
    };

    updateTimer(); // Initial update
    timerIntervalRef.current = setInterval(updateTimer, 1000);
  };

  const isTrialActive = !timerState.isExpired && (timerState.days > 0 || timerState.hours > 0 || timerState.minutes > 0 || timerState.seconds > 0);

  const daysRemaining = subscription?.end_date
    ? Math.ceil((new Date(subscription.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const formatTime = (value: number): string => {
    return String(value).padStart(2, '0');
  };

  const handlePlanPress = (plan: SubscriptionPlan) => {
    if (isTrialActive) {
      Alert.alert(
        'Plans Locked',
        'Plans are locked during the free trial period. They will be available when your trial ends.',
      );
    } else {
      // Future: Navigate to purchase screen
      Alert.alert('Coming Soon', 'Subscription purchase will be available soon.');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SellerHeader
          onProfilePress={() => navigation.navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support')}
          onSubscriptionPress={() => navigation.navigate('Subscription')}
          onLogoutPress={async () => {
            await logout();
          }}
          subscriptionDays={daysRemaining}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading subscription...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SellerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
        onSubscriptionPress={() => navigation.navigate('Subscription')}
        onLogoutPress={async () => {
          await logout();
        }}
        subscriptionDays={daysRemaining}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Plans Section */}
        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          <Text style={styles.sectionSubtitle}>
            Select the perfect plan for your property listing needs
          </Text>

          {/* Plan Cards - Always visible in background */}
          <View style={styles.plansGrid}>
            {subscriptionPlans.map((plan, index) => (
              <View 
                key={plan.planType} 
                style={[
                  styles.planCard,
                  isTrialActive && styles.planCardBlurred
                ]}>
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                  </View>
                )}
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDescription}>{plan.description}</Text>
                </View>
                <View style={styles.planPrice}>
                  <Text style={styles.priceValue}>₹{plan.price}</Text>
                  <Text style={styles.priceDuration}>{plan.duration}</Text>
                </View>
                <View style={styles.planFeatures}>
                  {plan.features.map((feature, idx) => (
                    <View key={idx} style={styles.featureItem}>
                      <Text style={styles.featureIcon}>✓</Text>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={[
                    styles.planButton,
                    isTrialActive && styles.planButtonLocked,
                  ]}
                  onPress={() => handlePlanPress(plan)}
                  disabled={isTrialActive}>
                  {isTrialActive ? (
                    <>
                      <Text style={styles.lockIconSmall}>🔒</Text>
                      <Text style={styles.planButtonTextLocked}>Locked</Text>
                    </>
                  ) : (
                    <Text style={styles.planButtonText}>Select Plan</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Blur Overlay - Shows during trial */}
          {isTrialActive && (
            <View style={styles.blurOverlay}>
              <View style={styles.overlayContent}>
                <Animated.View style={{transform: [{rotate: clockInterpolate}]}}>
                  <Text style={styles.clockIcon}>🕐</Text>
                </Animated.View>
                <Text style={styles.lockTitle}>Plans Locked During Free Trial</Text>
                <Text style={styles.lockSubtitle}>
                  Enjoy your premium access for free! Plans will be available when your trial period ends.
                </Text>
                
                {/* Compact Timer */}
                <View style={styles.compactTimerContainer}>
                  <View style={styles.compactTimeBox}>
                    <Text style={styles.compactTimeValue}>{formatTime(timerState.days)}</Text>
                    <Text style={styles.compactTimeLabel}>D</Text>
                  </View>
                  <Text style={styles.compactTimeSeparator}>:</Text>
                  <View style={styles.compactTimeBox}>
                    <Text style={styles.compactTimeValue}>{formatTime(timerState.hours)}</Text>
                    <Text style={styles.compactTimeLabel}>H</Text>
                  </View>
                  <Text style={styles.compactTimeSeparator}>:</Text>
                  <View style={styles.compactTimeBox}>
                    <Text style={styles.compactTimeValue}>{formatTime(timerState.minutes)}</Text>
                    <Text style={styles.compactTimeLabel}>M</Text>
                  </View>
                  <Text style={styles.compactTimeSeparator}>:</Text>
                  <View style={styles.compactTimeBox}>
                    <Text style={styles.compactTimeValue}>{formatTime(timerState.seconds)}</Text>
                    <Text style={styles.compactTimeLabel}>S</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.body,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  plansSection: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    position: 'relative',
    minHeight: 600,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    ...Platform.select({
      ios: {
        backdropFilter: 'blur(10px)',
      },
      android: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
      },
    }),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    borderRadius: borderRadius.lg,
  },
  overlayContent: {
    alignItems: 'center',
    padding: spacing.xl,
    width: '90%',
    maxWidth: 400,
  },
  clockIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  lockTitle: {
    ...typography.h2,
    color: colors.surface,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  lockSubtitle: {
    ...typography.body,
    color: colors.surface,
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  compactTimerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  compactTimeBox: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 50,
    alignItems: 'center',
  },
  compactTimeValue: {
    ...typography.h3,
    color: colors.surface,
    fontWeight: 'bold',
    fontSize: 20,
  },
  compactTimeLabel: {
    ...typography.caption,
    color: colors.surface,
    marginTop: 2,
    opacity: 0.9,
    fontSize: 10,
  },
  compactTimeSeparator: {
    ...typography.h3,
    color: colors.surface,
    marginHorizontal: spacing.xs,
    fontWeight: 'bold',
    fontSize: 20,
  },
  planCardBlurred: {
    opacity: 0.3,
  },
  plansGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  planCard: {
    width: (SCREEN_WIDTH - spacing.md * 3) / 3,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: '50%',
    transform: [{translateX: -50}],
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    zIndex: 1,
  },
  popularBadgeText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: 'bold',
    fontSize: 10,
  },
  planHeader: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  planName: {
    ...typography.h3,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  planDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  planPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  priceValue: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: 'bold',
  },
  priceDuration: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  planFeatures: {
    marginBottom: spacing.md,
    minHeight: 200,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  featureIcon: {
    color: colors.success,
    marginRight: spacing.xs,
    fontSize: 14,
    marginTop: 2,
  },
  featureText: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
    fontSize: 12,
  },
  planButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planButtonLocked: {
    backgroundColor: colors.disabled,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  planButtonTextLocked: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  lockIconSmall: {
    fontSize: 16,
  },
});

export default SubscriptionScreen;

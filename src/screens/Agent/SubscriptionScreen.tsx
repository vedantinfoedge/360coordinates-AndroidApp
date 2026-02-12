import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { AgentStackParamList } from '../../navigation/AgentNavigator';
import { colors, spacing, typography } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import AgentHeader from '../../components/AgentHeader';
import { sellerService, DashboardStats } from '../../services/seller.service';

type SubscriptionScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<AgentStackParamList, 'Subscription'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: SubscriptionScreenNavigationProp;
};

const SubscriptionScreen: React.FC<Props> = ({ navigation }) => {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<DashboardStats['subscription'] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const handleSubscribe = (planId: string) => {
    // TODO: Implement payment gateway integration
    console.log('Subscribe to:', planId);
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    const loadSubscriptionData = async () => {
      try {
        setLoading(true);
        const response: any = await sellerService.getDashboardStats();
        if (response && response.success && response.data) {
          setSubscription(response.data.subscription || null);
        }
      } catch (error: any) {
        if (__DEV__) {
          console.error('[AgentSubscription] Error loading subscription:', error);
        }
      } finally {
        setLoading(false);
      }
    };
    loadSubscriptionData();
  }, []);

  const daysRemaining = subscription?.end_date
    ? Math.ceil((new Date(subscription.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : undefined;

  const goToProfile = () => {
    (navigation as any).navigate('AgentTabs', { screen: 'Profile' });
  };

  const goToSupport = () => {
    (navigation as any).navigate('Support');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AgentHeader
          onProfilePress={goToProfile}
          onSupportPress={goToSupport}
          onSubscriptionPress={() => (navigation as any).navigate('Subscription')}
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
      <AgentHeader
        onProfilePress={goToProfile}
        onSupportPress={goToSupport}
        onSubscriptionPress={() => (navigation as any).navigate('Subscription')}
        onLogoutPress={async () => {
          await logout();
        }}
        subscriptionDays={daysRemaining}
        scrollY={scrollY}
      />

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>

        {/* Free Trial Timer */}
        <View style={styles.timerContainer}>
          <LinearGradient
            colors={['#FF9800', '#F57C00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.timerGradient}>
            <View style={styles.timerContent}>
              <Text style={styles.timerLabel}>Free Trial Ends In</Text>
              <View style={styles.timerBox}>
                <Text style={styles.timerValue}>14</Text>
                <Text style={styles.timerUnit}>Days</Text>
              </View>
              <Text style={styles.timerSubtext}>Upgrade now to keep posting!</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Standard Plan Card */}
        <View style={styles.planCard}>
          <LinearGradient
            colors={[colors.primary, '#1565c0']}
            style={styles.planGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>Standard Plan</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.currency}>₹</Text>
                <Text style={styles.price}>99</Text>
                <Text style={styles.period}>/ property</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>✅</Text>
                <Text style={styles.featureText}>Upload 1 Property</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>✅</Text>
                <Text style={styles.featureText}>Valid for 30 Days property visibility</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>✅</Text>
                <Text style={styles.featureText}>Standard Support</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.subscribeButton}
              activeOpacity={0.9}
              onPress={() => handleSubscribe('standard_99')}>
              <Text style={styles.subscribeButtonText}>Pay Now</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.trialCard}>
            {/* @ts-expect-error - LinearGradient runtime ok */}
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.trialGradient}>
              <View style={styles.trialContent}>
                <View style={styles.trialHeader}>
                  <View style={styles.trialIconContainer}>
                    <Text style={styles.trialIcon}>🎉</Text>
                  </View>
                  <View style={styles.trialTextContainer}>
                    <Text style={styles.trialTitle}>Free Trial Active</Text>
                    <Text style={styles.trialSubtitle}>Enjoy premium features at no cost</Text>
                  </View>
                </View>
                <Text style={styles.trialNote}>
                  You have full access to premium features during your free trial period.
                </Text>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.comingSoonCard}>
            <View style={styles.comingSoonIconContainer}>
              <Text style={styles.comingSoonIcon}>🚀</Text>
            </View>
            <Text style={styles.comingSoonTitle}>Subscription Plans</Text>
            <Text style={styles.comingSoonSubtitle}>Coming Soon</Text>
            <Text style={styles.comingSoonDescription}>
              We're working on subscription packages for Agents & Builders. Stay tuned for updates!
            </Text>
          </View>

          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>Need Help?</Text>
            <Text style={styles.helpText}>Contact our support team for any questions</Text>
            <TouchableOpacity style={styles.helpButton} onPress={goToSupport} activeOpacity={0.8}>
              <Text style={styles.helpButtonText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
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
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl + spacing.lg,
    paddingBottom: spacing.xxl + spacing.xl,
  },
  trialCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  trialGradient: {
    padding: spacing.xl,
  },
  trialContent: {
    alignItems: 'center',
  },
  trialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  trialIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  trialIcon: {
    fontSize: 28,
  },
  trialTextContainer: {
    flex: 1,
  },
  trialTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.surface,
    marginBottom: 4,
  },
  trialSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  trialNote: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  comingSoonCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  comingSoonIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  comingSoonIcon: {
    fontSize: 40,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D242B',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  comingSoonSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  comingSoonDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  helpSection: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },

  // New Styles
  timerContainer: {
    marginBottom: spacing.lg,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  timerGradient: {
    padding: spacing.lg,
  },
  timerContent: {
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  timerValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    marginRight: spacing.xs,
  },
  timerUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  timerSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
  },

  // Plan Card Styles
  planCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  planGradient: {
    padding: spacing.xl,
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  currency: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    marginRight: 4,
  },
  price: {
    fontSize: 56,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 64,
  },
  period: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 36,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: spacing.lg,
  },
  featuresList: {
    marginBottom: spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  featureIcon: {
    fontSize: 18,
    marginRight: spacing.md,
  },
  featureText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  subscribeButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D242B',
    marginBottom: spacing.xs,
  },
  helpText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  helpButton: {
    backgroundColor: '#E3F6FF',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: 10,
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});

export default SubscriptionScreen;


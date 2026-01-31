import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {SellerTabParamList} from '../../components/navigation/SellerTabNavigator';
import {colors, spacing, typography} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import SellerHeader from '../../components/SellerHeader';
import {sellerService, DashboardStats} from '../../services/seller.service';

type SubscriptionScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<SellerTabParamList, 'Subscription'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: SubscriptionScreenNavigationProp;
};

const SubscriptionScreen: React.FC<Props> = ({navigation}) => {
  const {logout} = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<DashboardStats['subscription'] | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
  }, []);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const response: any = await sellerService.getDashboardStats();
      if (response && response.success && response.data) {
        const sub = response.data.subscription;
        setSubscription(sub);
      }
    } catch (error: any) {
      if (__DEV__) {
        console.error('Error loading subscription data:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const daysRemaining = subscription?.end_date
    ? Math.ceil((new Date(subscription.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : undefined;

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
        scrollY={scrollY}
      />
      
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {useNativeDriver: true}
        )}
        scrollEventThrottle={16}>
        
        <Animated.View style={{opacity: fadeAnim, transform: [{translateY: slideAnim}]}}>
          {/* Free Trial Status Card */}
          <View style={styles.trialCard}>
            {/* @ts-expect-error - LinearGradient works but TypeScript types are incorrect */}
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.trialGradient}>
              <View style={styles.trialContent}>
                <View style={styles.trialHeader}>
                  <View style={styles.trialIconContainer}>
                    <Text style={styles.trialIcon}>🎉</Text>
                  </View>
                  <View style={styles.trialTextContainer}>
                    <Text style={styles.trialTitle}>Free Trial Active</Text>
                    <Text style={styles.trialSubtitle}>
                      Enjoy premium features at no cost
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.trialNote}>
                  You have full access to all premium features during your free trial period.
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* Coming Soon Section */}
          <View style={styles.comingSoonCard}>
            <View style={styles.comingSoonIconContainer}>
              <Text style={styles.comingSoonIcon}>🚀</Text>
            </View>
            <Text style={styles.comingSoonTitle}>Subscription Plans</Text>
            <Text style={styles.comingSoonSubtitle}>Coming Soon</Text>
            <Text style={styles.comingSoonDescription}>
              We're working on exciting subscription packages to help you get the most out of your property listings. Stay tuned for updates!
            </Text>
          </View>

          {/* Help Section */}
          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>Need Help?</Text>
            <Text style={styles.helpText}>
              Contact our support team for any questions
            </Text>
            <TouchableOpacity 
              style={styles.helpButton}
              onPress={() => navigation.navigate('Support')}>
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
    paddingTop: spacing.xl + spacing.lg, // Added more top padding
    paddingBottom: spacing.xxl + spacing.xl,
  },
  
  // Trial Card
  trialCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 8},
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
  
  // Coming Soon Card
  comingSoonCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
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
  
  // Help Section
  helpSection: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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

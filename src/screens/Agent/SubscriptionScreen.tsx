import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { AgentStackParamList } from '../../navigation/AgentNavigator';
import { colors, spacing, typography } from '../../theme';
import { sellerService, DashboardStats } from '../../services/seller.service';
import { ViewPlansContent } from '../../components/subscription/ViewPlansContent';

type SubscriptionScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<AgentStackParamList, 'Subscription'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: SubscriptionScreenNavigationProp;
};

const SubscriptionScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<DashboardStats['subscription'] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const response: any = await sellerService.getDashboardStats();
      if (response?.success && response?.data) {
        setSubscription(response.data.subscription || null);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[AgentSubscription] Error loading subscription:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSubscriptionData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const daysRemaining = subscription?.end_date
    ? Math.ceil(
        (new Date(subscription.end_date).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 14;

  const handlePayNow = (planId: string) => {
    // TODO: Implement payment gateway integration
    console.log('Subscribe to:', planId);
  };

  const handleHelpPress = () => {
    (navigation as any).navigate('Support');
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  if (loading && !subscription) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading subscription...</Text>
      </View>
    );
  }

  return (
    <ViewPlansContent
      daysRemaining={daysRemaining}
      trialTotalDays={21}
      onRefresh={onRefresh}
      refreshing={refreshing}
      onPayNow={handlePayNow}
      onHelpPress={handleHelpPress}
      onBackPress={handleBackPress}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: '#F2F5FA',
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.body,
    color: '#6B7280',
  },
});

export default SubscriptionScreen;

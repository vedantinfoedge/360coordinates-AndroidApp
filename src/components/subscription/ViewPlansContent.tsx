/**
 * View Plans content - matches 360 Coordinates reference design.
 * Shared by both Seller and Agent Subscription screens.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { TabIcon } from '../navigation/TabIcons';
import { spacing } from '../../theme';

// Reference design colors from HTML
const COLORS = {
  navy: '#0B1F3A',
  blue: '#1565C0',
  blueLight: '#1E88E5',
  sky: '#E8F4FD',
  grayBg: '#F2F5FA',
  grayText: '#8A97A8',
  textDark: '#0D1B2E',
  textMid: '#3D5068',
  border: '#E2E8F0',
  white: '#FFFFFF',
  orange: '#FF8C00',
  orangeDark: '#F57C00',
  accentBlue: '#60B4FF',
};

export interface ViewPlansContentProps {
  daysRemaining?: number;
  trialTotalDays?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
  onPayNow?: (planId: string) => void;
  onHelpPress?: () => void;
  onBackPress?: () => void;
}

export const ViewPlansContent: React.FC<ViewPlansContentProps> = ({
  daysRemaining = 14,
  trialTotalDays = 21,
  onRefresh,
  refreshing = false,
  onPayNow = () => {},
  onHelpPress = () => {},
  onBackPress,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'standard'>('standard');
  const insets = useSafeAreaInsets();
  const daysUsed = trialTotalDays - daysRemaining;
  const progressPercent = Math.min(100, Math.max(0, (daysUsed / trialTotalDays) * 100));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
      {/* Header - Navy with back button and title */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerRow}>
          {onBackPress ? (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={onBackPress}
              activeOpacity={0.8}>
              <TabIcon name="chevron-left" color="#FFFFFF" size={18} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
          <Text style={styles.headerTitle}>
            View <Text style={styles.headerTitleAccent}>Plans</Text>
          </Text>
          <View style={styles.placeholder} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }>
        {/* Trial Banner - Orange */}
        <View style={styles.trialBanner}>
          <LinearGradient
            colors={[COLORS.orange, COLORS.orangeDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.trialLabel}>⏳ FREE TRIAL ENDS IN</Text>
          <View style={styles.trialRow}>
            <View style={styles.trialDaysBox}>
              <Text style={styles.trialDaysNum}>{daysRemaining}</Text>
              <Text style={styles.trialDaysLabel}>Days Left</Text>
            </View>
            <View style={styles.trialRight}>
              <Text style={styles.trialTitle}>Upgrade to keep posting!</Text>
              <Text style={styles.trialSub}>
                Don't lose access to your active listings and buyer leads.
              </Text>
            </View>
          </View>
          <View style={styles.trialProgressLabel}>
            <Text style={styles.trialProgressText}>Trial progress</Text>
            <Text style={styles.trialProgressText}>
              {daysRemaining} / {trialTotalDays} days
            </Text>
          </View>
          <View style={styles.trialProgressTrack}>
            <View
              style={[
                styles.trialProgressFill,
                { width: `${100 - progressPercent}%` },
              ]}
            />
          </View>
        </View>

        {/* Active Trial Card - Dark Blue */}
        <View style={styles.activeTrialCard}>
          <LinearGradient
            colors={['#0D47A1', COLORS.blue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.atcTop}>
            <View style={styles.atcIcon}>
              <TabIcon name="subscription" color="#FFFFFF" size={22} />
            </View>
            <View>
              <Text style={styles.atcTitle}>Free Trial Active</Text>
              <Text style={styles.atcSub}>Enjoy premium features at no cost</Text>
            </View>
          </View>
          <Text style={styles.atcBody}>
            You have full access to all premium features during your free trial
            period. Upgrade to a paid plan before the trial ends to continue
            without interruption.
          </Text>
        </View>

        {/* Standard Plan Card - White, Selected */}
        <TouchableOpacity
          style={[styles.planCard, styles.planCardSelected]}
          onPress={() => setSelectedPlan('standard')}
          activeOpacity={1}>
          <View style={styles.planHeader}>
            <View style={[styles.planIcon, styles.planIconStandard]}>
              <TabIcon name="clipboard" color={COLORS.blue} size={20} />
            </View>
            <Text style={styles.planName}>Standard Plan</Text>
            <Text style={styles.planTagline}>
              Perfect to get started with your listing
            </Text>
            <View style={styles.planPriceRow}>
              <Text style={styles.planCurrency}>₹</Text>
              <Text style={styles.planAmount}>99</Text>
              <Text style={styles.planPeriod}>/ property</Text>
            </View>
          </View>
          <View style={styles.planFeatures}>
            <View style={styles.featureItem}>
              <View style={[styles.featureCheck, styles.fcBlue]}>
                <TabIcon name="check" color={COLORS.blue} size={12} />
              </View>
              <Text style={styles.featureText}>Upload 1 Property</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureCheck, styles.fcBlue]}>
                <TabIcon name="check" color={COLORS.blue} size={12} />
              </View>
              <Text style={styles.featureText}>30 Days Property Visibility</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureCheck, styles.fcBlue]}>
                <TabIcon name="check" color={COLORS.blue} size={12} />
              </View>
              <Text style={styles.featureText}>Standard Support</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.planCta}
            onPress={() => onPayNow('standard_99')}
            activeOpacity={0.9}>
            <LinearGradient
              colors={[COLORS.blueLight, COLORS.blue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.planCtaGradient}>
              <TabIcon name="dollar" color="#FFFFFF" size={14} />
              <Text style={styles.planCtaText}>Pay Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Help Card */}
        <TouchableOpacity
          style={styles.helpCard}
          onPress={onHelpPress}
          activeOpacity={0.8}>
          <View style={styles.helpIcon}>
            <TabIcon name="help-circle" color={COLORS.blue} size={20} />
          </View>
          <View style={styles.helpTextContainer}>
            <Text style={styles.helpTitle}>Need Help Choosing?</Text>
            <Text style={styles.helpSub}>
              Chat with our team — we'll find the best plan for you
            </Text>
          </View>
          <TabIcon name="chevron-right" color={COLORS.grayText} size={16} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.grayBg,
  },
  header: {
    backgroundColor: COLORS.navy,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  backBtn: {
    width: 34,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 34,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerTitleAccent: {
    color: COLORS.accentBlue,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + spacing.xl,
  },

  // Trial Banner
  trialBanner: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  trialLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  trialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  trialDaysBox: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 70,
    alignItems: 'center',
  },
  trialDaysNum: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 34,
  },
  trialDaysLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  trialRight: {
    flex: 1,
  },
  trialTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  trialSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
  },
  trialProgressLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  trialProgressText: {
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  trialProgressTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  trialProgressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },

  // Active Trial Card
  activeTrialCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  atcTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  atcIcon: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atcTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  atcSub: {
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  atcBody: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 20,
  },

  // Plan Card
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  planCardSelected: {
    borderColor: COLORS.blue,
    shadowColor: COLORS.blue,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 6,
  },
  planHeader: {
    padding: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  planIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  planIconStandard: {
    backgroundColor: '#E3F2FD',
  },
  planName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  planTagline: {
    fontSize: 11.5,
    color: COLORS.grayText,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginTop: 10,
  },
  planCurrency: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.blue,
    marginBottom: 4,
  },
  planAmount: {
    fontSize: 38,
    fontWeight: '800',
    color: COLORS.textDark,
    lineHeight: 42,
    letterSpacing: -1,
  },
  planPeriod: {
    fontSize: 13,
    color: COLORS.grayText,
    marginBottom: 6,
    fontWeight: '500',
  },
  planFeatures: {
    padding: 14,
    paddingHorizontal: 18,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  featureCheck: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fcBlue: {
    backgroundColor: '#E3F2FD',
  },
  featureText: {
    fontSize: 13,
    color: COLORS.textMid,
    fontWeight: '500',
  },
  planCta: {
    marginHorizontal: 18,
    marginBottom: 18,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  planCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  planCtaText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Help Card
  helpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  helpIcon: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.sky,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpTextContainer: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  helpSub: {
    fontSize: 11,
    color: COLORS.grayText,
  },
});

import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {AgentTabParamList} from '../../components/navigation/AgentTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {getLeads, Lead} from '../../services/leadsService';
import {formatters} from '../../utils/formatters';
import CustomAlert from '../../utils/alertHelper';

type AgentLeadsScreenNavigationProp = BottomTabNavigationProp<AgentTabParamList, 'Leads'>;

type Props = {
  navigation: AgentLeadsScreenNavigationProp;
};

const LeadCard: React.FC<{item: Lead}> = ({item}) => {
  const handlePhonePress = useCallback(() => {
    const phone = item?.buyer_phone?.trim();
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {
        CustomAlert.alert('Error', 'Unable to open phone dialer.');
      });
    }
  }, [item?.buyer_phone]);

  const handleEmailPress = useCallback(() => {
    const email = item?.buyer_email?.trim();
    if (email) {
      Linking.openURL(`mailto:${email}`).catch(() => {
        CustomAlert.alert('Error', 'Unable to open email.');
      });
    }
  }, [item?.buyer_email]);

  return (
    <View style={styles.card}>
      <Text style={styles.propertyTitle} numberOfLines={2}>
        {item?.property_title ?? '—'}
      </Text>
      <View style={styles.row}>
        <Text style={styles.label}>Buyer</Text>
        <Text style={styles.value} numberOfLines={1}>
          {item?.buyer_name ?? '—'}
        </Text>
      </View>
      {item?.buyer_phone ? (
        <TouchableOpacity style={styles.row} onPress={handlePhonePress} activeOpacity={0.7}>
          <Text style={styles.label}>Phone</Text>
          <Text style={[styles.value, styles.link]} numberOfLines={1}>
            {item.buyer_phone}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.row}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>—</Text>
        </View>
      )}
      {item?.buyer_email ? (
        <TouchableOpacity style={styles.row} onPress={handleEmailPress} activeOpacity={0.7}>
          <Text style={styles.label}>Email</Text>
          <Text style={[styles.value, styles.link]} numberOfLines={1}>
            {item.buyer_email}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>—</Text>
        </View>
      )}
      {item?.created_at ? (
        <Text style={styles.date}>{formatters.timeAgo(item.created_at)}</Text>
      ) : null}
    </View>
  );
};

const AgentLeadsScreen: React.FC<Props> = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contentTopPadding = insets.top + spacing.lg;

  const loadLeads = useCallback(async () => {
    try {
      setError(null);
      const list = await getLeads();
      setLeads(Array.isArray(list) ? list : []);
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to load leads';
      setError(msg);
      setLeads([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const renderItem = useCallback(({item}: {item: Lead}) => <LeadCard item={item} />, []);
  const keyExtractor = useCallback(
    (item: Lead, index: number) => `${item?.created_at ?? index}-${index}`,
    [],
  );

  return (
    <View style={styles.container}>
      {loading && leads.length === 0 ? (
        <View style={[styles.center, {paddingTop: contentTopPadding}]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading leads...</Text>
        </View>
      ) : error && leads.length === 0 ? (
        <View style={[styles.center, {paddingTop: contentTopPadding}]}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Unable to load leads</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              loadLeads();
            }}
            activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={leads}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContent,
            {paddingTop: contentTopPadding},
            leads.length === 0 && styles.listContentEmpty,
          ]}
          ListHeaderComponent={
            <View style={styles.titleWrap}>
              <Text style={styles.screenTitle}>Leads</Text>
              <Text style={styles.screenSubtitle}>Buyers who viewed your contact</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No leads yet</Text>
              <Text style={styles.emptyText}>
                When buyers click "View Contact" on your listings, they will appear here.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background ?? '#FAFAFA',
  },
  center: {
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
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  titleWrap: {
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.md,
  },
  screenTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  screenSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface ?? '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  propertyTitle: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    width: 56,
  },
  value: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  link: {
    color: colors.primary,
  },
  date: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});

export default AgentLeadsScreen;


import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Animated,
  RefreshControl,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerTabParamList} from '../../components/navigation/BuyerTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import BuyerHeader from '../../components/BuyerHeader';
import CustomAlert from '../../utils/alertHelper';
import {
  getViewedProperties,
  ViewedProperty,
  clearViewedProperties,
} from '../../services/viewedProperties.service';

type RecentlyViewedScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BuyerTabParamList, 'RecentlyViewed'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: RecentlyViewedScreenNavigationProp;
};

const RecentlyViewedScreen: React.FC<Props> = ({navigation}) => {
  const {user, logout, isAuthenticated} = useAuth();
  const insets = useSafeAreaInsets();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;
  const scrollY = React.useRef(new Animated.Value(0)).current;

  const [viewedProperties, setViewedProperties] = useState<ViewedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Load viewed properties when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadViewedProperties();
    }, [])
  );

  const loadViewedProperties = async () => {
    try {
      setLoading(true);
      const properties = await getViewedProperties();
      setViewedProperties(properties);
    } catch (error) {
      console.error('[RecentlyViewed] Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadViewedProperties();
    setRefreshing(false);
  };

  const handlePhonePress = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch((err: any) => {
        console.error('Error opening phone:', err);
        CustomAlert.alert('Error', 'Unable to open phone dialer.');
      });
    }
  };

  const handleEmailPress = (email: string) => {
    if (email) {
      Linking.openURL(`mailto:${email}`).catch((err: any) => {
        console.error('Error opening email:', err);
        CustomAlert.alert('Error', 'Unable to open email client.');
      });
    }
  };

  const handleClearHistory = () => {
    CustomAlert.alert(
      'Clear History',
      'Are you sure you want to clear all recently viewed properties? This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearViewedProperties();
            setViewedProperties([]);
            CustomAlert.alert('Success', 'History cleared successfully');
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  };

  const isLoggedIn = Boolean(user && isAuthenticated);
  const isGuest = !isLoggedIn;

  // Show login prompt if user is not authenticated
  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <BuyerHeader
          onProfilePress={() => navigation.navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support' as never)}
          onLogoutPress={() => {}}
          onSignInPress={() => {
            (navigation as any).navigate('Auth', {
              screen: 'Login',
              params: {returnTo: 'RecentlyViewed'},
            });
          }}
          onSignUpPress={() => {
            (navigation as any).navigate('Auth', {screen: 'Register'});
          }}
          showLogout={false}
          showProfile={false}
          showSignIn={true}
          showSignUp={true}
        />
        <Animated.View
          style={[
            styles.loginContainer,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
              paddingTop: insets.top + spacing.md,
            },
          ]}>
          <View style={styles.loginContent}>
            <View style={styles.loginIconContainer}>
              <Text style={styles.loginIcon}>🕐</Text>
            </View>
            <Text style={styles.loginTitle}>Login Required</Text>
            <Text style={styles.loginSubtitle}>
              Please login to view your recently viewed properties
            </Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => {
                (navigation as any).navigate('Auth', {
                  screen: 'Login',
                  params: {returnTo: 'RecentlyViewed'},
                });
              }}
              activeOpacity={0.8}>
              <Text style={styles.loginButtonText}>Login / Register</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <BuyerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support' as never)}
        onLogoutPress={isLoggedIn ? logout : undefined}
        onSignInPress={
          isGuest
            ? () => (navigation as any).navigate('Auth', {screen: 'Login'})
            : undefined
        }
        onSignUpPress={
          isGuest
            ? () => (navigation as any).navigate('Auth', {screen: 'Register'})
            : undefined
        }
        showLogout={isLoggedIn}
        showProfile={isLoggedIn}
        showSignIn={isGuest}
        showSignUp={isGuest}
        scrollY={scrollY}
      />

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingTop: spacing.md, paddingBottom: spacing.xl}}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {useNativeDriver: true},
        )}
        scrollEventThrottle={16}>
        
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.pageTitle}>🏠 Recently Viewed Properties</Text>
          <Text style={styles.pageSubtitle}>
            Properties you've contacted owners or viewed contact details
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : viewedProperties.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
            </View>
            <Text style={styles.emptyTitle}>No Recently Viewed Properties</Text>
            <Text style={styles.emptySubtitle}>
              When you view owner contact details or start a chat with property owners, they will appear here.
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate('Home')}
              activeOpacity={0.8}>
              <Text style={styles.browseButtonText}>Browse Properties</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Clear History Button */}
            <View style={styles.actionBar}>
              <Text style={styles.countText}>
                {viewedProperties.length} {viewedProperties.length === 1 ? 'property' : 'properties'}
              </Text>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearHistory}
                activeOpacity={0.7}>
                <Text style={styles.clearButtonText}>🗑️ Clear All</Text>
              </TouchableOpacity>
            </View>

            {/* Properties List */}
            <View style={styles.propertiesList}>
              {viewedProperties.map((item, index) => (
                <View 
                  key={`${item.propertyId}-${index}`} 
                  style={styles.propertyCard}>
                  <View style={styles.propertyHeader}>
                    <Text style={styles.propertyTitle} numberOfLines={2}>
                      {item.propertyTitle}
                    </Text>
                    <Text style={styles.viewedDate}>{formatDate(item.viewedAt)}</Text>
                  </View>
                  
                  {item.propertyLocation && (
                    <Text style={styles.propertyLocation} numberOfLines={1}>
                      📍 {item.propertyLocation}
                    </Text>
                  )}
                  
                  {item.propertyPrice && (
                    <Text style={styles.propertyPrice}>{item.propertyPrice}</Text>
                  )}
                  
                  {/* Owner Contact Details */}
                  <View style={styles.ownerDetailsContainer}>
                    <Text style={styles.ownerLabel}>Owner Contact Details</Text>
                    
                    <View style={styles.ownerInfoRow}>
                      <Text style={styles.ownerInfoIcon}>👤</Text>
                      <Text style={styles.ownerName}>{item.ownerName}</Text>
                    </View>
                    
                    {item.ownerPhone ? (
                      <TouchableOpacity 
                        style={styles.ownerInfoRow}
                        onPress={() => handlePhonePress(item.ownerPhone || '')}
                        activeOpacity={0.7}>
                        <Text style={styles.ownerInfoIcon}>📞</Text>
                        <Text style={[styles.ownerContact, styles.contactLink]}>
                          {item.ownerPhone}
                        </Text>
                        <View style={styles.callButton}>
                          <Text style={styles.callButtonText}>Call</Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.ownerInfoRow}>
                        <Text style={styles.ownerInfoIcon}>📞</Text>
                        <Text style={styles.ownerContactNA}>Not available</Text>
                      </View>
                    )}
                    
                    {item.ownerEmail ? (
                      <TouchableOpacity 
                        style={styles.ownerInfoRow}
                        onPress={() => handleEmailPress(item.ownerEmail || '')}
                        activeOpacity={0.7}>
                        <Text style={styles.ownerInfoIcon}>✉️</Text>
                        <Text style={[styles.ownerContact, styles.contactLink]}>
                          {item.ownerEmail}
                        </Text>
                        <View style={styles.emailButton}>
                          <Text style={styles.emailButtonText}>Email</Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.ownerInfoRow}>
                        <Text style={styles.ownerInfoIcon}>✉️</Text>
                        <Text style={styles.ownerContactNA}>Not available</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.actionBadge}>
                    <Text style={styles.actionBadgeText}>
                      {item.action === 'chat' ? '💬 Chatted' : 
                       item.action === 'contact' ? '📋 Viewed Contact' : 
                       '💬📋 Both'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  pageTitle: {
    ...typography.h2,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  pageSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 3,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl * 3,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyIcon: {
    fontSize: 50,
  },
  emptyTitle: {
    ...typography.h3,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  browseButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  countText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  clearButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error + '10',
  },
  clearButtonText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
    fontSize: 13,
  },
  propertiesList: {
    paddingHorizontal: spacing.lg,
  },
  propertyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  propertyTitle: {
    ...typography.body,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  viewedDate: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  propertyLocation: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  propertyPrice: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.md,
  },
  ownerDetailsContainer: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  ownerLabel: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  ownerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  ownerInfoIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
    width: 24,
  },
  ownerName: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  ownerContact: {
    ...typography.body,
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  ownerContactNA: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
  contactLink: {
    color: colors.primary,
  },
  callButton: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  callButtonText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '700',
    fontSize: 12,
  },
  emailButton: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  emailButtonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  actionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  actionBadgeText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  // Login Screen Styles
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  loginContent: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loginIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  loginIcon: {
    fontSize: 50,
  },
  loginTitle: {
    ...typography.h1,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  loginSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
});

export default RecentlyViewedScreen;

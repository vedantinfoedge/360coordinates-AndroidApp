import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import BuyerHeader from '../../components/BuyerHeader';
import LocationAutoSuggest from '../../components/search/LocationAutoSuggest';
import {useAuth} from '../../context/AuthContext';

type InitialScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Initial'>;

type Props = {
  navigation: InitialScreenNavigationProp;
};

type ListingType = 'all' | 'sale' | 'rent' | 'pg';

const InitialScreen: React.FC<Props> = ({navigation}) => {
  const {logout} = useAuth();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [listingType, setListingType] = useState<ListingType>('all');
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLocationSelect = (location: any) => {
    setSearchLocation(location.name || location.placeName || '');
    setShowLocationSuggestions(false);
  };

  const handleSearch = () => {
    try {
      // Close location suggestions
      setShowLocationSuggestions(false);
      
      // PART A: Safely get location input with trim() - handle null/empty/spaces
      // Empty location is VALID and should navigate to show ALL properties
      const searchLocationText = (searchLocation || searchQuery || '').trim();
      
      // PART A: Always allow Search click - NO validation blocking empty input
      // Empty location is valid - will show ALL properties in SearchResults
      // Navigate to SearchResults with search params
      const params: any = {
        query: searchLocationText, // Always pass query param (even if empty string)
        location: searchLocationText, // Always pass location param (even if empty string)
      };
      
      // If location has value, add additional params for backward compatibility
      if (searchLocationText) {
        params.searchQuery = searchLocationText;
      }
      
      // Add listing type filter
      if (listingType !== 'all') {
        if (listingType === 'sale') {
          params.status = 'sale';
          params.listingType = 'buy';
        } else if (listingType === 'rent') {
          params.status = 'rent';
          params.listingType = 'rent';
        } else if (listingType === 'pg') {
          params.status = 'rent'; // PG uses rent status in API
          params.listingType = 'pg-hostel';
        }
      }
      
      // Navigate to Buyer Dashboard (Search tab)
      (navigation as any).navigate('MainTabs', {
        screen: 'Search',
        params: {
          screen: 'SearchResults',
          params: params,
        },
      });
    } catch (error: any) {
      console.error('Error navigating to search:', error);
      Alert.alert('Error', 'Failed to navigate to search. Please try again.');
    }
  };

  const handleSearchProperty = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.navigate('MainTabs' as never);
    });
  };

  const handleSellProperty = () => {
    setShowRoleSelection(true);
  };

  const handleRoleSelection = async (role: 'seller' | 'agent' | 'builder') => {
    try {
      // Store targetDashboard in AsyncStorage for AppNavigator to use after login
      const targetDashboard = role === 'builder' ? 'builder' : role;
      await AsyncStorage.setItem('@target_dashboard', targetDashboard);
      // Also store persistent dashboard preference that persists until logout
      await AsyncStorage.setItem('@user_dashboard_preference', targetDashboard);
      
      // Verify the value was set correctly
      const verifyValue = await AsyncStorage.getItem('@target_dashboard');
      console.log('[InitialScreen] Set targetDashboard:', targetDashboard, 'Verified:', verifyValue);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideUpAnim, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Navigate to login with the selected role
        // For builder, use 'agent' as userType but set targetDashboard to 'builder'
        const userType = role === 'builder' ? 'agent' : role;
        
        console.log('[InitialScreen] Navigating to login with userType:', userType, 'targetDashboard:', targetDashboard);
        
        (navigation as any).navigate('Auth', {
          screen: 'Login',
          params: {
            userType: userType,
            targetDashboard: targetDashboard,
            requireAuth: true,
          },
        });
      });
    } catch (error) {
      console.error('[InitialScreen] Error setting targetDashboard:', error);
      Alert.alert('Error', 'Failed to proceed. Please try again.');
    }
  };

  const handleBackToMain = () => {
    setShowRoleSelection(false);
  };

  return (
    <View style={styles.container}>
      {/* Fixed Background Banner Image */}
      <View style={[styles.bannerBackground, {top: insets.top + 60}]}>
        <Image
          source={require('../../assets/Banner.jpeg')}
          style={styles.bannerImage}
          resizeMode="cover"
        />
        {/* Semi-transparent overlay for better content visibility */}
        <View style={styles.bannerOverlay} />
      </View>
      
      <BuyerHeader
        onSupportPress={() => {}}
        onSignInPress={() => {
          (navigation as any).navigate('Auth', {
            screen: 'Login',
          });
        }}
        showProfile={false}
        showLogout={false}
        showSignIn={true}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideUpAnim}, {scale: scaleAnim}],
            },
          ]}>
          {/* Listing Type Toggle Buttons - Hide when role selection is shown */}
          {!showRoleSelection && (
            <View style={[styles.toggleSection, {marginTop: insets.top + 70}]}>
              <TouchableOpacity
                style={[styles.toggleButton, listingType === 'all' && styles.toggleButtonActive]}
                onPress={() => setListingType('all')}>
                <Text style={[styles.toggleButtonText, listingType === 'all' && styles.toggleButtonTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, listingType === 'sale' && styles.toggleButtonActive]}
                onPress={() => setListingType('sale')}>
                <Text style={[styles.toggleButtonText, listingType === 'sale' && styles.toggleButtonTextActive]}>
                  Buy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, listingType === 'rent' && styles.toggleButtonActive]}
                onPress={() => setListingType('rent')}>
                <Text style={[styles.toggleButtonText, listingType === 'rent' && styles.toggleButtonTextActive]}>
                  Rent
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, listingType === 'pg' && styles.toggleButtonActive]}
                onPress={() => setListingType('pg')}>
                <Text style={[styles.toggleButtonText, listingType === 'pg' && styles.toggleButtonTextActive]}>
                  PG/Hostel
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Search Bar with Location Autocomplete - Hide when role selection is shown */}
          {!showRoleSelection && (
            <View style={styles.searchSection}>
              <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                  <Text style={styles.searchIcon}>📍</Text>
                  <View style={styles.searchInputWrapper}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search by city, locality, project"
                      placeholderTextColor={colors.textSecondary}
                      value={searchLocation || searchQuery}
                      onChangeText={text => {
                        setSearchLocation(text);
                        setSearchQuery(text);
                        setShowLocationSuggestions(text.length >= 2);
                      }}
                      onSubmitEditing={handleSearch}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.searchButton}
                    onPress={handleSearch}>
                    <Text style={styles.searchButtonText}>Search</Text>
                  </TouchableOpacity>
                </View>
                {showLocationSuggestions && searchLocation.length >= 2 && (
                  <View style={styles.locationSuggestionsContainer}>
                    <LocationAutoSuggest
                      query={searchLocation}
                      onSelect={handleLocationSelect}
                      visible={showLocationSuggestions}
                    />
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Options Section */}
          <View style={[styles.optionsSection, showRoleSelection && styles.optionsSectionWithPadding]}>
            {!showRoleSelection ? (
              <>
                <TouchableOpacity
                  style={styles.optionCard}
                  onPress={handleSearchProperty}
                  activeOpacity={0.8}>
                  <View style={styles.optionImageContainer}>
                    <Image
                      source={require('../../assets/SearchProperty.jpg')}
                      style={styles.optionImage}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={styles.optionTitle}>Search Property</Text>
                  <Text style={styles.optionDescription}>
                    Browse and find your perfect property
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionCard}
                  onPress={handleSellProperty}
                  activeOpacity={0.8}>
                  <View style={styles.optionImageContainer}>
                    <Image
                      source={require('../../assets/sellproperty.jpg')}
                      style={styles.optionImage}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={styles.optionTitle}>Sell Property</Text>
                  <Text style={styles.optionDescription}>
                    List your property as Owner, Agent or Builder
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBackToMain}>
                  <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionCard}
                  onPress={() => handleRoleSelection('seller')}
                  activeOpacity={0.8}>
                  <View style={styles.optionImageContainer}>
                    <Image
                      source={require('../../assets/Seller.jpg')}
                      style={styles.optionImage}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={styles.optionTitle}>Owner / Seller</Text>
                  <Text style={styles.optionDescription}>
                    List your property directly as an owner
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionCard}
                  onPress={() => handleRoleSelection('agent')}
                  activeOpacity={0.8}>
                  <View style={styles.optionImageContainer}>
                    <Image
                      source={require('../../assets/agent.jpg')}
                      style={styles.optionImage}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={styles.optionTitle}>Agent</Text>
                  <Text style={styles.optionDescription}>
                    List properties on behalf of clients
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionCard}
                  onPress={() => handleRoleSelection('builder')}
                  activeOpacity={0.8}>
                  <View style={styles.optionImageContainer}>
                    <Image
                      source={require('../../assets/builder.jpg')}
                      style={styles.optionImage}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={styles.optionTitle}>Builder</Text>
                  <Text style={styles.optionDescription}>
                    List your construction projects
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bannerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
    backgroundColor: 'transparent',
  },
  content: {
    width: '100%',
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  searchSection: {
    width: '100%',
    paddingHorizontal: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  searchContainer: {
    position: 'relative',
    width: '100%',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
  },
  searchInput: {
    ...typography.body,
    color: colors.text,
    padding: 0,
  },
  searchButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginLeft: spacing.md,
  },
  searchButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  locationSuggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: spacing.xs,
    zIndex: 1000,
  },
  toggleSection: {
    flexDirection: 'row',
    paddingLeft: spacing.xxl,
    paddingRight: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
    justifyContent: 'center',
  },
  toggleButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleButtonText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  toggleButtonTextActive: {
    color: colors.surface,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  optionsSection: {
    width: '100%',
    gap: spacing.lg,
  },
  optionsSectionWithPadding: {
    paddingTop: spacing.xl,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  optionImageContainer: {
    width: '100%',
    height: 180,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSecondary,
  },
  optionImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.lg,
  },
  optionTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  optionDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default InitialScreen;


import React from 'react';
import {View, StyleSheet, Text, TouchableOpacity} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerTabParamList} from '../../components/navigation/BuyerTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import BuyerHeader from '../../components/BuyerHeader';
import PropertyMapView from '../../components/map/PropertyMapView';
import {useAuth} from '../../context/AuthContext';

type PropertyMapScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BuyerTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: PropertyMapScreenNavigationProp;
  route?: {
    params?: {
      listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel';
      propertyId?: string | number;
    };
  };
};

const PropertyMapScreen: React.FC<Props> = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const {logout, user, isAuthenticated} = useAuth();
  const listingType = route?.params?.listingType || 'all';
  const propertyId = route?.params?.propertyId;
  
  // Check if user is guest
  const isLoggedIn = Boolean(user && isAuthenticated);
  const isGuest = !isLoggedIn;

  const handlePropertyPress = (property: any) => {
    try {
      navigation.navigate('PropertyDetails', {propertyId: String(property.id)});
    } catch (error: any) {
      console.error('Error navigating to property details:', error);
    }
  };

  const handleGoBackToList = () => {
    try {
      // Try to go back, or navigate to SearchResults with the same listingType
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        // Fallback: navigate to SearchResults tab with listingType
        navigation.navigate('SearchResults', {
          listingType: listingType,
        } as never);
      }
    } catch (error: any) {
      console.error('Error navigating back to list:', error);
      // Fallback navigation
      navigation.navigate('SearchResults', {
        listingType: listingType,
      } as never);
    }
  };

  return (
    <View style={styles.container}>
      <BuyerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
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
      />
      <PropertyMapView
        onPropertyPress={handlePropertyPress}
        showListToggle={true}
        listingType={listingType}
        selectedPropertyId={propertyId ? String(propertyId) : undefined}
      />
      
      {/* Floating Go Back to List Button */}
      <TouchableOpacity
        style={styles.floatingListButton}
        onPress={handleGoBackToList}>
        <Text style={styles.floatingListButtonIcon}>📋</Text>
        <Text style={styles.floatingListButtonText}>Go back to list</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  floatingListButton: {
    position: 'absolute',
    bottom: 30, // Position above bottom tab menu (65px height + some padding)
    alignSelf: 'center',
    minWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: spacing.sm,
  },
  floatingListButtonIcon: {
    fontSize: 20,
  },
  floatingListButtonText: {
    ...typography.body,
    color: colors.textblack,
    fontWeight: '700',
    fontSize: 16,
  },
});

export default PropertyMapScreen;


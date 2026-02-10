import React from 'react';
import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAuth} from '../context/AuthContext';
import SellerTabNavigator from '../components/navigation/SellerTabNavigator';
import SellerInquiriesScreen from '../screens/Seller/SellerInquiriesScreen';
import SellerPropertiesScreen from '../screens/Seller/SellerPropertiesScreen';
import SellerPropertyDetailsScreen from '../screens/Seller/SellerPropertyDetailsScreen';
import AddPropertyScreen from '../screens/Seller/AddPropertyScreen';
import SellerSupportScreen from '../screens/Seller/SellerSupportScreen';
import SubscriptionScreen from '../screens/Seller/SubscriptionScreen';
import {colors} from '../theme';

export type SellerStackParamList = {
  SellerTabs: undefined;
  Dashboard: undefined;
  MyProperties: undefined;
  Chat: undefined;
  Profile: undefined;
  PropertyDetails: {propertyId: string};
  AddProperty: undefined;
  Inquiries: undefined;
  Support: undefined;
  Subscription: undefined;
};

const Stack = createNativeStackNavigator<SellerStackParamList>();

/**
 * Gate: only render Seller stack when active role is seller.
 * Prevents crash when navigating from Buyer before role state/AsyncStorage are in sync.
 */
const SellerNavigator = () => {
  const {user} = useAuth();
  const isSeller = user?.user_type === 'seller';

  if (!user) {
    return (
      <View style={styles.gateContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.gateText}>Loading...</Text>
      </View>
    );
  }

  if (!isSeller) {
    return (
      <View style={styles.gateContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.gateText}>Switching to Seller...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{headerShown: false}}
      initialRouteName="SellerTabs">
      <Stack.Screen name="SellerTabs" component={SellerTabNavigator} />
      <Stack.Screen name="MyProperties" component={SellerPropertiesScreen} />
      <Stack.Screen name="Inquiries" component={SellerInquiriesScreen} />
      <Stack.Screen name="PropertyDetails" component={SellerPropertyDetailsScreen} />
      <Stack.Screen name="AddProperty" component={AddPropertyScreen} />
      <Stack.Screen name="Support" component={SellerSupportScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  gateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  gateText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
});

export default SellerNavigator;

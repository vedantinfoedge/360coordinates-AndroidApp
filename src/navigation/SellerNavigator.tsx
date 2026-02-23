import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { DEBUG_SELLER_CRASH } from '../config/debugCrash';
import SellerTabNavigator from '../components/navigation/SellerTabNavigator';
import LoadingScreen from '../components/common/LoadingScreen';
import SellerPropertyDetailsScreen from '../screens/Seller/SellerPropertyDetailsScreen';
import AddPropertyScreen from '../screens/Seller/AddPropertyScreen';

export type SellerStackParamList = {
  SellerTabs: undefined;
  PropertyDetails: { propertyId: string };
  AddProperty: { propertyId?: string; isLimitedEdit?: boolean; createdAt?: string } | undefined;
};

const Stack = createNativeStackNavigator<SellerStackParamList>();

/**
 * Gate: only render Seller stack when active role is seller.
 * Prevents crash when navigating from Buyer before role state/AsyncStorage are in sync.
 */
const SellerNavigator = () => {
  const { user } = useAuth();
  const isSeller = user?.user_type === 'seller';

  useEffect(() => {
    console.log('[DEBUG RoleSwitch] 10. SellerNavigator MOUNTED - user:', !!user, 'user_type:', user?.user_type, 'isSeller:', isSeller, 'DEBUG_SELLER_CRASH:', DEBUG_SELLER_CRASH);
  }, [user, isSeller]);

  try {
    if (!user) {
      console.log('[DEBUG RoleSwitch] SellerNavigator render: no user, showing Loading');
      return <LoadingScreen variant="generic" />;
    }

    if (!isSeller) {
      console.log('[DEBUG RoleSwitch] SellerNavigator render: not seller, showing Switching...');
      return <LoadingScreen variant="dashboard" message="Switching to Seller..." />;
    }

    // DEBUG: If crash isolation is on, render only static placeholder (no API, no Chat/Firestore, no real screens)
    if (DEBUG_SELLER_CRASH) {
      console.log('[DEBUG RoleSwitch] SellerNavigator render: DEBUG placeholder (APIs disabled)');
      return (
        <View style={styles.gateContainer}>
          <Text style={styles.gateText}>Seller placeholder – APIs disabled</Text>
          <Text style={[styles.gateText, { marginTop: 8, fontSize: 12 }]}>If you see this, crash is in real Seller stack</Text>
        </View>
      );
    }

    console.log('[DEBUG RoleSwitch] 11. SellerNavigator rendering full Stack (SellerTabs)');
    return (
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName="SellerTabs">
        <Stack.Screen name="SellerTabs" component={SellerTabNavigator} />
        <Stack.Screen name="PropertyDetails" component={SellerPropertyDetailsScreen} />
        <Stack.Screen name="AddProperty" component={AddPropertyScreen} />
      </Stack.Navigator>
    );
  } catch (err: any) {
    console.error('[DEBUG RoleSwitch] SellerNavigator render CRASH:', err?.message, err?.stack);
    return (
      <View style={styles.gateContainer}>
        <Text style={[styles.gateText, { color: '#c00' }]}>SellerNavigator error: {String(err?.message)}</Text>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  gateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  gateText: {
    marginTop: 12,
    fontSize: 16,
    color: '#5A6978',
  },
});

export default SellerNavigator;

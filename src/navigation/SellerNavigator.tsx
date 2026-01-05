import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import SellerTabNavigator from '../components/navigation/SellerTabNavigator';

export type SellerStackParamList = {
  SellerTabs: undefined;
};

const Stack = createNativeStackNavigator<SellerStackParamList>();

const SellerNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="SellerTabs" component={SellerTabNavigator} />
    </Stack.Navigator>
  );
};

export default SellerNavigator;


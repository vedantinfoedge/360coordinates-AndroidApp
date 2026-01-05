import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import BuyerTabNavigator from '../components/navigation/BuyerTabNavigator';

export type BuyerStackParamList = {
  BuyerTabs: undefined;
};

const Stack = createNativeStackNavigator<BuyerStackParamList>();

const BuyerNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="BuyerTabs" component={BuyerTabNavigator} />
    </Stack.Navigator>
  );
};

export default BuyerNavigator;


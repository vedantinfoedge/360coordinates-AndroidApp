import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import BuyerTabNavigator from '../components/navigation/BuyerTabNavigator';
import type {BuyerTabParamList} from '../components/navigation/BuyerTabNavigator';

/** Re-export for screens that navigate within the tab stack (e.g. PropertyDetails). */
export type BuyerStackParamList = BuyerTabParamList;

const Stack = createNativeStackNavigator<BuyerStackParamList>();

const BuyerNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{headerShown: false}}
      initialRouteName="BuyerTabs">
      <Stack.Screen name="BuyerTabs" component={BuyerTabNavigator} />
    </Stack.Navigator>
  );
};

export default BuyerNavigator;

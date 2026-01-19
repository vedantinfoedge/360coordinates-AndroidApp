import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import BuilderTabNavigator from '../components/navigation/BuilderTabNavigator';

export type BuilderStackParamList = {
  BuilderTabs: undefined;
};

const Stack = createNativeStackNavigator<BuilderStackParamList>();

const BuilderNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="BuilderTabs" component={BuilderTabNavigator} />
    </Stack.Navigator>
  );
};

export default BuilderNavigator;


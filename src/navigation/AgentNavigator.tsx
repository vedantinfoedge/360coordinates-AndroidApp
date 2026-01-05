import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AgentTabNavigator from '../components/navigation/AgentTabNavigator';

export type AgentStackParamList = {
  AgentTabs: undefined;
};

const Stack = createNativeStackNavigator<AgentStackParamList>();

const AgentNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="AgentTabs" component={AgentTabNavigator} />
    </Stack.Navigator>
  );
};

export default AgentNavigator;


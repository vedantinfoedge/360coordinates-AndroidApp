import React from 'react';
import {useNavigation} from '@react-navigation/native';
import AgentAddProjectScreen from '../Agent/AddProjectScreen';

/**
 * Builder Add Project (Upcoming Project) screen.
 * Reuses Agent AddProjectScreen with Builder stack navigation.
 */
export default function BuilderAddProjectScreen() {
  const navigation = useNavigation();
  return <AgentAddProjectScreen navigation={navigation as any} />;
}

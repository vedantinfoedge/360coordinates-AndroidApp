import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View, Text} from 'react-native';
import AgentDashboardScreen from '../../screens/Agent/AgentDashboardScreen';
import AgentPropertiesScreen from '../../screens/Agent/AgentPropertiesScreen';
import AgentInquiriesScreen from '../../screens/Agent/AgentInquiriesScreen';
import AgentProfileScreen from '../../screens/Agent/AgentProfileScreen';
import AgentPropertyDetailsScreen from '../../screens/Agent/AgentPropertyDetailsScreen';
import AddPropertyScreen from '../../screens/Agent/AddPropertyScreen';
import AddProjectScreen from '../../screens/Agent/AddProjectScreen';
import EditPropertyScreen from '../../screens/Agent/EditPropertyScreen';
import AgentSupportScreen from '../../screens/Agent/AgentSupportScreen';
import ChatNavigator from '../../navigation/ChatNavigator';
import {colors} from '../../theme';
import {useUnreadChatCount} from '../../hooks/useUnreadChatCount';

export type AgentTabParamList = {
  Dashboard: undefined;
  Listings: undefined;
  Chat: undefined;
  Inquiries: undefined;
  Profile: undefined;
  PropertyDetails: {propertyId: string};
  AddProperty: undefined;
  AddProject: undefined;
  EditProperty: {propertyId: string | number};
  Support: undefined;
};

const Tab = createBottomTabNavigator<AgentTabParamList>();

const AgentTabNavigator = () => {
  const unreadCount = useUnreadChatCount();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // Hide default header bar
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.surface,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 4,
          paddingBottom: 20,
          paddingHorizontal: 30,
          height: 65,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: -2},
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarItemStyle: {
          flex: 1,
          paddingVertical: 2,
          paddingHorizontal: 40,
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 56,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 0,
          marginBottom: 0,
          textAlign: 'center',
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}>
      <Tab.Screen
        name="Dashboard"
        component={AgentDashboardScreen}
        options={{
          title: 'Dashboard',
          headerShown: false, // Hide default header for custom header
          tabBarIcon: ({color}) => (
            <Text style={{color, fontSize: 20, textAlign: 'center'}}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Listings"
        component={AgentPropertiesScreen}
        options={{
          title: 'Listings',
          tabBarIcon: ({color}) => (
            <Text style={{color, fontSize: 20, textAlign: 'center'}}>📋</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatNavigator}
        options={{
          title: 'Chat',
          headerShown: false,
          tabBarIcon: ({color}) => (
            <View style={{position: 'relative', alignItems: 'center', justifyContent: 'center'}}>
              <Text style={{color, fontSize: 20, textAlign: 'center'}}>💬</Text>
              {unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    backgroundColor: '#FF3B30',
                    borderRadius: 10,
                    minWidth: 18,
                    height: 18,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 4,
                    borderWidth: 2,
                    borderColor: colors.surface,
                  }}>
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 10,
                      fontWeight: 'bold',
                    }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Inquiries"
        component={AgentInquiriesScreen}
        options={{
          title: 'Inquiries',
          tabBarIcon: ({color}) => (
            <Text style={{color, fontSize: 20, textAlign: 'center'}}>📨</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={AgentProfileScreen}
        options={{
          title: 'Profile',
          headerShown: false, // Hide default header for custom header
          tabBarIcon: ({color}) => (
            <Text style={{color, fontSize: 20, textAlign: 'center'}}>👤</Text>
          ),
        }}
      />
      <Tab.Screen
        name="PropertyDetails"
        component={AgentPropertyDetailsScreen}
        options={{
          title: 'Property Details',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
      <Tab.Screen
        name="AddProperty"
        component={AddPropertyScreen}
        options={{
          title: 'Add Property',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
      <Tab.Screen
        name="AddProject"
        component={AddProjectScreen}
        options={{
          title: 'Add Project',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
      <Tab.Screen
        name="EditProperty"
        component={EditPropertyScreen}
        options={{
          title: 'Edit Property',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
      <Tab.Screen
        name="Support"
        component={AgentSupportScreen}
        options={{
          title: 'Support',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
    </Tab.Navigator>
  );
};

export default AgentTabNavigator;


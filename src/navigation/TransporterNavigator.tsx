import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

// Import Screens
import DashboardScreen from '../screens/transporter/DashboardScreen';
import FleetScreen from '../screens/transporter/FleetScreen';
import DriversScreen from '../screens/transporter/DriversScreen';
import OperationsScreen from '../screens/transporter/OperationsScreen';
import ReportsProfileScreen from '../screens/transporter/ReportsProfileScreen';

export type TransporterTabParamList = {
  Dashboard: undefined;
  Fleet: undefined;
  Drivers: undefined;
  Operations: undefined;
  ReportsProfile: undefined;
};

const Tab = createBottomTabNavigator<TransporterTabParamList>();

const TransporterNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: '#666666',
        tabBarStyle: styles.tabBar,
        headerStyle: styles.header,
        headerTintColor: '#FFFFFF',
        headerTitleStyle: styles.headerTitle,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: 24 }}>🏢</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Fleet"
        component={FleetScreen}
        options={{
          tabBarLabel: 'Fleet',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: 24 }}>🚌</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Drivers"
        component={DriversScreen}
        options={{
          tabBarLabel: 'Drivers',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: 24 }}>👤</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Operations"
        component={OperationsScreen}
        options={{
          tabBarLabel: 'Operations',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: 24 }}>📅</Text>
          ),
        }}
      />
      <Tab.Screen
        name="ReportsProfile"
        component={ReportsProfileScreen}
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: 24 }}>📊</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  header: {
    backgroundColor: '#1A237E',
  },
  headerTitle: {
    fontWeight: '600',
    fontSize: 18,
  },
});

export default TransporterNavigator;
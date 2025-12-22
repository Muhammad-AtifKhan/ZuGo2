import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';

// Import Main Screens
import DashboardScreen from '../screens/transporter/DashboardScreen';
import FleetScreen from '../screens/transporter/FleetScreen';
import DriversScreen from '../screens/transporter/DriversScreen';
import OperationsScreen from '../screens/transporter/OperationsScreen';
import ReportsProfileScreen from '../screens/transporter/ReportsProfileScreen';

// Import Subscreens
import NotificationsScreen from '../screens/transporter/NotificationsScreen';
import AddBusScreen from '../screens/transporter/subscreens/AddBusScreen';
import AddDriverScreen from '../screens/transporter/subscreens/AddDriverScreen';
import ScheduleTripScreen from '../screens/transporter/subscreens/ScheduleTripScreen';

// Create Stack Navigators for each tab
const DashboardStack = createNativeStackNavigator();
const FleetStack = createNativeStackNavigator();
const DriversStack = createNativeStackNavigator();
const OperationsStack = createNativeStackNavigator();
const ReportsStack = createNativeStackNavigator();

// Dashboard Stack Navigator - IMPORTANT: headerShown: true for main screen
const DashboardStackNavigator = () => (
  <DashboardStack.Navigator>
    <DashboardStack.Screen
      name="DashboardMain"
      component={DashboardScreen}
      options={{
        headerShown: true,
        headerTitle: 'Dashboard',
        headerStyle: styles.header,
        headerTintColor: '#FFFFFF',
        headerTitleStyle: styles.headerTitle,
      }}
    />
    <DashboardStack.Screen
      name="Notifications"
      component={NotificationsScreen}
      options={{
        headerShown: true,
        headerTitle: 'Notifications',
        headerStyle: styles.header,
        headerTintColor: '#FFFFFF',
        headerTitleStyle: styles.headerTitle,
      }}
    />
  </DashboardStack.Navigator>
);

// Fleet Stack Navigator
const FleetStackNavigator = () => (
  <FleetStack.Navigator>
    <FleetStack.Screen
      name="FleetMain"
      component={FleetScreen}
      options={{
        headerShown: true,
        headerTitle: 'Fleet Management',
        headerStyle: styles.header,
        headerTintColor: '#FFFFFF',
        headerTitleStyle: styles.headerTitle,
      }}
    />
    <FleetStack.Screen
      name="AddBusScreen"
      component={AddBusScreen}
      options={({ route }: any) => ({
        headerShown: true,
        headerTitle: route.params?.mode === 'edit' ? 'Edit Bus' : 'Add New Bus',
        headerStyle: styles.header,
        headerTintColor: '#FFFFFF',
        headerTitleStyle: styles.headerTitle,
      })}
    />
  </FleetStack.Navigator>
);

// Drivers Stack Navigator
const DriversStackNavigator = () => (
  <DriversStack.Navigator>
    <DriversStack.Screen
      name="DriversMain"
      component={DriversScreen}
      options={{
        headerShown: true,
        headerTitle: 'Driver Management',
        headerStyle: styles.header,
        headerTintColor: '#FFFFFF',
        headerTitleStyle: styles.headerTitle,
      }}
    />
    <DriversStack.Screen
      name="AddDriverScreen"
      component={AddDriverScreen}
      options={({ route }: any) => ({
        headerShown: true,
        headerTitle: route.params?.mode === 'edit' ? 'Edit Driver' : 'Add New Driver',
        headerStyle: styles.header,
        headerTintColor: '#FFFFFF',
        headerTitleStyle: styles.headerTitle,
      })}
    />
  </DriversStack.Navigator>
);

// Operations Stack Navigator
const OperationsStackNavigator = () => (
  <OperationsStack.Navigator>
    <OperationsStack.Screen
      name="OperationsMain"
      component={OperationsScreen}
      options={{
        headerShown: true,
        headerTitle: 'Operations',
        headerStyle: styles.header,
        headerTintColor: '#FFFFFF',
        headerTitleStyle: styles.headerTitle,
      }}
    />
    <OperationsStack.Screen
      name="ScheduleTripScreen"
      component={ScheduleTripScreen}
      options={({ route }: any) => ({
        headerShown: true,
        headerTitle: route.params?.mode === 'edit' ? 'Edit Trip' : 'Schedule Trip',
        headerStyle: styles.header,
        headerTintColor: '#FFFFFF',
        headerTitleStyle: styles.headerTitle,
      })}
    />
  </OperationsStack.Navigator>
);

// Reports Stack Navigator
const ReportsStackNavigator = () => (
  <ReportsStack.Navigator>
    <ReportsStack.Screen
      name="ReportsMain"
      component={ReportsProfileScreen}
      options={{
        headerShown: true,
        headerTitle: 'Reports & Profile',
        headerStyle: styles.header,
        headerTintColor: '#FFFFFF',
        headerTitleStyle: styles.headerTitle,
      }}
    />
  </ReportsStack.Navigator>
);

// Main Tab Navigator
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
        headerShown: false, // Tab level pe header hide
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStackNavigator}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: 24 }}>🏢</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Fleet"
        component={FleetStackNavigator}
        options={{
          tabBarLabel: 'Fleet',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: 24 }}>🚌</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Drivers"
        component={DriversStackNavigator}
        options={{
          tabBarLabel: 'Drivers',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: 24 }}>👤</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Operations"
        component={OperationsStackNavigator}
        options={{
          tabBarLabel: 'Operations',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: 24 }}>📅</Text>
          ),
        }}
      />
      <Tab.Screen
        name="ReportsProfile"
        component={ReportsStackNavigator}
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
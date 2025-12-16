import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

// Import screens
import DashboardScreen from '../screens/driver/DashboardScreen';
import RouteScreen from '../screens/driver/RouteScreen';

// We'll create BoardingScreen below
import BoardingScreen from '../screens/driver/BoardingScreen';

// Side Menu screens
import ScheduleScreen from '../screens/driver/ScheduleScreen';
import VehicleCheckScreen from '../screens/driver/VehicleCheckScreen';
import EarningsScreen from '../screens/driver/EarningsScreen';
import EmergencyScreen from '../screens/driver/EmergencyScreen';
import ProfileScreen from '../screens/driver/ProfileScreen';
import NotificationsScreen from '../screens/driver/NotificationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Simple tab bar icon component
const TabIcon = ({ focused, title }: { focused: boolean; title: string }) => {
  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabIconText, focused ? styles.tabIconActive : styles.tabIconInactive]}>
        {getIconEmoji(title)}
      </Text>
      <Text style={[styles.tabLabel, focused ? styles.tabLabelActive : styles.tabLabelInactive]}>
        {title}
      </Text>
    </View>
  );
};

const getIconEmoji = (title: string) => {
  switch (title) {
    case 'Dashboard': return '🏠';
    case 'Boarding': return '👥';
    case 'Route': return '🗺️';
    default: return '🔘';
  }
};

// Side Menu Navigator
export const SideMenuStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: styles.header,
        headerTintColor: '#1A237E',
        headerTitleStyle: styles.headerTitle,
      }}
    >
      <Stack.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{ title: '📅 My Schedule' }}
      />
      <Stack.Screen
        name="VehicleCheck"
        component={VehicleCheckScreen}
        options={{ title: '🔧 Vehicle Check' }}
      />
      <Stack.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{ title: '💰 My Earnings' }}
      />
      <Stack.Screen
        name="Emergency"
        component={EmergencyScreen}
        options={{ title: '🆘 Emergency' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: '👤 My Profile' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: '🔔 Notifications' }}
      />
    </Stack.Navigator>
  );
};

// Custom header with hamburger menu
const CustomHeader = ({ navigation }: any) => {
  const openSideMenu = () => {
    // We'll use a simple navigation to Schedule as entry point
    navigation.navigate('Schedule');
  };

  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity onPress={openSideMenu} style={styles.menuButton}>
        <Text style={styles.menuIcon}>☰</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitleText}>Driver App</Text>
      <View style={styles.headerRight} />
    </View>
  );
};

const DriverNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused }) => {
          return <TabIcon focused={focused} title={route.name} />;
        },
        tabBarStyle: styles.tabBar,
        headerStyle: styles.header,
        headerTintColor: '#1A237E',
        headerTitleStyle: styles.headerTitle,
        tabBarShowLabel: false,
        header: () => <CustomHeader navigation={navigation} />,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Driver Dashboard' }}
      />
      <Tab.Screen
        name="Boarding"
        component={BoardingScreen}
        options={{ title: 'Passenger Boarding' }}
      />
      <Tab.Screen
        name="Route"
        component={RouteScreen}
        options={{ title: 'Route Management' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E0E0E0',
    borderTopWidth: 1,
    height: 70,
    paddingBottom: 10,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  tabIconText: {
    fontSize: 22,
    marginBottom: 4,
  },
  tabIconActive: {
    color: '#4A90E2',
  },
  tabIconInactive: {
    color: '#666666',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#4A90E2',
  },
  tabLabelInactive: {
    color: '#666666',
  },
  header: {
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  headerContainer: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 40,
  },
});

export default DriverNavigator;
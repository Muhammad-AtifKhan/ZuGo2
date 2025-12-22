import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

// Import screens
import DashboardScreen from '../screens/driver/DashboardScreen';
import BoardingScreen from '../screens/driver/BoardingScreen';
import RouteScreen from '../screens/driver/RouteScreen';

// Side Menu screens
import ScheduleScreen from '../screens/driver/ScheduleScreen';
import VehicleCheckScreen from '../screens/driver/VehicleCheckScreen';
import EarningsScreen from '../screens/driver/EarningsScreen';
import EmergencyScreen from '../screens/driver/EmergencyScreen';
import ProfileScreen from '../screens/driver/ProfileScreen';
import NotificationsScreen from '../screens/driver/NotificationsScreen';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Simple tab bar icon component
const TabIcon = ({ focused, title }: { focused: boolean; title: string }) => {
  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabIconText, focused ? styles.tabIconActive : styles.tabIconInactive]}>
        {getIconEmoji(title)}
      </Text>
      <Text style={[styles.tabLabel, focused ? styles.tabLabelActive : styles.tabLabelInactive]}>
        {getShortName(title)}
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

const getShortName = (title: string) => {
  switch (title) {
    case 'Dashboard': return 'Dashboard';
    case 'Boarding': return 'Boarding';
    case 'Route': return 'Route';
    default: return title;
  }
};

// Main Tab Navigator
const DriverTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          return <TabIcon focused={focused} title={route.name} />;
        },
        tabBarStyle: styles.tabBar,
        headerStyle: styles.header,
        headerTintColor: '#1A237E',
        headerTitleStyle: styles.headerTitle,
        tabBarShowLabel: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Driver Dashboard',
          headerShown: false, // Custom header دکھائیں گے
        }}
      />
      <Tab.Screen
        name="Boarding"
        component={BoardingScreen}
        options={{
          title: 'Passenger Boarding',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Route"
        component={RouteScreen}
        options={{
          title: 'Route Management',
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
};

// Custom Drawer Content
const CustomDrawerContent = (props: any) => {
  const { navigation } = props;

  const drawerItems = [
    { name: 'Main', label: '🏠 Main Dashboard', screen: 'Main' },
    { name: 'Schedule', label: '📅 My Schedule', screen: 'Schedule' },
    { name: 'VehicleCheck', label: '🔧 Vehicle Check', screen: 'VehicleCheck' },
    { name: 'Earnings', label: '💰 My Earnings', screen: 'Earnings' },
    { name: 'Emergency', label: '🆘 Emergency', screen: 'Emergency' },
    { name: 'Profile', label: '👤 My Profile', screen: 'Profile' },
    { name: 'Notifications', label: '🔔 Notifications', screen: 'Notifications' },
  ];

  return (
    <View style={styles.drawerContainer}>
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerTitle}>Driver App</Text>
        <Text style={styles.drawerSubtitle}>Welcome, Driver Ali!</Text>
      </View>

      <View style={styles.drawerItems}>
        {drawerItems.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={styles.drawerItem}
            onPress={() => {
              if (item.name === 'Main') {
                // Main tabs پر واپس جائیں
                navigation.navigate('Main', { screen: 'Dashboard' });
              } else {
                navigation.navigate(item.screen);
              }
              navigation.closeDrawer();
            }}
          >
            <Text style={styles.drawerItemText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.drawerFooter}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            // Logout logic here
            navigation.closeDrawer();
          }}
        >
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Main Driver Navigator with Drawer
const DriverNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerStyle: {
          backgroundColor: '#FFFFFF',
          width: 280,
        },
        headerShown: false,
      }}
    >
      <Drawer.Screen
        name="Main"
        component={DriverTabs}
        options={{
          drawerLabel: '🏠 Main Dashboard',
        }}
      />
      <Drawer.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          drawerLabel: '📅 My Schedule',
        }}
      />
      <Drawer.Screen
        name="VehicleCheck"
        component={VehicleCheckScreen}
        options={{
          drawerLabel: '🔧 Vehicle Check',
        }}
      />
      <Drawer.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{
          drawerLabel: '💰 My Earnings',
        }}
      />
      <Drawer.Screen
        name="Emergency"
        component={EmergencyScreen}
        options={{
          drawerLabel: '🆘 Emergency',
        }}
      />
      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          drawerLabel: '👤 My Profile',
        }}
      />
      <Drawer.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          drawerLabel: '🔔 Notifications',
        }}
      />
    </Drawer.Navigator>
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
  drawerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  drawerHeader: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 30,
    marginBottom: 20,
  },
  drawerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  drawerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  drawerItems: {
    flex: 1,
    paddingHorizontal: 15,
  },
  drawerItem: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  drawerItemText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DriverNavigator;
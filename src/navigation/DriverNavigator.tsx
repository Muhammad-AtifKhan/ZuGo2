// navigation/DriverNavigator.tsx - FIXED VERSION
import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import auth from '@react-native-firebase/auth';  // ✅ Direct Firebase import
import firestore from '@react-native-firebase/firestore';

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

// ❌ NO useAuth import - directly use Firebase

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Loading component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#4A90E2" />
    <Text style={styles.loadingText}>Loading Driver Panel...</Text>
  </View>
);

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
          headerShown: false,
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

// Custom Drawer Content - with direct Firebase
const CustomDrawerContent = (props: any) => {
  const { navigation } = props;
  const [driverName, setDriverName] = useState('Driver');
  const [loading, setLoading] = useState(true);

  const user = auth().currentUser;  // ✅ Direct Firebase

  useEffect(() => {
    const fetchDriverName = async () => {
      if (user) {
        try {
          const userDoc = await firestore().collection('users').doc(user.uid).get();
          if (userDoc.exists) {
            setDriverName(userDoc.data()?.fullName || 'Driver');
          }
        } catch (error) {
          console.error('Error fetching driver name:', error);
        }
      }
      setLoading(false);
    };

    fetchDriverName();
  }, [user]);

  const drawerItems = [
    { name: 'Main', label: '🏠 Main Dashboard', screen: 'Main' },
    { name: 'Schedule', label: '📅 My Schedule', screen: 'Schedule' },
    { name: 'VehicleCheck', label: '🔧 Vehicle Check', screen: 'VehicleCheck' },
    { name: 'Earnings', label: '💰 My Earnings', screen: 'Earnings' },
    { name: 'Emergency', label: '🆘 Emergency', screen: 'Emergency' },
    { name: 'Profile', label: '👤 My Profile', screen: 'Profile' },
    { name: 'Notifications', label: '🔔 Notifications', screen: 'Notifications' },
  ];

  const handleLogout = async () => {
    try {
      await auth().signOut();  // ✅ Direct Firebase logout
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.drawerContainer}>
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerTitle}>Driver App</Text>
        <Text style={styles.drawerSubtitle}>Welcome, {driverName}!</Text>
      </View>

      <View style={styles.drawerItems}>
        {drawerItems.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={styles.drawerItem}
            onPress={() => {
              if (item.name === 'Main') {
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
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Main Driver Navigator with Drawer
const DriverNavigator = () => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Check auth state directly
  useEffect(() => {
    const subscriber = auth().onAuthStateChanged((authUser) => {
      setUser(authUser);
      if (initializing) setInitializing(false);
    });
    return subscriber;
  }, [initializing]);

  if (initializing) {
    return <LoadingScreen />;
  }

  // Agar user nahi hai to kuch mat dikhao - RootNavigator handle karega
  if (!user) {
    return null;
  }

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4A90E2',
  },
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
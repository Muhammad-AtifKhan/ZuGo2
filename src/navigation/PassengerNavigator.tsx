import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';


// Import screens
import HomeScreen from '../screens/passenger/HomeScreen';
import SearchResultsScreen from '../screens/passenger/SearchResultsScreen';
import SeatSelectionScreen from '../screens/passenger/SeatSelectionScreen';
import PaymentScreen from '../screens/passenger/PaymentScreen';
import BookingConfirmationScreen from '../screens/passenger/BookingConfirmationScreen';
import MyTripsScreen from '../screens/passenger/MyTripsScreen';
import TrackScreen from '../screens/passenger/TrackScreen';
import ProfileScreen from '../screens/passenger/ProfileScreen';

export type PassengerStackParamList = {
  Home: undefined;
  SearchResults: {
    from: string;
    to: string;
    date: string;
    time: string;
    routeId?: string;
  };
  SeatSelection: {
    busId: string;
    from: string;
    to: string;
    date: string;
    time: string;
  };
  Payment: {
    busId: string;
    seatIds: string[];
    totalAmount: number;
  };
  BookingConfirmation: {
    bookingId: string;
  };
  MyTrips: undefined;
  Track: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<PassengerStackParamList>();
const Tab = createBottomTabNavigator();

// Home Stack Navigator
const HomeStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
    <Stack.Screen name="SeatSelection" component={SeatSelectionScreen} />
       <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
    </Stack.Navigator>
  );
};

// Main Tab Navigator
const PassengerNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MyTrips"
        component={MyTripsScreen}
        options={{
          tabBarLabel: 'My Trips',
          tabBarIcon: ({ color, size }) => (
            <Icon name="history" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Track"
        component={TrackScreen}
        options={{
          tabBarLabel: 'Track',
          tabBarIcon: ({ color, size }) => (
            <Icon name="location-on" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Icon name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default PassengerNavigator;
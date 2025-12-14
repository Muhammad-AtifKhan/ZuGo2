import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/passenger/HomeScreen';
import MyTripsScreen from '../screens/passenger/MyTripsScreen';
import TrackScreen from '../screens/passenger/TrackScreen';
import ProfileScreen from '../screens/passenger/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function PassengerNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="MyTrips" component={MyTripsScreen} />
      <Tab.Screen name="Track" component={TrackScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

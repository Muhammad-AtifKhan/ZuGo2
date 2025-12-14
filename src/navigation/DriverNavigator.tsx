import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import DashboardScreen from '../screens/driver/DashboardScreen';
import BoardingScreen from '../screens/driver/BoardingScreen';
import RouteScreen from '../screens/driver/RouteScreen';

const Tab = createBottomTabNavigator();

export default function DriverNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Boarding" component={BoardingScreen} />
      <Tab.Screen name="Route" component={RouteScreen} />
    </Tab.Navigator>
  );
}

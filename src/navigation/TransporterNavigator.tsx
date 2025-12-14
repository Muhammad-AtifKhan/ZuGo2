import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import DashboardScreen from '../screens/transporter/DashboardScreen';
import FleetScreen from '../screens/transporter/FleetScreen';
import OperationsScreen from '../screens/transporter/OperationsScreen';
import CompanyScreen from '../screens/transporter/CompanyScreen';
import ManageScreen from '../screens/transporter/ManageScreen';

const Tab = createBottomTabNavigator();

export default function TransporterNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Fleet" component={FleetScreen} />
      <Tab.Screen name="Operations" component={OperationsScreen} />
      <Tab.Screen name="Company" component={CompanyScreen} />
      <Tab.Screen name="Manage" component={ManageScreen} />
    </Tab.Navigator>
  );
}

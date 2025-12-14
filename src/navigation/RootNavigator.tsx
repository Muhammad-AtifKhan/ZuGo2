// src/navigation/RootNavigator.tsx - SIMPLE VERSION
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from './AuthNavigator';
import PassengerNavigator from './PassengerNavigator';
import DriverNavigator from './DriverNavigator';
import TransporterNavigator from './TransporterNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import SplashScreen from '../screens/auth/SplashScreen';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: undefined;
  Passenger: undefined;
  Driver: undefined;
  Transporter: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  userRole: 'passenger' | 'driver' | 'transporter' | null;
  setUserRole: (role: 'passenger' | 'driver' | 'transporter' | null) => void;
}

export default function RootNavigator({ userRole, setUserRole }: RootNavigatorProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={userRole ? getRoleRoute(userRole) : 'Onboarding'}
      >
        <Stack.Screen name="Onboarding">
          {() => <OnboardingNavigator setUserRole={setUserRole} />}
        </Stack.Screen>

        <Stack.Screen name="Auth">
          {() => <AuthNavigator setUserRole={setUserRole} />}
        </Stack.Screen>

        <Stack.Screen name="Passenger" component={PassengerNavigator} />
        <Stack.Screen name="Driver" component={DriverNavigator} />
        <Stack.Screen name="Transporter" component={TransporterNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function getRoleRoute(role: string): 'Passenger' | 'Driver' | 'Transporter' {
  switch (role) {
    case 'passenger': return 'Passenger';
    case 'driver': return 'Driver';
    case 'transporter': return 'Transporter';
    default: return 'Passenger';
  }
}
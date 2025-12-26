import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';

import AuthNavigator from './AuthNavigator';
import PassengerNavigator from './PassengerNavigator';
import DriverNavigator from './DriverNavigator';
import TransporterNavigator from './TransporterNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import SplashScreen from '../screens/auth/SplashScreen';

interface RootNavigatorProps {
  userRole: 'passenger' | 'driver' | 'transporter' | null;
  setUserRole: (role: 'passenger' | 'driver' | 'transporter' | null) => void;
}

export default function RootNavigator({ userRole, setUserRole }: RootNavigatorProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>

      {/* 🔐 ROLE-BASED ROUTING GUARD */}
      {!userRole ? (
        <OnboardingNavigator setUserRole={setUserRole} />
      ) : userRole === 'passenger' ? (
        <PassengerNavigator />
      ) : userRole === 'driver' ? (
        <DriverNavigator />
      ) : (
        <TransporterNavigator />
      )}

    </NavigationContainer>
  );
}

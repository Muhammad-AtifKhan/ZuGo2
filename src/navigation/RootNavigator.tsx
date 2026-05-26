import 'react-native-gesture-handler';
import React, { useEffect, useState, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';

import AuthNavigator from './AuthNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import PassengerNavigator from './PassengerNavigator';
import DriverNavigator from './DriverNavigator';
import TransporterNavigator from './TransporterNavigator';
import SplashScreen from '../screens/auth/SplashScreen';

export default function RootNavigator() {
  const {
    user,
    loading,
    userRole,
    isEmailVerified,
    isAdminVerified,
  } = useContext(AuthContext);

  const [firstLaunch, setFirstLaunch] = useState<boolean | null>(null);
  const [splashVisible, setSplashVisible] = useState(true);

  // 🔥 CHECK FIRST LAUNCH (DEVICE LEVEL)
  useEffect(() => {
    const checkFirstLaunch = async () => {
      const value = await AsyncStorage.getItem('alreadyLaunched');

      if (value === null) {
        await AsyncStorage.setItem('alreadyLaunched', 'true');
        setFirstLaunch(true);
      } else {
        setFirstLaunch(false);
      }
    };

    checkFirstLaunch();
  }, []);

  // Splash timer
  useEffect(() => {
    if (!loading && firstLaunch !== null) {
      const timer = setTimeout(() => {
        setSplashVisible(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [loading, firstLaunch]);

  if (loading || firstLaunch === null || splashVisible) {
    return <SplashScreen />;
  }

  // ✅ Determine if user can access their respective app
  const canAccessPassengerApp = user && userRole === 'passenger' && isEmailVerified;
  const canAccessDriverApp = user && userRole === 'driver' && isEmailVerified;
  const canAccessTransporterApp =
    user && userRole === 'transporter' && isEmailVerified && isAdminVerified;

  return (
    <NavigationContainer>
      {!user ? (
        firstLaunch ? (
          <OnboardingNavigator />
        ) : (
          <AuthNavigator />
        )
      ) : (
        <>
          {userRole === 'passenger' &&
            (canAccessPassengerApp ? (
              <PassengerNavigator />
            ) : (
              <AuthNavigator />
            ))}

          {userRole === 'driver' &&
            (canAccessDriverApp ? (
              <DriverNavigator />
            ) : (
              <AuthNavigator />
            ))}

          {userRole === 'transporter' &&
            (canAccessTransporterApp ? (
              <TransporterNavigator />
            ) : (
              <AuthNavigator />
            ))}

          {!userRole && <AuthNavigator />}
        </>
      )}
    </NavigationContainer>
  );
}
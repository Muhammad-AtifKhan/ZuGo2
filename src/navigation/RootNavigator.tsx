import 'react-native-gesture-handler';
import React, { useEffect, useState, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { AuthContext } from '../context/AuthContext';

import AuthNavigator from './AuthNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import PassengerNavigator from './PassengerNavigator';
import DriverNavigator from './DriverNavigator';
import TransporterNavigator from './TransporterNavigator';
import SplashScreen from '../screens/auth/SplashScreen';

export default function RootNavigator() {
  const { user, loading } = useContext(AuthContext);

  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
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

  // 🔥 FETCH USER ROLE
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const doc = await firestore()
          .collection('users')
          .doc(user.uid)
          .get();

        setUserRole(doc.data()?.userType?.toLowerCase() ?? null);
      } else {
        setUserRole(null);
      }

      setCheckingRole(false);
    };

    fetchUserRole();
  }, [user]);

  // Splash timer
  useEffect(() => {
    if (!loading && !checkingRole && firstLaunch !== null) {
      const timer = setTimeout(() => {
        setSplashVisible(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [loading, checkingRole, firstLaunch]);

  if (loading || checkingRole || firstLaunch === null || splashVisible) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {!user ? (
        firstLaunch ? (
          <OnboardingNavigator />
        ) : (
          <AuthNavigator />
        )
      ) : userRole === 'passenger' ? (
        <PassengerNavigator />
      ) : userRole === 'driver' ? (
        <DriverNavigator />
      ) : userRole === 'transporter' ? (
        <TransporterNavigator />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}
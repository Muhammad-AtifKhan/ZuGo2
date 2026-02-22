import 'react-native-gesture-handler';
import React, { useEffect, useState, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
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
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const doc = await firestore()
            .collection('users')
            .doc(user.uid)
            .get();

          if (doc.exists) {
            const data = doc.data();
            setUserRole(data?.userType || null);
            setHasOnboarded(data?.hasOnboarded || false);
          } else {
            setUserRole(null);
            setHasOnboarded(false);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUserRole(null);
        setHasOnboarded(false);
      }
      setCheckingRole(false);
    };

    fetchUserData();
  }, [user]);

  // Splash minimum duration - 2 seconds
  useEffect(() => {
    if (!loading && !checkingRole && hasOnboarded !== null) {
      const timer = setTimeout(() => {
        setSplashVisible(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [loading, checkingRole, hasOnboarded]);

  // Jab tak sab load ho raha hai, splash dikhao
  if (splashVisible || loading || checkingRole || hasOnboarded === null) {
    return <SplashScreen />;
  }

  const handleOnboardingComplete = async () => {
    if (user) {
      await firestore().collection('users').doc(user.uid).update({
        hasOnboarded: true,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      setHasOnboarded(true);
    }
  };

  return (
    <NavigationContainer>
      {!user ? (
        // 👇 USER LOGGED OUT - AUTH FLOW
        <AuthNavigator />
      ) : !hasOnboarded ? (
        // 👇 USER LOGGED IN BUT ONBOARDING COMPLETE NAHI
        <OnboardingNavigator
          onOnboardingComplete={handleOnboardingComplete}  // 👈 YEH SAHI HAI
        />
      ) : userRole === 'passenger' ? (
        <PassengerNavigator />
      ) : userRole === 'driver' ? (
        <DriverNavigator />
      ) : userRole === 'transporter' ? (
        <TransporterNavigator />
      ) : (
        // 👇 FALLBACK
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}
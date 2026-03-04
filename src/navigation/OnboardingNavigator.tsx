// src/navigation/OnboardingNavigator.tsx
import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import AuthNavigator from './AuthNavigator';

export type OnboardingStackParamList = {
  Onboarding: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  const [done, setDone] = useState(false);

  // Once onboarding is done, go to Auth flow
  if (done) {
    return <AuthNavigator />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
      initialRouteName="Onboarding"
    >
      <Stack.Screen name="Onboarding">
        {(props) => (
          <OnboardingScreen
            {...props}
            onComplete={() => setDone(true)} // ✅ Fix: handled inside navigator
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
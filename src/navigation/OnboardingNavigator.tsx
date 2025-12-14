// src/navigation/OnboardingNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen1 from '../screens/auth/OnboardingScreen1';
import OnboardingScreen2 from '../screens/auth/OnboardingScreen2';
import OnboardingScreen3 from '../screens/auth/OnboardingScreen3';
import LoginScreen from '../screens/auth/LoginScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';

export type OnboardingStackParamList = {
  Onboarding1: undefined;
  Onboarding2: undefined;  // ✅ FIXED
  Onboarding3: undefined;
  Login: undefined;
  RoleSelection: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

interface OnboardingNavigatorProps {
  setUserRole: (role: 'passenger' | 'driver' | 'transporter' | null) => void;
}

export default function OnboardingNavigator({ setUserRole }: OnboardingNavigatorProps) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
      initialRouteName="Onboarding1"
    >
      <Stack.Screen name="Onboarding1" component={OnboardingScreen1} />
      <Stack.Screen name="Onboarding2" component={OnboardingScreen2} />
      <Stack.Screen name="Onboarding3" component={OnboardingScreen3} />

      <Stack.Screen name="Login">
        {() => <LoginScreen setUserRole={setUserRole} />}
      </Stack.Screen>

      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
    </Stack.Navigator>
  );
}
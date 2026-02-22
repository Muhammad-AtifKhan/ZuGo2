// src/navigation/OnboardingNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import PassengerRegistrationScreen from '../screens/auth/PassengerRegistrationScreen';
import TransporterRegistrationScreen from '../screens/auth/TransporterRegistrationScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

export type OnboardingStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  RoleSelection: undefined;
  PassengerRegistration: undefined;
  TransporterRegistration: undefined;
  OTPVerification: any;
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

// 👇 PROPS AB OPTIONAL HO GAYE - KYUNKI ROOT NAVIGATOR ROLE HANDLE KAR RAHA
interface OnboardingNavigatorProps {
  setUserRole?: (role: 'passenger' | 'driver' | 'transporter' | null) => void;
  onOnboardingComplete?: () => void; // 👈 NAYA PROP - ONBOARDING COMPLETE HONE PAR
}

export default function OnboardingNavigator({
  setUserRole,
  onOnboardingComplete
}: OnboardingNavigatorProps) {

  // 👇 ONBOARDING COMPLETE HANDLER
  const handleOnboardingComplete = () => {
    if (onOnboardingComplete) {
      onOnboardingComplete();
    }
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
      initialRouteName="Onboarding"
    >
      {/* 👇 ONBOARDING SCREEN - YAHA COMPLETE BUTTON HOGA */}
      <Stack.Screen name="Onboarding">
        {(props) => (
          <OnboardingScreen
            {...props}
            onComplete={handleOnboardingComplete}
          />
        )}
      </Stack.Screen>

      {/* 👇 LOGIN SCREEN - AB setUserRole OPTIONAL HAI */}
      <Stack.Screen name="Login">
        {(props) => (
          <LoginScreen
            {...props}
            setUserRole={setUserRole}
          />
        )}
      </Stack.Screen>

      {/* 👇 ROLE SELECTION - KOI PROP NAHI */}
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />

      {/* 👇 REGISTRATION SCREENS */}
      <Stack.Screen name="PassengerRegistration" component={PassengerRegistrationScreen} />
      <Stack.Screen name="TransporterRegistration" component={TransporterRegistrationScreen} />

      {/* 👇 OTP VERIFICATION - setUserRole PASS KARO */}
      <Stack.Screen name="OTPVerification">
        {(props) => (
          <OTPVerificationScreen
            {...props.route.params}
            setUserRole={setUserRole}
          />
        )}
      </Stack.Screen>

      {/* 👇 FORGOT PASSWORD */}
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
// src/navigation/AuthNavigator.tsx - UPDATED WITH PROPS
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import PassengerRegistrationScreen from '../screens/auth/PassengerRegistrationScreen';
import TransporterRegistrationScreen from '../screens/auth/TransporterRegistrationScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

export type AuthStackParamList = {
  Login: undefined;
  RoleSelection: undefined;
  PassengerRegistration: undefined;
  TransporterRegistration: undefined;
  OTPVerification: { phone: string; role: string };
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

interface AuthNavigatorProps {
  setUserRole: (role: 'passenger' | 'driver' | 'transporter' | null) => void;
}

export default function AuthNavigator({ setUserRole }: AuthNavigatorProps) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login">
        {() => <LoginScreen setUserRole={setUserRole} />}
      </Stack.Screen>
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="PassengerRegistration" component={PassengerRegistrationScreen} />
      <Stack.Screen name="TransporterRegistration" component={TransporterRegistrationScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
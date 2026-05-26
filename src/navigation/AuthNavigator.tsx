import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/auth/LoginScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import PassengerRegistrationScreen from '../screens/auth/PassengerRegistrationScreen';
import TransporterRegistrationScreen from '../screens/auth/TransporterRegistrationScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';

export type AuthStackParamList = {
  Login: undefined;
  RoleSelection: undefined;
  PassengerRegistration: { role: 'passenger' };
  TransporterRegistration: { role: 'transporter' };
  ForgotPassword: undefined;
  OTPVerification: { phone?: string; role?: string; email?: string; userId?: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen
        name="PassengerRegistration"
        component={PassengerRegistrationScreen}
      />
      <Stack.Screen
        name="TransporterRegistration"
        component={TransporterRegistrationScreen}
      />

      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
      />
      <Stack.Screen
        name="OTPVerification"
        component={OTPVerificationScreen}
      />
    </Stack.Navigator>
  );
}
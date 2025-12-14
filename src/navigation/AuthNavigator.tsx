import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator({ setUserRole }: any) {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Login">
        {(props) => <LoginScreen {...props} setUserRole={setUserRole} />}
      </Stack.Screen>

      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// App.tsx - CORRECTED VERSION
import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';

export type UserRole = 'passenger' | 'driver' | 'transporter' | null;

const App = () => {
  const [userRole, setUserRole] = useState<UserRole>(null);

  return (
    <SafeAreaProvider>
      <RootNavigator userRole={userRole} setUserRole={setUserRole} />
    </SafeAreaProvider>
  );
};

export default App;
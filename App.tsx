import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';

export type UserRole = 'passenger' | 'driver' | 'transporter' | null;

const App = () => {
  const [userRole, setUserRole] = useState<UserRole>(null);

  return (
    <NavigationContainer>
      <RootNavigator userRole={userRole} setUserRole={setUserRole} />
    </NavigationContainer>
  );
};

export default App;

import React from 'react';
import AuthNavigator from './AuthNavigator';
import PassengerNavigator from './PassengerNavigator';
import DriverNavigator from './DriverNavigator';
import TransporterNavigator from './TransporterNavigator';

type Props = {
  userRole: 'passenger' | 'driver' | 'transporter' | null;
  setUserRole: (role: 'passenger' | 'driver' | 'transporter') => void;
};

export default function RootNavigator({ userRole, setUserRole }: Props) {
  if (!userRole) {
    return <AuthNavigator setUserRole={setUserRole} />;
  }

  if (userRole === 'passenger') return <PassengerNavigator />;
  if (userRole === 'driver') return <DriverNavigator />;
  if (userRole === 'transporter') return <TransporterNavigator />;

  return null;
}

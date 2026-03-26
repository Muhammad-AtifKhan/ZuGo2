// src/types/operations.types.ts
import firestore from '@react-native-firebase/firestore';

export type Route = {
  id: string;
  code: string;
  name: string;
  from?: string;
  to?: string;
  distance: string;
  duration: string;
  stops: number;
  fare: number;
  transporterId: string;
  createdAt: firestore.Timestamp;
  updatedAt?: firestore.Timestamp;
};

export type TripStatus = 'active' | 'upcoming' | 'delayed' | 'completed' | 'cancelled';

export type Trip = {
  id: string;
  routeCode: string;
  routeName: string;
  busId: string;
  busNumber: string;
  driverId: string;
  driverName: string;
  departureTime: string;
  arrivalTime: string;
  days: string[];
  status: TripStatus;
  passengers: number;
  revenue: number;
  transporterId: string;
  createdAt: firestore.Timestamp;
  updatedAt?: firestore.Timestamp;
  scheduledDate?: firestore.Timestamp;
};

export type OperationsStats = {
  activeTrips: number;
  todayTrips: number;
  completedTrips: number;
  delayedTrips: number;
  totalRevenue: number;
  totalPassengers: number;
  totalRoutes: number;
};
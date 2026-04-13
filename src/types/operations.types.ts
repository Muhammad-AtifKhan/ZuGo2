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

/**
 * TRIP STATUS DEFINITIONS
 * - 'scheduled': Trip is planned but not started (was 'upcoming')
 * - 'in_progress': Trip is currently en route (was 'active'/'on-time')
 * - 'delayed': Trip is running late
 * - 'completed': Trip finished successfully
 * - 'cancelled': Trip was cancelled
 * - 'expired': Trip missed departure (computed only, not stored)
 */
export type TripStatus = 'scheduled' | 'in_progress' | 'delayed' | 'completed' | 'cancelled';

export type Trip = {
  id: string;
  routeId: string;
  routeCode: string;
  routeName: string;
  from?: string;
  to?: string;
  fromCode?: string;
  toCode?: string;
  busId: string;
  busNumber: string;
  driverId: string;
  driverName: string;
  departureTime: string;
  arrivalTime: string;
  days: string[];
  status: TripStatus;
  totalSeats: number;
  availableSeats: number;
  heldSeats?: number;
  fare: number;
  distance?: string | number;
  duration?: string;
  passengers: number;
  revenue: number;
  estimatedRevenue?: number;
  transporterId: string;
  date?: string;                    // YYYY-MM-DD format
  dayOfWeek?: string;
  startDate?: string;
  endDate?: string;
  repeatType?: 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom';
  scheduleId?: string | null;
  scheduleTemplateId?: string | null;
  startedAt?: firestore.Timestamp;
  completedAt?: firestore.Timestamp;
  cancelledAt?: firestore.Timestamp;
  scheduledDate?: firestore.Timestamp;
  createdAt: firestore.Timestamp;
  updatedAt?: firestore.Timestamp;
};

export type OperationsStats = {
  activeTrips: number;        // in_progress trips
  scheduledTrips: number;     // scheduled trips (was todayTrips)
  completedTrips: number;
  delayedTrips: number;
  cancelledTrips: number;
  totalRevenue: number;
  totalPassengers: number;
  totalRoutes: number;
};

// Helper function to check if trip is active
export const isTripActive = (status: TripStatus): boolean => {
  return status === 'in_progress';
};

// Helper function to check if trip can be started
export const canStartTrip = (trip: Trip): boolean => {
  return trip.status === 'scheduled';
};

// Helper function to check if trip is finished
export const isTripFinished = (status: TripStatus): boolean => {
  return status === 'completed' || status === 'cancelled';
};
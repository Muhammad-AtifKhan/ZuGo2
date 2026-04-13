// src/types/transporter.types.ts
import firestore from '@react-native-firebase/firestore';
import { BusStatus } from './fleet.types';
import { DriverStatus } from './driver.types';
import { TripStatus } from './operations.types';

// 🔥 BUS TYPE (Dashboard version)
export type DashboardBus = {
  id: string;                    // Document ID
  number: string;                // Bus number (e.g., "BUS-001")
  registration: string;          // Registration number
  status: BusStatus;
  driverId?: string;             // Optional - assigned driver ID
  driverName?: string;           // Optional - for display
  lastMaintenance: firestore.Timestamp;
  nextMaintenanceDue?: firestore.Timestamp;
  transporterId: string;
  createdAt: firestore.Timestamp;
  updatedAt?: firestore.Timestamp;
};

// 🔥 DRIVER TYPE (Dashboard version)
export type DashboardDriver = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: DriverStatus;
  busAssignedId?: string;
  busNumber?: string;
  rating: number;               // 0-5 rating
  totalTrips: number;
  transporterId: string;
  joinedAt: firestore.Timestamp;
  updatedAt?: firestore.Timestamp;
};

// 🔥 TRIP TYPE (Dashboard version)
export type DashboardTrip = {
  id: string;
  time: firestore.Timestamp;    // Departure time
  route: string;
  routeId: string;
  busId: string;
  busNumber: string;
  driverId: string;
  driverName: string;
  status: TripStatus;
  passengers: number;
  revenue: number;
  transporterId: string;
  date: firestore.Timestamp;    // Trip date
  createdAt: firestore.Timestamp;
  updatedAt?: firestore.Timestamp;
};

// 🔥 NOTIFICATION TYPE
export type TransporterNotification = {
  id: string;
  type: 'maintenance' | 'success' | 'warning' | 'info' | 'emergency';
  title: string;
  message: string;
  time: firestore.Timestamp;
  read: boolean;
  transporterId: string;
  driverId?: string;
  busId?: string;
  tripId?: string;
  actionRequired?: boolean;
};

// 🔥 ALERT TYPE
export type TransporterAlert = {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  timestamp: firestore.Timestamp;
  transporterId: string;
  acknowledged: boolean;
};

// 🔥 DASHBOARD STATS TYPE
export type DashboardStats = {
  totalBuses: number;
  availableBuses: number;        // was activeBuses
  onTripBuses: number;           // NEW
  maintenanceBuses: number;
  inactiveBuses: number;
  totalDrivers: number;
  availableDrivers: number;      // was activeDrivers/onlineDrivers
  onTripDrivers: number;         // NEW
  offlineDrivers: number;
  onLeaveDrivers: number;
  suspendedDrivers: number;
  todayRevenue: number;
  todayTrips: number;
  completedTrips: number;
  delayedTrips: number;
  scheduledTrips: number;        // was upcomingTrips
  onTimePerformance: number;     // Percentage
  averageRating: number;
};

// 🔥 HELPER TYPES FOR API RESPONSES
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// 🔥 FILTER TYPES
export type TripFilter = {
  startDate?: Date;
  endDate?: Date;
  status?: TripStatus;
  driverId?: string;
  busId?: string;
};

export type DriverFilter = {
  status?: DriverStatus;
  minRating?: number;
  searchQuery?: string;
};
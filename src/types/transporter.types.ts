// src/types/transporter.types.ts

// Import Firebase Timestamp type
import firestore from '@react-native-firebase/firestore';

// 🔥 BUS TYPE
export type Bus = {
  id: string;                    // Document ID
  number: string;                 // Bus number (e.g., "BUS-001")
  registration: string;           // Registration number
  status: 'active' | 'maintenance' | 'inactive';
  driverId?: string;              // Optional - assigned driver ID
  driverName?: string;            // Optional - for display
  lastMaintenance: firestore.Timestamp;  // Firebase Timestamp
  nextMaintenanceDue?: firestore.Timestamp;
  transporterId: string;          // Who owns this bus
  createdAt: firestore.Timestamp;
  updatedAt?: firestore.Timestamp;
};

// 🔥 DRIVER TYPE
export type Driver = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'on-duty' | 'online' | 'offline';
  busAssignedId?: string;
  busNumber?: string;
  rating: number;                 // 0-5 rating
  totalTrips: number;
  transporterId: string;
  joinedAt: firestore.Timestamp;
  updatedAt?: firestore.Timestamp;
};

// 🔥 TRIP TYPE
export type Trip = {
  id: string;
  time: firestore.Timestamp;      // Departure time
  route: string;
  routeId: string;
  busId: string;
  busNumber: string;
  driverId: string;
  driverName: string;
  status: 'on-time' | 'delayed' | 'upcoming' | 'completed' | 'cancelled';
  passengers: number;
  revenue: number;
  transporterId: string;
  date: firestore.Timestamp;       // Trip date
  createdAt: firestore.Timestamp;
  updatedAt?: firestore.Timestamp;
};

// 🔥 NOTIFICATION TYPE
export type Notification = {
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
export type Alert = {
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
  activeBuses: number;
  maintenanceBuses: number;
  inactiveBuses: number;
  totalDrivers: number;
  activeDrivers: number;
  onlineDrivers: number;
  offlineDrivers: number;
  todayRevenue: number;
  todayTrips: number;
  completedTrips: number;
  delayedTrips: number;
  upcomingTrips: number;
  onTimePerformance: number;      // Percentage
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
  status?: Trip['status'];
  driverId?: string;
  busId?: string;
};

export type DriverFilter = {
  status?: Driver['status'];
  minRating?: number;
  searchQuery?: string;
};
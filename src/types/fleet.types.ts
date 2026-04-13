// src/types/fleet.types.ts
import firestore from '@react-native-firebase/firestore';

/**
 * BUS STATUS DEFINITIONS
 * - 'available': Bus is ready for assignment (was 'active')
 * - 'on_trip': Bus is currently on a trip (NEW - critical for preventing double booking)
 * - 'maintenance': Bus is under repair/service
 * - 'inactive': Bus is out of service
 */
export type BusStatus = 'available' | 'on_trip' | 'maintenance' | 'inactive';

export type BusImages = {
  frontView?: string;
  backView?: string;
  interior?: string;
  documents?: string;
};

export type Bus = {
  id: string;
  busNumber: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  capacity: number;
  fuelType: 'diesel' | 'petrol' | 'cng' | 'electric';
  color: string;
  busType?: 'standard' | 'ac' | 'luxury' | 'sleeper' | 'minibus';
  status: BusStatus;
  driverId?: string | null;
  driverName?: string | null;
  assignedDriverId?: string | null;  // Alternative field name
  insuranceNumber: string;
  insuranceExpiry: string;
  fitnessExpiry: string;
  images?: BusImages;
  transporterId: string;
  currentTripId?: string | null;     // Active trip reference
  isDeleted?: boolean;
  searchKeywords?: string[];
  createdAt: firestore.Timestamp;
  updatedAt?: firestore.Timestamp;
};

export type MaintenanceRecord = {
  id: string;
  busId: string;
  busNumber: string;
  date: firestore.Timestamp;
  type: 'routine' | 'repair' | 'emergency';
  description: string;
  cost: number;
  mechanicName?: string;
  nextDueDate?: firestore.Timestamp;
  transporterId: string;
  createdAt: firestore.Timestamp;
};

// Helper function to check if bus is available for assignment
export const isBusAvailable = (status: BusStatus): boolean => {
  return status === 'available';
};

// Helper function to check if bus can be assigned to trip
export const canBusTakeTrip = (bus: Bus): boolean => {
  return bus.status === 'available' && !bus.currentTripId;
};
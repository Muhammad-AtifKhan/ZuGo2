// src/types/fleet.types.ts
import firestore from '@react-native-firebase/firestore';

export type BusStatus = 'active' | 'maintenance' | 'inactive';

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
  status: BusStatus;
  driverId?: string;
  driverName?: string;
  insuranceNumber: string;
  insuranceExpiry: string;
  fitnessExpiry: string;
  images?: BusImages;
  transporterId: string;
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
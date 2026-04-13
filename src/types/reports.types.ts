// src/types/reports.types.ts
import firestore from '@react-native-firebase/firestore';
import { BusStatus } from './fleet.types';
import { DriverStatus } from './driver.types';

export type DailyRevenue = {
  day: string;
  revenue: number;
  date: string;
};

export type MonthlyRevenue = {
  month: string;
  revenue: number;
  year: number;
};

export type BusPerformance = {
  busId: string;
  busNumber: string;
  trips: number;
  revenue: number;
  rating: number;
  status: BusStatus;
};

export type DriverPerformance = {
  driverId: string;
  driverName: string;
  trips: number;
  rating: number;
  revenue: number;
  status: DriverStatus;
};

export type CompanyProfile = {
  name: string;
  registration: string;
  email: string;
  phone: string;
  address: string;
  taxNumber: string;
  established: string;
  totalBuses: number;
  totalDrivers: number;
  activeSince: string;
  logo?: string;
  bankDetails?: {
    bankName: string;
    accountTitle: string;
    accountNumber: string;
    iban: string;
  };
};

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'dispatcher' | 'accountant' | 'viewer';
  permissions: string[];
  createdAt: firestore.Timestamp;
};

export type ReportStats = {
  totalRevenue: number;
  avgDailyRevenue: number;
  totalTrips: number;
  avgRating: number;
  availableBuses: number;      // was activeBuses
  availableDrivers: number;    // was activeDrivers
  completedTrips: number;
  cancelledTrips: number;
};
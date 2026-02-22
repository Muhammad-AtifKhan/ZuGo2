// src/types/reports.types.ts
import firestore from '@react-native-firebase/firestore';

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
  status: string;
};

export type DriverPerformance = {
  driverId: string;
  driverName: string;
  trips: number;
  rating: number;
  revenue: number;
  status: string;
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
  activeBuses: number;
  activeDrivers: number;
  completedTrips: number;
  cancelledTrips: number;
};
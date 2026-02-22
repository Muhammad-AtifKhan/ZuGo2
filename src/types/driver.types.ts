// src/types/driver.types.ts
import firestore from '@react-native-firebase/firestore';

export type DriverStatus = 'active' | 'inactive' | 'on-duty' | 'online' | 'offline';

export type Driver = {
  id: string;                    // uid from Firebase
  fullName: string;              // fullName
  contactNumber: string;          // contactNumber
  email: string;
  cnic: string;
  licenseNumber: string;         // licenseNumber
  licenseExpiry: string;
  status: DriverStatus;
  vehicleAssigned?: string;      // vehicleAssigned (bus number)
  rating: number;
  totalRides: number;            // totalRides
  joiningDate: string;
  salary: string | number;       // salary (string ya number)
  emergencyContact: string;
  address: string;
  transporterId: string;
  createdAt: firestore.Timestamp;
  updatedAt?: firestore.Timestamp;

  // Optional fields
  assignedVehicles?: any[];
  currentLocation?: any;
  documents?: any;
  earnings?: number;
  employmentType?: string;
  lastLogin?: any;
  licenseType?: string;
  passwordSetByTransporter?: boolean;
  passwordSetDate?: string;
  phone?: string;
  phoneLocal?: string;
};
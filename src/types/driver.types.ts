// src/types/driver.types.ts
import firestore from '@react-native-firebase/firestore';

/**
 * DRIVER STATUS DEFINITIONS
 * - 'available': Driver is ready for assignment (was 'active'/'online')
 * - 'on_trip': Driver is currently driving a trip (was 'on-duty')
 * - 'offline': Driver is not available (was 'inactive'/'offline')
 * - 'on_leave': Driver is on approved leave
 * - 'suspended': Driver is temporarily suspended
 */
export type DriverStatus = 'available' | 'on_trip' | 'offline' | 'on_leave' | 'suspended';

export type Driver = {
  id: string;                    // uid from Firebase
  fullName: string;              // fullName
  contactNumber: string;         // contactNumber
  email: string;
  cnic: string;
  licenseNumber: string;         // licenseNumber
  licenseExpiry: string;
  isLicenseExpired?: boolean;    // Computed field
  status: DriverStatus;
  vehicleAssigned?: string;      // vehicleAssigned (bus number)
  busAssignedId?: string;        // Reference to assigned bus
  rating: number;
  totalRides: number;            // totalRides
  joiningDate: string;
  salary: string | number;       // salary (string ya number)
  emergencyContact: string;
  address: string;
  experienceYears?: number;
  employmentType?: 'fulltime' | 'parttime' | 'contract';
  licenseType?: 'light' | 'heavy' | 'both';
  transporterId: string;
  uid?: string;                  // Same as id
  role?: string;                 // 'driver'
  isDeleted?: boolean;
  searchKeywords?: string[];
  currentTripId?: string | null; // Active trip reference
  createdAt: firestore.Timestamp;
  updatedAt?: firestore.Timestamp;

  // Optional fields (kept for backward compatibility)
  assignedVehicles?: any[];
  currentLocation?: any;
  documents?: any;
  earnings?: number;
  lastLogin?: any;
  passwordSetByTransporter?: boolean;
  passwordSetDate?: string;
  phone?: string;
  phoneLocal?: string;
};

// Helper function to check if driver is available for assignment
export const isDriverAvailable = (status: DriverStatus): boolean => {
  return status === 'available';
};

// Helper function to check if driver can be assigned to trip
export const canDriverTakeTrip = (driver: Driver): boolean => {
  return driver.status === 'available' && !driver.currentTripId;
};
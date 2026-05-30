// src/constants/status.ts
// Centralized status constants for the entire application

// ============================================
// BUS STATUS
// ============================================
export const BUS_STATUS = {
  AVAILABLE: 'available',
  ON_TRIP: 'on_trip',
  MAINTENANCE: 'maintenance',
  INACTIVE: 'inactive',
} as const;

export type BusStatusType = typeof BUS_STATUS[keyof typeof BUS_STATUS];

// Bus status display configuration
export const BUS_STATUS_CONFIG: Record<BusStatusType, { label: string; icon: string; color: string }> = {
  [BUS_STATUS.AVAILABLE]: { label: 'Available', icon: '🟢', color: '#4CAF50' },
  [BUS_STATUS.ON_TRIP]: { label: 'On Trip', icon: '🚌', color: '#2196F3' },
  [BUS_STATUS.MAINTENANCE]: { label: 'Maintenance', icon: '🔧', color: '#FF9800' },
  [BUS_STATUS.INACTIVE]: { label: 'Inactive', icon: '🔴', color: '#F44336' },
};

// ============================================
// DRIVER STATUS
// ============================================
export const DRIVER_STATUS = {
  AVAILABLE: 'available',
  ON_TRIP: 'on_trip',
  OFFLINE: 'offline',
  ON_LEAVE: 'on_leave',
  SUSPENDED: 'suspended',
} as const;

export type DriverStatusType = typeof DRIVER_STATUS[keyof typeof DRIVER_STATUS];

// Driver status display configuration
export const DRIVER_STATUS_CONFIG: Record<DriverStatusType, { label: string; icon: string; color: string }> = {
  [DRIVER_STATUS.AVAILABLE]: { label: 'Available', icon: '🔵', color: '#2196F3' },
  [DRIVER_STATUS.ON_TRIP]: { label: 'On Trip', icon: '🚌', color: '#4CAF50' },
  [DRIVER_STATUS.OFFLINE]: { label: 'Offline', icon: '⚫', color: '#9E9E9E' },
  [DRIVER_STATUS.ON_LEAVE]: { label: 'On Leave', icon: '🟡', color: '#FF9800' },
  [DRIVER_STATUS.SUSPENDED]: { label: 'Suspended', icon: '🔴', color: '#F44336' },
};

// ============================================
// TRIP STATUS
// ============================================
export const TRIP_STATUS = {
  SCHEDULED: 'scheduled',
  BOARDING: 'boarding',
  IN_PROGRESS: 'active',
  ACTIVE: 'active',
  DELAYED: 'delayed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const;

export type TripStatusType = typeof TRIP_STATUS[keyof typeof TRIP_STATUS];

// Trip status display configuration
export const TRIP_STATUS_CONFIG: Record<TripStatusType, { label: string; icon: string; color: string }> = {
  [TRIP_STATUS.SCHEDULED]: { label: 'Scheduled', icon: '📅', color: '#9C27B0' },
  [TRIP_STATUS.BOARDING]: { label: 'Boarding', icon: '👥', color: '#FF9800' },
  [TRIP_STATUS.IN_PROGRESS]: { label: 'Active', icon: '🚌', color: '#2196F3' },
  [TRIP_STATUS.DELAYED]: { label: 'Delayed', icon: '⚠️', color: '#FF9800' },
  [TRIP_STATUS.COMPLETED]: { label: 'Completed', icon: '✅', color: '#4CAF50' },
  [TRIP_STATUS.CANCELLED]: { label: 'Cancelled', icon: '❌', color: '#F44336' },
  [TRIP_STATUS.EXPIRED]: { label: 'Expired', icon: '⏰', color: '#FF6B6B' },
};

// ============================================
// SCHEDULE STATUS
// ============================================
export const SCHEDULE_STATUS = {
  PUBLISHED: 'published',
  PAUSED: 'paused',
  ENDED: 'ended',
} as const;

export type ScheduleStatusType = typeof SCHEDULE_STATUS[keyof typeof SCHEDULE_STATUS];

export const SCHEDULE_STATUS_CONFIG: Record<ScheduleStatusType, { label: string; icon: string; color: string }> = {
  [SCHEDULE_STATUS.PUBLISHED]: { label: 'Active', icon: '🟢', color: '#4CAF50' },
  [SCHEDULE_STATUS.PAUSED]: { label: 'Paused', icon: '⏸️', color: '#FF9800' },
  [SCHEDULE_STATUS.ENDED]: { label: 'Ended', icon: '🏁', color: '#9E9E9E' },
};

// ============================================
// STATUS MIGRATION MAPPINGS
// ============================================

// Map old bus status to new
export const migrateBusStatus = (oldStatus: string): BusStatusType => {
  const mapping: Record<string, BusStatusType> = {
    'active': BUS_STATUS.AVAILABLE,
    'maintenance': BUS_STATUS.MAINTENANCE,
    'inactive': BUS_STATUS.INACTIVE,
  };
  return mapping[oldStatus] || BUS_STATUS.INACTIVE;
};

// Map old driver status to new
export const migrateDriverStatus = (oldStatus: string): DriverStatusType => {
  const mapping: Record<string, DriverStatusType> = {
    'active': DRIVER_STATUS.AVAILABLE,
    'online': DRIVER_STATUS.AVAILABLE,
    'on-duty': DRIVER_STATUS.ON_TRIP,
    'inactive': DRIVER_STATUS.OFFLINE,
    'offline': DRIVER_STATUS.OFFLINE,
    'on_leave': DRIVER_STATUS.ON_LEAVE,
    'suspended': DRIVER_STATUS.SUSPENDED,
  };
  return mapping[oldStatus] || DRIVER_STATUS.OFFLINE;
};

// Map old trip status to new
export const migrateTripStatus = (oldStatus: string): TripStatusType => {
  const mapping: Record<string, TripStatusType> = {
    'upcoming': TRIP_STATUS.SCHEDULED,
    'scheduled': TRIP_STATUS.SCHEDULED,
    'boarding': TRIP_STATUS.BOARDING,
    'active': TRIP_STATUS.IN_PROGRESS,
    'in-progress': TRIP_STATUS.IN_PROGRESS,
    'in_progress': TRIP_STATUS.IN_PROGRESS,
    'on-time': TRIP_STATUS.IN_PROGRESS,
    'delayed': TRIP_STATUS.DELAYED,
    'completed': TRIP_STATUS.COMPLETED,
    'cancelled': TRIP_STATUS.CANCELLED,
    'expired': TRIP_STATUS.EXPIRED,
  };
  return mapping[oldStatus] || TRIP_STATUS.SCHEDULED;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Check if bus is available for assignment
export const isBusAvailable = (status: string): boolean => {
  return status === BUS_STATUS.AVAILABLE;
};

// Check if driver is available for assignment
export const isDriverAvailable = (status: string): boolean => {
  return status === DRIVER_STATUS.AVAILABLE;
};

// Check if trip is active (in progress)
export const isTripActive = (status: string): boolean => {
  return status === TRIP_STATUS.IN_PROGRESS;
};

// Check if trip is finished
export const isTripFinished = (status: string): boolean => {
  return status === TRIP_STATUS.COMPLETED || status === TRIP_STATUS.CANCELLED;
};

// Get status config by value
export const getBusStatusConfig = (status: string) => {
  return BUS_STATUS_CONFIG[status as BusStatusType] || BUS_STATUS_CONFIG[BUS_STATUS.INACTIVE];
};

export const getDriverStatusConfig = (status: string) => {
  return DRIVER_STATUS_CONFIG[status as DriverStatusType] || DRIVER_STATUS_CONFIG[DRIVER_STATUS.OFFLINE];
};

export const getTripStatusConfig = (status: string) => {
  return TRIP_STATUS_CONFIG[status as TripStatusType] || TRIP_STATUS_CONFIG[TRIP_STATUS.SCHEDULED];
};
// src/screens/driver/DashboardScreen.tsx - STANDARDIZED STATUSES
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// Import notification service
import { requestPermissionAndSaveToken, listenForTokenRefresh } from '../../services/notificationService';

// ✅ Import standardized status constants
import {
  BUS_STATUS,
  BUS_STATUS_CONFIG,
  DRIVER_STATUS,
  DRIVER_STATUS_CONFIG,
  TRIP_STATUS,
  TRIP_STATUS_CONFIG,
  getBusStatusConfig,
  getDriverStatusConfig,
  getTripStatusConfig,
} from '../../constants/status';

type RootDrawerParamList = {
  Main: undefined;
  Schedule: undefined;
  VehicleCheck: undefined;
  Earnings: undefined;
  Emergency: undefined;
  Profile: undefined;
  Notifications: undefined;
  Boarding: undefined;
  Route: undefined;
};

type DashboardScreenProps = {
  navigation: DrawerNavigationProp<RootDrawerParamList, 'Main'>;
};

// ✅ Updated Duty interface with standardized statuses
interface Duty {
  id: string;
  busNumber: string;
  busModel: string;
  routeName: string;
  timeSlot: string;
  passengers: string;
  status: string; // Now using TRIP_STATUS values
  startTime: string;
  endTime: string;
  busId: string;
  routeId: string;
  driverId: string;
  date: string;
  bookedSeats: number;
  totalSeats: number;
  startDate?: string;
  endDate?: string;
  repeatType?: string;
  days?: string[];
  departureTime?: string;
  arrivalTime?: string;
  revenue?: number;
  from?: string;
  to?: string;
  distance?: string;
  actualStartPrepTime?: any;
}

interface DriverStats {
  totalTrips: number;
  todayTrips: number;
  averageRating: number;
  totalReviews: number;
  onlineHours: number;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const user = auth().currentUser;

  // ✅ Updated driver status to use DRIVER_STATUS type
  const [driverStatus, setDriverStatus] = useState<string>(DRIVER_STATUS.OFFLINE);
  // ❌ REMOVED: driverOnDuty - use driverStatus === DRIVER_STATUS.ON_TRIP instead
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [currentTripStatus, setCurrentTripStatus] = useState<string | null>(null);

  const [currentDate] = useState(new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }));

  const [duties, setDuties] = useState<Duty[]>([]);
  const [allDuties, setAllDuties] = useState<Duty[]>([]);
  const [showAllDuties, setShowAllDuties] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverStats, setDriverStats] = useState<DriverStats>({
    totalTrips: 0,
    todayTrips: 0,
    averageRating: 0,
    totalReviews: 0,
    onlineHours: 0,
  });
  const [driverName, setDriverName] = useState('');
  const [driverUid, setDriverUid] = useState<string>('');

  const [timeLeft, setTimeLeft] = useState<{ [key: string]: string }>({});
  const [canStartDuty, setCanStartDuty] = useState<{ [key: string]: boolean }>({});

  // Use refs for listeners to ensure proper cleanup
  const driverUnsubscribeRef = useRef<(() => void) | null>(null);
  const tripsUnsubscribeRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);

  // Initialize notifications
  useEffect(() => {
    if (!user) return;

    let notificationUnsubscribe: (() => void) | null = null;

    requestPermissionAndSaveToken(user.uid);
    const unsubscribe = listenForTokenRefresh(user.uid);
    notificationUnsubscribe = unsubscribe;

    return () => {
      if (notificationUnsubscribe) {
        notificationUnsubscribe();
      }
    };
  }, [user]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Get correct driver ID
  const getDriverUid = useCallback(async (authUid: string) => {
    try {
      const driverDoc = await firestore().collection('drivers').doc(authUid).get();
      if (driverDoc.exists) {
        setDriverUid(authUid);
        return authUid;
      } else {
        const userDoc = await firestore().collection('users').doc(authUid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const driverQuery = await firestore()
            .collection('drivers')
            .where('email', '==', userData?.email)
            .limit(1)
            .get();
          if (!driverQuery.empty) {
            const driverId = driverQuery.docs[0].id;
            setDriverUid(driverId);
            return driverId;
          }
        }
        setDriverUid(authUid);
        return authUid;
      }
    } catch (error) {
      console.error('Error getting driver UID:', error);
      return authUid;
    }
  }, []);

  // Check if trip is valid for a specific date
  const isTripValidForDate = (tripData: any, targetDate: string, targetDay: string): boolean => {
    let startDate = '';
    let endDate = '';

    if (tripData.startDate) {
      if (tripData.startDate.toDate) {
        startDate = tripData.startDate.toDate().toISOString().split('T')[0];
      } else if (typeof tripData.startDate === 'string') {
        startDate = tripData.startDate;
      }
    } else if (tripData.date) {
      startDate = tripData.date;
    } else {
      startDate = targetDate;
    }

    if (tripData.endDate) {
      if (tripData.endDate.toDate) {
        endDate = tripData.endDate.toDate().toISOString().split('T')[0];
      } else if (typeof tripData.endDate === 'string') {
        endDate = tripData.endDate;
      }
    } else {
      endDate = startDate;
    }

    if (targetDate < startDate || targetDate > endDate) return false;

    if (tripData.repeatType === 'daily') return true;
    if (tripData.repeatType === 'weekly') {
      return tripData.days?.includes(targetDay) ?? false;
    }
    if (tripData.repeatType === 'weekdays') {
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(targetDay);
    }
    if (tripData.repeatType === 'weekends') {
      return ['Sat', 'Sun'].includes(targetDay);
    }

    return startDate === targetDate;
  };

  // ✅ Updated mapping function using standardized statuses
  const mapTripToDuty = (doc: any): Duty => {
    const data = doc.data();

    let tripDate = '';
    if (data.startDate) {
      if (data.startDate.toDate) {
        tripDate = data.startDate.toDate().toISOString().split('T')[0];
      } else if (typeof data.startDate === 'string') {
        tripDate = data.startDate;
      }
    } else if (data.date) {
      tripDate = data.date;
    } else {
      tripDate = 'Date not set';
    }

    const dayOfWeek = tripDate !== 'Date not set'
      ? new Date(tripDate).toLocaleDateString('en-US', { weekday: 'short' })
      : 'N/A';

    // ✅ Map Firebase status to standardized status
    let status = data.status;
    if (status === 'upcoming' || status === 'scheduled') status = TRIP_STATUS.SCHEDULED;
    if (status === 'boarding') status = TRIP_STATUS.BOARDING;
    if (status === 'active' || status === 'on-time' || status === 'in-progress' || status === 'in_progress') status = TRIP_STATUS.IN_PROGRESS;
    if (status === 'expired') status = TRIP_STATUS.EXPIRED;
    if (status === 'completed') status = TRIP_STATUS.COMPLETED;
    if (status === 'cancelled') status = TRIP_STATUS.CANCELLED;

    return {
      id: doc.id,
      busNumber: data.busNumber || 'N/A',
      busModel: data.busModel || 'Standard Bus',
      routeName: data.routeName || 'Unknown Route',
      timeSlot: `${data.departureTime || '00:00'} - ${data.arrivalTime || '00:00'}`,
      passengers: `${data.bookedSeats || 0}/${data.totalSeats || 0}`,
      status: status,
      startTime: data.departureTime || '00:00',
      endTime: data.arrivalTime || '00:00',
      busId: data.busId || '',
      routeId: data.routeId || '',
      driverId: data.driverId || '',
      date: `${tripDate} (${dayOfWeek})`,
      bookedSeats: data.bookedSeats || 0,
      totalSeats: data.totalSeats || 0,
      startDate: tripDate,
      endDate: data.endDate?.toDate?.()
        ? data.endDate.toDate().toISOString().split('T')[0]
        : data.endDate,
      repeatType: data.repeatType,
      days: data.days,
      departureTime: data.departureTime,
      arrivalTime: data.arrivalTime,
      revenue: data.revenue || data.earnings || 0,
      from: data.from,
      to: data.to,
      distance: data.distance,
      actualStartPrepTime: data.actualStartPrepTime,
    };
  };

  const canStartTrip = (departureTime: string, dutyDate?: string): boolean => {
    if (!departureTime) return false;
    const now = new Date();
    const [hours, minutes] = departureTime.split(':');
    // Use the actual trip date if provided, otherwise fall back to today
    const departureDateTime = dutyDate ? new Date(dutyDate) : new Date();
    departureDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    const timeDiff = departureDateTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    // Allow starting duty from 45 minutes before scheduled time up to 60 minutes after scheduled time
    return minutesDiff <= 45 && minutesDiff >= -60;
  };

  const calculateTimeLeft = (departureTime: string, dutyDate?: string): string => {
    if (!departureTime) return '';
    const now = new Date();
    const [hours, minutes] = departureTime.split(':');
    // Use the actual trip date if provided, otherwise fall back to today
    const departureDateTime = dutyDate ? new Date(dutyDate) : new Date();
    departureDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    const timeDiff = departureDateTime.getTime() - now.getTime();
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));
    if (minutesDiff <= 0) {
      const absMinutes = Math.abs(minutesDiff);
      if (absMinutes <= 60) return `Late by ${absMinutes} min`;
      return 'Expired';
    }
    if (minutesDiff < 60) return `Starts in ${minutesDiff} min`;
    const hoursDiff = Math.floor(minutesDiff / 60);
    const remainingMinutes = minutesDiff % 60;
    return `Starts in ${hoursDiff}h ${remainingMinutes}m`;
  };

  // ✅ Updated: Check if driver has active trip using status
  const hasActiveTrip = useCallback((): boolean => {
    return driverStatus === DRIVER_STATUS.ON_TRIP && currentTripId !== null;
  }, [driverStatus, currentTripId]);

  const checkBusAvailability = async (busId: string, tripId: string): Promise<boolean> => {
    try {
      const activeTrips = await firestore()
        .collection('trips')
        .where('busId', '==', busId)
        .where('status', 'in', [TRIP_STATUS.IN_PROGRESS, TRIP_STATUS.BOARDING, TRIP_STATUS.DELAYED])
        .get();

      const conflictingTrip = activeTrips.docs.find(doc => doc.id !== tripId);
      if (conflictingTrip) {
        const data = conflictingTrip.data();
        Alert.alert(
          'Bus Unavailable',
          `This bus is currently being used on another trip by ${data.driverName || 'another driver'}. Please contact dispatcher.`
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking bus availability:', error);
      return false;
    }
  };

  // ✅ Updated: Toggle driver status using standardized values
  const toggleDriverStatus = async () => {
    if (!user || !driverUid) return;

    const newStatus = driverStatus === DRIVER_STATUS.AVAILABLE
      ? DRIVER_STATUS.OFFLINE
      : DRIVER_STATUS.AVAILABLE;

    if (newStatus === DRIVER_STATUS.OFFLINE && hasActiveTrip()) {
      Alert.alert(
        'Cannot Go Offline',
        'You have an active trip. Please complete or end the trip before going offline.'
      );
      return;
    }

    try {
      await firestore().collection('drivers').doc(driverUid).update({
        status: newStatus,
        // ❌ REMOVED: onDuty field
        lastStatusUpdate: firestore.FieldValue.serverTimestamp(),
      });
      setDriverStatus(newStatus);

      const statusConfig = getDriverStatusConfig(newStatus);
      Alert.alert(
        'Status Updated',
        `You are now ${statusConfig.label}`,
        [{ text: 'OK' }]
      );

      if (newStatus === DRIVER_STATUS.AVAILABLE && driverStatus === DRIVER_STATUS.ON_TRIP && currentTripId) {
        Alert.alert(
          'Active Duty Found',
          `You have an active duty. Would you like to continue?`,
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Resume',
              onPress: () => navigateBasedOnTripStatus(currentTripStatus)
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const navigateBasedOnTripStatus = (tripStatus: string | null) => {
    if (!currentTripId) return;

    if (tripStatus === TRIP_STATUS.SCHEDULED) {
      navigation.navigate('VehicleCheck', { tripId: currentTripId });
    } else if (tripStatus === TRIP_STATUS.BOARDING) {
      navigation.navigate('Boarding', { tripId: currentTripId });
    } else if (tripStatus === TRIP_STATUS.IN_PROGRESS) {
      navigation.navigate('Route', { tripId: currentTripId });
    } else {
      navigation.navigate('VehicleCheck', { tripId: currentTripId });
    }
  };

  // ✅ Updated: Start duty with standardized statuses
  const handleStartDuty = async (dutyId: string) => {
    if (!user || !driverUid) return;

    const duty = allDuties.find(d => d.id === dutyId);
    if (!duty) return;

    // Bypassing online check if it's the current trip being resumed
    if (driverStatus !== DRIVER_STATUS.AVAILABLE && currentTripId !== duty.id) {
      Alert.alert('Cannot Start Duty', 'Please go online first before starting a duty.');
      return;
    }

    if (driverStatus === DRIVER_STATUS.ON_TRIP && currentTripId === duty.id) {
      navigateBasedOnTripStatus(currentTripStatus);
      return;
    }

    if (hasActiveTrip() && currentTripId !== duty.id) {
      Alert.alert(
        'Cannot Start Duty',
        'You already have an active trip. Please complete or end that trip first.'
      );
      return;
    }

    if (duty.status === TRIP_STATUS.IN_PROGRESS) {
      navigateBasedOnTripStatus(currentTripStatus);
      return;
    }

    if (duty.status === TRIP_STATUS.BOARDING) {
      navigation.navigate('Boarding', {
        tripId: duty.id,
        dutyDetails: {
          busId: duty.busId,
          busNumber: duty.busNumber,
          routeName: duty.routeName,
          timeSlot: duty.timeSlot,
          date: duty.date,
          from: duty.from,
          to: duty.to,
          distance: duty.distance
        }
      });
      return;
    }

    if (duty.status === TRIP_STATUS.SCHEDULED) {
      const canStart = canStartTrip(duty.startTime, duty.startDate);
      if (!canStart) {
        const timeLeftMsg = calculateTimeLeft(duty.startTime, duty.startDate);
        Alert.alert(
          'Cannot Start Duty Yet',
          `You can start duty 45 minutes before departure time.\n\n${timeLeftMsg}`,
          [{ text: 'OK' }]
        );
        return;
      }
    }

    const busAvailable = await checkBusAvailability(duty.busId, duty.id);
    if (!busAvailable) return;

    const getButtonText = () => {
      if (duty.status === TRIP_STATUS.SCHEDULED) return 'Start Duty';
      if (duty.status === TRIP_STATUS.IN_PROGRESS) return 'Go to Route';
      return 'Start Duty';
    };

    Alert.alert(
      duty.status === TRIP_STATUS.IN_PROGRESS ? 'Resume Duty' : 'Start Duty',
      `${getButtonText()} for ${duty.busNumber} - ${duty.routeName}?\n\nDate: ${duty.date}\nTime: ${duty.timeSlot}\nPassengers: ${duty.passengers}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: getButtonText(),
          onPress: async () => {
            try {
              const batch = firestore().batch();

              // ✅ Trip status: SCHEDULED (vehicle check phase)
              const tripRef = firestore().collection('trips').doc(duty.id);
              batch.update(tripRef, {
                status: TRIP_STATUS.SCHEDULED,
                actualStartPrepTime: firestore.FieldValue.serverTimestamp(),
              });

              // ✅ Bus status: ON_TRIP
              const busRef = firestore().collection('buses').doc(duty.busId);
              batch.update(busRef, {
                status: BUS_STATUS.ON_TRIP,
                currentTripId: duty.id,
                updatedAt: firestore.FieldValue.serverTimestamp(),
              });

              // ✅ Driver status: ON_TRIP (no onDuty field)
              const driverRef = firestore().collection('drivers').doc(driverUid);
              batch.update(driverRef, {
                status: DRIVER_STATUS.ON_TRIP,
                currentTripId: duty.id,
                lastActiveTime: firestore.FieldValue.serverTimestamp(),
              });

              await batch.commit();

              setDriverStatus(DRIVER_STATUS.ON_TRIP);
              setCurrentTripId(duty.id);
              setCurrentTripStatus(TRIP_STATUS.SCHEDULED);

              navigation.navigate('VehicleCheck', {
                tripId: duty.id,
                dutyDetails: {
                  busId: duty.busId,
                  busNumber: duty.busNumber,
                  routeName: duty.routeName,
                  timeSlot: duty.timeSlot,
                  date: duty.date,
                  from: duty.from,
                  to: duty.to,
                  distance: duty.distance
                }
              });
            } catch (error) {
              console.error('Error starting duty:', error);
              Alert.alert('Error', 'Failed to start duty');
            }
          }
        }
      ]
    );
  };

  // ✅ Updated: End duty with standardized statuses
  const handleEndDuty = async () => {
    if (!user || !driverUid) return;

    if (driverStatus !== DRIVER_STATUS.ON_TRIP || !currentTripId) {
      Alert.alert('No Active Duty', 'You are not currently on any active duty.');
      return;
    }

    const activeDuty = allDuties.find(d => d.id === currentTripId);
    if (!activeDuty) {
      Alert.alert('Error', 'Could not find active duty details.');
      return;
    }

    Alert.alert(
      'End Duty',
      `Are you sure you want to end duty for ${activeDuty.routeName}?\n\nDate: ${activeDuty.date}\nThis will:\n• End your current duty\n• Calculate trip summary\n• Return to dashboard`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Duty',
          onPress: async () => {
            try {
              const batch = firestore().batch();

              // ✅ Trip status: COMPLETED
              const tripRef = firestore().collection('trips').doc(activeDuty.id);
              batch.update(tripRef, {
                status: TRIP_STATUS.COMPLETED,
                actualEndTime: firestore.FieldValue.serverTimestamp(),
              });

              // ✅ Bus status: AVAILABLE
              const busRef = firestore().collection('buses').doc(activeDuty.busId);
              batch.update(busRef, {
                status: BUS_STATUS.AVAILABLE,
                currentTripId: firestore.FieldValue.delete(),
                updatedAt: firestore.FieldValue.serverTimestamp(),
              });

              // ✅ Driver status: AVAILABLE (no onDuty field)
              const driverRef = firestore().collection('drivers').doc(driverUid);
              batch.update(driverRef, {
                status: DRIVER_STATUS.AVAILABLE,
                currentTripId: firestore.FieldValue.delete(),
                totalRides: firestore.FieldValue.increment(1),
              });

              await batch.commit();

              setDriverStatus(DRIVER_STATUS.AVAILABLE);
              setCurrentTripId(null);
              setCurrentTripStatus(null);

              Alert.alert(
                'Duty Completed Successfully!',
                `🚌 Bus: ${activeDuty.busNumber}\n` +
                `📍 Route: ${activeDuty.routeName}\n` +
                `📅 Date: ${activeDuty.date}\n` +
                `🕒 Time: ${activeDuty.timeSlot}\n` +
                `👥 Passengers: ${activeDuty.passengers}\n\n` +
                `Trip summary has been saved to your records.`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Error ending duty:', error);
              Alert.alert('Error', 'Failed to end duty');
            }
          }
        }
      ]
    );
  };

  const handleReportDelay = () => {
    const activeDuty = allDuties.find(d => d.id === currentTripId);
    Alert.alert(
      'Report Delay',
      'Select delay reason:',
      [
        {
          text: 'Traffic Congestion',
          onPress: async () => {
            if (user && driverUid) {
              try {
                await firestore().collection('delays').add({
                  driverId: driverUid,
                  driverName: driverName,
                  tripId: currentTripId,
                  busId: activeDuty?.busId || null,
                  routeId: activeDuty?.routeId || null,
                  routeName: activeDuty?.routeName || null,
                  reason: 'Traffic Congestion',
                  timestamp: firestore.FieldValue.serverTimestamp(),
                  status: 'reported',
                });

                // ✅ Also update trip status to DELAYED
                if (currentTripId) {
                  await firestore().collection('trips').doc(currentTripId).update({
                    status: TRIP_STATUS.DELAYED,
                    updatedAt: firestore.FieldValue.serverTimestamp(),
                  });
                  setCurrentTripStatus(TRIP_STATUS.DELAYED);
                }

                Alert.alert('Success', 'Delay reported to passengers and dispatcher.');
              } catch (error) {
                console.error('Error reporting delay:', error);
                Alert.alert('Error', 'Failed to report delay');
              }
            }
          }
        },
        {
          text: 'Mechanical Issue',
          onPress: async () => {
            if (user && driverUid) {
              try {
                await firestore().collection('delays').add({
                  driverId: driverUid,
                  driverName: driverName,
                  tripId: currentTripId,
                  busId: activeDuty?.busId || null,
                  routeId: activeDuty?.routeId || null,
                  routeName: activeDuty?.routeName || null,
                  reason: 'Mechanical Issue',
                  timestamp: firestore.FieldValue.serverTimestamp(),
                  status: 'reported',
                });

                if (currentTripId) {
                  await firestore().collection('trips').doc(currentTripId).update({
                    status: TRIP_STATUS.DELAYED,
                    updatedAt: firestore.FieldValue.serverTimestamp(),
                  });
                  setCurrentTripStatus(TRIP_STATUS.DELAYED);
                }

                Alert.alert('Success', 'Maintenance team has been notified.');
              } catch (error) {
                console.error('Error reporting mechanical issue:', error);
                Alert.alert('Error', 'Failed to report issue');
              }
            }
          }
        },
        {
          text: 'Weather Conditions',
          onPress: async () => {
            if (user && driverUid) {
              try {
                await firestore().collection('delays').add({
                  driverId: driverUid,
                  driverName: driverName,
                  tripId: currentTripId,
                  busId: activeDuty?.busId || null,
                  routeId: activeDuty?.routeId || null,
                  routeName: activeDuty?.routeName || null,
                  reason: 'Weather Conditions',
                  timestamp: firestore.FieldValue.serverTimestamp(),
                  status: 'reported',
                });

                if (currentTripId) {
                  await firestore().collection('trips').doc(currentTripId).update({
                    status: TRIP_STATUS.DELAYED,
                    updatedAt: firestore.FieldValue.serverTimestamp(),
                  });
                  setCurrentTripStatus(TRIP_STATUS.DELAYED);
                }

                Alert.alert('Success', 'Weather delay reported to passengers.');
              } catch (error) {
                console.error('Error reporting weather delay:', error);
                Alert.alert('Error', 'Failed to report delay');
              }
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const quickActions = [
    {
      id: 1,
      title: driverStatus === DRIVER_STATUS.ON_TRIP ? 'Resume Duty' : 'Start Duty',
      emoji: driverStatus === DRIVER_STATUS.ON_TRIP ? '🔄' : '🚀',
      action: () => {
        if (driverStatus === DRIVER_STATUS.ON_TRIP && currentTripId) {
          navigateBasedOnTripStatus(currentTripStatus);
        } else {
          const nextDuty = duties.find(d => d.status === TRIP_STATUS.SCHEDULED);
          if (nextDuty) {
            handleStartDuty(nextDuty.id);
          } else {
            Alert.alert(
              'No Upcoming Duties',
              'There are no upcoming duties to start. Check your schedule for future duties.',
              [{ text: 'OK' }]
            );
          }
        }
      }
    },
    {
      id: 2,
      title: 'End Duty',
      emoji: '🛑',
      action: handleEndDuty
    },
    {
      id: 3,
      title: 'Report Delay',
      emoji: '⏳',
      action: handleReportDelay
    },
    {
      id: 4,
      title: 'Vehicle Check',
      emoji: '🔧',
      action: () => navigation.navigate('VehicleCheck')
    },
  ];

  // ✅ Updated: Get status display using centralized config
  const getStatusDisplay = (status: string) => {
    return getTripStatusConfig(status);
  };

  const getButtonText = (status: string, duty: Duty): string => {
    if (status === TRIP_STATUS.COMPLETED) return 'COMPLETED';
    if (status === TRIP_STATUS.EXPIRED) return 'EXPIRED';

    // Check computed expiration — pass duty's actual date so future trips are not mistaken as expired
    const timeLeftText = calculateTimeLeft(duty.startTime, duty.startDate);
    if (timeLeftText === 'Expired' && (status === TRIP_STATUS.SCHEDULED || status === TRIP_STATUS.BOARDING)) {
      return 'EXPIRED';
    }

    if (driverStatus === DRIVER_STATUS.ON_TRIP && status === TRIP_STATUS.IN_PROGRESS) return 'GO TO ROUTE';
    if (driverStatus === DRIVER_STATUS.ON_TRIP && status === TRIP_STATUS.BOARDING) return 'GO TO BOARDING';
    if (driverStatus === DRIVER_STATUS.ON_TRIP && status === TRIP_STATUS.SCHEDULED) return 'RESUME CHECK';

    if (status === TRIP_STATUS.BOARDING) return 'GO TO BOARDING';
    if (status === TRIP_STATUS.SCHEDULED) {
      const canStart = canStartTrip(duty.startTime, duty.startDate);
      return canStart ? 'START DUTY' : 'WAITING';
    }
    return 'START DUTY';
  };

  const isButtonDisabled = (status: string, duty: Duty): boolean => {
    if (status === TRIP_STATUS.COMPLETED || status === TRIP_STATUS.EXPIRED) return true;

    // Pass duty's actual date so future trips are not mistaken as expired
    const timeLeftText = calculateTimeLeft(duty.startTime, duty.startDate);
    if (timeLeftText === 'Expired' && (status === TRIP_STATUS.SCHEDULED || status === TRIP_STATUS.BOARDING)) {
      return true;
    }

    if (status === TRIP_STATUS.BOARDING) return false;
    if (status === TRIP_STATUS.SCHEDULED) {
      const canStart = canStartTrip(duty.startTime, duty.startDate);
      return !canStart;
    }
    return false;
  };

  const renderDutyCard = (duty: Duty) => {
    const isActive = duty.status === TRIP_STATUS.IN_PROGRESS ||
                     duty.status === TRIP_STATUS.BOARDING ||
                     (driverStatus === DRIVER_STATUS.ON_TRIP && currentTripId === duty.id);
    const buttonText = getButtonText(duty.status, duty);
    const disabled = isButtonDisabled(duty.status, duty);
    const timeLeftText = timeLeft[duty.id] || '';
    const isLate = timeLeftText.includes('Late');
    const statusConfig = getStatusDisplay(duty.status);

    return (
      <View key={duty.id} style={[
        styles.dutyCard,
        isActive && styles.activeDutyCard,
        isLate && styles.lateDutyCard
      ]}>
        <View style={styles.dutyHeader}>
          <View style={styles.busInfo}>
            <Text style={styles.busNumber}>{duty.busNumber}</Text>
            <Text style={styles.busModel}>{duty.busModel}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.icon} {statusConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.dutyDetails}>
          <Text style={styles.routeName}>📍 {duty.routeName}</Text>
          {duty.from && duty.to && (
            <Text style={styles.routeDetails}>🔄 {duty.from} → {duty.to}</Text>
          )}
          <Text style={styles.dateInfo}>📅 {duty.date}</Text>
          <Text style={styles.timeSlot}>🕒 {duty.timeSlot}</Text>
          {duty.status === TRIP_STATUS.SCHEDULED && timeLeftText && (
            <Text style={[styles.countdownText, isLate && styles.lateText]}>
              ⏰ {timeLeftText}
            </Text>
          )}
          <Text style={styles.passengerCount}>👥 Passengers: {duty.passengers}</Text>
          {duty.distance && (
            <Text style={styles.distance}>📏 Distance: {duty.distance}</Text>
          )}
        </View>

        <View style={styles.dutyActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              (duty.status === TRIP_STATUS.IN_PROGRESS || duty.status === TRIP_STATUS.BOARDING) ? styles.activeButton :
              duty.status === TRIP_STATUS.SCHEDULED && driverStatus === DRIVER_STATUS.ON_TRIP ? styles.vehicleCheckButton :
              styles.startButton,
              disabled && styles.disabledButton
            ]}
            onPress={() => {
              if (disabled && duty.status === TRIP_STATUS.SCHEDULED) {
                Alert.alert(
                  'Cannot Start Yet',
                  `You can start duty 45 minutes before departure.\n\n${timeLeftText}`,
                  [{ text: 'OK' }]
                );
                return;
              }
              handleStartDuty(duty.id);
            }}
            disabled={disabled}
          >
            <Text style={[
              styles.actionButtonText,
              (duty.status === TRIP_STATUS.IN_PROGRESS ||
               duty.status === TRIP_STATUS.BOARDING ||
               (duty.status === TRIP_STATUS.SCHEDULED && driverStatus === DRIVER_STATUS.ON_TRIP)) && styles.activeButtonText,
              disabled && styles.disabledButtonText
            ]}>
              {buttonText}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => {
              Alert.alert(
                'Duty Details',
                `🚌 Bus: ${duty.busNumber}\n` +
                `📍 Route: ${duty.routeName}\n` +
                `📅 Date: ${duty.date}\n` +
                `🕒 Time: ${duty.timeSlot}\n` +
                `👥 Passengers: ${duty.passengers}\n` +
                `📊 Status: ${statusConfig.label}\n` +
                (timeLeftText ? `⏰ ${timeLeftText}\n` : ''),
                [{ text: 'Close', style: 'cancel' }]
              );
            }}
          >
            <Text style={styles.viewButtonText}>VIEW DETAILS</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const displayDuties = showAllDuties ? allDuties : duties;

  // ✅ MAIN: Setup listeners with proper cleanup - UPDATED
  useEffect(() => {
    if (!user) return;

    isMountedRef.current = true;

    const setupListeners = async () => {
      try {
        const actualDriverId = await getDriverUid(user.uid);

        if (!isMountedRef.current) return;

        const userDoc = await firestore().collection('users').doc(user.uid).get();
        if (userDoc.exists && isMountedRef.current) {
          setDriverName(userDoc.data()?.fullName || 'Driver');
        }

        if (driverUnsubscribeRef.current) {
          driverUnsubscribeRef.current();
        }

        const driverUnsubscribe = firestore()
          .collection('drivers')
          .doc(actualDriverId)
          .onSnapshot((doc) => {
            if (!isMountedRef.current) return;
            if (doc.exists) {
              const driverData = doc.data();

              // ✅ Map old status to new if needed
              let status = driverData?.status || DRIVER_STATUS.OFFLINE;
              if (status === 'active' || status === 'online') status = DRIVER_STATUS.AVAILABLE;
              if (status === 'on-duty') status = DRIVER_STATUS.ON_TRIP;
              if (status === 'inactive' || status === 'offline') status = DRIVER_STATUS.OFFLINE;

              setDriverStatus(status);
              // ❌ No longer using onDuty
              setCurrentTripId(driverData?.currentTripId || null);

              if (driverData?.currentTripId) {
                firestore().collection('trips').doc(driverData.currentTripId).get()
                  .then(tripDoc => {
                    if (isMountedRef.current && tripDoc.exists) {
                      const tripStatus = tripDoc.data()?.status || null;
                      // Map to standardized
                      if (tripStatus === 'active' || tripStatus === 'on-time') {
                        setCurrentTripStatus(TRIP_STATUS.IN_PROGRESS);
                      } else if (tripStatus === 'upcoming' || tripStatus === 'scheduled') {
                        setCurrentTripStatus(TRIP_STATUS.SCHEDULED);
                      } else {
                        setCurrentTripStatus(tripStatus);
                      }
                    }
                  })
                  .catch(err => console.error('Error fetching trip status:', err));
              } else if (isMountedRef.current) {
                setCurrentTripStatus(null);
              }

              setDriverStats(prev => ({
                ...prev,
                totalTrips: driverData?.totalRides || 0,
                averageRating: driverData?.rating || 0,
                totalReviews: driverData?.totalRatings || 0,
                onlineHours: driverData?.onlineHours || 0,
              }));
            }
          });

        driverUnsubscribeRef.current = driverUnsubscribe;

        if (tripsUnsubscribeRef.current) {
          tripsUnsubscribeRef.current();
        }

        const tripsUnsubscribe = firestore()
          .collection('trips')
          .where('driverId', '==', actualDriverId)
          .onSnapshot((snapshot) => {
            if (!isMountedRef.current) return;

            const today = new Date();
            const todayDate = today.toISOString().split('T')[0];
            const todayDay = today.toLocaleDateString('en-US', { weekday: 'short' });

            const allTripsData: Duty[] = [];
            const todayTripsData: Duty[] = [];
            let completedCount = 0;

            snapshot.forEach(doc => {
              const data = doc.data();
              const duty = mapTripToDuty(doc);

              allTripsData.push(duty);

              const isValidToday = isTripValidForDate(data, todayDate, todayDay);
              if (isValidToday) {
                todayTripsData.push(duty);
              }

              if (duty.status === TRIP_STATUS.COMPLETED) {
                completedCount++;
              }
            });

            todayTripsData.sort((a, b) => a.startTime.localeCompare(b.startTime));
            allTripsData.sort((a, b) => {
              const aDate = a.startDate || '';
              const bDate = b.startDate || '';
              return bDate.localeCompare(aDate);
            });

            const timeLeftMap: { [key: string]: string } = {};
            const canStartMap: { [key: string]: boolean } = {};
            todayTripsData.forEach(trip => {
              timeLeftMap[trip.id] = calculateTimeLeft(trip.startTime, trip.startDate);
              canStartMap[trip.id] = canStartTrip(trip.startTime, trip.startDate);
            });

            if (isMountedRef.current) {
              setTimeLeft(timeLeftMap);
              setCanStartDuty(canStartMap);
              setAllDuties(allTripsData);
              setDuties(todayTripsData.slice(0, 1));
              setDriverStats(prev => ({
                ...prev,
                totalTrips: completedCount,
                todayTrips: todayTripsData.length,
              }));
              setLoading(false);
            }
          }, (error) => {
            console.error('Error in trips listener:', error);
            if (isMountedRef.current) {
              setLoading(false);
            }
          });

        tripsUnsubscribeRef.current = tripsUnsubscribe;

      } catch (error) {
        console.error('Error setting up listeners:', error);
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    setupListeners();

    return () => {
      isMountedRef.current = false;

      if (driverUnsubscribeRef.current) {
        driverUnsubscribeRef.current();
        driverUnsubscribeRef.current = null;
      }

      if (tripsUnsubscribeRef.current) {
        tripsUnsubscribeRef.current();
        tripsUnsubscribeRef.current = null;
      }
    };
  }, [user, getDriverUid]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const driverStatusConfig = getDriverStatusConfig(driverStatus);
  const isAvailable = driverStatus === DRIVER_STATUS.AVAILABLE;
  const isOnTrip = driverStatus === DRIVER_STATUS.ON_TRIP;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            style={styles.menuButton}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.welcomeText}>Welcome, {driverName || 'Driver'}! 👋</Text>
            <View style={styles.statusRow}>
              <View style={[
                styles.driverStatusBadge,
                { backgroundColor: driverStatusConfig.color }
              ]}>
                <Text style={styles.driverStatusText}>
                  {driverStatusConfig.icon} {driverStatusConfig.label}
                </Text>
              </View>
              {isOnTrip && (
                <View style={[styles.driverStatusBadge, { backgroundColor: BUS_STATUS_CONFIG[BUS_STATUS.ON_TRIP].color }]}>
                  <Text style={styles.driverStatusText}>🚌 ON TRIP</Text>
                </View>
              )}
              <TouchableOpacity onPress={toggleDriverStatus}>
                <Text style={styles.toggleStatusText}>
                  {isAvailable ? 'Go Offline' : 'Go Online'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.timeContainer}>
          <Text style={styles.dateText}>{currentDate}</Text>
          <Text style={styles.timeText}>{currentTime}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Today's Duties Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              📋 {showAllDuties ? 'ALL DUTIES' : 'NEXT DUTY'} ({displayDuties.length})
            </Text>
            {allDuties.length > 1 && (
              <TouchableOpacity onPress={() => setShowAllDuties(!showAllDuties)}>
                <Text style={styles.seeAllText}>
                  {showAllDuties ? 'SHOW LESS' : 'SEE ALL'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {displayDuties.length > 0 ? (
            displayDuties.map(renderDutyCard)
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={styles.emptyTitle}>No Duties Today</Text>
              <Text style={styles.emptyText}>
                You have no scheduled duties for today. Check your schedule for future duties.
              </Text>
            </View>
          )}

          {showAllDuties && displayDuties.length > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowAllDuties(false)}
            >
              <Text style={styles.backButtonText}>⬅ BACK TO NEXT DUTY</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ QUICK ACTIONS</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map(action => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionCard}
                onPress={action.action}
              >
                <Text style={styles.quickActionEmoji}>{action.emoji}</Text>
                <Text style={styles.quickActionText}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Upcoming Duties Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📅 UPCOMING DUTIES</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Schedule')}>
              <Text style={styles.seeAllText}>View Schedule</Text>
            </TouchableOpacity>
          </View>

          {duties.filter(d => d.status === TRIP_STATUS.SCHEDULED).length > 0 ? (
            duties
              .filter(d => d.status === TRIP_STATUS.SCHEDULED)
              .slice(0, 3)
              .map(duty => (
                <View key={duty.id} style={styles.upcomingItem}>
                  <View style={styles.upcomingItemLeft}>
                    <Text style={styles.upcomingItemTime}>{duty.startTime}</Text>
                    <Text style={styles.upcomingItemDate}>{duty.date}</Text>
                    <Text style={styles.upcomingItemRoute}>{duty.routeName}</Text>
                    <Text style={styles.upcomingItemBus}>{duty.busNumber}</Text>
                    {duty.from && duty.to && (
                      <Text style={styles.upcomingItemFromTo}>{duty.from} → {duty.to}</Text>
                    )}
                    {timeLeft[duty.id] && (
                      <Text style={[styles.upcomingItemTimeLeft, timeLeft[duty.id].includes('Late') && styles.lateText]}>
                        {timeLeft[duty.id]}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.upcomingItemButton,
                      (!isAvailable || !canStartDuty[duty.id]) && styles.disabledButton
                    ]}
                    onPress={() => {
                      if (!isAvailable) {
                        Alert.alert('Cannot Start', 'Please go online first.');
                        return;
                      }
                      if (!canStartDuty[duty.id]) {
                        Alert.alert('Cannot Start Yet', `You can start duty 15 minutes before departure.\n\n${timeLeft[duty.id]}`);
                        return;
                      }
                      handleStartDuty(duty.id);
                    }}
                    disabled={!isAvailable || !canStartDuty[duty.id]}
                  >
                    <Text style={styles.upcomingItemButtonText}>
                      {canStartDuty[duty.id] ? 'START' : 'WAIT'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
          ) : (
            <View style={styles.noUpcomingContainer}>
              <Text style={styles.noUpcomingText}>No upcoming duties scheduled</Text>
            </View>
          )}
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{driverStats.todayTrips}</Text>
            <Text style={styles.statLabel}>Today's Trips</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{driverStats.totalTrips}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{driverStats.averageRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
            <Text style={styles.statSubtext}>({driverStats.totalReviews})</Text>
          </View>
        </View>

        {/* Quick Navigation */}
        <View style={styles.quickNavSection}>
          <Text style={styles.sectionTitle}>🚗 QUICK NAVIGATION</Text>
          <View style={styles.quickNavGrid}>
            <TouchableOpacity
              style={styles.quickNavItem}
              onPress={() => navigation.navigate('Boarding')}
            >
              <Text style={styles.quickNavEmoji}>👥</Text>
              <Text style={styles.quickNavText}>Boarding</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickNavItem}
              onPress={() => {
                if (isOnTrip && currentTripId) {
                  navigateBasedOnTripStatus(currentTripStatus);
                } else {
                  Alert.alert('No Active Duty', 'Start a duty first to access route navigation.');
                }
              }}
            >
              <Text style={styles.quickNavEmoji}>🗺️</Text>
              <Text style={styles.quickNavText}>Route</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickNavItem}
              onPress={() => navigation.navigate('Emergency')}
            >
              <Text style={styles.quickNavEmoji}>🆘</Text>
              <Text style={styles.quickNavText}>Emergency</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickNavItem}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.quickNavEmoji}>👤</Text>
              <Text style={styles.quickNavText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Styles remain unchanged
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  topBar: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  driverStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  driverStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  toggleStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    opacity: 0.8,
    textDecorationLine: 'underline',
  },
  timeContainer: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  timeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  seeAllText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  dutyCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  activeDutyCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  lateDutyCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    backgroundColor: '#FFF3E0',
  },
  dutyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  busInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  busNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  busModel: {
    fontSize: 14,
    color: '#666666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dutyDetails: {
    marginBottom: 16,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 4,
  },
  routeDetails: {
    fontSize: 14,
    color: '#4A90E2',
    marginBottom: 4,
  },
  dateInfo: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
    fontWeight: '500',
  },
  timeSlot: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  countdownText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2196F3',
    marginBottom: 4,
  },
  lateText: {
    color: '#FF9800',
  },
  passengerCount: {
    fontSize: 14,
    color: '#666666',
  },
  distance: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
  },
  repeatType: {
    fontSize: 11,
    color: '#4A90E2',
    marginTop: 4,
    fontStyle: 'italic',
  },
  dutyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4A90E2',
  },
  activeButton: {
    backgroundColor: '#4CAF50',
  },
  vehicleCheckButton: {
    backgroundColor: '#2196F3',
  },
  boardingButton: {
    backgroundColor: '#FF9800',
  },
  viewButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  activeButtonText: {
    color: '#FFFFFF',
  },
  viewButtonText: {
    color: '#4A90E2',
    fontWeight: '600',
    fontSize: 14,
  },
  disabledButtonText: {
    color: '#9E9E9E',
  },
  backButton: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  backButtonText: {
    color: '#4A90E2',
    fontWeight: '600',
    fontSize: 14,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A237E',
    textAlign: 'center',
  },
  upcomingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  upcomingItemLeft: {
    flex: 1,
  },
  upcomingItemTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  upcomingItemDate: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  upcomingItemRoute: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  upcomingItemBus: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  upcomingItemFromTo: {
    fontSize: 12,
    color: '#4A90E2',
    marginTop: 2,
  },
  upcomingItemTimeLeft: {
    fontSize: 11,
    color: '#2196F3',
    marginTop: 2,
    fontWeight: '500',
  },
  upcomingItemButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  upcomingItemButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  noUpcomingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noUpcomingText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
  },
  statsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 16,
    gap: 12,
  },
  statCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  statSubtext: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  quickNavSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickNavGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  quickNavItem: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  quickNavEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickNavText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A237E',
  },
});

export default DashboardScreen;
// src/screens/driver/DashboardScreen.tsx - REFACTORED WITH CORRECTIONS
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

interface Duty {
  id: string;
  busNumber: string;
  busModel: string;
  routeName: string;
  timeSlot: string;
  passengers: string;
  status: 'UPCOMING' | 'READY' | 'ACTIVE' | 'COMPLETED' | 'VEHICLE_CHECK' | 'BOARDING';
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
  totalEarnings: number;
  todayTrips: number;
  todayEarnings: number;
  averageRating: number;
  totalReviews: number;
  onlineHours: number;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const user = auth().currentUser;

  // ✅ FIX 3: Correct driver status types
  const [driverStatus, setDriverStatus] = useState<'active' | 'inactive' | 'on_leave' | 'suspended'>('inactive');
  const [driverOnDuty, setDriverOnDuty] = useState(false);
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
    totalEarnings: 0,
    todayTrips: 0,
    todayEarnings: 0,
    averageRating: 0,
    totalReviews: 0,
    onlineHours: 0,
  });
  const [driverName, setDriverName] = useState('');
  const [driverUid, setDriverUid] = useState<string>('');

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<{ [key: string]: string }>({});
  const [canStartDuty, setCanStartDuty] = useState<{ [key: string]: boolean }>({});

  const listenersRef = useRef<(() => void)[]>([]);

  // Initialize notifications
  useEffect(() => {
    if (!user) return;
    requestPermissionAndSaveToken(user.uid);
    const unsubscribe = listenForTokenRefresh(user.uid);
    listenersRef.current.push(unsubscribe);
    return () => {
      listenersRef.current.forEach(unsub => unsub());
      listenersRef.current = [];
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

  // ✅ FIX: Check 15-minute rule per duty
  const canStartTrip = (departureTime: string): boolean => {
    if (!departureTime) return false;
    const now = new Date();
    const [hours, minutes] = departureTime.split(':');
    const departureDateTime = new Date();
    departureDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    const timeDiff = departureDateTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    return minutesDiff <= 15 && minutesDiff >= -30;
  };

  // ✅ FIX: Calculate time left for a specific duty
  const calculateTimeLeft = (departureTime: string): string => {
    if (!departureTime) return '';
    const now = new Date();
    const [hours, minutes] = departureTime.split(':');
    const departureDateTime = new Date();
    departureDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    const timeDiff = departureDateTime.getTime() - now.getTime();
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));
    if (minutesDiff <= 0) {
      const absMinutes = Math.abs(minutesDiff);
      if (absMinutes <= 30) return `Late by ${absMinutes} min`;
      return 'Departed';
    }
    if (minutesDiff < 60) return `Starts in ${minutesDiff} min`;
    const hoursDiff = Math.floor(minutesDiff / 60);
    const remainingMinutes = minutesDiff % 60;
    return `Starts in ${hoursDiff}h ${remainingMinutes}m`;
  };

  // Fetch trips with correct filtering and only next duty
  const fetchTodayTrips = useCallback(async (driverId: string) => {
    try {
      const today = new Date();
      const todayDate = today.toISOString().split('T')[0];
      const todayDay = today.toLocaleDateString('en-US', { weekday: 'short' });

      const tripsSnapshot = await firestore()
        .collection('trips')
        .where('driverId', '==', driverId)
        .orderBy('startDate', 'desc')
        .get();

      const allTripsData: Duty[] = [];
      tripsSnapshot.forEach(doc => {
        allTripsData.push(mapTripToDuty(doc));
      });

      const todayTrips = allTripsData.filter(trip => {
        const startDate = trip.startDate ?? trip.date ?? todayDate;
        const endDate = trip.endDate ?? trip.date ?? todayDate;
        if (startDate > todayDate || endDate < todayDate) return false;
        if (trip.repeatType === 'daily') return true;
        if (trip.repeatType === 'weekly') return trip.days?.includes(todayDay) ?? false;
        if (trip.repeatType === 'weekdays') {
          const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
          return weekdays.includes(todayDay);
        }
        if (trip.repeatType === 'weekends') {
          return ['Sat', 'Sun'].includes(todayDay);
        }
        return startDate === todayDate;
      });

      // Sort by departure time
      todayTrips.sort((a, b) => a.startTime.localeCompare(b.startTime));

      // Compute per-duty eligibility
      const timeLeftMap: { [key: string]: string } = {};
      const canStartMap: { [key: string]: boolean } = {};
      todayTrips.forEach(trip => {
        timeLeftMap[trip.id] = calculateTimeLeft(trip.startTime);
        canStartMap[trip.id] = canStartTrip(trip.startTime);
      });
      setTimeLeft(timeLeftMap);
      setCanStartDuty(canStartMap);

      return { allTrips: allTripsData, todayTrips };
    } catch (error) {
      console.error('Error fetching trips:', error);
      throw error;
    }
  }, []);

  const mapTripStatus = (firebaseStatus: string): Duty['status'] => {
    switch (firebaseStatus) {
      case 'scheduled':
      case 'upcoming':
        return 'UPCOMING';
      case 'vehicle_check':
        return 'VEHICLE_CHECK';
      case 'boarding':
        return 'BOARDING';
      case 'in-progress':
      case 'active':
        return 'ACTIVE';
      case 'completed':
        return 'COMPLETED';
      default:
        return 'UPCOMING';
    }
  };

  const mapTripToDuty = (doc: any): Duty => {
    const data = doc.data();
    return {
      id: doc.id,
      busNumber: data.busNumber || 'N/A',
      busModel: data.busModel || 'Standard Bus',
      routeName: data.routeName || 'Unknown Route',
      timeSlot: `${data.departureTime || '00:00'} - ${data.arrivalTime || '00:00'}`,
      passengers: `${data.bookedSeats || 0}/${data.totalSeats || 0}`,
      status: mapTripStatus(data.status),
      startTime: data.departureTime || '00:00',
      endTime: data.arrivalTime || '00:00',
      busId: data.busId || '',
      routeId: data.routeId || '',
      driverId: data.driverId || '',
      date: data.startDate || new Date().toISOString().split('T')[0],
      bookedSeats: data.bookedSeats || 0,
      totalSeats: data.totalSeats || 0,
      startDate: data.startDate,
      endDate: data.endDate,
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

  // ✅ FIX 4: hasActiveTrip uses driver doc truth
  const hasActiveTrip = useCallback((): boolean => {
    return driverOnDuty && currentTripId !== null;
  }, [driverOnDuty, currentTripId]);

  // ✅ FIX 5: Improved bus conflict check (no !=)
  const checkBusAvailability = async (busId: string, tripId: string): Promise<boolean> => {
    try {
      const activeTrips = await firestore()
        .collection('trips')
        .where('busId', '==', busId)
        .where('status', 'in', ['in-progress', 'vehicle_check', 'boarding'])
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

  // Toggle driver status (active/inactive)
  const toggleDriverStatus = async () => {
    if (!user || !driverUid) return;

    const newStatus = driverStatus === 'active' ? 'inactive' : 'active';
    if (newStatus === 'inactive' && hasActiveTrip()) {
      Alert.alert(
        'Cannot Go Offline',
        'You have an active trip. Please complete or end the trip before going offline.'
      );
      return;
    }

    try {
      await firestore().collection('drivers').doc(driverUid).update({
        status: newStatus,
        lastStatusUpdate: firestore.FieldValue.serverTimestamp(),
      });
      setDriverStatus(newStatus);
      Alert.alert(
        'Status Updated',
        `You are now ${newStatus === 'active' ? 'ONLINE' : 'INACTIVE'}`,
        [{ text: 'OK' }]
      );
      if (newStatus === 'active' && driverOnDuty && currentTripId) {
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
    switch (tripStatus) {
      case 'vehicle_check':
        navigation.navigate('VehicleCheck', { tripId: currentTripId });
        break;
      case 'boarding':
        navigation.navigate('Boarding', { tripId: currentTripId });
        break;
      case 'in-progress':
        navigation.navigate('Route', { tripId: currentTripId });
        break;
      default:
        navigation.navigate('VehicleCheck', { tripId: currentTripId });
    }
  };

  // Start duty logic
  const handleStartDuty = async (dutyId: string) => {
    if (!user || !driverUid) return;

    if (driverStatus !== 'active') {
      Alert.alert('Cannot Start Duty', 'Please go online first before starting a duty.');
      return;
    }

    const duty = allDuties.find(d => d.id === dutyId);
    if (!duty) return;

    if (hasActiveTrip() && duty.status !== 'ACTIVE' && duty.status !== 'VEHICLE_CHECK' && duty.status !== 'BOARDING') {
      Alert.alert(
        'Cannot Start Duty',
        'You already have an active trip. Please complete or end that trip first.'
      );
      return;
    }

    if (duty.status === 'ACTIVE' || duty.status === 'VEHICLE_CHECK' || duty.status === 'BOARDING') {
      navigateBasedOnTripStatus(currentTripStatus);
      return;
    }

    // ✅ FIX 2: Use current duty's start time
    if (duty.status === 'UPCOMING') {
      const canStart = canStartTrip(duty.startTime);
      if (!canStart) {
        const timeLeftMsg = calculateTimeLeft(duty.startTime);
        Alert.alert(
          'Cannot Start Duty Yet',
          `You can start duty 15 minutes before departure time.\n\n${timeLeftMsg}`,
          [{ text: 'OK' }]
        );
        return;
      }
    }

    const busAvailable = await checkBusAvailability(duty.busId, duty.id);
    if (!busAvailable) return;

    const getButtonText = () => {
      if (duty.status === 'VEHICLE_CHECK') return 'Continue Vehicle Check';
      if (duty.status === 'BOARDING') return 'Continue Boarding';
      if (duty.status === 'ACTIVE') return 'Go to Route';
      return 'Start Duty';
    };

    Alert.alert(
      duty.status === 'VEHICLE_CHECK' || duty.status === 'BOARDING' || duty.status === 'ACTIVE' ? 'Resume Duty' : 'Start Duty',
      `${getButtonText()} for ${duty.busNumber} - ${duty.routeName}?\n\nTime: ${duty.timeSlot}\nPassengers: ${duty.passengers}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: getButtonText(),
          onPress: async () => {
            try {
              const batch = firestore().batch();
              let newTripStatus = '';
              let nextScreen: keyof RootDrawerParamList = 'VehicleCheck';
              if (duty.status === 'UPCOMING') {
                newTripStatus = 'vehicle_check';
                nextScreen = 'VehicleCheck';
              } else if (duty.status === 'VEHICLE_CHECK') {
                newTripStatus = 'vehicle_check';
                nextScreen = 'VehicleCheck';
              } else if (duty.status === 'BOARDING') {
                newTripStatus = 'boarding';
                nextScreen = 'Boarding';
              } else if (duty.status === 'ACTIVE') {
                newTripStatus = 'in-progress';
                nextScreen = 'Route';
              } else {
                newTripStatus = 'vehicle_check';
                nextScreen = 'VehicleCheck';
              }

              const tripRef = firestore().collection('trips').doc(duty.id);
              batch.update(tripRef, {
                status: newTripStatus,
                ...(duty.status === 'UPCOMING' && { actualStartPrepTime: firestore.FieldValue.serverTimestamp() }),
              });

              const busRef = firestore().collection('buses').doc(duty.busId);
              batch.update(busRef, {
                status: 'active',
                currentTripId: duty.id,
              });

              const driverRef = firestore().collection('drivers').doc(driverUid);
              batch.update(driverRef, {
                onDuty: true,
                currentTripId: duty.id,
                status: 'active',
                lastActiveTime: firestore.FieldValue.serverTimestamp(),
              });

              await batch.commit();

              setDriverOnDuty(true);
              setCurrentTripId(duty.id);
              setCurrentTripStatus(newTripStatus);

              navigation.navigate(nextScreen, {
                tripId: duty.id,
                dutyDetails: {
                  busId: duty.busId,
                  busNumber: duty.busNumber,
                  routeName: duty.routeName,
                  timeSlot: duty.timeSlot,
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

  const handleEndDuty = async () => {
    if (!user || !driverUid) return;

    if (!driverOnDuty || !currentTripId) {
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
      `Are you sure you want to end duty for ${activeDuty.routeName}?\n\nThis will:\n• End your current duty\n• Calculate trip summary\n• Return to dashboard`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Duty',
          onPress: async () => {
            try {
              const estimatedEarnings = activeDuty.revenue ||
                Math.round((activeDuty.bookedSeats || 0) * 50);
              const today = new Date().toISOString().split('T')[0];
              const dayName = new Date().toLocaleDateString('en-US', { weekday: 'short' });

              const batch = firestore().batch();

              const tripRef = firestore().collection('trips').doc(activeDuty.id);
              batch.update(tripRef, {
                status: 'completed',
                actualEndTime: firestore.FieldValue.serverTimestamp(),
                revenue: estimatedEarnings,
              });

              const busRef = firestore().collection('buses').doc(activeDuty.busId);
              batch.update(busRef, {
                status: 'available',
                currentTripId: firestore.FieldValue.delete(),
              });

              const driverRef = firestore().collection('drivers').doc(driverUid);
              batch.update(driverRef, {
                onDuty: false,
                currentTripId: firestore.FieldValue.delete(),
                status: 'active',
                totalRides: firestore.FieldValue.increment(1),
                totalEarnings: firestore.FieldValue.increment(estimatedEarnings),
                tripsToday: firestore.FieldValue.increment(1),
                earningsToday: firestore.FieldValue.increment(estimatedEarnings),
              });

              const earningsRef = firestore().collection('driver_earnings').doc();
              batch.set(earningsRef, {
                driverId: driverUid,
                tripId: activeDuty.id,
                busId: activeDuty.busId,
                routeId: activeDuty.routeId,
                date: today,
                dayOfWeek: dayName,
                routeName: activeDuty.routeName,
                busNumber: activeDuty.busNumber,
                timestamp: firestore.FieldValue.serverTimestamp(),
                total: estimatedEarnings,
                baseFare: estimatedEarnings,
                distanceFare: 0,
                bonus: 0,
                distance: activeDuty.distance || 0,
                duration: 0,
              });

              await batch.commit();

              setDriverOnDuty(false);
              setCurrentTripId(null);
              setCurrentTripStatus(null);

              Alert.alert(
                'Duty Completed Successfully!',
                `🚌 Bus: ${activeDuty.busNumber}\n` +
                `📍 Route: ${activeDuty.routeName}\n` +
                `🕒 Duration: ${activeDuty.timeSlot}\n` +
                `👥 Passengers: ${activeDuty.passengers}\n` +
                `💰 Earnings: PKR ${estimatedEarnings.toLocaleString()}\n\n` +
                `Trip summary has been saved to your records.`,
                [
                  {
                    text: 'View Earnings',
                    onPress: () => navigation.navigate('Earnings')
                  },
                  { text: 'OK' }
                ]
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

  const handleContactDispatcher = () => {
    Alert.alert(
      'Contact Dispatcher',
      'Choose contact method:',
      [
        {
          text: 'Call Dispatcher',
          onPress: () => Alert.alert('Calling', 'Connecting to dispatcher...')
        },
        {
          text: 'Send Message',
          onPress: () => {
            Alert.prompt(
              'Message Dispatcher',
              'Enter your message:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Send',
                  onPress: async (message) => {
                    if (message && user && driverUid) {
                      try {
                        await firestore().collection('messages').add({
                          senderId: driverUid,
                          senderName: driverName,
                          senderType: 'driver',
                          receiverType: 'dispatcher',
                          message: message,
                          tripId: currentTripId,
                          timestamp: firestore.FieldValue.serverTimestamp(),
                          read: false,
                        });
                        Alert.alert('Sent', 'Your message has been sent.');
                      } catch (error) {
                        console.error('Error sending message:', error);
                        Alert.alert('Error', 'Failed to send message');
                      }
                    }
                  }
                }
              ]
            );
          }
        },
        {
          text: 'Emergency Contact',
          onPress: () => navigation.navigate('Emergency')
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // ✅ FIX 1: Show only next duty (slice 0,1)
  const quickActions = [
    {
      id: 1,
      title: driverOnDuty ? 'Resume Duty' : 'Start Duty',
      emoji: driverOnDuty ? '🔄' : '🚀',
      action: () => {
        if (driverOnDuty && currentTripId) {
          navigateBasedOnTripStatus(currentTripStatus);
        } else {
          const nextDuty = duties.find(d =>
            d.status === 'UPCOMING' ||
            d.status === 'VEHICLE_CHECK' ||
            d.status === 'BOARDING'
          );
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

  const getStatusColor = (status: Duty['status']) => {
    switch (status) {
      case 'ACTIVE': return '#4CAF50';
      case 'VEHICLE_CHECK': return '#2196F3';
      case 'BOARDING': return '#FF9800';
      case 'UPCOMING': return '#2196F3';
      case 'READY': return '#FF9800';
      case 'COMPLETED': return '#9E9E9E';
      default: return '#666666';
    }
  };

  const getStatusEmoji = (status: Duty['status']) => {
    switch (status) {
      case 'ACTIVE': return '🚌';
      case 'VEHICLE_CHECK': return '🔧';
      case 'BOARDING': return '👥';
      case 'UPCOMING': return '⏰';
      case 'READY': return '✅';
      case 'COMPLETED': return '🏁';
      default: return '🔘';
    }
  };

  const getButtonText = (status: Duty['status'], duty: Duty): string => {
    if (driverOnDuty && status === 'ACTIVE') return 'GO TO ROUTE';
    if (driverOnDuty && status === 'VEHICLE_CHECK') return 'RESUME CHECK';
    if (driverOnDuty && status === 'BOARDING') return 'RESUME BOARDING';
    if (status === 'COMPLETED') return 'COMPLETED';
    if (status === 'UPCOMING') {
      const canStart = canStartTrip(duty.startTime);
      return canStart ? 'START DUTY' : 'WAITING';
    }
    return 'START DUTY';
  };

  const isButtonDisabled = (status: Duty['status'], duty: Duty): boolean => {
    if (status === 'COMPLETED') return true;
    if (status === 'UPCOMING') {
      const canStart = canStartTrip(duty.startTime);
      return !canStart;
    }
    return false;
  };

  const renderDutyCard = (duty: Duty) => {
    const isActive = duty.status === 'ACTIVE' || duty.status === 'VEHICLE_CHECK' || duty.status === 'BOARDING';
    const buttonText = getButtonText(duty.status, duty);
    const disabled = isButtonDisabled(duty.status, duty);
    const timeLeftText = timeLeft[duty.id] || '';
    const canStart = canStartDuty[duty.id] || false;
    const isLate = timeLeftText.includes('Late');

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
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(duty.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(duty.status) }]}>
              {getStatusEmoji(duty.status)} {duty.status}
            </Text>
          </View>
        </View>

        <View style={styles.dutyDetails}>
          <Text style={styles.routeName}>📍 {duty.routeName}</Text>
          {duty.from && duty.to && (
            <Text style={styles.routeDetails}>🔄 {duty.from} → {duty.to}</Text>
          )}
          <Text style={styles.timeSlot}>🕒 {duty.timeSlot}</Text>
          {duty.status === 'UPCOMING' && timeLeftText && (
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
              duty.status === 'ACTIVE' ? styles.activeButton :
              duty.status === 'VEHICLE_CHECK' ? styles.vehicleCheckButton :
              duty.status === 'BOARDING' ? styles.boardingButton :
              styles.startButton,
              disabled && styles.disabledButton
            ]}
            onPress={() => {
              if (disabled && duty.status === 'UPCOMING') {
                Alert.alert(
                  'Cannot Start Yet',
                  `You can start duty 15 minutes before departure.\n\n${timeLeftText}`,
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
              (duty.status === 'ACTIVE' || duty.status === 'VEHICLE_CHECK' || duty.status === 'BOARDING') && styles.activeButtonText,
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
                `📱 Model: ${duty.busModel}\n` +
                `📍 Route: ${duty.routeName}\n` +
                `🔄 From/To: ${duty.from || 'N/A'} → ${duty.to || 'N/A'}\n` +
                `🕒 Time: ${duty.timeSlot}\n` +
                `👥 Passengers: ${duty.passengers}\n` +
                `📊 Status: ${duty.status}\n` +
                `📏 Distance: ${duty.distance || 'N/A'}\n` +
                (timeLeftText ? `⏰ ${timeLeftText}\n` : ''),
                [
                  { text: 'Close', style: 'cancel' },
                  {
                    text: buttonText !== 'COMPLETED' ? (buttonText === 'WAITING' ? 'Wait for Start Time' : buttonText) : 'Close',
                    onPress: () => {
                      if (!disabled && buttonText !== 'COMPLETED' && buttonText !== 'WAITING') {
                        handleStartDuty(duty.id);
                      }
                    }
                  }
                ]
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
  }, []);

  const displayDuties = showAllDuties ? allDuties : duties;

  // Load driver data and trips
  useEffect(() => {
    if (!user) return;

    const fetchDriverData = async () => {
      try {
        setLoading(true);
        const actualDriverId = await getDriverUid(user.uid);

        const userDoc = await firestore().collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          setDriverName(userDoc.data()?.fullName || 'Driver');
        }

        const driverUnsubscribe = firestore()
          .collection('drivers')
          .doc(actualDriverId)
          .onSnapshot((doc) => {
            if (doc.exists) {
              const driverData = doc.data();
              setDriverStatus(driverData?.status || 'inactive');
              setDriverOnDuty(driverData?.onDuty || false);
              setCurrentTripId(driverData?.currentTripId || null);

              if (driverData?.currentTripId) {
                firestore().collection('trips').doc(driverData.currentTripId).get()
                  .then(tripDoc => {
                    if (tripDoc.exists) setCurrentTripStatus(tripDoc.data()?.status || null);
                  })
                  .catch(err => console.error('Error fetching trip status:', err));
              } else {
                setCurrentTripStatus(null);
              }

              setDriverStats({
                totalTrips: driverData?.totalRides || 0,
                totalEarnings: driverData?.totalEarnings || 0,
                todayTrips: driverData?.tripsToday || 0,
                todayEarnings: driverData?.earningsToday || 0,
                averageRating: driverData?.rating || 0,
                totalReviews: driverData?.totalRatings || 0,
                onlineHours: driverData?.onlineHours || 0,
              });
            }
          });

        listenersRef.current.push(driverUnsubscribe);

        const { allTrips, todayTrips } = await fetchTodayTrips(actualDriverId);
        // ✅ FIX 1: Only show next duty (first upcoming)
        setAllDuties(allTrips);
        setDuties(todayTrips.slice(0, 1));
        setLoading(false);
        setRefreshing(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Failed to load driver data');
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchDriverData();
  }, [user, getDriverUid, fetchTodayTrips]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

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
                { backgroundColor: driverStatus === 'active' ? '#4CAF50' : '#FF9800' }
              ]}>
                <Text style={styles.driverStatusText}>
                  {driverStatus === 'active' ? '✅ ONLINE' : '⏸️ INACTIVE'}
                </Text>
              </View>
              {driverOnDuty && (
                <View style={[styles.driverStatusBadge, { backgroundColor: '#2196F3' }]}>
                  <Text style={styles.driverStatusText}>🚌 ON DUTY</Text>
                </View>
              )}
              <TouchableOpacity onPress={toggleDriverStatus}>
                <Text style={styles.toggleStatusText}>
                  {driverStatus === 'active' ? 'Go Inactive' : 'Go Active'}
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
            <TouchableOpacity onPress={() => setShowAllDuties(!showAllDuties)}>
              <Text style={styles.seeAllText}>
                {showAllDuties ? 'SHOW LESS' : 'SEE ALL'}
              </Text>
            </TouchableOpacity>
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

          {duties.filter(d => d.status === 'UPCOMING' || d.status === 'READY').length > 0 ? (
            duties
              .filter(d => d.status === 'UPCOMING' || d.status === 'READY')
              .slice(0, 3)
              .map(duty => (
                <View key={duty.id} style={styles.upcomingItem}>
                  <View style={styles.upcomingItemLeft}>
                    <Text style={styles.upcomingItemTime}>{duty.startTime}</Text>
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
                      (driverStatus !== 'active' || !canStartDuty[duty.id]) && styles.disabledButton
                    ]}
                    onPress={() => {
                      if (driverStatus !== 'active') {
                        Alert.alert('Cannot Start', 'Please go active first.');
                        return;
                      }
                      if (!canStartDuty[duty.id]) {
                        Alert.alert('Cannot Start Yet', `You can start duty 15 minutes before departure.\n\n${timeLeft[duty.id]}`);
                        return;
                      }
                      handleStartDuty(duty.id);
                    }}
                    disabled={driverStatus !== 'active' || !canStartDuty[duty.id]}
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
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Earnings')}
          >
            <Text style={styles.statValue}>{driverStats.todayTrips}</Text>
            <Text style={styles.statLabel}>Today's Trips</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Earnings')}
          >
            <Text style={styles.statValue}>PKR {driverStats.todayEarnings.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Today's Earnings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Earnings')}
          >
            <Text style={styles.statValue}>{driverStats.totalTrips}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => Alert.alert('Rating', `Average rating: ${driverStats.averageRating.toFixed(1)} from ${driverStats.totalReviews} reviews`)}
          >
            <Text style={styles.statValue}>{driverStats.averageRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
            <Text style={styles.statSubtext}>({driverStats.totalReviews})</Text>
          </TouchableOpacity>
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
                if (driverOnDuty && currentTripId) {
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

// Styles remain the same as before (unchanged)
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
    width: '48%',
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
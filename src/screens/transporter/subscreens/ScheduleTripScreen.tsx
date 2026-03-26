// src/screens/transporter/subscreens/ScheduleTripScreen.tsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  FlatList,
  Platform,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Types
import { Route, Trip } from '../../../types/operations.types';

// Constants
import { COLORS, SIZES, SHADOWS } from '../../../constants/theme';

type FirebaseBus = {
  id: string;
  busNumber: string;
  capacity: number;
  status: string;
};

type FirebaseDriver = {
  id: string;
  fullName: string;
  status: string;
  contactNumber?: string;
};

// Types for validation states
type ValidationState = {
  busAvailable: boolean;
  driverAvailable: boolean;
  busMessage?: string;
  driverMessage?: string;
  routeFrequencyValid: boolean;
  routeFrequencyMessage?: string;
  fareValid: boolean;
  fareMessage?: string;
  seatsValid: boolean;
  seatsMessage?: string;
  dateValid: boolean;
  dateMessage?: string;
  durationValid: boolean;
  durationMessage?: string;
};

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Validation Constants
const BUS_TURNAROUND_MINUTES = 30;
const DRIVER_REST_MINUTES = 60;
const MIN_FARE = 1;
const MAX_FARE = 50000;
const MAX_TRIP_DURATION_HOURS = 24;
const MIN_ROUTE_GAP_MINUTES = 30;

const ScheduleTripScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { mode, trip, preSelectedRoute, transporterId: routeTransporterId } = route.params as {
    mode: 'add' | 'edit' | 'view';
    trip?: Trip;
    preSelectedRoute?: string;
    transporterId?: string;
  };

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // Data states
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<FirebaseBus[]>([]);
  const [drivers, setDrivers] = useState<FirebaseDriver[]>([]);

  // Cache for existing trips to avoid repeated Firestore queries
  const [existingTrips, setExistingTrips] = useState<any[]>([]);

  // Real-time validation states
  const [validation, setValidation] = useState<ValidationState>({
    busAvailable: true,
    driverAvailable: true,
    routeFrequencyValid: true,
    fareValid: true,
    seatsValid: true,
    dateValid: true,
    durationValid: true,
  });

  // City codes cache
  const [cityCodesCache, setCityCodesCache] = useState<Record<string, string>>({});

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Time picker states
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentTimeField, setCurrentTimeField] = useState('');

  // ✅ FIX: Update field helper
  const updateField = useCallback((key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const [formData, setFormData] = useState({
    routeId: '',
    routeCode: '',
    routeName: '',
    from: '',
    to: '',
    fromCode: '',
    toCode: '',
    busId: '',
    busNumber: '',
    driverId: '',
    driverName: '',
    departureTime: '08:00',
    arrivalTime: '',
    selectedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as string[],
    startDate: '',
    endDate: '',
    repeatType: 'weekdays' as 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom',
    fare: '50',
    totalSeats: '40',
    distance: '',
    duration: '',
  });

  const user = auth().currentUser;
  const effectiveTransporterId = routeTransporterId || user?.uid;

  // ========== TIME OVERLAP DETECTION FUNCTION ==========
  const checkTimeOverlap = useCallback((
    existingDeparture: string,
    existingArrival: string,
    newDeparture: string,
    newArrival: string
  ): boolean => {
    if (!existingDeparture || !existingArrival || !newDeparture || !newArrival) {
      return false;
    }

    const parseTimeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const existingDep = parseTimeToMinutes(existingDeparture);
    const existingArr = parseTimeToMinutes(existingArrival);
    const newDep = parseTimeToMinutes(newDeparture);
    let newArr = parseTimeToMinutes(newArrival);

    // Handle overnight trips
    if (newArr < newDep) {
      newArr += 24 * 60;
    }

    // Check for overlap: newDeparture < existingArrival AND newArrival > existingDeparture
    return newDep < existingArr && newArr > existingDep;
  }, []);

  // ========== VALIDATION FUNCTIONS ==========

  const validateFare = useCallback((fare: string): { valid: boolean; message?: string } => {
    const fareNum = Number(fare);
    if (isNaN(fareNum) || fareNum < MIN_FARE) {
      return { valid: false, message: `Fare must be at least PKR ${MIN_FARE}` };
    }
    if (fareNum > MAX_FARE) {
      return { valid: false, message: `Fare cannot exceed PKR ${MAX_FARE}` };
    }
    return { valid: true };
  }, []);

  const validateSeats = useCallback((seats: string, busId: string): { valid: boolean; message?: string } => {
    const seatsNum = Number(seats);
    // ✅ FIX: Proper validation for zero and NaN
    if (isNaN(seatsNum) || seatsNum <= 0) {
      return { valid: false, message: 'Please enter a valid number of seats (greater than 0)' };
    }

    const selectedBus = buses.find(b => b.id === busId);
    if (selectedBus && seatsNum > selectedBus.capacity) {
      return {
        valid: false,
        message: `Seats (${seatsNum}) cannot exceed bus capacity (${selectedBus.capacity})`
      };
    }
    return { valid: true };
  }, [buses]);

  const validateStartDate = useCallback((dateStr: string): { valid: boolean; message?: string } => {
    if (!dateStr) return { valid: true };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(dateStr);
    startDate.setHours(0, 0, 0, 0);

    if (startDate < today) {
      return { valid: false, message: 'Start date cannot be in the past' };
    }
    return { valid: true };
  }, []);

  const validateDuration = useCallback((departure: string, arrival: string): { valid: boolean; message?: string } => {
    if (!departure || !arrival) return { valid: true };

    const [depHours, depMins] = departure.split(':').map(Number);
    const [arrHours, arrMins] = arrival.split(':').map(Number);

    const depTotal = depHours * 60 + depMins;
    let arrTotal = arrHours * 60 + arrMins;

    if (arrTotal < depTotal) {
      arrTotal += 24 * 60;
    }

    const durationMinutes = arrTotal - depTotal;
    const maxDurationMinutes = MAX_TRIP_DURATION_HOURS * 60;

    if (durationMinutes > maxDurationMinutes) {
      return {
        valid: false,
        message: `Trip duration cannot exceed ${MAX_TRIP_DURATION_HOURS} hours`
      };
    }

    return { valid: true };
  }, []);

  const checkBusTurnaround = useCallback((
    existingTrip: any,
    newDeparture: string,
    newDays: string[],
    newStartDate: string
  ): boolean => {
    const existingArrival = existingTrip.arrivalTime;
    const [existArrHours, existArrMins] = existingArrival.split(':').map(Number);
    const [newDepHours, newDepMins] = newDeparture.split(':').map(Number);

    const existArrTotal = existArrHours * 60 + existArrMins;
    const newDepTotal = newDepHours * 60 + newDepMins;

    const minNextDeparture = existArrTotal + BUS_TURNAROUND_MINUTES;

    if (minNextDeparture >= 24 * 60) {
      const nextDay = minNextDeparture - (24 * 60);
      return newDepTotal >= nextDay;
    }

    return newDepTotal >= minNextDeparture;
  }, []);

  const checkDriverRest = useCallback((
    existingTrip: any,
    newDeparture: string,
    newDays: string[],
    newStartDate: string
  ): boolean => {
    const existingArrival = existingTrip.arrivalTime;
    const [existArrHours, existArrMins] = existingArrival.split(':').map(Number);
    const [newDepHours, newDepMins] = newDeparture.split(':').map(Number);

    const existArrTotal = existArrHours * 60 + existArrMins;
    const newDepTotal = newDepHours * 60 + newDepMins;

    const minNextDeparture = existArrTotal + DRIVER_REST_MINUTES;

    if (minNextDeparture >= 24 * 60) {
      const nextDay = minNextDeparture - (24 * 60);
      return newDepTotal >= nextDay;
    }

    return newDepTotal >= minNextDeparture;
  }, []);

  const checkRouteFrequency = useCallback((
    existingTrip: any,
    newDeparture: string,
    newDays: string[],
    newStartDate: string
  ): boolean => {
    const existingDeparture = existingTrip.departureTime;
    const [existDepHours, existDepMins] = existingDeparture.split(':').map(Number);
    const [newDepHours, newDepMins] = newDeparture.split(':').map(Number);

    const existDepTotal = existDepHours * 60 + existDepMins;
    const newDepTotal = newDepHours * 60 + newDepMins;

    const timeDifference = Math.abs(newDepTotal - existDepTotal);

    return timeDifference >= MIN_ROUTE_GAP_MINUTES;
  }, []);

  // ✅ FIX: Comprehensive conflict check with proper time overlap detection
  const checkAllConflicts = useCallback(async () => {
    if (!effectiveTransporterId || !formData.departureTime || !formData.arrivalTime ||
        !formData.busId || !formData.driverId || !formData.routeId) {
      return;
    }

    try {
      let tripsToCheck = existingTrips;
      if (tripsToCheck.length === 0) {
        // ✅ FIX: Optimize query - don't use 'in' operator for better performance
        const upcomingSnapshot = await firestore()
          .collection('trips')
          .where('transporterId', '==', effectiveTransporterId)
          .where('status', '==', 'upcoming')
          .get();

        const activeSnapshot = await firestore()
          .collection('trips')
          .where('transporterId', '==', effectiveTransporterId)
          .where('status', '==', 'active')
          .get();

        tripsToCheck = [
          ...upcomingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          ...activeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        ];
        setExistingTrips(tripsToCheck);
      }

      const newValidation: ValidationState = {
        busAvailable: true,
        driverAvailable: true,
        routeFrequencyValid: true,
        fareValid: true,
        seatsValid: true,
        dateValid: true,
        durationValid: true,
      };

      const fareValidation = validateFare(formData.fare);
      newValidation.fareValid = fareValidation.valid;
      newValidation.fareMessage = fareValidation.message;

      const seatsValidation = validateSeats(formData.totalSeats, formData.busId);
      newValidation.seatsValid = seatsValidation.valid;
      newValidation.seatsMessage = seatsValidation.message;

      const dateValidation = validateStartDate(formData.startDate);
      newValidation.dateValid = dateValidation.valid;
      newValidation.dateMessage = dateValidation.message;

      if (formData.arrivalTime) {
        const durationValidation = validateDuration(formData.departureTime, formData.arrivalTime);
        newValidation.durationValid = durationValidation.valid;
        newValidation.durationMessage = durationValidation.message;
      }

      const newDepTime = formData.departureTime;
      const newArrTime = formData.arrivalTime;

      // ✅ FIX: Optimize conflict checking by filtering first
      const relevantTrips = tripsToCheck.filter(existingTrip => {
        if (mode === 'edit' && trip?.id && existingTrip.id === trip.id) return false;

        const dayOverlap = existingTrip.days?.some((day: string) =>
          formData.selectedDays.includes(day)
        );
        if (!dayOverlap) return false;

        if (formData.startDate && existingTrip.startDate) {
          const newStart = new Date(formData.startDate);
          const newEnd = formData.endDate ? new Date(formData.endDate) : newStart;
          const existStart = new Date(existingTrip.startDate);
          const existEnd = existingTrip.endDate ? new Date(existingTrip.endDate) : existStart;

          return (newStart <= existEnd && newEnd >= existStart);
        }
        return true;
      });

      // Check each filtered trip for conflicts
      for (const existingTrip of relevantTrips) {
        const existingDep = existingTrip.departureTime;
        const existingArr = existingTrip.arrivalTime;

        if (existingTrip.busId === formData.busId) {
          const hasOverlap = checkTimeOverlap(
            existingDep,
            existingArr,
            newDepTime,
            newArrTime
          );

          if (hasOverlap) {
            newValidation.busAvailable = false;
            newValidation.busMessage = `Bus ${formData.busNumber} has overlapping trip at ${existingDep} - ${existingArr}`;
          } else {
            const turnaroundValid = checkBusTurnaround(
              existingTrip,
              newDepTime,
              formData.selectedDays,
              formData.startDate
            );

            if (!turnaroundValid) {
              newValidation.busAvailable = false;
              newValidation.busMessage = `Bus ${formData.busNumber} needs ${BUS_TURNAROUND_MINUTES} minutes turnaround time after trip at ${existingArr}`;
            }
          }
        }

        if (existingTrip.driverId === formData.driverId) {
          const hasOverlap = checkTimeOverlap(
            existingDep,
            existingArr,
            newDepTime,
            newArrTime
          );

          if (hasOverlap) {
            newValidation.driverAvailable = false;
            newValidation.driverMessage = `Driver ${formData.driverName} has overlapping trip at ${existingDep} - ${existingArr}`;
          } else {
            const restValid = checkDriverRest(
              existingTrip,
              newDepTime,
              formData.selectedDays,
              formData.startDate
            );

            if (!restValid) {
              newValidation.driverAvailable = false;
              newValidation.driverMessage = `Driver ${formData.driverName} needs ${DRIVER_REST_MINUTES} minutes rest after trip ending at ${existingArr}`;
            }
          }
        }

        if (existingTrip.routeId === formData.routeId) {
          const frequencyValid = checkRouteFrequency(
            existingTrip,
            newDepTime,
            formData.selectedDays,
            formData.startDate
          );

          if (!frequencyValid) {
            newValidation.routeFrequencyValid = false;
            newValidation.routeFrequencyMessage = `Trips on same route must be at least ${MIN_ROUTE_GAP_MINUTES} minutes apart`;
          }
        }
      }

      setValidation(newValidation);
    } catch (error) {
      console.error('Error checking conflicts:', error);
    }
  }, [
    effectiveTransporterId,
    formData,
    existingTrips,
    mode,
    trip,
    validateFare,
    validateSeats,
    validateStartDate,
    validateDuration,
    checkBusTurnaround,
    checkDriverRest,
    checkRouteFrequency,
    checkTimeOverlap
  ]);

  // ========== EXISTING FUNCTIONS ==========

  const parseDurationToMinutes = (durationStr: string): number => {
    if (!durationStr) return 0;

    const duration = durationStr.toLowerCase().trim();
    let totalMinutes = 0;

    const hoursMatch = duration.match(/(\d+(?:\.\d+)?)\s*h(?:ours?)?/);
    if (hoursMatch) {
      totalMinutes += parseFloat(hoursMatch[1]) * 60;
    }

    const minutesMatch = duration.match(/(\d+)\s*m(?:in(?:utes?)?)?/);
    if (minutesMatch) {
      totalMinutes += parseInt(minutesMatch[1]);
    }

    if (totalMinutes === 0 && duration.match(/^\d+$/)) {
      totalMinutes = parseInt(duration);
    }

    return Math.round(totalMinutes);
  };

  const calculateArrivalTime = useCallback((departureTime: string, durationStr: string): string => {
    if (!departureTime || !durationStr) {
      return '';
    }

    const durationMinutes = parseDurationToMinutes(durationStr);
    if (durationMinutes === 0 || durationMinutes > 24 * 60) {
      return '';
    }

    const [hours, minutes] = departureTime.split(':').map(Number);
    const departureDate = new Date();
    departureDate.setHours(hours, minutes, 0, 0);
    departureDate.setMinutes(departureDate.getMinutes() + durationMinutes);

    return `${departureDate.getHours().toString().padStart(2, '0')}:${departureDate.getMinutes().toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (formData.routeId && formData.departureTime && formData.duration) {
      const calculatedArrival = calculateArrivalTime(formData.departureTime, formData.duration);
      if (calculatedArrival) {
        updateField('arrivalTime', calculatedArrival);
      }
    }
  }, [formData.routeId, formData.departureTime, formData.duration, calculateArrivalTime, updateField]);

  useEffect(() => {
    if (formData.repeatType !== 'custom') {
      let newDays: string[] = [];

      switch (formData.repeatType) {
        case 'daily':
          newDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          break;
        case 'weekdays':
          newDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
          break;
        case 'weekends':
          newDays = ['Sat', 'Sun'];
          break;
        case 'weekly':
          newDays = formData.selectedDays.length > 0 ? [formData.selectedDays[0]] : ['Mon'];
          break;
        default:
          newDays = formData.selectedDays;
      }

      if (JSON.stringify(newDays) !== JSON.stringify(formData.selectedDays)) {
        updateField('selectedDays', newDays);
      }
    }
  }, [formData.repeatType, formData.selectedDays, updateField]);

  const fetchCityCode = useCallback(async (cityName: string): Promise<string> => {
    if (!cityName) return '';

    if (cityCodesCache[cityName]) {
      return cityCodesCache[cityName];
    }

    try {
      const snapshot = await firestore()
        .collection('cities')
        .where('name', '==', cityName)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const cityData = snapshot.docs[0].data();
        const code = cityData.code || '';

        setCityCodesCache(prev => ({
          ...prev,
          [cityName]: code
        }));

        return code;
      }
    } catch (error) {
      console.error(`Error fetching city code for ${cityName}:`, error);
    }

    return '';
  }, [cityCodesCache]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !effectiveTransporterId) {
        setFetchingData(false);
        return;
      }

      setFetchingData(true);

      try {
        const routesSnapshot = await firestore()
          .collection('routes')
          .where('transporterId', '==', effectiveTransporterId)
          .orderBy('createdAt', 'desc')
          .get();

        const routesList = routesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            code: data.code || '',
            name: data.name || '',
            from: data.from || '',
            to: data.to || '',
            distance: data.distance || '',
            duration: data.duration || '',
            stops: data.stops || 0,
            fare: data.fare || 0,
            updatedAt: data.updatedAt,
          } as Route;
        });
        setRoutes(routesList);

        const busesSnapshot = await firestore()
          .collection('buses')
          .where('transporterId', '==', effectiveTransporterId)
          .where('status', '==', 'active')
          .where('isDeleted', '==', false)
          .get();

        const busesList = busesSnapshot.docs.map(doc => ({
          id: doc.id,
          busNumber: doc.data().busNumber || '',
          capacity: doc.data().capacity || 40,
          status: doc.data().status || 'active',
        })) as FirebaseBus[];
        setBuses(busesList);

        const driversSnapshot = await firestore()
          .collection('drivers')
          .where('transporterId', '==', effectiveTransporterId)
          .where('status', 'in', ['online', 'active'])
          .where('isDeleted', '==', false)
          .get();

        const driversList = driversSnapshot.docs.map(doc => ({
          id: doc.id,
          fullName: doc.data().fullName || '',
          status: doc.data().status || 'online',
          contactNumber: doc.data().contactNumber,
        })) as FirebaseDriver[];
        setDrivers(driversList);

        // ✅ FIX: Split queries to avoid 'in' operator limitation
        const upcomingSnapshot = await firestore()
          .collection('trips')
          .where('transporterId', '==', effectiveTransporterId)
          .where('status', '==', 'upcoming')
          .get();

        const activeSnapshot = await firestore()
          .collection('trips')
          .where('transporterId', '==', effectiveTransporterId)
          .where('status', '==', 'active')
          .get();

        const tripsList = [
          ...upcomingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          ...activeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        ];
        setExistingTrips(tripsList);

        if (mode === 'edit' && trip) {
          updateField('routeId', trip.routeId || '');
          updateField('routeCode', trip.routeCode || '');
          updateField('routeName', trip.routeName || '');
          updateField('from', trip.from || '');
          updateField('to', trip.to || '');
          updateField('fromCode', (trip as any).fromCode || '');
          updateField('toCode', (trip as any).toCode || '');
          updateField('busId', trip.busId || '');
          updateField('busNumber', trip.busNumber || '');
          updateField('driverId', trip.driverId || '');
          updateField('driverName', trip.driverName || '');
          updateField('departureTime', trip.departureTime || '08:00');
          updateField('arrivalTime', trip.arrivalTime || '');
          updateField('selectedDays', trip.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
          updateField('startDate', trip.startDate || '');
          updateField('endDate', trip.endDate || '');
          updateField('repeatType', (trip.repeatType as any) || 'weekdays');
          updateField('fare', trip.fare?.toString() || '50');
          updateField('totalSeats', trip.totalSeats?.toString() || '40');
          updateField('distance', trip.distance?.toString() || '');
          updateField('duration', trip.duration || '');
        }

        if (preSelectedRoute && routesList.length > 0) {
          const selectedRoute = routesList.find(r => r.code === preSelectedRoute);
          if (selectedRoute) {
            const fetchPreSelectedCodes = async () => {
              const [fromCode, toCode] = await Promise.all([
                fetchCityCode(selectedRoute.from || ''),
                fetchCityCode(selectedRoute.to || '')
              ]);

              updateField('routeId', selectedRoute.id);
              updateField('routeCode', selectedRoute.code);
              updateField('routeName', selectedRoute.name);
              updateField('from', selectedRoute.from || '');
              updateField('to', selectedRoute.to || '');
              updateField('fromCode', fromCode);
              updateField('toCode', toCode);
              updateField('fare', selectedRoute.fare?.toString() || '50');
              updateField('distance', selectedRoute.distance || '');
              updateField('duration', selectedRoute.duration || '');
            };

            fetchPreSelectedCodes();
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Failed to load data. Please try again.');
      } finally {
        setFetchingData(false);
      }
    };

    fetchData();
  }, [user, effectiveTransporterId, mode, trip, preSelectedRoute, fetchCityCode, updateField]);

  // ========== DATE PICKER FUNCTIONS ==========
  const handleDatePress = (field: string) => {
    setCurrentDateField(field);
    const dateValue = formData[field as keyof typeof formData];
    if (dateValue && typeof dateValue === 'string' && dateValue) {
      setSelectedDate(new Date(dateValue));
    } else {
      setSelectedDate(new Date());
    }
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, date: Date | undefined) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0];
      updateField(currentDateField, formattedDate);
    }
  };

  const handleAndroidDateConfirm = () => {
    const formattedDate = selectedDate.toISOString().split('T')[0];
    updateField(currentDateField, formattedDate);
    setShowDatePicker(false);
  };

  // ========== TIME PICKER FUNCTIONS ==========
  const handleTimePress = (field: string) => {
    setCurrentTimeField(field);

    const timeValue = formData[field as keyof typeof formData];
    if (timeValue && typeof timeValue === 'string' && timeValue) {
      const [hours, minutes] = timeValue.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      setSelectedDate(date);
    } else {
      setSelectedDate(new Date());
    }

    setShowTimePicker(true);
  };

  const handleTimeChange = (event: any, date: Date | undefined) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (date) {
      setSelectedDate(date);
      const formattedTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

      if (currentTimeField === 'departureTime') {
        updateField('departureTime', formattedTime);

        if (formData.duration) {
          const arrivalTime = calculateArrivalTime(formattedTime, formData.duration);
          if (arrivalTime) {
            updateField('arrivalTime', arrivalTime);
          }
        }
      } else if (currentTimeField === 'arrivalTime') {
        updateField('arrivalTime', formattedTime);
      }
    }
  };

  const handleAndroidTimeConfirm = () => {
    const formattedTime = `${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}`;

    if (currentTimeField === 'departureTime') {
      updateField('departureTime', formattedTime);

      if (formData.duration) {
        const arrivalTime = calculateArrivalTime(formattedTime, formData.duration);
        if (arrivalTime) {
          updateField('arrivalTime', arrivalTime);
        }
      }
    } else if (currentTimeField === 'arrivalTime') {
      updateField('arrivalTime', formattedTime);
    }

    setShowTimePicker(false);
  };

  // ========== VALIDATION FUNCTIONS ==========
  const validateTimes = (): boolean => {
    if (!formData.departureTime) {
      Alert.alert('Error', 'Please select departure time');
      return false;
    }

    if (!formData.arrivalTime) {
      Alert.alert('Error', 'Arrival time is required. Please select a route with duration or set arrival time manually.');
      return false;
    }

    const [depHours, depMinutes] = formData.departureTime.split(':').map(Number);
    const [arrHours, arrMinutes] = formData.arrivalTime.split(':').map(Number);

    const depTotal = depHours * 60 + depMinutes;
    let arrTotal = arrHours * 60 + arrMinutes;

    if (arrTotal < depTotal) {
      arrTotal += 24 * 60;
    }

    if (arrTotal <= depTotal) {
      Alert.alert('Error', 'Arrival time must be after departure time');
      return false;
    }

    return true;
  };

  const validateDates = (): boolean => {
    if (formData.startDate) {
      const dateValidation = validateStartDate(formData.startDate);
      if (!dateValidation.valid) {
        Alert.alert('Error', dateValidation.message);
        return false;
      }
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);

      if (end < start) {
        Alert.alert('Error', 'End date must be after start date');
        return false;
      }
    }

    return true;
  };

  const validateDays = (): boolean => {
    if (formData.selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one day for the trip');
      return false;
    }
    return true;
  };

  const generateTripSeats = async (tripId: string, totalSeats: number, fare: number) => {
    try {
      const db = firestore();
      const batch = db.batch();
      const seatsRef = db.collection('trips').doc(tripId).collection('seats');

      const rows = Math.ceil(totalSeats / 5);
      const columns = 5;

      console.log(`🪑 Generating ${totalSeats} seats for trip ${tripId}...`);

      for (let row = 1; row <= rows; row++) {
        for (let col = 1; col <= columns; col++) {
          const seatNumber = `${row}${String.fromCharCode(64 + col)}`;
          const seatRef = seatsRef.doc(seatNumber);

          const isPremium = row <= 2;
          const isWindow = col === 1 || col === 5;
          const isAisle = col === 3;
          const isMiddle = col === 2 || col === 4;
          const hasExtraLegroom = row === 1;
          const isWheelchairAccessible = row === rows && (col === 1 || col === 2);

          batch.set(seatRef, {
            seatNumber,
            row,
            column: col,
            isBooked: false,
            status: 'available',
            price: isPremium ? Math.round(fare * 1.25) : fare,
            type: isWindow ? 'window' : isAisle ? 'aisle' : 'middle',
            isWindow,
            isAisle,
            isMiddle,
            hasExtraLegroom,
            isWheelchairAccessible,
            reservedBy: null,
            reservedUntil: null,
            bookingId: null,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp()
          });
        }
      }

      await batch.commit();
      console.log(`✅ Successfully generated ${totalSeats} seats for trip ${tripId}`);
      return true;
    } catch (error) {
      console.error('❌ Error generating seats:', error);
      return false;
    }
  };

  // ✅ FIX: Enhanced submit with proper transaction re-check
  const handleSubmit = async () => {
    // ✅ FIX: Loading lock
    if (loading) return;

    if (!user || !effectiveTransporterId) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    if (!formData.arrivalTime) {
      Alert.alert('Error', 'Arrival time is required. Please select a route with duration or set arrival time manually.');
      return;
    }

    if (!validateTimes() || !validateDates() || !validateDays()) {
      return;
    }

    if (!validation.fareValid) {
      Alert.alert('Invalid Fare', validation.fareMessage);
      return;
    }

    if (!validation.seatsValid) {
      Alert.alert('Invalid Seats', validation.seatsMessage);
      return;
    }

    if (!validation.durationValid) {
      Alert.alert('Invalid Duration', validation.durationMessage);
      return;
    }

    if (!validation.routeFrequencyValid) {
      Alert.alert('Route Conflict', validation.routeFrequencyMessage);
      return;
    }

    if (!validation.busAvailable) {
      Alert.alert('Bus Unavailable', validation.busMessage);
      return;
    }

    if (!validation.driverAvailable) {
      Alert.alert('Driver Unavailable', validation.driverMessage);
      return;
    }

    setLoading(true);

    try {
      const db = firestore();
      const tripsRef = db.collection('trips');

      // ✅ FIX: Re-check conflicts INSIDE transaction to prevent race conditions
      await db.runTransaction(async (transaction) => {
        // Get fresh snapshot inside transaction
        const upcomingSnapshot = await transaction.get(
          tripsRef.where('transporterId', '==', effectiveTransporterId).where('status', '==', 'upcoming')
        );

        const activeSnapshot = await transaction.get(
          tripsRef.where('transporterId', '==', effectiveTransporterId).where('status', '==', 'active')
        );

        const freshTrips = [
          ...upcomingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          ...activeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        ];

        const newDepTime = formData.departureTime;
        const newArrTime = formData.arrivalTime;

        // Critical re-check inside transaction
        for (const existingTrip of freshTrips) {
          if (mode === 'edit' && trip?.id && existingTrip.id === trip.id) continue;

          const dayOverlap = existingTrip.days?.some((day: string) =>
            formData.selectedDays.includes(day)
          );
          if (!dayOverlap) continue;

          if (formData.startDate && existingTrip.startDate) {
            const newStart = new Date(formData.startDate);
            const newEnd = formData.endDate ? new Date(formData.endDate) : newStart;
            const existStart = new Date(existingTrip.startDate);
            const existEnd = existingTrip.endDate ? new Date(existingTrip.endDate) : existStart;

            const dateOverlap = (newStart <= existEnd && newEnd >= existStart);
            if (!dateOverlap) continue;
          }

          if (existingTrip.busId === formData.busId) {
            const hasOverlap = checkTimeOverlap(
              existingTrip.departureTime,
              existingTrip.arrivalTime,
              newDepTime,
              newArrTime
            );

            if (hasOverlap) {
              throw new Error(`Bus ${formData.busNumber} is already scheduled for another trip at this time`);
            }

            const turnaroundValid = checkBusTurnaround(
              existingTrip,
              newDepTime,
              formData.selectedDays,
              formData.startDate
            );

            if (!turnaroundValid) {
              throw new Error(`Bus ${formData.busNumber} needs ${BUS_TURNAROUND_MINUTES} minutes turnaround time`);
            }
          }

          if (existingTrip.driverId === formData.driverId) {
            const hasOverlap = checkTimeOverlap(
              existingTrip.departureTime,
              existingTrip.arrivalTime,
              newDepTime,
              newArrTime
            );

            if (hasOverlap) {
              throw new Error(`Driver ${formData.driverName} is already assigned to another trip at this time`);
            }

            const restValid = checkDriverRest(
              existingTrip,
              newDepTime,
              formData.selectedDays,
              formData.startDate
            );

            if (!restValid) {
              throw new Error(`Driver ${formData.driverName} needs ${DRIVER_REST_MINUTES} minutes rest`);
            }
          }

          if (existingTrip.routeId === formData.routeId) {
            const frequencyValid = checkRouteFrequency(
              existingTrip,
              newDepTime,
              formData.selectedDays,
              formData.startDate
            );

            if (!frequencyValid) {
              throw new Error(`Trips on same route must be at least ${MIN_ROUTE_GAP_MINUTES} minutes apart`);
            }
          }
        }

        // Prepare trip data
        let selectedRoute = routes.find(r => r.id === formData.routeId);
        if (!selectedRoute && formData.routeId) {
          const routeDoc = await transaction.get(db.collection('routes').doc(formData.routeId));
          if (routeDoc.exists) {
            const data = routeDoc.data();
            selectedRoute = {
              id: routeDoc.id,
              code: data?.code || formData.routeCode,
              name: data?.name || formData.routeName,
              from: data?.from || formData.from,
              to: data?.to || formData.to,
              distance: data?.distance || formData.distance,
              duration: data?.duration || formData.duration,
              stops: data?.stops || 0,
              fare: data?.fare || Number(formData.fare) || 0,
              transporterId: data?.transporterId || '',
              createdAt: data?.createdAt,
              updatedAt: data?.updatedAt,
            } as Route;
          }
        }

        const selectedBus = buses.find(b => b.id === formData.busId);
        const selectedDriver = drivers.find(d => d.id === formData.driverId);

        const totalSeatsNum = Number(formData.totalSeats);
        // ✅ FIX: Proper validation for seat count
        if (isNaN(totalSeatsNum) || totalSeatsNum <= 0) {
          throw new Error('Invalid seat count');
        }

        const existingTrip = trip as any;
        const availableSeats = mode === 'edit' && existingTrip?.availableSeats
          ? existingTrip.availableSeats
          : totalSeatsNum;

        let fromCode = formData.fromCode;
        let toCode = formData.toCode;

        if (!fromCode && selectedRoute?.from) {
          fromCode = await fetchCityCode(selectedRoute.from);
        }
        if (!toCode && selectedRoute?.to) {
          toCode = await fetchCityCode(selectedRoute.to);
        }

        const fareNum = Number(formData.fare);
        if (isNaN(fareNum) || fareNum < MIN_FARE) {
          throw new Error(`Fare must be at least PKR ${MIN_FARE}`);
        }

        // ✅ FIX: Store dates as Firestore Timestamps to avoid timezone issues
        const startDateTimestamp = formData.startDate ? firestore.Timestamp.fromDate(new Date(formData.startDate)) : null;
        const endDateTimestamp = formData.endDate ? firestore.Timestamp.fromDate(new Date(formData.endDate)) : null;

        const tripData = {
          routeId: formData.routeId,
          routeCode: selectedRoute?.code || formData.routeCode,
          routeName: selectedRoute?.name || formData.routeName,
          from: selectedRoute?.from || formData.from,
          to: selectedRoute?.to || formData.to,
          fromCode: fromCode,
          toCode: toCode,
          distance: selectedRoute?.distance || formData.distance,
          duration: selectedRoute?.duration || formData.duration,
          busId: formData.busId,
          busNumber: selectedBus?.busNumber || formData.busNumber,
          driverId: formData.driverId,
          driverName: selectedDriver?.fullName || formData.driverName,
          departureTime: formData.departureTime,
          arrivalTime: formData.arrivalTime,
          days: formData.selectedDays,
          startDate: startDateTimestamp,
          endDate: endDateTimestamp,
          repeatType: formData.repeatType,
          fare: fareNum,
          totalSeats: totalSeatsNum,
          availableSeats: availableSeats,
          status: 'upcoming',
          transporterId: effectiveTransporterId,
          estimatedRevenue: 0,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        };

        if (mode === 'add') {
          const newTripRef = tripsRef.doc();
          transaction.set(newTripRef, {
            ...tripData,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });

          // ✅ FIX: Use Promise.resolve with error handling instead of setTimeout
          Promise.resolve().then(async () => {
            try {
              await generateTripSeats(newTripRef.id, totalSeatsNum, fareNum);
            } catch (seatError) {
              console.error('Error generating seats after transaction:', seatError);
              // Log to monitoring service if available
            }
          });

          return { type: 'add', id: newTripRef.id };
        } else if (mode === 'edit' && trip?.id) {
          const tripRef = tripsRef.doc(trip.id);
          transaction.update(tripRef, tripData);
          return { type: 'edit', id: trip.id };
        }
      });

      Alert.alert(
        'Success',
        mode === 'add' ? 'Trip scheduled successfully!' : 'Trip updated successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('Error scheduling trip:', error);
      // ✅ FIX: Type-safe error handling
      const message = error instanceof Error ? error.message : 'Failed to schedule trip. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  // Trigger validation when relevant fields change (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.departureTime && formData.arrivalTime) {
        checkAllConflicts();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    formData.busId,
    formData.driverId,
    formData.routeId,
    formData.departureTime,
    formData.arrivalTime,
    formData.selectedDays,
    formData.startDate,
    formData.endDate,
    formData.fare,
    formData.totalSeats,
    checkAllConflicts
  ]);

  const getAvailableBuses = useCallback((): FirebaseBus[] => {
    if (!validation.busAvailable && formData.busId) {
      return buses.map(bus => ({
        ...bus,
        _disabled: bus.id === formData.busId && !validation.busAvailable
      })) as any;
    }
    return buses;
  }, [buses, validation.busAvailable, formData.busId]);

  const getAvailableDrivers = useCallback((): FirebaseDriver[] => {
    if (!validation.driverAvailable && formData.driverId) {
      return drivers.map(driver => ({
        ...driver,
        _disabled: driver.id === formData.driverId && !validation.driverAvailable
      })) as any;
    }
    return drivers;
  }, [drivers, validation.driverAvailable, formData.driverId]);

  const handleNextStep = async () => {
    if (step === 1 && !formData.routeId) {
      Alert.alert('Error', 'Please select a route');
      return;
    }

    if (step === 2) {
      if (!validateTimes() || !validateDates() || !validateDays()) {
        return;
      }

      if (!validation.fareValid) {
        Alert.alert('Warning', validation.fareMessage);
        return;
      }

      if (!validation.durationValid && formData.arrivalTime) {
        Alert.alert('Warning', validation.durationMessage);
        return;
      }
    }

    if (step === 3 && (!formData.busId || !formData.driverId)) {
      Alert.alert('Error', 'Please select both bus and driver');
      return;
    }

    if (step === 3) {
      if (!validation.busAvailable) {
        Alert.alert('Bus Unavailable', validation.busMessage);
        return;
      }
      if (!validation.driverAvailable) {
        Alert.alert('Driver Unavailable', validation.driverMessage);
        return;
      }
      if (!validation.routeFrequencyValid) {
        Alert.alert('Route Conflict', validation.routeFrequencyMessage);
        return;
      }
    }

    if (step < 4) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const toggleDaySelection = (day: string) => {
    updateField('selectedDays',
      formData.selectedDays.includes(day)
        ? formData.selectedDays.filter(d => d !== day)
        : [...formData.selectedDays, day]
    );
  };

  const handleRouteSelect = useCallback(async (route: Route) => {
    console.log('Selected route:', route);

    const [fromCode, toCode] = await Promise.all([
      fetchCityCode(route.from || ''),
      fetchCityCode(route.to || '')
    ]);

    updateField('routeId', route.id);
    updateField('routeCode', route.code || '');
    updateField('routeName', route.name || '');
    updateField('from', route.from || '');
    updateField('to', route.to || '');
    updateField('fromCode', fromCode);
    updateField('toCode', toCode);
    updateField('fare', route.fare?.toString() || '50');
    updateField('distance', route.distance || '');
    updateField('duration', route.duration || '');

    if (formData.departureTime && route.duration) {
      const arrivalTime = calculateArrivalTime(formData.departureTime, route.duration);
      if (arrivalTime) {
        updateField('arrivalTime', arrivalTime);
      }
    }
  }, [calculateArrivalTime, fetchCityCode, formData.departureTime, updateField]);

  const estimatedRevenue = useMemo(() => {
    const farePerPassenger = Number(formData.fare) || 0;
    const totalSeats = Number(formData.totalSeats) || 40;
    const estimatedPassengers = Math.floor(totalSeats * 0.8);
    return estimatedPassengers * farePerPassenger;
  }, [formData.fare, formData.totalSeats]);

  // ========== RENDER FUNCTIONS ==========
  // (Keep all existing render functions - they are unchanged)
  const renderRouteItem = useCallback(({ item }: { item: Route }) => (
    <TouchableOpacity
      style={[
        styles.routeCard,
        SHADOWS.small,
        formData.routeId === item.id && styles.selectedCard
      ]}
      onPress={() => handleRouteSelect(item)}
    >
      <View style={styles.routeHeader}>
        <Text style={styles.routeCode}>{item.code}</Text>
        <Text style={styles.routeFare}>PKR {item.fare}</Text>
      </View>
      <Text style={styles.routeName}>{item.name}</Text>
      {item.from && item.to && (
        <Text style={styles.routePath}>{item.from} → {item.to}</Text>
      )}
      <View style={styles.routeDetails}>
        <Text style={styles.routeDetail}>📏 {item.distance}</Text>
        <Text style={styles.routeDetail}>⏱️ {item.duration}</Text>
      </View>
    </TouchableOpacity>
  ), [formData.routeId, handleRouteSelect]);

  const renderBusItem = useCallback(({ item }: { item: FirebaseBus & { _disabled?: boolean } }) => {
    const isDisabled = item._disabled || !validation.busAvailable;

    return (
      <TouchableOpacity
        style={[
          styles.resourceCard,
          SHADOWS.small,
          formData.busId === item.id && styles.selectedResourceCard,
          isDisabled && styles.disabledResourceCard
        ]}
        onPress={() => {
          if (!isDisabled) {
            updateField('busId', item.id);
            updateField('busNumber', item.busNumber);
            updateField('totalSeats', item.capacity?.toString() || formData.totalSeats);
          }
        }}
        disabled={isDisabled}
      >
        <Text style={styles.resourceIcon}>🚌</Text>
        <Text style={[styles.resourceName, isDisabled && styles.disabledText]}>
          {item.busNumber}
        </Text>
        <Text style={[styles.resourceDetail, isDisabled && styles.disabledText]}>
          {item.capacity} seats
        </Text>
        {isDisabled && (
          <Text style={styles.unavailableBadge}>Unavailable</Text>
        )}
      </TouchableOpacity>
    );
  }, [formData.busId, formData.totalSeats, validation.busAvailable, updateField]);

  const renderDriverItem = useCallback(({ item }: { item: FirebaseDriver & { _disabled?: boolean } }) => {
    const isDisabled = item._disabled || !validation.driverAvailable;

    return (
      <TouchableOpacity
        style={[
          styles.resourceCard,
          SHADOWS.small,
          formData.driverId === item.id && styles.selectedResourceCard,
          isDisabled && styles.disabledResourceCard
        ]}
        onPress={() => {
          if (!isDisabled) {
            updateField('driverId', item.id);
            updateField('driverName', item.fullName);
          }
        }}
        disabled={isDisabled}
      >
        <Text style={styles.resourceIcon}>👤</Text>
        <Text style={[styles.resourceName, isDisabled && styles.disabledText]}>
          {item.fullName}
        </Text>
        <Text style={[
          styles.resourceStatus,
          item.status === 'online' ? styles.onlineStatus :
          item.status === 'on_trip' ? styles.onTripStatus :
          styles.offlineStatus,
          isDisabled && styles.disabledText
        ]}>
          {item.status === 'online' ? 'Online' :
           item.status === 'on_trip' ? 'On Trip' :
           item.status === 'offline' ? 'Offline' : item.status}
        </Text>
        {isDisabled && (
          <Text style={styles.unavailableBadge}>Unavailable</Text>
        )}
      </TouchableOpacity>
    );
  }, [formData.driverId, validation.driverAvailable, updateField]);

  const renderValidationWarnings = () => {
    if (step !== 2 && step !== 3) return null;

    const warnings: JSX.Element[] = [];

    if (step === 2) {
      if (!validation.fareValid && validation.fareMessage) {
        warnings.push(
          <View key="fare" style={styles.warningBadge}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>{validation.fareMessage}</Text>
          </View>
        );
      }

      if (!validation.seatsValid && validation.seatsMessage) {
        warnings.push(
          <View key="seats" style={styles.warningBadge}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>{validation.seatsMessage}</Text>
          </View>
        );
      }

      if (!validation.dateValid && validation.dateMessage) {
        warnings.push(
          <View key="date" style={styles.warningBadge}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>{validation.dateMessage}</Text>
          </View>
        );
      }

      if (!validation.durationValid && validation.durationMessage) {
        warnings.push(
          <View key="duration" style={styles.warningBadge}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>{validation.durationMessage}</Text>
          </View>
        );
      }
    }

    if (step === 3) {
      if (!validation.busAvailable && validation.busMessage) {
        warnings.push(
          <View key="bus" style={styles.warningBadge}>
            <Text style={styles.warningIcon}>🚌</Text>
            <Text style={styles.warningText}>{validation.busMessage}</Text>
          </View>
        );
      }

      if (!validation.driverAvailable && validation.driverMessage) {
        warnings.push(
          <View key="driver" style={styles.warningBadge}>
            <Text style={styles.warningIcon}>👤</Text>
            <Text style={styles.warningText}>{validation.driverMessage}</Text>
          </View>
        );
      }

      if (!validation.routeFrequencyValid && validation.routeFrequencyMessage) {
        warnings.push(
          <View key="route" style={styles.warningBadge}>
            <Text style={styles.warningIcon}>🛣️</Text>
            <Text style={styles.warningText}>{validation.routeFrequencyMessage}</Text>
          </View>
        );
      }
    }

    if (warnings.length > 0) {
      return (
        <View style={styles.warningsContainer}>
          {warnings}
        </View>
      );
    }

    return null;
  };

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Select Route</Text>
      {routes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🛣️</Text>
          <Text style={styles.emptyStateText}>No routes available</Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => navigation.navigate('OperationsMain', { openCreateRoute: true })}
          >
            <Text style={styles.emptyStateButtonText}>Create Route</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={(item) => item.id}
          renderItem={renderRouteItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  const renderStep2 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Schedule Details</Text>

      {renderValidationWarnings()}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Departure Time *</Text>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => handleTimePress('departureTime')}
        >
          <Text style={formData.departureTime ? styles.dateSelectedText : styles.datePlaceholderText}>
            {formData.departureTime || 'Select time'}
          </Text>
          <Text style={styles.calendarIcon}>⏰</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Arrival Time *</Text>
        <TouchableOpacity
          style={[styles.dateInput, !formData.arrivalTime && styles.requiredField]}
          onPress={() => handleTimePress('arrivalTime')}
        >
          <Text style={formData.arrivalTime ? styles.dateSelectedText : styles.datePlaceholderText}>
            {formData.arrivalTime || 'Required - select or auto-calculated'}
          </Text>
          <Text style={styles.calendarIcon}>⏰</Text>
        </TouchableOpacity>
        {formData.duration && formData.departureTime && !formData.arrivalTime && (
          <Text style={styles.helperText}>
            Will be auto-calculated based on duration ({formData.duration})
          </Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Repeat Pattern</Text>
        <View style={styles.repeatOptions}>
          {[
            { id: 'daily', label: 'Daily' },
            { id: 'weekdays', label: 'Weekdays' },
            { id: 'weekends', label: 'Weekends' },
            { id: 'weekly', label: 'Weekly' },
            { id: 'custom', label: 'Custom' }
          ].map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.repeatButton,
                formData.repeatType === type.id && styles.repeatButtonSelected
              ]}
              onPress={() => updateField('repeatType', type.id)}
            >
              <Text style={[
                styles.repeatText,
                formData.repeatType === type.id && styles.repeatTextSelected
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {formData.repeatType === 'custom' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Select Days *</Text>
          <View style={styles.daysContainer}>
            {daysOfWeek.map((day) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  formData.selectedDays.includes(day) && styles.dayButtonSelected
                ]}
                onPress={() => toggleDaySelection(day)}
              >
                <Text style={[
                  styles.dayButtonText,
                  formData.selectedDays.includes(day) && styles.dayButtonTextSelected
                ]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {formData.selectedDays.length === 0 && (
            <Text style={styles.errorText}>Please select at least one day</Text>
          )}
        </View>
      )}

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Start Date</Text>
          <TouchableOpacity
            style={[styles.dateInput, !validation.dateValid && styles.invalidInput]}
            onPress={() => handleDatePress('startDate')}
          >
            <Text style={formData.startDate ? styles.dateSelectedText : styles.datePlaceholderText}>
              {formData.startDate || 'Select date'}
            </Text>
            <Text style={styles.calendarIcon}>📅</Text>
          </TouchableOpacity>
          {!validation.dateValid && validation.dateMessage && (
            <Text style={styles.errorText}>{validation.dateMessage}</Text>
          )}
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>End Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => handleDatePress('endDate')}
          >
            <Text style={formData.endDate ? styles.dateSelectedText : styles.datePlaceholderText}>
              {formData.endDate || 'Select date (optional)'}
            </Text>
            <Text style={styles.calendarIcon}>📅</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Fare per Passenger (PKR) *</Text>
        <TextInput
          style={[styles.input, !validation.fareValid && styles.invalidInput]}
          placeholder="50"
          value={formData.fare}
          onChangeText={(text) => updateField('fare', text)}
          keyboardType="numeric"
        />
        {!validation.fareValid && validation.fareMessage && (
          <Text style={styles.errorText}>{validation.fareMessage}</Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Total Seats *</Text>
        <TextInput
          style={[styles.input, !validation.seatsValid && styles.invalidInput]}
          placeholder="40"
          value={formData.totalSeats}
          onChangeText={(text) => updateField('totalSeats', text)}
          keyboardType="numeric"
        />
        {!validation.seatsValid && validation.seatsMessage && (
          <Text style={styles.errorText}>{validation.seatsMessage}</Text>
        )}
      </View>
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Assign Resources</Text>

      {renderValidationWarnings()}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Select Bus *</Text>
        {buses.length === 0 ? (
          <View style={styles.emptyResource}>
            <Text style={styles.emptyResourceText}>No available buses</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddBusScreen', { mode: 'add' })}
            >
              <Text style={styles.addResourceText}>Add Bus</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={getAvailableBuses()}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={renderBusItem}
          />
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Select Driver *</Text>
        {drivers.length === 0 ? (
          <View style={styles.emptyResource}>
            <Text style={styles.emptyResourceText}>No online drivers available</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddDriverScreen', { mode: 'add' })}
            >
              <Text style={styles.addResourceText}>Add Driver</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={getAvailableDrivers()}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={renderDriverItem}
          />
        )}
      </View>

      <View style={styles.previewCard}>
        <Text style={styles.previewTitle}>Schedule Preview</Text>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Route:</Text>
          <Text style={styles.previewValue}>
            {formData.routeName || 'Not selected'}
          </Text>
        </View>
        {formData.from && formData.to && (
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Path:</Text>
            <Text style={styles.previewValue}>{formData.from} → {formData.to}</Text>
          </View>
        )}
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Time:</Text>
          <Text style={styles.previewValue}>
            {formData.departureTime} → {formData.arrivalTime || 'Not set'}
          </Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Days:</Text>
          <Text style={styles.previewValue}>{formData.selectedDays.join(', ')}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Fare:</Text>
          <Text style={styles.previewValue}>PKR {formData.fare}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Bus:</Text>
          <Text style={styles.previewValue}>
            {formData.busNumber || 'Not selected'}
          </Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Driver:</Text>
          <Text style={styles.previewValue}>
            {formData.driverName || 'Not selected'}
          </Text>
        </View>
        {formData.startDate && (
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Start Date:</Text>
            <Text style={styles.previewValue}>{formData.startDate}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Confirmation</Text>

      <View style={styles.confirmationCard}>
        <Text style={styles.confirmationTitle}>Trip Details</Text>

        <View style={styles.confirmationDetail}>
          <Text style={styles.confirmationLabel}>Route:</Text>
          <Text style={styles.confirmationValue}>{formData.routeName}</Text>
        </View>

        {formData.from && formData.to && (
          <View style={styles.confirmationDetail}>
            <Text style={styles.confirmationLabel}>From/To:</Text>
            <Text style={styles.confirmationValue}>{formData.from} → {formData.to}</Text>
          </View>
        )}

        <View style={styles.confirmationDetail}>
          <Text style={styles.confirmationLabel}>Bus:</Text>
          <Text style={styles.confirmationValue}>{formData.busNumber}</Text>
        </View>

        <View style={styles.confirmationDetail}>
          <Text style={styles.confirmationLabel}>Driver:</Text>
          <Text style={styles.confirmationValue}>{formData.driverName}</Text>
        </View>

        <View style={styles.confirmationDetail}>
          <Text style={styles.confirmationLabel}>Departure:</Text>
          <Text style={styles.confirmationValue}>{formData.departureTime}</Text>
        </View>

        <View style={styles.confirmationDetail}>
          <Text style={styles.confirmationLabel}>Arrival:</Text>
          <Text style={styles.confirmationValue}>{formData.arrivalTime || 'Not set'}</Text>
        </View>

        <View style={styles.confirmationDetail}>
          <Text style={styles.confirmationLabel}>Days:</Text>
          <Text style={styles.confirmationValue}>{formData.selectedDays.join(', ')}</Text>
        </View>

        <View style={styles.confirmationDetail}>
          <Text style={styles.confirmationLabel}>Start Date:</Text>
          <Text style={styles.confirmationValue}>{formData.startDate || 'Not set'}</Text>
        </View>

        <View style={styles.confirmationDetail}>
          <Text style={styles.confirmationLabel}>End Date:</Text>
          <Text style={styles.confirmationValue}>{formData.endDate || 'Not set'}</Text>
        </View>

        <View style={styles.confirmationDetail}>
          <Text style={styles.confirmationLabel}>Fare:</Text>
          <Text style={styles.confirmationValue}>PKR {formData.fare}</Text>
        </View>

        <View style={styles.confirmationDetail}>
          <Text style={styles.confirmationLabel}>Total Seats:</Text>
          <Text style={styles.confirmationValue}>{formData.totalSeats}</Text>
        </View>

        <View style={styles.confirmationDetail}>
          <Text style={styles.confirmationLabel}>Schedule Type:</Text>
          <Text style={styles.confirmationValue}>
            {formData.repeatType.charAt(0).toUpperCase() + formData.repeatType.slice(1)}
          </Text>
        </View>

        <View style={styles.revenueEstimate}>
          <Text style={styles.revenueTitle}>Estimated Daily Revenue</Text>
          <Text style={styles.revenueValue}>PKR {estimatedRevenue.toLocaleString()}</Text>
          <Text style={styles.revenueSubtext}>
            Based on 80% occupancy at PKR {formData.fare} per passenger
          </Text>
        </View>

        <View style={[
          styles.conflictSummary,
          (!validation.busAvailable || !validation.driverAvailable || !validation.routeFrequencyValid) &&
          styles.conflictSummaryWarning
        ]}>
          <Text style={styles.conflictSummaryTitle}>
            {validation.busAvailable && validation.driverAvailable && validation.routeFrequencyValid
              ? '✓ All Checks Passed'
              : '⚠️ Some Conflicts Detected'}
          </Text>

          {validation.busAvailable ? (
            <Text style={styles.conflictSummaryText}>✓ Bus available with proper turnaround</Text>
          ) : (
            <Text style={styles.conflictSummaryWarningText}>✗ {validation.busMessage}</Text>
          )}

          {validation.driverAvailable ? (
            <Text style={styles.conflictSummaryText}>✓ Driver available with proper rest</Text>
          ) : (
            <Text style={styles.conflictSummaryWarningText}>✗ {validation.driverMessage}</Text>
          )}

          {validation.routeFrequencyValid ? (
            <Text style={styles.conflictSummaryText}>✓ Route frequency respected</Text>
          ) : (
            <Text style={styles.conflictSummaryWarningText}>✗ {validation.routeFrequencyMessage}</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );

  if (fetchingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevStep}>
          <Text style={styles.backButton}>{step === 1 ? '←' : '← Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {mode === 'add' ? 'Schedule Trip' : mode === 'edit' ? 'Edit Trip' : 'Trip Details'}
        </Text>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>Step {step}/4</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / 4) * 100}%` }]} />
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        style={styles.contentContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.modalClose}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
              {Platform.OS === 'android' && (
                <View style={styles.androidButtons}>
                  <TouchableOpacity
                    style={styles.androidButtonCancel}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.androidButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.androidButtonConfirm}
                    onPress={handleAndroidDateConfirm}
                  >
                    <Text style={[styles.androidButtonText, styles.confirmButtonText]}>OK</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showTimePicker}
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Time</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.modalClose}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
              />
              {Platform.OS === 'android' && (
                <View style={styles.androidButtons}>
                  <TouchableOpacity
                    style={styles.androidButtonCancel}
                    onPress={() => setShowTimePicker(false)}
                  >
                    <Text style={styles.androidButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.androidButtonConfirm}
                    onPress={handleAndroidTimeConfirm}
                  >
                    <Text style={[styles.androidButtonText, styles.confirmButtonText]}>OK</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* Action Buttons */}
      {mode !== 'view' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.nextButton,
              (step === 3 && (!validation.busAvailable || !validation.driverAvailable)) && styles.disabledButton
            ]}
            onPress={handleNextStep}
            disabled={loading || (step === 3 && (!validation.busAvailable || !validation.driverAvailable))}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.nextButtonText}>
                {step === 4 ? 'Confirm Schedule' : 'Next'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

// ========== STYLES ==========
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SIZES.sm,
    fontSize: 16,
    color: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.lg,
    backgroundColor: COLORS.primary,
  },
  backButton: {
    fontSize: 18,
    color: COLORS.white,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  stepIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: 20,
  },
  stepText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
  },
  contentContainer: {
    flex: 1,
    padding: SIZES.md,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SIZES.lg,
  },
  emptyState: {
    alignItems: 'center',
    padding: SIZES.xxxl,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: SIZES.md,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: SIZES.lg,
  },
  emptyStateButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.xs,
  },
  emptyStateButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  routeCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedCard: {
    backgroundColor: COLORS.infoLight,
    borderColor: COLORS.secondary,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  routeCode: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  routeFare: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.success,
  },
  routeName: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 4,
  },
  routePath: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SIZES.sm,
  },
  routeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeDetail: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  inputGroup: {
    marginBottom: SIZES.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    padding: SIZES.sm,
    fontSize: 16,
    backgroundColor: COLORS.white,
    color: COLORS.text,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    padding: SIZES.sm,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requiredField: {
    borderColor: COLORS.secondary,
    borderWidth: 2,
  },
  dateSelectedText: {
    fontSize: 16,
    color: COLORS.text,
  },
  datePlaceholderText: {
    fontSize: 16,
    color: COLORS.textLighter,
  },
  calendarIcon: {
    fontSize: 20,
    color: COLORS.secondary,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 4,
  },
  repeatOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  repeatButton: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    margin: 4,
    backgroundColor: COLORS.white,
  },
  repeatButtonSelected: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  repeatText: {
    fontSize: 14,
    color: COLORS.text,
  },
  repeatTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: '14%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    marginBottom: SIZES.xs,
    backgroundColor: COLORS.white,
  },
  dayButtonSelected: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  dayButtonTextSelected: {
    color: COLORS.white,
  },
  row: {
    flexDirection: 'row',
  },
  emptyResource: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.md,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.xs,
  },
  emptyResourceText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  addResourceText: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  resourceCard: {
    width: 140,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginRight: SIZES.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedResourceCard: {
    backgroundColor: COLORS.infoLight,
    borderColor: COLORS.secondary,
  },
  disabledResourceCard: {
    opacity: 0.5,
    backgroundColor: COLORS.border,
  },
  resourceIcon: {
    fontSize: 32,
    marginBottom: SIZES.xs,
  },
  resourceName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  resourceDetail: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  resourceStatus: {
    fontSize: 10,
    paddingHorizontal: SIZES.xs,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  onlineStatus: {
    backgroundColor: '#E8F5E8',
    color: COLORS.success,
  },
  onTripStatus: {
    backgroundColor: '#FFF3E0',
    color: COLORS.warning,
  },
  offlineStatus: {
    backgroundColor: '#FFEBEE',
    color: COLORS.danger,
  },
  previewCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginTop: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SIZES.sm,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.xs,
  },
  previewLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  confirmationCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SIZES.lg,
    textAlign: 'center',
  },
  confirmationDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.sm,
    paddingBottom: SIZES.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  confirmationLabel: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  confirmationValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  revenueEstimate: {
    backgroundColor: '#E8F5E8',
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginTop: SIZES.lg,
    alignItems: 'center',
  },
  revenueTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SIZES.xs,
  },
  revenueValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.success,
    marginBottom: 4,
  },
  revenueSubtext: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  conflictSummary: {
    backgroundColor: '#E3F2FD',
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginTop: SIZES.md,
    alignItems: 'flex-start',
  },
  conflictSummaryWarning: {
    backgroundColor: '#FFF3E0',
  },
  conflictSummaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  conflictSummaryText: {
    fontSize: 12,
    color: COLORS.text,
    marginBottom: 4,
  },
  conflictSummaryWarningText: {
    fontSize: 12,
    color: COLORS.warning,
    marginBottom: 4,
  },
  actionButtons: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.lg,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    paddingVertical: SIZES.md,
    borderRadius: SIZES.xs,
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: COLORS.secondary,
  },
  nextButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.lg,
    borderTopRightRadius: SIZES.lg,
    paddingBottom: SIZES.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalClose: {
    fontSize: 16,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  androidButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SIZES.md,
    paddingTop: SIZES.sm,
  },
  androidButtonCancel: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    marginRight: SIZES.sm,
  },
  androidButtonConfirm: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.secondary,
    borderRadius: SIZES.xs,
  },
  androidButtonText: {
    fontSize: 16,
    color: COLORS.text,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  invalidInput: {
    borderColor: COLORS.danger,
    borderWidth: 2,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: COLORS.textLight,
  },
  unavailableBadge: {
    fontSize: 10,
    color: COLORS.danger,
    fontWeight: '600',
    marginTop: 4,
  },
  warningsContainer: {
    marginBottom: SIZES.lg,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: SIZES.xs,
    padding: SIZES.sm,
    marginBottom: SIZES.xs,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: SIZES.xs,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.warningDark,
  },
});

export default ScheduleTripScreen;
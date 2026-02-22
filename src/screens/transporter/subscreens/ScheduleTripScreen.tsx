// src/screens/transporter/subscreens/ScheduleTripScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';

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

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ScheduleTripScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { mode, trip, preSelectedRoute, transporterId } = route.params as {
    mode: 'add' | 'edit' | 'view';
    trip?: Trip;
    preSelectedRoute?: string;
    transporterId?: string;
  };

  const [step, setStep] = useState(1); // 1: Route, 2: Schedule, 3: Assign, 4: Confirm
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // Data states
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<FirebaseBus[]>([]);
  const [drivers, setDrivers] = useState<FirebaseDriver[]>([]);

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Time picker states
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentTimeField, setCurrentTimeField] = useState('');

  const [formData, setFormData] = useState({
    routeId: '',
    routeCode: '',
    routeName: '',
    from: '',
    to: '',
    busId: '',
    busNumber: '',
    driverId: '',
    driverName: '',
    departureTime: '08:00',
    arrivalTime: '',
    selectedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as string[],
    startDate: '',
    endDate: '',
    repeatType: 'weekdays', // daily, weekdays, weekends, weekly, custom
    fare: '50',
    totalSeats: '40',
    distance: '',
    duration: '',
  });

  const user = auth().currentUser;

  // Load data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setFetchingData(true);

      try {
        // Fetch routes
        const routesSnapshot = await firestore()
          .collection('routes')
          .where('transporterId', '==', user.uid)
          .orderBy('createdAt', 'desc')
          .get();

        const routesList = routesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Route[];
        setRoutes(routesList);

        // Fetch available buses
        const busesSnapshot = await firestore()
          .collection('buses')
          .where('transporterId', '==', user.uid)
          .where('status', '==', 'active')
          .get();

        const busesList = busesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as FirebaseBus[];
        setBuses(busesList);

        // Fetch available drivers
        const driversSnapshot = await firestore()
          .collection('drivers')
          .where('transporterId', '==', user.uid)
          .where('status', '==', 'active')
          .get();

        const driversList = driversSnapshot.docs.map(doc => ({
          id: doc.id,
          fullName: doc.data().fullName,
          status: doc.data().status,
          contactNumber: doc.data().contactNumber,
        })) as FirebaseDriver[];
        setDrivers(driversList);

        // If in edit mode, populate form with trip data
        if (mode === 'edit' && trip) {
          setFormData({
            routeId: trip.routeId || '',
            routeCode: trip.routeCode || '',
            routeName: trip.routeName || '',
            from: trip.from || '',
            to: trip.to || '',
            busId: trip.busId || '',
            busNumber: trip.busNumber || '',
            driverId: trip.driverId || '',
            driverName: trip.driverName || '',
            departureTime: trip.departureTime || '08:00',
            arrivalTime: trip.arrivalTime || '',
            selectedDays: trip.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            startDate: trip.startDate || '',
            endDate: trip.endDate || '',
            repeatType: trip.repeatType || 'weekdays',
            fare: trip.fare?.toString() || '50',
            totalSeats: trip.totalSeats?.toString() || '40',
            distance: trip.distance?.toString() || '',
            duration: trip.duration || '',
          });
        }

        // If pre-selected route is provided
        if (preSelectedRoute && routesList.length > 0) {
          const selectedRoute = routesList.find(r => r.code === preSelectedRoute);
          if (selectedRoute) {
            setFormData(prev => ({
              ...prev,
              routeId: selectedRoute.id,
              routeCode: selectedRoute.code,
              routeName: selectedRoute.name,
              from: selectedRoute.from || '',
              to: selectedRoute.to || '',
              fare: selectedRoute.fare?.toString() || '50',
              distance: selectedRoute.distance || '',
              duration: selectedRoute.duration || '',
            }));
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
  }, [user, mode, trip, preSelectedRoute]);

  // ========== DATE PICKER FUNCTIONS ==========
  const handleDatePress = (field: string) => {
    setCurrentDateField(field);
    if (formData[field as keyof typeof formData]) {
      setSelectedDate(new Date(formData[field as keyof typeof formData] as string));
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

      if (currentDateField === 'startDate') {
        setFormData({...formData, startDate: formattedDate});
      } else if (currentDateField === 'endDate') {
        setFormData({...formData, endDate: formattedDate});
      }
    }
  };

  const handleAndroidDateConfirm = () => {
    const formattedDate = selectedDate.toISOString().split('T')[0];

    if (currentDateField === 'startDate') {
      setFormData({...formData, startDate: formattedDate});
    } else if (currentDateField === 'endDate') {
      setFormData({...formData, endDate: formattedDate});
    }

    setShowDatePicker(false);
  };

  // ========== TIME PICKER FUNCTIONS ==========
  const handleTimePress = (field: string) => {
    setCurrentTimeField(field);

    // Parse existing time if available
    if (formData[field as keyof typeof formData]) {
      const timeStr = formData[field as keyof typeof formData] as string;
      const [hours, minutes] = timeStr.split(':').map(Number);
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
        setFormData({...formData, departureTime: formattedTime});

        // Auto-calculate arrival time (e.g., + duration)
        if (formData.duration) {
          const durationMatch = formData.duration.match(/(\d+)/);
          if (durationMatch) {
            const durationMins = parseInt(durationMatch[0]) * 60; // Convert hours to minutes
            const arrivalDate = new Date(date);
            arrivalDate.setMinutes(arrivalDate.getMinutes() + durationMins);
            const arrivalTime = `${arrivalDate.getHours().toString().padStart(2, '0')}:${arrivalDate.getMinutes().toString().padStart(2, '0')}`;
            setFormData(prev => ({...prev, arrivalTime}));
          }
        }
      } else if (currentTimeField === 'arrivalTime') {
        setFormData({...formData, arrivalTime: formattedTime});
      }
    }
  };

  const handleAndroidTimeConfirm = () => {
    const formattedTime = `${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}`;

    if (currentTimeField === 'departureTime') {
      setFormData({...formData, departureTime: formattedTime});
    } else if (currentTimeField === 'arrivalTime') {
      setFormData({...formData, arrivalTime: formattedTime});
    }

    setShowTimePicker(false);
  };

  // ========== FORM NAVIGATION FUNCTIONS ==========
  const handleNextStep = () => {
    if (step === 1 && !formData.routeId) {
      Alert.alert('Error', 'Please select a route');
      return;
    }
    if (step === 2 && !formData.departureTime) {
      Alert.alert('Error', 'Please select departure time');
      return;
    }
    if (step === 3 && (!formData.busId || !formData.driverId)) {
      Alert.alert('Error', 'Please select both bus and driver');
      return;
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

  // ========== FIREBASE SUBMIT ==========
  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setLoading(true);

    try {
      const selectedRoute = routes.find(r => r.id === formData.routeId);

      // Prepare trip data for Firebase
      const tripData = {
        routeId: formData.routeId,
        routeCode: selectedRoute?.code || formData.routeCode,
        routeName: selectedRoute?.name || formData.routeName,
        from: selectedRoute?.from || formData.from,
        to: selectedRoute?.to || formData.to,
        busId: formData.busId,
        busNumber: buses.find(b => b.id === formData.busId)?.busNumber || formData.busNumber,
        driverId: formData.driverId,
        driverName: drivers.find(d => d.id === formData.driverId)?.fullName || formData.driverName,
        departureTime: formData.departureTime,
        arrivalTime: formData.arrivalTime,
        days: formData.selectedDays,
        startDate: formData.startDate || new Date().toISOString().split('T')[0],
        endDate: formData.endDate || '',
        repeatType: formData.repeatType,
        fare: parseInt(formData.fare) || 0,
        totalSeats: parseInt(formData.totalSeats) || 40,
        availableSeats: parseInt(formData.totalSeats) || 40,
        distance: parseInt(formData.distance) || 0,
        duration: formData.duration || '',
        status: 'upcoming',
        transporterId: user.uid,
        estimatedRevenue: 0, // Will be calculated when passengers book
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      if (mode === 'add') {
        // Add new trip
        await firestore()
          .collection('trips')
          .add(tripData);

        Alert.alert(
          'Success',
          'Trip scheduled successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            },
            {
              text: 'View Schedule',
              onPress: () => {
                navigation.navigate('OperationsMain');
              }
            }
          ]
        );
      } else if (mode === 'edit' && trip?.id) {
        // Update existing trip
        await firestore()
          .collection('trips')
          .doc(trip.id)
          .update({
            ...tripData,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });

        Alert.alert(
          'Success',
          'Trip updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error scheduling trip:', error);
      Alert.alert('Error', 'Failed to schedule trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDaySelection = (day: string) => {
    if (formData.selectedDays.includes(day)) {
      setFormData({
        ...formData,
        selectedDays: formData.selectedDays.filter(d => d !== day)
      });
    } else {
      setFormData({
        ...formData,
        selectedDays: [...formData.selectedDays, day]
      });
    }
  };

  // Handle route selection
  const handleRouteSelect = (route: Route) => {
    setFormData({
      ...formData,
      routeId: route.id,
      routeCode: route.code,
      routeName: route.name,
      from: route.from || '',
      to: route.to || '',
      fare: route.fare?.toString() || '50',
      distance: route.distance || '',
      duration: route.duration || '',
    });
  };

  // Calculate estimated revenue
  const estimatedRevenue = useMemo(() => {
    const farePerPassenger = parseInt(formData.fare) || 0;
    const totalSeats = parseInt(formData.totalSeats) || 40;
    // Assuming 80% occupancy for estimate
    const estimatedPassengers = Math.floor(totalSeats * 0.8);
    return estimatedPassengers * farePerPassenger;
  }, [formData.fare, formData.totalSeats]);

  // ========== RENDER FUNCTIONS ==========
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
          renderItem={({ item }) => (
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
                <Text style={styles.routeDetail}>📍 {item.stops} stops</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  const renderStep2 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Schedule Details</Text>

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
        <Text style={styles.label}>Arrival Time</Text>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => handleTimePress('arrivalTime')}
        >
          <Text style={formData.arrivalTime ? styles.dateSelectedText : styles.datePlaceholderText}>
            {formData.arrivalTime || 'Select time (optional)'}
          </Text>
          <Text style={styles.calendarIcon}>⏰</Text>
        </TouchableOpacity>
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
              onPress={() => setFormData({...formData, repeatType: type.id})}
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
        </View>
      )}

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Start Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => handleDatePress('startDate')}
          >
            <Text style={formData.startDate ? styles.dateSelectedText : styles.datePlaceholderText}>
              {formData.startDate || 'Select date'}
            </Text>
            <Text style={styles.calendarIcon}>📅</Text>
          </TouchableOpacity>
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
          style={styles.input}
          placeholder="50"
          value={formData.fare}
          onChangeText={(text) => setFormData({...formData, fare: text})}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Total Seats *</Text>
        <TextInput
          style={styles.input}
          placeholder="40"
          value={formData.totalSeats}
          onChangeText={(text) => setFormData({...formData, totalSeats: text})}
          keyboardType="numeric"
        />
      </View>
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Assign Resources</Text>

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
            data={buses}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.resourceCard,
                  SHADOWS.small,
                  formData.busId === item.id && styles.selectedResourceCard
                ]}
                onPress={() => setFormData({
                  ...formData,
                  busId: item.id,
                  busNumber: item.busNumber,
                  totalSeats: item.capacity?.toString() || formData.totalSeats
                })}
              >
                <Text style={styles.resourceIcon}>🚌</Text>
                <Text style={styles.resourceName}>{item.busNumber}</Text>
                <Text style={styles.resourceDetail}>{item.capacity} seats</Text>
                <Text style={[styles.resourceStatus, styles.availableStatus]}>
                  {item.status}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Select Driver *</Text>
        {drivers.length === 0 ? (
          <View style={styles.emptyResource}>
            <Text style={styles.emptyResourceText}>No available drivers</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddDriverScreen', { mode: 'add' })}
            >
              <Text style={styles.addResourceText}>Add Driver</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={drivers}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.resourceCard,
                  SHADOWS.small,
                  formData.driverId === item.id && styles.selectedResourceCard
                ]}
                onPress={() => setFormData({
                  ...formData,
                  driverId: item.id,
                  driverName: item.fullName
                })}
              >
                <Text style={styles.resourceIcon}>👤</Text>
                <Text style={styles.resourceName}>{item.fullName}</Text>
                <Text style={[styles.resourceStatus, styles.availableStatus]}>
                  {item.status}
                </Text>
              </TouchableOpacity>
            )}
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
          <Text style={styles.previewValue}>{formData.departureTime}</Text>
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
      <View style={styles.contentContainer}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </View>

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

      {/* Action Buttons - Only show for add/edit mode */}
      {mode !== 'view' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.nextButton]}
            onPress={handleNextStep}
            disabled={loading}
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
  availableStatus: {
    backgroundColor: '#E8F5E8',
    color: COLORS.success,
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
  // Modal styles
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
});

export default ScheduleTripScreen;
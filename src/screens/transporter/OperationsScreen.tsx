// src/screens/transporter/OperationsScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { StackNavigationProp } from '@react-navigation/stack';
import { TransporterStackParamList } from '../../navigation/TransporterNavigator';

// Types
import { Route, Trip, TripStatus } from '../../types/operations.types';

// Constants
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { TRIP_STATUS, TRIP_STATUS_CONFIG, getTripStatusConfig } from '../../constants/status';

// Pakistan Cities Data
const PAKISTAN_CITIES = [
  // Punjab
  'Lahore', 'Faisalabad', 'Rawalpindi', 'Multan', 'Gujranwala', 'Sialkot', 'Bahawalpur',
  'Sargodha', 'Sheikhupura', 'Rahim Yar Khan', 'Jhang', 'Dera Ghazi Khan', 'Gujrat',
  'Sahiwal', 'Wah Cantonment', 'Kasur', 'Okara', 'Mandi Bahauddin', 'Chiniot',
  // Sindh
  'Karachi', 'Hyderabad', 'Sukkur', 'Larkana', 'Nawabshah', 'Mirpur Khas', 'Jacobabad',
  'Shikarpur', 'Dadu', 'Tando Allahyar', 'Thatta', 'Badin', 'Ghotki', 'Kashmore',
  // Khyber Pakhtunkhwa
  'Peshawar', 'Mardan', 'Abbottabad', 'Mingora', 'Kohat', 'Bannu', 'Dera Ismail Khan',
  'Charsadda', 'Nowshera', 'Swabi', 'Haripur', 'Mansehra', 'Batkhela', 'Timergara',
  // Balochistan
  'Quetta', 'Turbat', 'Khuzdar', 'Hub', 'Chaman', 'Sibi', 'Zhob', 'Gwadar',
  'Dera Murad Jamali', 'Loralai', 'Usta Muhammad', 'Pasni',
  // Islamabad
  'Islamabad',
  // Gilgit-Baltistan
  'Gilgit', 'Skardu', 'Hunza', 'Chilas', 'Gahkuch', 'Astore',
  // Azad Kashmir
  'Muzaffarabad', 'Mirpur', 'Rawalakot', 'Kotli', 'Bhimber', 'Bagh'
].sort();

// City Picker Modal Component
const CityPickerModal = ({
  visible,
  onClose,
  onSelect,
  title,
  selectedCity
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (city: string) => void;
  title: string;
  selectedCity: string;
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCities, setFilteredCities] = useState(PAKISTAN_CITIES);

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
    }
  }, [visible]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCities(PAKISTAN_CITIES);
    } else {
      const filtered = PAKISTAN_CITIES.filter(city =>
        city.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCities(filtered);
    }
  }, [searchQuery]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.cityPickerContainer}>
          <View style={styles.cityPickerHeader}>
            <Text style={styles.cityPickerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search city..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={COLORS.textLight}
            />
          </View>

          <FlatList
            data={filteredCities}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.cityItem,
                  selectedCity === item && styles.cityItemSelected
                ]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={[
                  styles.cityItemText,
                  selectedCity === item && styles.cityItemTextSelected
                ]}>
                  {item}
                </Text>
                {selectedCity === item && (
                  <Text style={styles.checkIcon}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyCityList}>
                <Text style={styles.emptyCityText}>No cities found</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
};

type OperationsScreenNavigationProp = StackNavigationProp<TransporterStackParamList, 'Operations'>;

// Firebase Trip type
type FirebaseTrip = {
  id: string;
  routeId: string;
  routeCode: string;
  routeName: string;
  from: string;
  to: string;
  busId: string;
  busNumber: string;
  driverId: string;
  driverName: string;
  departureTime: string;
  arrivalTime: string;
  days: string[];
  status: string;
  totalSeats: number;
  availableSeats: number;
  fare: number;
  distance: number;
  estimatedRevenue: number;
  transporterId: string;
  createdAt: any;
  updatedAt: any;
  startDate?: string;
  endDate?: string;
  repeatType?: string;
  cancelledAt?: any;
  date?: string;
  dayOfWeek?: string;
};

const OperationsScreen = () => {
  const navigation = useNavigation<OperationsScreenNavigationProp>();
  const route = useRoute();
  const [activeTab, setActiveTab] = useState<'schedule' | 'routes' | 'today'>('schedule');
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transporterName, setTransporterName] = useState('');
  const [routeLoading, setRouteLoading] = useState(false);

  // City picker states
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [cityPickerField, setCityPickerField] = useState<'from' | 'to'>('from');

  // Data states
  const [routes, setRoutes] = useState<Route[]>([]);
  const [trips, setTrips] = useState<FirebaseTrip[]>([]);
  const [buses, setBuses] = useState<{id: string, busNumber: string, assignedDriverId?: string}[]>([]);
  const [drivers, setDrivers] = useState<{id: string, fullName: string, assignedBusId?: string}[]>([]);

  // Form states
  const [newRoute, setNewRoute] = useState({
    code: '',
    name: '',
    from: '',
    to: '',
    distance: '',
    fare: '',
  });

  const user = auth().currentUser;
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Open ScheduleTripScreen automatically
  useFocusEffect(
    useCallback(() => {
      const params = route.params as any;
      if (params?.openScheduleTrip) {
        handleScheduleTrip();
        navigation.setParams({ openScheduleTrip: false });
      }
    }, [route.params])
  );

  // Fetch transporter name
  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .onSnapshot(
        (doc) => {
          if ((doc as any).exists) {
            setTransporterName(doc.data()?.fullName || 'Transporter');
          }
        },
        (error) => console.error('Error fetching user:', error)
      );

    return () => unsubscribe();
  }, [user]);

  // REAL-TIME ROUTES LISTENER
  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestore()
      .collection('routes')
      .where('transporterId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snapshot) => {
          const routesList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Route[];
          setRoutes(routesList);
        },
        (error) => console.error('Error fetching routes:', error)
      );

    return () => unsubscribe();
  }, [user]);

  // REAL-TIME TRIPS LISTENER
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const unsubscribe = firestore()
      .collection('trips')
      .where('transporterId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snapshot) => {
          const tripsList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as FirebaseTrip[];

          setTrips(tripsList);
          setLoading(false);
          setRefreshing(false);
        },
        (error) => {
          console.error('Error fetching trips:', error);
          setLoading(false);
          setRefreshing(false);
        }
      );

    return () => unsubscribe();
  }, [user]);

  // FETCH AVAILABLE BUSES
  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestore()
      .collection('buses')
      .where('transporterId', '==', user.uid)
      .where('status', '==', 'available')
      .onSnapshot(
        (snapshot) => {
          const busesList = snapshot.docs.map(doc => ({
            id: doc.id,
            busNumber: doc.data().busNumber,
            assignedDriverId: doc.data().assignedDriverId,
          }));
          setBuses(busesList);
        },
        (error) => console.error('Error fetching buses:', error)
      );

    return () => unsubscribe();
  }, [user]);

  // FETCH AVAILABLE DRIVERS
  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestore()
      .collection('drivers')
      .where('transporterId', '==', user.uid)
      .where('status', '==', 'available')
      .onSnapshot(
        (snapshot) => {
          const driversList = snapshot.docs.map(doc => ({
            id: doc.id,
            fullName: doc.data().fullName,
            assignedBusId: doc.data().assignedBusId,
          }));
          setDrivers(driversList);
        },
        (error) => console.error('Error fetching drivers:', error)
      );

    return () => unsubscribe();
  }, [user]);

  // Manual refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // ✅ Check if trip is expired (30 minutes after departure time)
  const isTripExpired = useCallback((trip: FirebaseTrip): boolean => {
    if (trip.status !== TRIP_STATUS.SCHEDULED) return false;

    const now = new Date();
    const tripDate = trip.date || new Date().toISOString().split('T')[0];
    const [hours, minutes] = trip.departureTime.split(':').map(Number);

    const depDateTime = new Date(tripDate);
    depDateTime.setHours(hours, minutes, 0, 0);

    const thirtyMinutesAfter = new Date(depDateTime.getTime() + 30 * 60 * 1000);
    return now > thirtyMinutesAfter;
  }, []);

  // ✅ Get effective status with centralized config
  const getEffectiveStatus = useCallback((trip: FirebaseTrip): string => {
    if (isTripExpired(trip)) {
      return 'expired';
    }
    // Map old statuses to new ones
    if (trip.status === 'upcoming' || trip.status === 'scheduled') {
      return TRIP_STATUS.SCHEDULED;
    }
    if (trip.status === 'active' || trip.status === 'on-time' || trip.status === 'in-progress') {
      return TRIP_STATUS.IN_PROGRESS;
    }
    return trip.status;
  }, [isTripExpired]);

  // ✅ Get status display using centralized config
  const getStatusDisplay = useCallback((status: string) => {
    if (status === 'expired') {
      return { label: 'Expired', icon: '⏰', color: '#FF6B6B' };
    }
    return getTripStatusConfig(status);
  }, []);

  // Get today's trips
  const getTodayTrips = useCallback(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayName = today.toLocaleDateString('en-US', { weekday: 'short' });

    return trips.filter(trip => {
      if (trip.date) {
        return trip.date === todayStr;
      }
      if (trip.days?.includes('Daily')) return true;
      if (trip.days?.includes(dayName)) return true;

      if (trip.startDate && trip.endDate) {
        try {
          const tripStart = new Date(trip.startDate);
          const tripEnd = new Date(trip.endDate);
          return today >= tripStart && today <= tripEnd;
        } catch (e) {
          return false;
        }
      }
      return false;
    });
  }, [trips]);

  // ✅ Calculate stats with new statuses
  const stats = useMemo(() => {
    const todayTripsArray = getTodayTrips();

    const activeTrips = trips.filter(t => {
      const effectiveStatus = getEffectiveStatus(t);
      return effectiveStatus === TRIP_STATUS.IN_PROGRESS || effectiveStatus === TRIP_STATUS.SCHEDULED;
    }).length;

    const scheduledTrips = trips.filter(t => getEffectiveStatus(t) === TRIP_STATUS.SCHEDULED).length;
    const inProgressTrips = trips.filter(t => getEffectiveStatus(t) === TRIP_STATUS.IN_PROGRESS).length;
    const completedTrips = trips.filter(t => t.status === TRIP_STATUS.COMPLETED).length;
    const delayedTrips = trips.filter(t => t.status === TRIP_STATUS.DELAYED).length;
    const cancelledTrips = trips.filter(t => t.status === TRIP_STATUS.CANCELLED).length;
    const expiredTrips = trips.filter(t => isTripExpired(t)).length;

    let totalPassengers = 0;
    let totalRevenue = 0;

    trips.forEach(trip => {
      const passengers = (trip.totalSeats || 0) - (trip.availableSeats || 0);
      totalPassengers += passengers;
      totalRevenue += passengers * (trip.fare || 0);
    });

    return {
      activeTrips,
      todayTrips: todayTripsArray.length,
      scheduledTrips,
      inProgressTrips,
      completedTrips,
      delayedTrips,
      cancelledTrips,
      expiredTrips,
      totalRevenue,
      totalPassengers,
      totalRoutes: routes.length,
    };
  }, [trips, routes, getTodayTrips, getEffectiveStatus, isTripExpired]);

  const todayTrips = useMemo(() => getTodayTrips(), [getTodayTrips]);

  // Format date for display
  const formatTripDate = useCallback((trip: FirebaseTrip): string => {
    if (trip.date) {
      const date = new Date(trip.date);
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
    if (trip.days && trip.days.length > 0) {
      if (trip.days.includes('Daily')) return 'Daily';
      return trip.days.join(', ');
    }
    return 'N/A';
  }, []);

  // Check if trip is today
  const isTripToday = useCallback((trip: FirebaseTrip): boolean => {
    const today = new Date().toISOString().split('T')[0];
    if (trip.date) {
      return trip.date === today;
    }
    const today2 = new Date();
    const dayName = today2.toLocaleDateString('en-US', { weekday: 'short' });
    if (trip.days?.includes('Daily')) return true;
    if (trip.days?.includes(dayName)) return true;
    if (trip.startDate && trip.endDate) {
      const tripStart = new Date(trip.startDate);
      const tripEnd = new Date(trip.endDate);
      return today2 >= tripStart && today2 <= tripEnd;
    }
    return false;
  }, []);

  // Format trip for display
  const getDisplayTrip = (trip: FirebaseTrip) => {
    const passengers = (trip.totalSeats || 0) - (trip.availableSeats || 0);
    const revenue = passengers * (trip.fare || 0);

    let routeName = trip.routeName || (trip.from && trip.to ? `${trip.from} → ${trip.to}` : null);
    let routeCode = trip.routeCode || (trip.from && trip.to ? `${trip.from.substring(0, 3)}-${trip.to.substring(0, 3)}` : null);

    if (!routeName && trip.routeId) {
      const r = routes.find(route => route.id === trip.routeId);
      if (r) {
        routeName = r.name || (r.from && r.to ? `${r.from} → ${r.to}` : 'Unknown Route');
        routeCode = r.code || routeCode || 'RT-000';
      }
    }

    return {
      routeName: routeName || 'Unknown Route',
      routeCode: routeCode || 'RT-000',
      passengers,
      revenue,
    };
  };

  // Schedule Trip button handler
  const handleScheduleTrip = () => {
    navigation.navigate('ScheduleTripScreen', {
      mode: 'add',
      transporterId: user?.uid,
    });
  };

  // Create New Route button handler
  const handleCreateRoute = () => {
    setRouteModalVisible(true);
  };

  // Open city picker
  const openCityPicker = (field: 'from' | 'to') => {
    setCityPickerField(field);
    setCityPickerVisible(true);
  };

  // Fetch distance from OpenStreetMap
  const fetchDistanceFromOSM = async (fromCity: string, toCity: string) => {
    if (!fromCity || !toCity) return null;

    try {
      const fromQuery = encodeURIComponent(`${fromCity}, Pakistan`);
      const toQuery = encodeURIComponent(`${toCity}, Pakistan`);

      const fromResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${fromQuery}&format=json&limit=1`,
        { headers: { 'User-Agent': 'BusBuddy/1.0' } }
      );
      const fromData = await fromResponse.json();

      const toResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${toQuery}&format=json&limit=1`,
        { headers: { 'User-Agent': 'BusBuddy/1.0' } }
      );
      const toData = await toResponse.json();

      if (fromData.length > 0 && toData.length > 0) {
        const routeResponse = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${fromData[0].lon},${fromData[0].lat};${toData[0].lon},${toData[0].lat}?overview=false`
        );
        const routeData = await routeResponse.json();

        if (routeData.routes && routeData.routes.length > 0) {
          const distanceKm = Math.round(routeData.routes[0].distance / 1000);
          return `${distanceKm} km`;
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching distance:', error);
      return null;
    }
  };

  // Handle city selection
  const handleCitySelect = async (city: string) => {
    const updatedRoute = { ...newRoute };

    if (cityPickerField === 'from') {
      updatedRoute.from = city;
    } else {
      updatedRoute.to = city;
    }

    setNewRoute(updatedRoute);

    if (updatedRoute.from && updatedRoute.to) {
      try {
        setRouteLoading(true);
        const distance = await fetchDistanceFromOSM(updatedRoute.from, updatedRoute.to);
        if (distance) {
          setNewRoute(prev => ({ ...prev, distance }));
        }
      } catch (error) {
        console.error('Error fetching distance:', error);
      } finally {
        setRouteLoading(false);
      }
    }
  };

  // Add new route
  const handleAddRoute = async () => {
    if (!user) return;

    if (!newRoute.code || !newRoute.name || !newRoute.from || !newRoute.to ||
        !newRoute.distance || !newRoute.fare) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    const routeExists = routes.some(route =>
      route.code === newRoute.code.toUpperCase() &&
      route.transporterId === user.uid
    );

    if (routeExists) {
      Alert.alert('Error', `Route code ${newRoute.code.toUpperCase()} already exists`);
      return;
    }

    setRouteLoading(true);

    try {
      // ✅ Calculate duration from distance (rough estimate)
      let duration = '2h 0m';
      if (newRoute.distance) {
        const distanceNum = parseInt(newRoute.distance.replace(/[^0-9]/g, ''));
        if (!isNaN(distanceNum)) {
          const hours = Math.floor(distanceNum / 60);
          const minutes = Math.round((distanceNum % 60) * 0.6);
          duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        }
      }

      const routeData = {
        code: newRoute.code.toUpperCase(),
        name: newRoute.name,
        from: newRoute.from,
        to: newRoute.to,
        distance: newRoute.distance,
        duration: duration, // ✅ ADD THIS
        fare: parseInt(newRoute.fare) || 0,
        transporterId: user.uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore()
        .collection('routes')
        .add(routeData);

      Alert.alert(
        'Success',
        `Route ${newRoute.code.toUpperCase()} added successfully!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setRouteModalVisible(false);
              setNewRoute({ code: '', name: '', from: '', to: '', distance: '', fare: '' });
            }
          },
          {
            text: 'Schedule Now',
            onPress: () => {
              setRouteModalVisible(false);
              setNewRoute({ code: '', name: '', from: '', to: '', distance: '', fare: '' });
              navigation.navigate('ScheduleTripScreen', {
                mode: 'add',
                preSelectedRoute: routeData.code,
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error adding route:', error);
      Alert.alert('Error', 'Failed to add route. Please try again.');
    } finally {
      setRouteLoading(false);
    }
  };

  // Edit Trip handler
  const handleEditTrip = (trip: FirebaseTrip) => {
    navigation.navigate('ScheduleTripScreen', {
      mode: 'edit',
      trip: trip as any,
    });
  };

  // Track Trip handler
  const handleTrackTrip = (trip: FirebaseTrip) => {
    navigation.navigate('TripTrackingScreen', {
      tripId: trip.id,
      busId: trip.busId,
      busNumber: trip.busNumber,
      routeFrom: trip.from,
      routeTo: trip.to,
      departureTime: trip.departureTime,
      driverName: trip.driverName,
    });
  };

  // View Trip Details handler
  const handleViewTripDetails = (trip: FirebaseTrip) => {
    const { routeName, passengers, revenue } = getDisplayTrip(trip);
    const tripDate = formatTripDate(trip);
    const effectiveStatus = getEffectiveStatus(trip);
    const statusConfig = getStatusDisplay(effectiveStatus);

    Alert.alert(
      'Trip Details',
      `Route: ${routeName}\n` +
      `Date: ${tripDate}\n` +
      `Bus: ${trip.busNumber}\n` +
      `Driver: ${trip.driverName}\n` +
      `Time: ${trip.departureTime} - ${trip.arrivalTime}\n` +
      `Days: ${trip.days?.join(', ') || 'N/A'}\n` +
      `Status: ${statusConfig.icon} ${statusConfig.label}\n` +
      `Seats: ${trip.availableSeats || 0}/${trip.totalSeats || 0}\n` +
      `Passengers: ${passengers}\n` +
      `Fare: PKR ${trip.fare || 0}\n` +
      `Revenue: PKR ${revenue.toLocaleString()}`,
      [
        { text: 'OK' },
        { text: 'Edit', onPress: () => handleEditTrip(trip) }
      ]
    );
  };

  // ✅ Render trip card with new status display
  const renderTripCard = ({ item }: { item: FirebaseTrip }) => {
    const { routeName, routeCode, passengers, revenue } = getDisplayTrip(item);
    const effectiveStatus = getEffectiveStatus(item);
    const statusConfig = getStatusDisplay(effectiveStatus);
    const tripDate = formatTripDate(item);
    const isToday = isTripToday(item);

    // Check if trip can be tracked (scheduled or in_progress, and today)
    const canTrack = isToday &&
      (effectiveStatus === TRIP_STATUS.SCHEDULED || effectiveStatus === TRIP_STATUS.IN_PROGRESS);

    return (
      <TouchableOpacity
        style={[styles.tripCard, SHADOWS.medium]}
        onPress={() => handleViewTripDetails(item)}
        activeOpacity={0.7}
      >
        {/* Header with Route Info and Status */}
        <View style={styles.tripHeader}>
          <View style={styles.tripTitleContainer}>
            <Text style={styles.tripRoute}>{routeName}</Text>
            <Text style={styles.tripCode}>{routeCode}</Text>
            <Text style={styles.tripDate}>📅 {tripDate}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
            <Text style={styles.statusText}>
              {statusConfig.icon} {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Essential Trip Details */}
        <View style={styles.tripDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>🚌 Bus:</Text>
            <Text style={styles.detailValue}>{item.busNumber}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>👤 Driver:</Text>
            <Text style={styles.detailValue}>{item.driverName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>⏰ Time:</Text>
            <Text style={styles.detailValue}>{item.departureTime} - {item.arrivalTime}</Text>
          </View>
        </View>

        {/* Simplified Footer with Key Stats */}
        <View style={styles.tripFooter}>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Seats</Text>
            <Text style={styles.footerValue}>
              {item.availableSeats || 0}/{item.totalSeats || 0}
            </Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Passengers</Text>
            <Text style={styles.footerValue}>{passengers}</Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Revenue</Text>
            <Text style={styles.footerValue}>
              PKR {revenue.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.tripActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleEditTrip(item);
            }}
          >
            <Text style={styles.actionButtonText}>✏️ Edit</Text>
          </TouchableOpacity>

          {canTrack ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.trackButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleTrackTrip(item);
              }}
            >
              <Text style={[styles.actionButtonText, styles.trackButtonText]}>📍 Track</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.actionButton, styles.trackButtonDisabled]}>
              <Text style={[styles.actionButtonText, styles.trackButtonTextDisabled]}>📍 Track</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render Route Card
  const renderRouteCard = ({ item }: { item: Route }) => (
    <View style={[styles.routeCard, SHADOWS.medium]}>
      <View style={styles.routeHeader}>
        <Text style={styles.routeCode}>{item.code}</Text>
        <Text style={styles.routeFare}>PKR {item.fare}</Text>
      </View>
      <Text style={styles.routeName}>{item.name}</Text>
      {item.from && item.to && (
        <Text style={styles.routePath}>{item.from} → {item.to}</Text>
      )}
      <View style={styles.routeDetails}>
        <View style={styles.routeDetail}>
          <Text style={styles.routeDetailIcon}>📏</Text>
          <Text style={styles.routeDetailText}>{item.distance}</Text>
        </View>
        <View style={styles.routeDetail}>
          <Text style={styles.routeDetailIcon}>⏱️</Text>
          <Text style={styles.routeDetailText}>{item.duration || '2h 0m'}</Text>
        </View>
        <View style={styles.routeDetail}>
          <Text style={styles.routeDetailIcon}>💰</Text>
          <Text style={styles.routeDetailText}>Fixed Fare</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.useRouteButton}
        onPress={() => {
          navigation.navigate('ScheduleTripScreen', {
            mode: 'add',
            preSelectedRoute: item.code,
          });
        }}
      >
        <Text style={styles.useRouteButtonText}>Use This Route</Text>
      </TouchableOpacity>
    </View>
  );

  // Render Empty State
  const renderEmptyState = (type: string) => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📅</Text>
      <Text style={styles.emptyStateText}>
        {type === 'trips' ? 'No trips found' : 'No routes found'}
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={type === 'trips' ? handleScheduleTrip : handleCreateRoute}
      >
        <Text style={styles.emptyStateButtonText}>
          {type === 'trips' ? 'Schedule a Trip' : 'Create a Route'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render Stats Header
  const renderStatsHeader = () => (
    <View style={styles.statsContainer}>
      <TouchableOpacity
        style={styles.statCard}
        onPress={() => setActiveTab('schedule')}
        activeOpacity={0.7}
      >
        <Text style={styles.statValue}>{stats.inProgressTrips}</Text>
        <Text style={styles.statLabel}>In Progress</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.statCard}
        onPress={() => setActiveTab('today')}
        activeOpacity={0.7}
      >
        <Text style={styles.statValue}>{stats.todayTrips}</Text>
        <Text style={styles.statLabel}>Today's Trips</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.statCard}
        onPress={() => Alert.alert('Scheduled', `${stats.scheduledTrips} trips scheduled`)}
        activeOpacity={0.7}
      >
        <Text style={styles.statValue}>{stats.scheduledTrips}</Text>
        <Text style={styles.statLabel}>Scheduled</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.statCard}
        onPress={() => Alert.alert('Revenue', `Total: PKR ${stats.totalRevenue.toLocaleString()}`)}
        activeOpacity={0.7}
      >
        <Text style={styles.statValue}>PKR {(stats.totalRevenue / 1000).toFixed(1)}K</Text>
        <Text style={styles.statLabel}>Revenue</Text>
      </TouchableOpacity>
    </View>
  );

  // Render Route Modal
  const renderRouteModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={routeModalVisible}
      onRequestClose={() => setRouteModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>Add New Route</Text>

            <TextInput
              style={styles.input}
              placeholder="Route Code (e.g., RT-001)"
              value={newRoute.code}
              onChangeText={(text) => setNewRoute({...newRoute, code: text})}
              autoCapitalize="characters"
              editable={!routeLoading}
            />

            <TextInput
              style={styles.input}
              placeholder="Route Name (e.g., Lahore-Islamabad Express)"
              value={newRoute.name}
              onChangeText={(text) => setNewRoute({...newRoute, name: text})}
              editable={!routeLoading}
            />

            <TouchableOpacity
              style={styles.cityPickerButton}
              onPress={() => openCityPicker('from')}
              disabled={routeLoading}
            >
              <Text style={styles.cityPickerLabel}>From:</Text>
              <Text style={[styles.cityPickerValue, !newRoute.from && styles.placeholderText]}>
                {newRoute.from || 'Select city...'}
              </Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cityPickerButton}
              onPress={() => openCityPicker('to')}
              disabled={routeLoading}
            >
              <Text style={styles.cityPickerLabel}>To:</Text>
              <Text style={[styles.cityPickerValue, !newRoute.to && styles.placeholderText]}>
                {newRoute.to || 'Select city...'}
              </Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>

            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Distance (auto-fetched)"
                value={newRoute.distance}
                editable={false}
                placeholderTextColor={COLORS.textLight}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Fare (PKR)"
                value={newRoute.fare}
                onChangeText={(text) => setNewRoute({...newRoute, fare: text})}
                keyboardType="numeric"
                editable={!routeLoading}
              />
            </View>

            {routeLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingOverlayText}>Fetching distance...</Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setRouteModalVisible(false);
                  setNewRoute({ code: '', name: '', from: '', to: '', distance: '', fare: '' });
                }}
                disabled={routeLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddRoute}
                disabled={routeLoading}
              >
                {routeLoading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Add Route</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading && trips.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading operations...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CityPickerModal
        visible={cityPickerVisible}
        onClose={() => setCityPickerVisible(false)}
        onSelect={handleCitySelect}
        title={`Select ${cityPickerField === 'from' ? 'Departure' : 'Destination'} City`}
        selectedCity={cityPickerField === 'from' ? newRoute.from : newRoute.to}
      />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>📅 Operations</Text>
          <Text style={styles.subtitle}>{transporterName}</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleScheduleTrip}
          >
            <Text style={styles.headerButtonText}>➕ Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleCreateRoute}
          >
            <Text style={styles.headerButtonText}>🛣️ Route</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderStatsHeader()}

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'schedule' && styles.tabActive]}
          onPress={() => setActiveTab('schedule')}
        >
          <Text style={[styles.tabText, activeTab === 'schedule' && styles.tabTextActive]}>
            📅 All Trips
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'routes' && styles.tabActive]}
          onPress={() => setActiveTab('routes')}
        >
          <Text style={[styles.tabText, activeTab === 'routes' && styles.tabTextActive]}>
            🛣️ Routes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'today' && styles.tabActive]}
          onPress={() => setActiveTab('today')}
        >
          <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>
            🎯 Today
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'schedule' && (
        <FlatList
          data={trips}
          renderItem={renderTripCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListHeaderComponent={<Text style={styles.sectionTitle}>All Trips</Text>}
          ListEmptyComponent={renderEmptyState('trips')}
        />
      )}

      {activeTab === 'routes' && (
        <FlatList
          data={routes}
          renderItem={renderRouteCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListHeaderComponent={<Text style={styles.sectionTitle}>Available Routes</Text>}
          ListEmptyComponent={renderEmptyState('routes')}
        />
      )}

      {activeTab === 'today' && (
        <FlatList
          data={todayTrips}
          renderItem={renderTripCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListHeaderComponent={
            <>
              <Text style={styles.sectionTitle}>Today's Schedule</Text>
              <Text style={styles.todayDate}>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </>
          }
          ListEmptyComponent={renderEmptyState('trips')}
        />
      )}

      {renderRouteModal()}
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
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.lg,
    backgroundColor: COLORS.primary,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.greyLight,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    marginTop: SIZES.md,
  },
  headerButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.xs,
    marginRight: SIZES.sm,
  },
  headerButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.white,
    marginBottom: 1,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SIZES.sm,
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: SIZES.xs,
  },
  tabActive: {
    backgroundColor: COLORS.secondary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  listContainer: {
    paddingHorizontal: SIZES.md,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SIZES.xs,
    marginTop: SIZES.xs,
  },
  todayDate: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SIZES.md,
  },
  tripCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  tripTitleContainer: {
    flex: 1,
    marginRight: SIZES.sm,
  },
  tripRoute: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  tripCode: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  tripDate: {
    fontSize: 12,
    color: COLORS.info,
    marginTop: 4,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  tripDetails: {
    marginBottom: SIZES.sm,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    width: 70,
  },
  detailValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom: SIZES.sm,
  },
  footerItem: {
    alignItems: 'center',
    flex: 1,
  },
  footerLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  tripActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SIZES.xs,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SIZES.xs,
    alignItems: 'center',
    borderRadius: SIZES.xs,
    backgroundColor: COLORS.greyLight,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  trackButton: {
    backgroundColor: '#E3F2FD',
  },
  trackButtonText: {
    color: COLORS.info,
  },
  trackButtonDisabled: {
    backgroundColor: '#F5F5F5',
    opacity: 0.5,
  },
  trackButtonTextDisabled: {
    color: COLORS.textLight,
  },
  routeCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
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
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 2,
  },
  routePath: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: SIZES.sm,
  },
  routeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SIZES.md,
  },
  routeDetail: {
    alignItems: 'center',
    flex: 1,
  },
  routeDetailIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  routeDetailText: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  useRouteButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.xs,
    alignItems: 'center',
  },
  useRouteButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    padding: SIZES.xxxl,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: SIZES.md,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.lg,
    borderTopRightRadius: SIZES.lg,
    padding: SIZES.lg,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SIZES.lg,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    padding: SIZES.sm,
    fontSize: 15,
    marginBottom: SIZES.sm,
    backgroundColor: COLORS.white,
    color: COLORS.text,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SIZES.lg,
    paddingBottom: SIZES.lg,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.xs,
    alignItems: 'center',
    marginHorizontal: SIZES.xs,
  },
  cancelButton: {
    backgroundColor: COLORS.greyLight,
  },
  saveButton: {
    backgroundColor: COLORS.secondary,
  },
  cancelButtonText: {
    color: COLORS.textLight,
    fontWeight: '600',
    fontSize: 15,
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 15,
  },
  cityPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    padding: SIZES.sm,
    marginBottom: SIZES.sm,
    backgroundColor: COLORS.white,
  },
  cityPickerLabel: {
    fontSize: 15,
    color: COLORS.textLight,
    marginRight: SIZES.xs,
    fontWeight: '500',
  },
  cityPickerValue: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  placeholderText: {
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  dropdownIcon: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  cityPickerContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.lg,
    borderTopRightRadius: SIZES.lg,
    paddingTop: SIZES.lg,
    maxHeight: '80%',
  },
  cityPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cityPickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  closeButton: {
    padding: SIZES.xs,
  },
  closeButtonText: {
    fontSize: 20,
    color: COLORS.textLight,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greyLight,
    marginHorizontal: SIZES.md,
    marginVertical: SIZES.sm,
    paddingHorizontal: SIZES.sm,
    borderRadius: SIZES.xs,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: SIZES.xs,
    color: COLORS.textLight,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SIZES.sm,
    fontSize: 15,
    color: COLORS.text,
  },
  cityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cityItemSelected: {
    backgroundColor: COLORS.secondary + '20',
  },
  cityItemText: {
    fontSize: 16,
    color: COLORS.text,
  },
  cityItemTextSelected: {
    color: COLORS.secondary,
    fontWeight: '600',
  },
  checkIcon: {
    fontSize: 18,
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  emptyCityList: {
    padding: SIZES.xl,
    alignItems: 'center',
  },
  emptyCityText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  loadingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SIZES.sm,
    padding: SIZES.sm,
    backgroundColor: COLORS.greyLight,
    borderRadius: SIZES.xs,
  },
  loadingOverlayText: {
    marginLeft: SIZES.sm,
    fontSize: 14,
    color: COLORS.primary,
  },
});

export default OperationsScreen;
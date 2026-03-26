// src/screens/driver/RouteScreen.tsx - FIXED (Critical Issues Only)
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
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Platform,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Geolocation from '@react-native-community/geolocation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

interface RouteScreenProps {
  navigation: DrawerNavigationProp<RootDrawerParamList, 'Route'>;
  route?: any;
}

interface TripData {
  id: string;
  routeName: string;
  routeCode: string;
  busNumber: string;
  busId: string;
  startLocation: string;
  endLocation: string;
  departureTime: string;
  arrivalTime: string;
  totalDistance: number;
  distanceCovered: number;
  status: 'SCHEDULED' | 'BOARDING' | 'IN_PROGRESS' | 'COMPLETED';
  startedAt?: any;
  completedAt?: any;
  boardedSeats: number;
  totalSeats: number;
}

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  area?: string;
  timestamp: Date;
}

const RouteScreen: React.FC<RouteScreenProps> = ({ navigation, route }) => {
  const user = auth().currentUser;
  const tripIdFromParams = route?.params?.tripId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }));
  const [isTracking, setIsTracking] = useState(false);
  const [passengerCount, setPassengerCount] = useState(0);
  const [totalPassengers, setTotalPassengers] = useState(0);

  // Refs
  const locationIntervalRef = useRef<NodeJS.Timeout>();
  const unsubscribeRefs = useRef<(() => void)[]>([]);
  const isTrackingRef = useRef(false);
  const lastLocationRef = useRef<LocationData | null>(null);
  const tripDataRef = useRef<TripData | null>(null);
  tripDataRef.current = tripData;

  // ✅ FIX: Counter for controlled Firestore writes
  let locationSaveCounter = 0;

  // ✅ FIX: Last saved timestamp for throttling
  let lastSavedTimestamp = 0;

  // ✅ FIX: Normalize trip status helper
  const normalizeStatus = (status: string): TripData['status'] => {
    switch (status) {
      case 'in_progress':
      case 'in-progress':
      case 'active':
        return 'IN_PROGRESS';
      case 'boarding':
        return 'BOARDING';
      case 'completed':
        return 'COMPLETED';
      default:
        return 'SCHEDULED';
    }
  };

  // Request location permission
  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to track your trip.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else {
      return new Promise((resolve) => {
        Geolocation.requestAuthorization(() => resolve(true), () => resolve(false));
      });
    }
  };

  // Get current location with error handling
  const getCurrentLocation = useCallback((): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: new Date(),
          };
          resolve(location);
        },
        (error) => {
          console.error('Location error:', error);
          if (error.code === 2) {
            Alert.alert(
              'Location Services Disabled',
              'Your device location is turned off. Please enable it in settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
              ]
            );
          } else if (error.code === 3) {
            Alert.alert('Location Timeout', 'Unable to get location. Please try again later.');
          } else if (error.code === 1) {
            Alert.alert('Permission Denied', 'Location permission was denied. Please grant it in settings.');
          } else {
            Alert.alert('Location Error', error.message || 'Failed to get location.');
          }
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  }, []);

  // Haversine distance in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Start location tracking with distance filter and throttled Firestore updates
  const startLocationTracking = useCallback(async () => {
    if (isTrackingRef.current) return true;

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Cannot track location without permission.');
      return false;
    }

    try {
      const location = await getCurrentLocation();
      lastLocationRef.current = location;
      setCurrentLocation(location);
      setLocationHistory(prev => [...prev.slice(-50), location]);

      // Save initial location
      const trip = tripDataRef.current;
      if (user && trip) {
        await firestore().collection('driver_locations').add({
          driverId: user.uid,
          tripId: trip.id,
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: firestore.FieldValue.serverTimestamp(),
        });
      }

      isTrackingRef.current = true;
      setIsTracking(true);

      // ✅ FIX: Use interval with distance filter and throttled writes
      locationIntervalRef.current = setInterval(async () => {
        try {
          const newLocation = await getCurrentLocation();
          const prevLocation = lastLocationRef.current;
          lastLocationRef.current = newLocation;
          setCurrentLocation(newLocation);
          setLocationHistory(prev => [...prev.slice(-50), newLocation]);

          const trip = tripDataRef.current;
          if (user && trip && prevLocation) {
            // Calculate distance
            const distance = calculateDistance(
              prevLocation.latitude, prevLocation.longitude,
              newLocation.latitude, newLocation.longitude
            );

            // ✅ FIX: Only update if distance > 0.05 km (50 meters) to reduce writes and battery
            if (distance > 0.05) {
              // Update local state
              setTripData(prev => prev ? {
                ...prev,
                distanceCovered: prev.distanceCovered + distance
              } : null);

              // ✅ FIX: Persist to Firestore (atomic increment)
              await firestore().collection('trips').doc(trip.id).update({
                distanceCovered: firestore.FieldValue.increment(distance)
              });
            }

            // ✅ FIX: Throttled Firestore location writes (every 3rd update)
            locationSaveCounter++;
            if (locationSaveCounter % 3 === 0) {
              await firestore().collection('driver_locations').add({
                driverId: user.uid,
                tripId: trip.id,
                latitude: newLocation.latitude,
                longitude: newLocation.longitude,
                timestamp: firestore.FieldValue.serverTimestamp(),
              });
            }

            // ✅ FIX: Time‑based throttling (every 30 seconds) as fallback
            const now = Date.now();
            if (now - lastSavedTimestamp > 30000) {
              lastSavedTimestamp = now;
              await firestore().collection('driver_locations').add({
                driverId: user.uid,
                tripId: trip.id,
                latitude: newLocation.latitude,
                longitude: newLocation.longitude,
                timestamp: firestore.FieldValue.serverTimestamp(),
              });
            }
          }
        } catch (error) {
          console.error('Interval location error:', error);
        }
      }, 15000); // ✅ FIX: Increase interval to 15 seconds for battery efficiency

      return true;
    } catch (error) {
      console.error('Failed to start location tracking:', error);
      Alert.alert('Location Error', 'Could not get initial location. Tracking may not work.');
      return false;
    }
  }, [user, getCurrentLocation]);

  // Stop location tracking
  const stopLocationTracking = useCallback(() => {
    isTrackingRef.current = false;
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = undefined;
    }
    setIsTracking(false);
  }, []);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Request permission on mount
  useEffect(() => {
    const initPermissions = async () => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Location permission is needed to track your trip. Please grant it in settings.',
          [{ text: 'OK', onPress: () => Linking.openSettings() }]
        );
      }
    };
    initPermissions();
  }, []);

  // Fetch trip data (with fixed status mapping)
  useEffect(() => {
    if (!user) return;

    const fetchTripData = async () => {
      try {
        setLoading(true);

        let tripQuery;
        if (tripIdFromParams) {
          tripQuery = firestore().collection('trips').doc(tripIdFromParams);
        } else {
          tripQuery = firestore()
            .collection('trips')
            .where('driverId', '==', user.uid)
            .where('status', 'in', ['BOARDING', 'IN_PROGRESS', 'in-progress'])
            .limit(1);
        }

        // ✅ FIX: Clean up old listeners before adding new ones
        unsubscribeRefs.current.forEach(unsub => unsub());
        unsubscribeRefs.current = [];

        if (tripIdFromParams) {
          const unsubscribeTrip = (tripQuery as firestore.DocumentReference).onSnapshot(
            (doc) => {
              if (doc.exists) {
                const data = doc.data();
                const newTripData: TripData = {
                  id: doc.id,
                  routeName: data?.routeName || 'Lahore to Islamabad',
                  routeCode: data?.routeCode || 'RT-001',
                  busNumber: data?.busNumber || 'B-001',
                  busId: data?.busId || '',
                  startLocation: data?.startLocation || data?.from || 'Lahore',
                  endLocation: data?.endLocation || data?.to || 'Islamabad',
                  departureTime: data?.departureTime || '10:00',
                  arrivalTime: data?.arrivalTime || '14:00',
                  totalDistance: data?.totalDistance || 380,
                  distanceCovered: data?.distanceCovered || 0,
                  // ✅ FIX: Use normalized status
                  status: normalizeStatus(data?.status),
                  startedAt: data?.startedAt,
                  completedAt: data?.completedAt,
                  boardedSeats: data?.boardedSeats || 0,
                  totalSeats: data?.totalSeats || 40,
                };
                setTripData(newTripData);
                tripDataRef.current = newTripData;

                const isInProgress = newTripData.status === 'IN_PROGRESS';
                if (isInProgress && !isTrackingRef.current) {
                  startLocationTracking();
                }
              } else {
                Alert.alert('Error', 'Trip not found');
                navigation.goBack();
              }
              setLoading(false);
              setRefreshing(false);
            },
            (error) => {
              console.error('Error fetching trip:', error);
              setLoading(false);
              setRefreshing(false);
            }
          );
          unsubscribeRefs.current.push(unsubscribeTrip);

          const unsubscribeBookings = firestore()
            .collection('bookings')
            .where('tripId', '==', tripIdFromParams)
            .where('boardingStatus', '==', 'boarded')
            .onSnapshot(snapshot => setPassengerCount(snapshot.size));
          unsubscribeRefs.current.push(unsubscribeBookings);

          const unsubscribeTotal = firestore()
            .collection('bookings')
            .where('tripId', '==', tripIdFromParams)
            .onSnapshot(snapshot => setTotalPassengers(snapshot.size));
          unsubscribeRefs.current.push(unsubscribeTotal);

        } else {
          const unsubscribeTrip = (tripQuery as firestore.Query).onSnapshot(
            (snapshot) => {
              if (!snapshot.empty) {
                const tripDoc = snapshot.docs[0];
                const data = tripDoc.data();
                const newTripData: TripData = {
                  id: tripDoc.id,
                  routeName: data?.routeName || 'Lahore to Islamabad',
                  routeCode: data?.routeCode || 'RT-001',
                  busNumber: data?.busNumber || 'B-001',
                  busId: data?.busId || '',
                  startLocation: data?.startLocation || data?.from || 'Lahore',
                  endLocation: data?.endLocation || data?.to || 'Islamabad',
                  departureTime: data?.departureTime || '10:00',
                  arrivalTime: data?.arrivalTime || '14:00',
                  totalDistance: data?.totalDistance || 380,
                  distanceCovered: data?.distanceCovered || 0,
                  status: normalizeStatus(data?.status),
                  startedAt: data?.startedAt,
                  completedAt: data?.completedAt,
                  boardedSeats: data?.boardedSeats || 0,
                  totalSeats: data?.totalSeats || 40,
                };
                setTripData(newTripData);
                tripDataRef.current = newTripData;

                const isInProgress = newTripData.status === 'IN_PROGRESS';
                if (isInProgress && !isTrackingRef.current) {
                  startLocationTracking();
                }

                const unsubscribeBookings = firestore()
                  .collection('bookings')
                  .where('tripId', '==', tripDoc.id)
                  .where('boardingStatus', '==', 'boarded')
                  .onSnapshot(snapshot => setPassengerCount(snapshot.size));
                unsubscribeRefs.current.push(unsubscribeBookings);

                const unsubscribeTotal = firestore()
                  .collection('bookings')
                  .where('tripId', '==', tripDoc.id)
                  .onSnapshot(snapshot => setTotalPassengers(snapshot.size));
                unsubscribeRefs.current.push(unsubscribeTotal);
              } else {
                Alert.alert(
                  'No Active Trip',
                  'You don\'t have any active trip.',
                  [{ text: 'Go to Dashboard', onPress: () => navigation.navigate('Main') }]
                );
              }
              setLoading(false);
              setRefreshing(false);
            },
            (error) => {
              console.error('Error fetching trip:', error);
              setLoading(false);
              setRefreshing(false);
            }
          );
          unsubscribeRefs.current.push(unsubscribeTrip);
        }
      } catch (error) {
        console.error('Error:', error);
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchTripData();

    return () => {
      stopLocationTracking();
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
      unsubscribeRefs.current = [];
    };
  }, [user, tripIdFromParams, startLocationTracking, stopLocationTracking, navigation]);

  // ... (rest of the component: handleEndTrip, handleReportDelay, handleEmergency, render functions remain unchanged)

  // NOTE: The following functions and render methods are identical to the original,
  // except the status mapping is now handled by normalizeStatus() in the data loading.
  // I'll keep them as they were to maintain UI consistency.

  const handleEndTrip = async () => {
    if (!tripData) return;

    Alert.alert(
      'End Trip',
      'Are you sure you want to end this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Trip',
          onPress: async () => {
            try {
              stopLocationTracking();

              await firestore()
                .collection('trips')
                .doc(tripData.id)
                .update({
                  status: 'COMPLETED',
                  completedAt: firestore.FieldValue.serverTimestamp(),
                  finalDistance: tripData.distanceCovered,
                });

              await firestore()
                .collection('drivers')
                .doc(user?.uid)
                .update({
                  status: 'online',
                  currentTripId: firestore.FieldValue.delete(),
                  lastTripEnded: firestore.FieldValue.serverTimestamp(),
                });

              Alert.alert(
                'Trip Completed',
                'Trip has been completed successfully.',
                [{ text: 'OK', onPress: () => navigation.navigate('Main') }]
              );
            } catch (error) {
              console.error('Error ending trip:', error);
              Alert.alert('Error', 'Failed to end trip. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleReportDelay = () => {
    if (!tripData) return;

    Alert.alert(
      'Report Delay',
      'Select delay reason:',
      [
        {
          text: 'Traffic Congestion',
          onPress: async () => {
            try {
              await firestore().collection('delays').add({
                tripId: tripData.id,
                driverId: user?.uid,
                busId: tripData.busId,
                routeName: tripData.routeName,
                reason: 'Traffic Congestion',
                delayMinutes: 15,
                currentLocation: currentLocation ? `${currentLocation.latitude},${currentLocation.longitude}` : null,
                timestamp: firestore.FieldValue.serverTimestamp(),
                status: 'active',
              });
              Alert.alert('Delay Reported', 'Traffic delay reported to passengers and dispatcher.');
            } catch (error) {
              console.error('Error reporting delay:', error);
              Alert.alert('Error', 'Failed to report delay.');
            }
          }
        },
        {
          text: 'Weather Conditions',
          onPress: async () => {
            try {
              await firestore().collection('delays').add({
                tripId: tripData.id,
                driverId: user?.uid,
                busId: tripData.busId,
                routeName: tripData.routeName,
                reason: 'Weather Conditions',
                delayMinutes: 10,
                currentLocation: currentLocation ? `${currentLocation.latitude},${currentLocation.longitude}` : null,
                timestamp: firestore.FieldValue.serverTimestamp(),
                status: 'active',
              });
              Alert.alert('Delay Reported', 'Weather delay reported.');
            } catch (error) {
              console.error('Error reporting delay:', error);
              Alert.alert('Error', 'Failed to report delay.');
            }
          }
        },
        {
          text: 'Mechanical Issue',
          onPress: async () => {
            try {
              await firestore().collection('delays').add({
                tripId: tripData.id,
                driverId: user?.uid,
                busId: tripData.busId,
                routeName: tripData.routeName,
                reason: 'Mechanical Issue',
                delayMinutes: 30,
                currentLocation: currentLocation ? `${currentLocation.latitude},${currentLocation.longitude}` : null,
                timestamp: firestore.FieldValue.serverTimestamp(),
                status: 'active',
                requiresMaintenance: true,
              });
              Alert.alert('Mechanical Issue Reported', 'Maintenance team notified.');
            } catch (error) {
              console.error('Error reporting mechanical issue:', error);
              Alert.alert('Error', 'Failed to report issue.');
            }
          }
        },
        {
          text: 'Heavy Boarding',
          onPress: async () => {
            try {
              await firestore().collection('delays').add({
                tripId: tripData.id,
                driverId: user?.uid,
                busId: tripData.busId,
                routeName: tripData.routeName,
                reason: 'Heavy Boarding',
                delayMinutes: 5,
                currentLocation: currentLocation ? `${currentLocation.latitude},${currentLocation.longitude}` : null,
                timestamp: firestore.FieldValue.serverTimestamp(),
                status: 'active',
              });
              Alert.alert('Delay Reported', 'Delay due to heavy boarding reported.');
            } catch (error) {
              console.error('Error reporting delay:', error);
              Alert.alert('Error', 'Failed to report delay.');
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleEmergency = () => {
    Alert.alert(
      '🚨 EMERGENCY',
      'This will contact emergency services and notify dispatcher. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Emergency',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore().collection('emergencies').add({
                tripId: tripData?.id,
                driverId: user?.uid,
                busId: tripData?.busId,
                location: currentLocation ? `${currentLocation.latitude},${currentLocation.longitude}` : null,
                timestamp: firestore.FieldValue.serverTimestamp(),
                status: 'active',
              });
              navigation.navigate('Emergency');
            } catch (error) {
              console.error('Error reporting emergency:', error);
              navigation.navigate('Emergency');
            }
          }
        }
      ]
    );
  };

  const calculateProgress = (): number => {
    if (!tripData || tripData.totalDistance === 0) return 0;
    return (tripData.distanceCovered / tripData.totalDistance) * 100;
  };

  const calculateETA = (): string => {
    if (!tripData) return '--:--';
    const progress = calculateProgress();
    if (progress <= 0) return tripData.arrivalTime;
    const remainingDistance = tripData.totalDistance - tripData.distanceCovered;
    const avgSpeed = 60; // km/h
    const remainingHours = remainingDistance / avgSpeed;
    const remainingMinutes = Math.round(remainingHours * 60);
    const now = new Date();
    const eta = new Date(now.getTime() + remainingMinutes * 60000);
    return eta.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading trip data...</Text>
      </SafeAreaView>
    );
  }

  const progress = calculateProgress();
  const eta = calculateETA();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1A237E" barStyle="light-content" />

      <View style={styles.topBar}>
        <View>
          <Text style={styles.routeTitle}>{tripData?.routeName}</Text>
          <Text style={styles.routeSubtitle}>
            {tripData?.routeCode} • Bus: {tripData?.busNumber}
          </Text>
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.currentTime}>{currentTime}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Current Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 CURRENT LOCATION</Text>
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <Text style={styles.locationCity}>
                {currentLocation ? 'Location Received' : 'Waiting for location...'}
              </Text>
              <View style={[styles.trackingBadge, { backgroundColor: isTracking ? '#4CAF50' : '#FF9800' }]}>
                <Text style={styles.trackingBadgeText}>{isTracking ? 'LIVE' : 'PAUSED'}</Text>
              </View>
            </View>
            {currentLocation && (
              <>
                <Text style={styles.locationArea}>
                  Lat: {currentLocation.latitude.toFixed(6)}, Lng: {currentLocation.longitude.toFixed(6)}
                </Text>
                <Text style={styles.locationTimestamp}>
                  Last updated: {currentLocation.timestamp.toLocaleTimeString()}
                </Text>
              </>
            )}
            {!currentLocation && (
              <Text style={styles.locationWaiting}>Waiting for GPS signal...</Text>
            )}
          </View>
        </View>

        {/* Trip Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚌 TRIP INFORMATION</Text>
          <View style={styles.tripInfoCard}>
            <View style={styles.tripRow}>
              <View style={styles.tripPoint}>
                <Text style={styles.tripPointLabel}>FROM</Text>
                <Text style={styles.tripPointValue}>{tripData?.startLocation}</Text>
                <Text style={styles.tripPointTime}>{tripData?.departureTime}</Text>
              </View>
              <View style={styles.tripArrow}>
                <Text style={styles.tripArrowText}>→</Text>
              </View>
              <View style={styles.tripPoint}>
                <Text style={styles.tripPointLabel}>TO</Text>
                <Text style={styles.tripPointValue}>{tripData?.endLocation}</Text>
                <Text style={styles.tripPointTime}>{eta}</Text>
              </View>
            </View>
            <View style={styles.tripStats}>
              <View style={styles.tripStat}>
                <Text style={styles.tripStatValue}>{passengerCount}</Text>
                <Text style={styles.tripStatLabel}>Boarded</Text>
              </View>
              <View style={styles.tripStat}>
                <Text style={styles.tripStatValue}>{totalPassengers}</Text>
                <Text style={styles.tripStatLabel}>Total</Text>
              </View>
              <View style={styles.tripStat}>
                <Text style={styles.tripStatValue}>{Math.round(tripData?.distanceCovered || 0)} km</Text>
                <Text style={styles.tripStatLabel}>Covered</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 TRIP PROGRESS</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
              <Text style={styles.progressEta}>ETA: {eta}</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>{tripData?.startLocation}</Text>
                <Text style={styles.progressLabel}>{tripData?.endLocation}</Text>
              </View>
            </View>
            <View style={styles.distanceStats}>
              <View style={styles.distanceItem}>
                <Text style={styles.distanceValue}>{Math.round(tripData?.distanceCovered || 0)} km</Text>
                <Text style={styles.distanceLabel}>Covered</Text>
              </View>
              <View style={styles.distanceDivider} />
              <View style={styles.distanceItem}>
                <Text style={styles.distanceValue}>
                  {Math.round((tripData?.totalDistance || 0) - (tripData?.distanceCovered || 0))} km
                </Text>
                <Text style={styles.distanceLabel}>Remaining</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={[styles.actionButton, styles.delayButton]} onPress={handleReportDelay}>
            <Text style={styles.delayButtonText}>⏰ REPORT DELAY</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.endTripButton]} onPress={handleEndTrip}>
            <Text style={styles.endTripButtonText}>🏁 END TRIP</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.tripId}>Trip ID: {tripData?.id?.slice(0, 8)}...</Text>
      </ScrollView>

      {/* Floating Emergency Button */}
      <TouchableOpacity style={styles.floatingEmergencyButton} onPress={handleEmergency} activeOpacity={0.8}>
        <View style={styles.emergencyButtonInner}>
          <Text style={styles.emergencyButtonEmoji}>🚨</Text>
          <Text style={styles.emergencyButtonText}>EMERGENCY</Text>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// Styles remain unchanged (same as original)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#4A90E2' },
  topBar: { backgroundColor: '#1A237E', paddingHorizontal: 20, paddingVertical: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routeTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  routeSubtitle: { fontSize: 14, color: '#E3F2FD', marginTop: 2 },
  timeContainer: { alignItems: 'flex-end' },
  currentTime: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  scrollView: { flex: 1, paddingHorizontal: 16 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A237E', marginBottom: 12 },
  locationCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  locationCity: { fontSize: 20, fontWeight: 'bold', color: '#1A237E' },
  trackingBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  trackingBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  locationArea: { fontSize: 16, color: '#666666', marginBottom: 8 },
  locationTimestamp: { fontSize: 14, color: '#999999', marginBottom: 4 },
  locationWaiting: { fontSize: 14, color: '#FF9800', fontStyle: 'italic' },
  tripInfoCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tripRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  tripPoint: { flex: 1, alignItems: 'center' },
  tripPointLabel: { fontSize: 12, color: '#666666', marginBottom: 4 },
  tripPointValue: { fontSize: 16, fontWeight: 'bold', color: '#1A237E', marginBottom: 2 },
  tripPointTime: { fontSize: 14, color: '#4A90E2' },
  tripArrow: { width: 40, alignItems: 'center' },
  tripArrowText: { fontSize: 24, color: '#666666' },
  tripStats: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 16 },
  tripStat: { alignItems: 'center' },
  tripStatValue: { fontSize: 20, fontWeight: 'bold', color: '#1A237E', marginBottom: 4 },
  tripStatLabel: { fontSize: 12, color: '#666666' },
  progressCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  progressPercentage: { fontSize: 24, fontWeight: 'bold', color: '#4A90E2' },
  progressEta: { fontSize: 16, color: '#666666' },
  progressBarContainer: { marginBottom: 24 },
  progressBar: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#4A90E2', borderRadius: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 12, color: '#666666' },
  distanceStats: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  distanceItem: { flex: 1, alignItems: 'center' },
  distanceValue: { fontSize: 18, fontWeight: 'bold', color: '#1A237E', marginBottom: 4 },
  distanceLabel: { fontSize: 12, color: '#666666' },
  distanceDivider: { width: 1, height: 30, backgroundColor: '#E0E0E0' },
  actionsSection: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 16 },
  actionButton: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  delayButton: { backgroundColor: '#FF9800' },
  endTripButton: { backgroundColor: '#F44336' },
  delayButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  endTripButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  tripId: { fontSize: 12, color: '#999999', textAlign: 'center', marginBottom: 80 },
  floatingEmergencyButton: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#F44336', paddingVertical: 15, paddingHorizontal: 25, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10, zIndex: 1000, flexDirection: 'row', minWidth: 140 },
  emergencyButtonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  emergencyButtonEmoji: { fontSize: 24, marginRight: 10 },
  emergencyButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});

export default RouteScreen;
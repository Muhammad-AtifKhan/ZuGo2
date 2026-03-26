// src/screens/transporter/TripTrackingScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

interface LocationData {
  id: string;
  driverId: string;
  tripId: string;
  latitude: number;
  longitude: number;
  city?: string;
  area?: string;
  timestamp: any;
  speed?: number;
}

interface TripData {
  id: string;
  busNumber: string;
  routeName: string;
  driverName: string;
  driverId: string;
  departureTime: string;
  arrivalTime: string;
  from: string;
  to: string;
  status: string;
}

const TripTrackingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { tripId } = route.params as { tripId: string };

  const user = auth().currentUser;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Fetch trip details and locations
  useEffect(() => {
    if (!tripId) {
      setError('No trip ID provided');
      setLoading(false);
      return;
    }

    let unsubscribeTrip: (() => void) | undefined;
    let unsubscribeLocations: (() => void) | undefined;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Listen to trip details
        unsubscribeTrip = firestore()
          .collection('trips')
          .doc(tripId)
          .onSnapshot(
            (doc) => {
              if (doc.exists) {
                const data = doc.data();
                setTripData({
                  id: doc.id,
                  busNumber: data?.busNumber || 'N/A',
                  routeName: data?.routeName || 'Unknown Route',
                  driverName: data?.driverName || 'Unknown Driver',
                  driverId: data?.driverId || '',
                  departureTime: data?.departureTime || '--:--',
                  arrivalTime: data?.arrivalTime || '--:--',
                  from: data?.from || 'Unknown',
                  to: data?.to || 'Unknown',
                  status: data?.status || 'unknown',
                });
              } else {
                setError('Trip not found');
              }
            },
            (error) => {
              console.error('Error fetching trip:', error);
              setError('Failed to load trip details');
            }
          );

        // Listen to driver locations for this trip
        unsubscribeLocations = firestore()
          .collection('driver_locations')
          .where('tripId', '==', tripId)
          .orderBy('timestamp', 'desc')
          .limit(20)
          .onSnapshot(
            (snapshot) => {
              const locationsList: LocationData[] = [];
              snapshot.forEach(doc => {
                const data = doc.data();
                locationsList.push({
                  id: doc.id,
                  driverId: data.driverId,
                  tripId: data.tripId,
                  latitude: data.latitude,
                  longitude: data.longitude,
                  city: data.city || 'Unknown',
                  area: data.area,
                  timestamp: data.timestamp?.toDate?.() || new Date(),
                  speed: data.speed,
                });
              });

              setLocations(locationsList);

              // Set current location (most recent)
              if (locationsList.length > 0) {
                setCurrentLocation(locationsList[0]);
                const updateTime = locationsList[0].timestamp;
                setLastUpdate(updateTime.toLocaleTimeString());
              }

              setLoading(false);
              setRefreshing(false);
            },
            (error) => {
              console.error('Error fetching locations:', error);
              if (error.message?.includes('index')) {
                Alert.alert(
                  'Database Index Required',
                  'Please create the required index in Firebase Console:\n\n' +
                  'Collection: driver_locations\n' +
                  'Fields: tripId (Ascending), timestamp (Descending)',
                  [{ text: 'OK' }]
                );
              }
              setError('Failed to load location data');
              setLoading(false);
              setRefreshing(false);
            }
          );

      } catch (error) {
        console.error('Error in tracking screen:', error);
        setError('An unexpected error occurred');
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchData();

    // Cleanup listeners
    return () => {
      if (unsubscribeTrip) unsubscribeTrip();
      if (unsubscribeLocations) unsubscribeLocations();
    };
  }, [tripId]);

  const onRefresh = () => {
    setRefreshing(true);
    // Data will auto-refresh via listeners
  };

  const openInMaps = () => {
    if (!currentLocation) {
      Alert.alert('No Location', 'No location data available');
      return;
    }

    const { latitude, longitude } = currentLocation;
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

    Alert.alert(
      'Open in Maps',
      'Choose map application:',
      [
        { text: 'Google Maps', onPress: () => openLink(url) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const openLink = (url: string) => {
    // In a real app, you'd use Linking.openURL
    Alert.alert('Open URL', url);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active':
      case 'in-progress':
        return COLORS.success;
      case 'upcoming':
        return COLORS.info;
      case 'delayed':
        return COLORS.warning;
      case 'completed':
        return COLORS.purple;
      default:
        return COLORS.textLight;
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'active':
      case 'in-progress':
        return '🟢';
      case 'upcoming':
        return '🔵';
      case 'delayed':
        return '🟡';
      case 'completed':
        return '🟣';
      default:
        return '⚫';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading tracking data...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Icon name="error-outline" size={64} color={COLORS.danger} />
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Trip Tracking</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Trip Info Card */}
        {tripData && (
          <View style={[styles.card, SHADOWS.medium]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>🚌 Trip Details</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tripData.status) }]}>
                <Text style={styles.statusText}>
                  {getStatusIcon(tripData.status)} {tripData.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.tripInfo}>
              <View style={styles.infoRow}>
                <Icon name="route" size={20} color={COLORS.primary} />
                <Text style={styles.infoLabel}>Route:</Text>
                <Text style={styles.infoValue}>{tripData.routeName}</Text>
              </View>

              <View style={styles.infoRow}>
                <Icon name="directions-bus" size={20} color={COLORS.primary} />
                <Text style={styles.infoLabel}>Bus:</Text>
                <Text style={styles.infoValue}>{tripData.busNumber}</Text>
              </View>

              <View style={styles.infoRow}>
                <Icon name="person" size={20} color={COLORS.primary} />
                <Text style={styles.infoLabel}>Driver:</Text>
                <Text style={styles.infoValue}>{tripData.driverName}</Text>
              </View>

              <View style={styles.infoRow}>
                <Icon name="schedule" size={20} color={COLORS.primary} />
                <Text style={styles.infoLabel}>Time:</Text>
                <Text style={styles.infoValue}>{tripData.departureTime} - {tripData.arrivalTime}</Text>
              </View>

              <View style={styles.infoRow}>
                <Icon name="location-on" size={20} color={COLORS.primary} />
                <Text style={styles.infoLabel}>Route:</Text>
                <Text style={styles.infoValue}>{tripData.from} → {tripData.to}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Current Location Card */}
        <View style={[styles.card, SHADOWS.medium]}>
          <Text style={styles.cardTitle}>📍 Current Location</Text>

          {currentLocation ? (
            <>
              <View style={styles.locationContainer}>
                <View style={styles.locationHeader}>
                  <Icon name="my-location" size={28} color={COLORS.success} />
                  <Text style={styles.locationCity}>{currentLocation.city || 'Unknown'}</Text>
                </View>

                {currentLocation.area && (
                  <Text style={styles.locationArea}>{currentLocation.area}</Text>
                )}

                <View style={styles.coordinatesContainer}>
                  <Text style={styles.coordinates}>
                    Lat: {currentLocation.latitude.toFixed(6)}
                  </Text>
                  <Text style={styles.coordinates}>
                    Lng: {currentLocation.longitude.toFixed(6)}
                  </Text>
                </View>

                {currentLocation.speed !== undefined && (
                  <View style={styles.speedContainer}>
                    <Icon name="speed" size={16} color={COLORS.textLight} />
                    <Text style={styles.speedText}>
                      Speed: {Math.round(currentLocation.speed * 3.6)} km/h
                    </Text>
                  </View>
                )}

                <View style={styles.updateContainer}>
                  <Icon name="update" size={14} color={COLORS.textLight} />
                  <Text style={styles.updateText}>
                    Last updated: {lastUpdate || 'N/A'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.mapButton}
                onPress={openInMaps}
              >
                <Icon name="map" size={20} color={COLORS.white} />
                <Text style={styles.mapButtonText}>View on Google Maps</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.noLocationContainer}>
              <Icon name="location-off" size={48} color={COLORS.textLight} />
              <Text style={styles.noLocationText}>No location data available</Text>
              <Text style={styles.noLocationSubtext}>
                Driver may not have started the trip or location sharing is off
              </Text>
            </View>
          )}
        </View>

        {/* Location History */}
        {locations.length > 1 && (
          <View style={[styles.card, SHADOWS.medium]}>
            <Text style={styles.cardTitle}>📊 Location History</Text>
            <Text style={styles.historySubtitle}>Last {locations.length} updates</Text>

            {locations.slice(1, 6).map((loc, index) => (
              <View key={loc.id} style={styles.historyItem}>
                <View style={styles.historyTime}>
                  <Icon name="access-time" size={14} color={COLORS.textLight} />
                  <Text style={styles.historyTimeText}>
                    {loc.timestamp.toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.historyLocation}>
                  {loc.city || 'Unknown'}{loc.area ? `, ${loc.area}` : ''}
                </Text>
                {index < 4 && <View style={styles.historyDivider} />}
              </View>
            ))}

            <Text style={styles.historyNote}>
              {locations.length - 1} more location updates available
            </Text>
          </View>
        )}
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SIZES.xl,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SIZES.md,
    marginBottom: SIZES.xs,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: SIZES.xl,
  },
  errorButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.xs,
  },
  errorButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.lg,
  },
  backButton: {
    padding: SIZES.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    padding: SIZES.md,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.lg,
    marginBottom: SIZES.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
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
  tripInfo: {
    marginTop: SIZES.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: SIZES.xs,
    marginRight: SIZES.xs,
    width: 50,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  locationContainer: {
    marginVertical: SIZES.sm,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  locationCity: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: SIZES.sm,
  },
  locationArea: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: SIZES.md,
    marginLeft: 36,
  },
  coordinatesContainer: {
    marginLeft: 36,
    marginBottom: SIZES.sm,
  },
  coordinates: {
    fontSize: 13,
    color: COLORS.textLight,
    fontFamily: 'monospace',
  },
  speedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 36,
    marginBottom: SIZES.sm,
  },
  speedText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginLeft: SIZES.xs,
  },
  updateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 36,
  },
  updateText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  mapButton: {
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    borderRadius: SIZES.xs,
    marginTop: SIZES.md,
  },
  mapButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: SIZES.xs,
  },
  noLocationContainer: {
    alignItems: 'center',
    padding: SIZES.xl,
  },
  noLocationText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SIZES.md,
    marginBottom: SIZES.xs,
  },
  noLocationSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  historySubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SIZES.md,
  },
  historyItem: {
    marginBottom: SIZES.sm,
  },
  historyTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyTimeText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  historyLocation: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 18,
  },
  historyDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: SIZES.sm,
    marginBottom: SIZES.sm,
    marginLeft: 18,
  },
  historyNote: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: SIZES.sm,
  },
});

export default TripTrackingScreen;
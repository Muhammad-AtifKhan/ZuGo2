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
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import {
  TRIP_STATUS,
  TRIP_STATUS_CONFIG,
  BUS_STATUS,
  DRIVER_STATUS,
  getTripStatusConfig
} from '../../constants/status';

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
  busId: string;
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

  // Action modals
  const [showStartModal, setShowStartModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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
                  busId: data?.busId || '',
                  busNumber: data?.busNumber || 'N/A',
                  routeName: data?.routeName || 'Unknown Route',
                  driverName: data?.driverName || 'Unknown Driver',
                  driverId: data?.driverId || '',
                  departureTime: data?.departureTime || '--:--',
                  arrivalTime: data?.arrivalTime || '--:--',
                  from: data?.from || 'Unknown',
                  to: data?.to || 'Unknown',
                  status: data?.status || TRIP_STATUS.SCHEDULED,
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

    return () => {
      if (unsubscribeTrip) unsubscribeTrip();
      if (unsubscribeLocations) unsubscribeLocations();
    };
  }, [tripId]);

  const onRefresh = () => {
    setRefreshing(true);
  };

  // ✅ START TRIP - Updates Trip, Bus, and Driver statuses
  const handleStartTrip = async () => {
    if (!tripData || !user) return;

    setActionLoading(true);

    try {
      const batch = firestore().batch();
      const now = firestore.FieldValue.serverTimestamp();

      // 1. Update Trip status to IN_PROGRESS
      const tripRef = firestore().collection('trips').doc(tripData.id);
      batch.update(tripRef, {
        status: TRIP_STATUS.IN_PROGRESS,
        startedAt: now,
        updatedAt: now,
      });

      // 2. Update Bus status to ON_TRIP
      if (tripData.busId) {
        const busRef = firestore().collection('buses').doc(tripData.busId);
        batch.update(busRef, {
          status: BUS_STATUS.ON_TRIP,
          currentTripId: tripData.id,
          updatedAt: now,
        });
      }

      // 3. Update Driver status to ON_TRIP
      if (tripData.driverId) {
        const driverRef = firestore().collection('drivers').doc(tripData.driverId);
        batch.update(driverRef, {
          status: DRIVER_STATUS.ON_TRIP,
          currentTripId: tripData.id,
          updatedAt: now,
        });
      }

      // 4. Create activity log
      const activityRef = firestore().collection('trip_activities').doc();
      batch.set(activityRef, {
        tripId: tripData.id,
        type: 'started',
        timestamp: now,
        driverId: tripData.driverId,
        busId: tripData.busId,
        transporterId: user.uid,
        createdAt: now,
      });

      await batch.commit();

      Alert.alert(
        '✅ Trip Started',
        `Trip ${tripData.routeName} has been started.\nBus and Driver statuses updated to ON_TRIP.`,
        [{ text: 'OK' }]
      );

      setShowStartModal(false);
    } catch (error) {
      console.error('Error starting trip:', error);
      Alert.alert('Error', 'Failed to start trip. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ COMPLETE TRIP - Resets Trip, Bus, and Driver statuses
  const handleCompleteTrip = async () => {
    if (!tripData || !user) return;

    setActionLoading(true);

    try {
      const batch = firestore().batch();
      const now = firestore.FieldValue.serverTimestamp();

      // 1. Update Trip status to COMPLETED
      const tripRef = firestore().collection('trips').doc(tripData.id);
      batch.update(tripRef, {
        status: TRIP_STATUS.COMPLETED,
        completedAt: now,
        updatedAt: now,
      });

      // 2. Reset Bus status to AVAILABLE
      if (tripData.busId) {
        const busRef = firestore().collection('buses').doc(tripData.busId);
        batch.update(busRef, {
          status: BUS_STATUS.AVAILABLE,
          currentTripId: null,
          updatedAt: now,
        });
      }

      // 3. Reset Driver status to AVAILABLE
      if (tripData.driverId) {
        const driverRef = firestore().collection('drivers').doc(tripData.driverId);
        batch.update(driverRef, {
          status: DRIVER_STATUS.AVAILABLE,
          currentTripId: null,
          updatedAt: now,
        });
      }

      // 4. Create activity log
      const activityRef = firestore().collection('trip_activities').doc();
      batch.set(activityRef, {
        tripId: tripData.id,
        type: 'completed',
        timestamp: now,
        driverId: tripData.driverId,
        busId: tripData.busId,
        transporterId: user.uid,
        createdAt: now,
      });

      await batch.commit();

      Alert.alert(
        '✅ Trip Completed',
        `Trip ${tripData.routeName} has been completed.\nBus and Driver are now AVAILABLE for new assignments.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );

      setShowCompleteModal(false);
    } catch (error) {
      console.error('Error completing trip:', error);
      Alert.alert('Error', 'Failed to complete trip. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ CANCEL TRIP - Updates Trip status, resets Bus/Driver
  const handleCancelTrip = async () => {
    if (!tripData || !user) return;

    setActionLoading(true);

    try {
      const batch = firestore().batch();
      const now = firestore.FieldValue.serverTimestamp();

      // 1. Update Trip status to CANCELLED
      const tripRef = firestore().collection('trips').doc(tripData.id);
      batch.update(tripRef, {
        status: TRIP_STATUS.CANCELLED,
        cancelledAt: now,
        updatedAt: now,
      });

      // 2. Reset Bus status to AVAILABLE
      if (tripData.busId) {
        const busRef = firestore().collection('buses').doc(tripData.busId);
        batch.update(busRef, {
          status: BUS_STATUS.AVAILABLE,
          currentTripId: null,
          updatedAt: now,
        });
      }

      // 3. Reset Driver status to AVAILABLE
      if (tripData.driverId) {
        const driverRef = firestore().collection('drivers').doc(tripData.driverId);
        batch.update(driverRef, {
          status: DRIVER_STATUS.AVAILABLE,
          currentTripId: null,
          updatedAt: now,
        });
      }

      // 4. Create activity log
      const activityRef = firestore().collection('trip_activities').doc();
      batch.set(activityRef, {
        tripId: tripData.id,
        type: 'cancelled',
        timestamp: now,
        driverId: tripData.driverId,
        busId: tripData.busId,
        transporterId: user.uid,
        createdAt: now,
      });

      await batch.commit();

      Alert.alert(
        '❌ Trip Cancelled',
        `Trip ${tripData.routeName} has been cancelled.\nBus and Driver are now AVAILABLE.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );

      setShowCancelModal(false);
    } catch (error) {
      console.error('Error cancelling trip:', error);
      Alert.alert('Error', 'Failed to cancel trip. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ DELAY TRIP - Quick action
  const handleDelayTrip = () => {
    if (!tripData || !user) return;

    Alert.alert(
      '⚠️ Report Delay',
      'Mark this trip as delayed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Delayed',
          onPress: async () => {
            try {
              await firestore()
                .collection('trips')
                .doc(tripData.id)
                .update({
                  status: TRIP_STATUS.DELAYED,
                  updatedAt: firestore.FieldValue.serverTimestamp(),
                });

              Alert.alert('✅ Updated', 'Trip marked as delayed');
            } catch (error) {
              console.error('Error updating trip:', error);
              Alert.alert('Error', 'Failed to update trip status');
            }
          }
        }
      ]
    );
  };

  const openInMaps = () => {
    if (!currentLocation) {
      Alert.alert('No Location', 'No location data available');
      return;
    }

    const { latitude, longitude } = currentLocation;
    Alert.alert(
      '📍 Current Location',
      `Lat: ${latitude.toFixed(6)}\nLng: ${longitude.toFixed(6)}`,
      [{ text: 'OK' }]
    );
  };

  // ✅ Get status display using centralized config
  const getStatusDisplay = (status: string) => {
    return getTripStatusConfig(status);
  };

  // Check if trip can be started
  const canStartTrip = tripData?.status === TRIP_STATUS.SCHEDULED;

  // Check if trip can be completed
  const canCompleteTrip = tripData?.status === TRIP_STATUS.IN_PROGRESS || tripData?.status === TRIP_STATUS.DELAYED;

  // Check if trip can be cancelled
  const canCancelTrip = tripData?.status === TRIP_STATUS.SCHEDULED ||
                        tripData?.status === TRIP_STATUS.DELAYED;

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

  const statusConfig = tripData ? getStatusDisplay(tripData.status) : null;

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
        {tripData && statusConfig && (
          <View style={[styles.card, SHADOWS.medium]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>🚌 Trip Details</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
                <Text style={styles.statusText}>
                  {statusConfig.icon} {statusConfig.label}
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

            {/* ✅ Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              {canStartTrip && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.startButton]}
                  onPress={() => setShowStartModal(true)}
                >
                  <Icon name="play-arrow" size={20} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Start Trip</Text>
                </TouchableOpacity>
              )}

              {canCompleteTrip && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.completeButton]}
                  onPress={() => setShowCompleteModal(true)}
                >
                  <Icon name="check" size={20} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Complete</Text>
                </TouchableOpacity>
              )}

              {tripData.status === TRIP_STATUS.IN_PROGRESS && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.delayButton]}
                  onPress={handleDelayTrip}
                >
                  <Icon name="warning" size={20} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Delay</Text>
                </TouchableOpacity>
              )}

              {canCancelTrip && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => setShowCancelModal(true)}
                >
                  <Icon name="close" size={20} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
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
                <Icon name="location-on" size={20} color={COLORS.white} />
                <Text style={styles.mapButtonText}>View Coordinates</Text>
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
            <Text style={styles.historySubtitle}>Last {Math.min(locations.length, 5)} updates</Text>

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
                {index < 4 && index < locations.length - 2 && <View style={styles.historyDivider} />}
              </View>
            ))}

            {locations.length > 6 && (
              <Text style={styles.historyNote}>
                {locations.length - 6} more location updates available
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Start Trip Confirmation Modal */}
      <Modal
        visible={showStartModal}
        transparent
        animationType="fade"
        onRequestClose={() => !actionLoading && setShowStartModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🚌 Start Trip</Text>
            <Text style={styles.modalText}>
              Are you sure you want to start this trip?
            </Text>
            <Text style={styles.modalSubtext}>
              This will update the trip status to IN PROGRESS and mark the bus and driver as ON TRIP.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowStartModal(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleStartTrip}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>Start Trip</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete Trip Confirmation Modal */}
      <Modal
        visible={showCompleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => !actionLoading && setShowCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✅ Complete Trip</Text>
            <Text style={styles.modalText}>
              Confirm that this trip has been completed?
            </Text>
            <Text style={styles.modalSubtext}>
              This will mark the trip as COMPLETED and make the bus and driver AVAILABLE for new assignments.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowCompleteModal(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleCompleteTrip}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>Complete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Trip Confirmation Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => !actionLoading && setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: COLORS.danger }]}>❌ Cancel Trip</Text>
            <Text style={styles.modalText}>
              Are you sure you want to cancel this trip?
            </Text>
            <Text style={styles.modalSubtext}>
              This action cannot be undone. The bus and driver will become AVAILABLE.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowCancelModal(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalDangerButton]}
                onPress={handleCancelTrip}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>Cancel Trip</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: SIZES.md,
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
  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    borderRadius: SIZES.xs,
    minWidth: '48%',
    marginBottom: SIZES.xs,
  },
  startButton: {
    backgroundColor: COLORS.success,
  },
  completeButton: {
    backgroundColor: COLORS.info,
  },
  delayButton: {
    backgroundColor: COLORS.warning,
  },
  cancelButton: {
    backgroundColor: COLORS.danger,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: SIZES.xs,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.lg,
    padding: SIZES.xl,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SIZES.md,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SIZES.sm,
    textAlign: 'center',
  },
  modalSubtext: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: SIZES.lg,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.xs,
    alignItems: 'center',
    marginHorizontal: SIZES.xs,
  },
  modalCancelButton: {
    backgroundColor: COLORS.greyLight,
  },
  modalConfirmButton: {
    backgroundColor: COLORS.success,
  },
  modalDangerButton: {
    backgroundColor: COLORS.danger,
  },
  modalCancelText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 14,
  },
  modalConfirmText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default TripTrackingScreen;
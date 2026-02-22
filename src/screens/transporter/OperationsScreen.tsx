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
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { StackNavigationProp } from '@react-navigation/stack';
import { TransporterStackParamList } from '../../navigation/TransporterNavigator';

// Types
import { Route, Trip, TripStatus, OperationsStats } from '../../types/operations.types';

// Constants
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

type OperationsScreenNavigationProp = StackNavigationProp<TransporterStackParamList, 'Operations'>;

// Firebase Trip type based on your document
type FirebaseTrip = {
  id: string;
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
  status: TripStatus;
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
};

const OperationsScreen = () => {
  const navigation = useNavigation<OperationsScreenNavigationProp>();
  const route = useRoute();
  const [activeTab, setActiveTab] = useState('schedule'); // schedule, routes, today
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transporterName, setTransporterName] = useState('');

  // Data states
  const [routes, setRoutes] = useState<Route[]>([]);
  const [trips, setTrips] = useState<FirebaseTrip[]>([]);
  const [buses, setBuses] = useState<{id: string, busNumber: string}[]>([]);
  const [drivers, setDrivers] = useState<{id: string, fullName: string}[]>([]);

  // Form states
  const [newTrip, setNewTrip] = useState({
    routeCode: '',
    busId: '',
    driverId: '',
    departureTime: '',
    days: [] as string[],
  });

  const [newRoute, setNewRoute] = useState({
    code: '',
    name: '',
    from: '',
    to: '',
    distance: '',
    duration: '',
    stops: '',
    fare: '',
  });

  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

  const user = auth().currentUser;

  // Days of week
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // 🔥 IMPORTANT: useEffect for opening ScheduleTripScreen automatically
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
          if (doc.exists) {
            setTransporterName(doc.data()?.fullName || 'Transporter');
          }
        },
        (error) => console.error('Error fetching user:', error)
      );

    return () => unsubscribe();
  }, [user]);

  // 🔥 REAL-TIME ROUTES LISTENER
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

  // 🔥 REAL-TIME TRIPS LISTENER
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

  // 🔥 FETCH AVAILABLE BUSES
  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestore()
      .collection('buses')
      .where('transporterId', '==', user.uid)
      .where('status', '==', 'active')
      .onSnapshot(
        (snapshot) => {
          const busesList = snapshot.docs.map(doc => ({
            id: doc.id,
            busNumber: doc.data().busNumber,
          }));
          setBuses(busesList);
        },
        (error) => console.error('Error fetching buses:', error)
      );

    return () => unsubscribe();
  }, [user]);

  // 🔥 FETCH AVAILABLE DRIVERS
  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestore()
      .collection('drivers')
      .where('transporterId', '==', user.uid)
      .where('status', '==', 'active')
      .onSnapshot(
        (snapshot) => {
          const driversList = snapshot.docs.map(doc => ({
            id: doc.id,
            fullName: doc.data().fullName,
          }));
          setDrivers(driversList);
        },
        (error) => console.error('Error fetching drivers:', error)
      );

    return () => unsubscribe();
  }, [user]);

  // Manual refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Listeners will auto-update
  }, []);

  // Calculate stats from Firebase trips
  const stats = useMemo(() => {
    const activeTrips = trips.filter(t => t.status === 'active').length;
    const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
    const todayTrips = trips.filter(trip =>
      trip.days?.includes('Daily') || trip.days?.includes(today)
    ).length;
    const completedTrips = trips.filter(t => t.status === 'completed').length;
    const delayedTrips = trips.filter(t => t.status === 'delayed').length;

    // Calculate passengers and revenue from Firebase fields
    let totalPassengers = 0;
    let totalRevenue = 0;

    trips.forEach(trip => {
      const passengers = (trip.totalSeats || 0) - (trip.availableSeats || 0);
      totalPassengers += passengers;
      totalRevenue += passengers * (trip.fare || 0);
    });

    return {
      activeTrips,
      todayTrips,
      completedTrips,
      delayedTrips,
      totalRevenue,
      totalPassengers,
      totalRoutes: routes.length,
    };
  }, [trips, routes]);

  // Get today's trips
  const todayTrips = useMemo(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
    return trips.filter(trip =>
      trip.days?.includes('Daily') || trip.days?.includes(today)
    );
  }, [trips]);

  // Format trip for display
  const formatTripForDisplay = (trip: FirebaseTrip) => {
    const passengers = (trip.totalSeats || 0) - (trip.availableSeats || 0);
    const revenue = passengers * (trip.fare || 0);

    // Create route name from from/to if routeName is empty
    const routeName = trip.routeName ||
                     (trip.from && trip.to ? `${trip.from} → ${trip.to}` : 'Unknown Route');

    // Use routeCode or create from from/to
    const routeCode = trip.routeCode ||
                     (trip.from && trip.to ? `${trip.from.substring(0,3)}-${trip.to.substring(0,3)}` : 'RT-000');

    return {
      ...trip,
      displayRouteName: routeName,
      displayRouteCode: routeCode,
      displayPassengers: passengers,
      displayRevenue: revenue,
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

  // Add New Route function
  const handleAddRoute = async () => {
    if (!user) return;

    if (!newRoute.code || !newRoute.name || !newRoute.from || !newRoute.to || !newRoute.distance || !newRoute.duration || !newRoute.stops || !newRoute.fare) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    // Check if route code already exists
    const routeExists = routes.some(route => route.code === newRoute.code.toUpperCase());
    if (routeExists) {
      Alert.alert('Error', `Route code ${newRoute.code.toUpperCase()} already exists`);
      return;
    }

    setLoading(true);

    try {
      const routeData = {
        code: newRoute.code.toUpperCase(),
        name: newRoute.name,
        from: newRoute.from,
        to: newRoute.to,
        distance: newRoute.distance,
        duration: newRoute.duration,
        stops: parseInt(newRoute.stops) || 0,
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
              setNewRoute({ code: '', name: '', from: '', to: '', distance: '', duration: '', stops: '', fare: '' });
            }
          },
          {
            text: 'Schedule Now',
            onPress: () => {
              setRouteModalVisible(false);
              setNewRoute({ code: '', name: '', from: '', to: '', distance: '', duration: '', stops: '', fare: '' });
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
      setLoading(false);
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
    Alert.alert(
      'Track Trip',
      `Track ${trip.busNumber} from ${trip.from || 'Unknown'} to ${trip.to || 'Unknown'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Live Tracking', onPress: () => {
          Alert.alert('Live Tracking', `Tracking ${trip.busNumber}...`);
        }}
      ]
    );
  };

  // Update Trip Status handler
  const handleUpdateStatus = async (tripId: string, newStatus: TripStatus) => {
    if (!user) return;

    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      if (newStatus === 'cancelled') {
        updateData.cancelledAt = firestore.FieldValue.serverTimestamp();
      }

      await firestore()
        .collection('trips')
        .doc(tripId)
        .update(updateData);

      Alert.alert('Success', `Trip status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating trip status:', error);
      Alert.alert('Error', 'Failed to update trip status');
    }
  };

  // Cancel Trip handler
  const handleCancelTrip = (trip: FirebaseTrip) => {
    const routeInfo = trip.displayRouteName || `${trip.from || 'Unknown'} → ${trip.to || 'Unknown'}`;

    Alert.alert(
      'Cancel Trip',
      `Are you sure you want to cancel ${routeInfo}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => handleUpdateStatus(trip.id, 'cancelled')
        }
      ]
    );
  };

  // Complete Trip handler
  const handleCompleteTrip = (trip: FirebaseTrip) => {
    const routeInfo = trip.displayRouteName || `${trip.from || 'Unknown'} → ${trip.to || 'Unknown'}`;

    Alert.alert(
      'Complete Trip',
      `Mark ${routeInfo} as completed?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Complete',
          onPress: () => handleUpdateStatus(trip.id, 'completed')
        }
      ]
    );
  };

  // Use Route handler
  const handleUseRoute = (route: Route) => {
    navigation.navigate('ScheduleTripScreen', {
      mode: 'add',
      preSelectedRoute: route.code,
    });
  };

  // View Trip Details handler
  const handleViewTripDetails = (trip: FirebaseTrip) => {
    const passengers = (trip.totalSeats || 0) - (trip.availableSeats || 0);
    const revenue = passengers * (trip.fare || 0);

    Alert.alert(
      'Trip Details',
      `Route: ${trip.displayRouteName || 'Unknown'}\n` +
      `From: ${trip.from || 'N/A'}\n` +
      `To: ${trip.to || 'N/A'}\n` +
      `Bus: ${trip.busNumber}\n` +
      `Driver: ${trip.driverName}\n` +
      `Time: ${trip.departureTime} - ${trip.arrivalTime}\n` +
      `Days: ${trip.days?.join(', ') || 'N/A'}\n` +
      `Status: ${trip.status}\n` +
      `Total Seats: ${trip.totalSeats || 0}\n` +
      `Available: ${trip.availableSeats || 0}\n` +
      `Passengers: ${passengers}\n` +
      `Fare: PKR ${trip.fare || 0}\n` +
      `Revenue: PKR ${revenue.toLocaleString()}`,
      [
        { text: 'OK' },
        { text: 'Edit', onPress: () => handleEditTrip(trip) }
      ]
    );
  };

  // Helper functions
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return COLORS.success;
      case 'upcoming': return COLORS.info;
      case 'delayed': return COLORS.warning;
      case 'completed': return COLORS.purple;
      case 'cancelled': return COLORS.danger;
      default: return COLORS.textLight;
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'active': return '🟢';
      case 'upcoming': return '🔵';
      case 'delayed': return '🟡';
      case 'completed': return '🟣';
      case 'cancelled': return '🔴';
      default: return '⚫';
    }
  };

  // Render Trip Card
  const renderTripCard = ({ item }: { item: FirebaseTrip }) => {
    const passengers = (item.totalSeats || 0) - (item.availableSeats || 0);
    const revenue = passengers * (item.fare || 0);
    const routeName = item.displayRouteName || `${item.from || 'Unknown'} → ${item.to || 'Unknown'}`;
    const routeCode = item.displayRouteCode || '';

    return (
      <TouchableOpacity
        style={[styles.tripCard, SHADOWS.medium]}
        onPress={() => handleViewTripDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.tripHeader}>
          <View>
            <Text style={styles.tripRoute}>{routeName}</Text>
            <Text style={styles.tripCode}>{routeCode}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>
              {getStatusIcon(item.status)} {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

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
            <Text style={styles.detailLabel}>📍 Route:</Text>
            <Text style={styles.detailValue}>{item.from || '?'} → {item.to || '?'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>⏰ Time:</Text>
            <Text style={styles.detailValue}>{item.departureTime} - {item.arrivalTime}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📅 Days:</Text>
            <Text style={styles.detailValue}>{item.days?.join(', ') || 'N/A'}</Text>
          </View>
        </View>

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

          {item.status !== 'completed' && item.status !== 'cancelled' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleCompleteTrip(item);
              }}
            >
              <Text style={[styles.actionButtonText, styles.completeButtonText]}>✅ Complete</Text>
            </TouchableOpacity>
          )}

          {item.status !== 'cancelled' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelActionButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleCancelTrip(item);
              }}
            >
              <Text style={[styles.actionButtonText, styles.cancelButtonText]}>❌ Cancel</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleTrackTrip(item);
            }}
          >
            <Text style={styles.actionButtonText}>📍 Track</Text>
          </TouchableOpacity>
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
          <Text style={styles.routeDetailText}>{item.duration}</Text>
        </View>
        <View style={styles.routeDetail}>
          <Text style={styles.routeDetailIcon}>📍</Text>
          <Text style={styles.routeDetailText}>{item.stops} stops</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.useRouteButton}
        onPress={() => handleUseRoute(item)}
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
        <Text style={styles.statValue}>{stats.activeTrips}</Text>
        <Text style={styles.statLabel}>Active Trips</Text>
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
        onPress={() => Alert.alert('Passengers', `Total: ${stats.totalPassengers} passengers`)}
        activeOpacity={0.7}
      >
        <Text style={styles.statValue}>{stats.totalPassengers}</Text>
        <Text style={styles.statLabel}>Passengers</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.statCard}
        onPress={() => Alert.alert('Revenue', `Total: PKR ${stats.totalRevenue.toLocaleString()}`)}
        activeOpacity={0.7}
      >
        <Text style={styles.statValue}>PKR {stats.totalRevenue.toLocaleString()}</Text>
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
          <Text style={styles.modalTitle}>Add New Route</Text>

          <TextInput
            style={styles.input}
            placeholder="Route Code (e.g., RT-001)"
            value={newRoute.code}
            onChangeText={(text) => setNewRoute({...newRoute, code: text})}
            autoCapitalize="characters"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Route Name (e.g., Downtown Express)"
            value={newRoute.name}
            onChangeText={(text) => setNewRoute({...newRoute, name: text})}
            editable={!loading}
          />

          <View style={styles.rowInputs}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="From (e.g., Lahore)"
              value={newRoute.from}
              onChangeText={(text) => setNewRoute({...newRoute, from: text})}
              editable={!loading}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="To (e.g., Islamabad)"
              value={newRoute.to}
              onChangeText={(text) => setNewRoute({...newRoute, to: text})}
              editable={!loading}
            />
          </View>

          <View style={styles.rowInputs}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Distance (e.g., 375km)"
              value={newRoute.distance}
              onChangeText={(text) => setNewRoute({...newRoute, distance: text})}
              editable={!loading}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Duration (e.g., 5h 30m)"
              value={newRoute.duration}
              onChangeText={(text) => setNewRoute({...newRoute, duration: text})}
              editable={!loading}
            />
          </View>

          <View style={styles.rowInputs}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Number of Stops"
              value={newRoute.stops}
              onChangeText={(text) => setNewRoute({...newRoute, stops: text})}
              keyboardType="numeric"
              editable={!loading}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Fare (PKR)"
              value={newRoute.fare}
              onChangeText={(text) => setNewRoute({...newRoute, fare: text})}
              keyboardType="numeric"
              editable={!loading}
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setRouteModalVisible(false);
                setNewRoute({ code: '', name: '', from: '', to: '', distance: '', duration: '', stops: '', fare: '' });
              }}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleAddRoute}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Add Route</Text>
              )}
            </TouchableOpacity>
          </View>
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
      {/* Header */}
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
            <Text style={styles.headerButtonText}>🛣️ New Route</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      {renderStatsHeader()}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'schedule' && styles.tabActive]}
          onPress={() => setActiveTab('schedule')}
        >
          <Text style={[styles.tabText, activeTab === 'schedule' && styles.tabTextActive]}>
            📅 Schedule
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

      {/* Content based on active tab */}
      {activeTab === 'schedule' && (
        <FlatList
          data={trips}
          renderItem={renderTripCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={<Text style={styles.sectionTitle}>All Scheduled Trips</Text>}
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={<Text style={styles.sectionTitle}>Today's Schedule</Text>}
          ListEmptyComponent={renderEmptyState('trips')}
        />
      )}

      {/* Add Route Modal */}
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
    marginBottom: SIZES.md,
    marginTop: SIZES.xs,
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
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    paddingVertical: SIZES.xs,
    alignItems: 'center',
    marginHorizontal: 2,
    borderRadius: SIZES.xs,
    backgroundColor: COLORS.greyLight,
    minWidth: 70,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  completeButton: {
    backgroundColor: '#E8F5E9',
  },
  completeButtonText: {
    color: COLORS.success,
  },
  cancelActionButton: {
    backgroundColor: '#FFEBEE',
  },
  cancelButtonText: {
    color: COLORS.danger,
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
    justifyContent: 'space-between',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.lg,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
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
    marginTop: SIZES.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SIZES.sm,
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
});

export default OperationsScreen;
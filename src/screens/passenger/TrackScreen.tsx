// src/screens/passenger/TrackScreen.tsx - MINOR IMPROVEMENTS
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Dimensions,
  Animated,
  Linking,
  Share,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PassengerStackParamList } from '../../navigation/PassengerNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import OpenStreetMap from '../../components/OpenStreetMap';

// ✅ Optional: Import for consistency
import { TRIP_STATUS } from '../../constants/status';

type TrackScreenNavigationProp = StackNavigationProp<PassengerStackParamList, 'Track'>;

const { width } = Dimensions.get('window');

interface Trip {
  id: string;
  ticketNumber: string;
  from: string;
  to: string;
  fromCode: string;
  toCode: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  busNumber: string;
  busId: string;
  seats: string[];
  driver: string;
  driverId: string;
  driverContact: string;
  driverPhone?: string;
  status: string;
  routeId: string;
  delay?: string;
  totalSeats?: number;
  occupiedSeats?: number;
}

interface TrackingData {
  busLocation: {
    latitude: number;
    longitude: number;
  };
  lastUpdated: string;
  speed?: number;
  heading?: number;
}

interface Alert {
  id: string;
  type: 'delay' | 'info' | 'warning';
  message: string;
  time: string;
  timestamp: any;
}

const TrackScreen = () => {
  const navigation = useNavigation<TrackScreenNavigationProp>();
  const user = auth().currentUser;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  // Refs for real-time listener
  const locationUnsubscribe = useRef<(() => void) | null>(null);
  const alertsUnsubscribe = useRef<(() => void) | null>(null);

  // Start pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      if (locationUnsubscribe.current) locationUnsubscribe.current();
      if (alertsUnsubscribe.current) alertsUnsubscribe.current();
    };
  }, []);

  // Load active trip on mount
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadActiveTrip();
  }, [user]);

  const loadActiveTrip = async () => {
    try {
      setLoading(true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // ✅ Booking status filter - appropriate for finding active trips
      const snapshot = await firestore()
        .collection('bookings')
        .where('userId', '==', user?.uid)
        .where('status', 'in', ['confirmed', 'boarding', 'paid'])
        .where('travelDate', '>=', firestore.Timestamp.fromDate(today))
        .orderBy('travelDate', 'asc')
        .limit(1)
        .get();

      if (snapshot.empty) {
        setActiveTrip(null);
        setLoading(false);
        return;
      }

      const bookingDoc = snapshot.docs[0];
      const bookingData = bookingDoc.data();

      const tripDoc = await firestore()
        .collection('trips')
        .doc(bookingData.tripId)
        .get();

      if (!tripDoc.exists) {
        setLoading(false);
        return;
      }

      const tripData = tripDoc.data();

      let driverName = 'Not assigned';
      let driverContact = '';
      let driverPhone = '';

      if (tripData?.driverId) {
        const driverDoc = await firestore()
          .collection('drivers')
          .doc(tripData.driverId)
          .get();

        if (driverDoc.exists) {
          const driverData = driverDoc.data();
          driverName = driverData?.fullName || 'Driver';
          driverContact = driverData?.contactNumber || '';
          driverPhone = driverData?.contactNumber || '';
        }
      }

      const travelDate = bookingData.travelDate?.toDate?.() || new Date();
      const todayDate = new Date();
      const tomorrow = new Date(todayDate);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let dateStr = '';
      if (travelDate.toDateString() === todayDate.toDateString()) {
        dateStr = 'Today';
      } else if (travelDate.toDateString() === tomorrow.toDateString()) {
        dateStr = 'Tomorrow';
      } else {
        dateStr = travelDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      // ✅ Get delay status display
      const getDelayStatus = () => {
        if (tripData?.status === TRIP_STATUS.DELAYED) {
          return `Delayed`;
        }
        if (tripData?.delay) {
          return `+${tripData.delay} min`;
        }
        return 'On time';
      };

      const trip: Trip = {
        id: bookingDoc.id,
        ticketNumber: bookingData.bookingCode || `TKT-${bookingDoc.id.slice(0, 8)}`,
        from: bookingData.from || tripData?.from || '',
        to: bookingData.to || tripData?.to || '',
        fromCode: bookingData.fromCode || tripData?.fromCode || '',
        toCode: bookingData.toCode || tripData?.toCode || '',
        date: dateStr,
        departureTime: tripData?.departureTime || '00:00',
        arrivalTime: tripData?.arrivalTime || '00:00',
        busNumber: tripData?.busNumber || 'N/A',
        busId: tripData?.busId || '',
        seats: bookingData.seatNumbers || [],
        driver: driverName,
        driverId: tripData?.driverId || '',
        driverContact: driverContact,
        driverPhone: driverPhone,
        status: tripData?.status || TRIP_STATUS.SCHEDULED,
        routeId: tripData?.routeId || '',
        delay: getDelayStatus(),
        totalSeats: tripData?.totalSeats || 40,
        occupiedSeats: tripData?.boardedSeats || 0,
      };

      setActiveTrip(trip);
      startLocationTracking(trip.driverId, trip.id);
      loadAlerts(trip.id);

    } catch (error) {
      console.error('Error loading active trip:', error);
      Alert.alert('Error', 'Failed to load trip data');
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = (driverId: string, tripId: string) => {
    if (!driverId) return;

    if (locationUnsubscribe.current) {
      locationUnsubscribe.current();
    }

    locationUnsubscribe.current = firestore()
      .collection('driver_locations')
      .doc(driverId)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            const data = doc.data();
            if (data?.latitude && data?.longitude) {
              setTrackingData({
                busLocation: {
                  latitude: data.latitude,
                  longitude: data.longitude,
                },
                lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                speed: data.speed,
                heading: data.heading,
              });
              setIsTracking(true);
            }
          }
        },
        (error) => {
          console.error('Location listener error:', error);
        }
      );
  };

  const loadAlerts = async (tripId: string) => {
    if (alertsUnsubscribe.current) {
      alertsUnsubscribe.current();
    }

    alertsUnsubscribe.current = firestore()
      .collection('alerts')
      .where('tripId', '==', tripId)
      .orderBy('timestamp', 'desc')
      .limit(5)
      .onSnapshot(
        (snapshot) => {
          const alertsList: Alert[] = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            const timestamp = data.timestamp?.toDate?.() || new Date();
            const timeAgo = getTimeAgo(timestamp);

            alertsList.push({
              id: doc.id,
              type: data.type || 'info',
              message: data.message,
              time: timeAgo,
              timestamp: data.timestamp,
            });
          });
          setAlerts(alertsList);
        },
        (error) => {
          console.error('Alerts listener error:', error);
        }
      );
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadActiveTrip();
    setRefreshing(false);
  };

  const handleShareLocation = async () => {
    if (!trackingData?.busLocation) {
      Alert.alert('No Location', 'Bus location not available yet');
      return;
    }

    try {
      const mapsUrl = `https://www.openstreetmap.org/?mlat=${trackingData.busLocation.latitude}&mlon=${trackingData.busLocation.longitude}#map=15/${trackingData.busLocation.latitude}/${trackingData.busLocation.longitude}`;

      const shareContent = {
        title: 'My Bus Location',
        message: `🚍 Bus: ${activeTrip?.busNumber}\n📍 From: ${activeTrip?.from}\n🎯 To: ${activeTrip?.to}\n\nLive tracking: ${mapsUrl}\n\nTrack on ZUGO App`,
      };

      await Share.share(shareContent);
    } catch (error) {
      Alert.alert('Error', 'Failed to share location');
    }
  };

  const handleContactDriver = async () => {
    if (activeTrip?.driverPhone) {
      Alert.alert(
        'Contact Driver',
        `Driver: ${activeTrip.driver}\nBus: ${activeTrip.busNumber}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: '📞 Call',
            onPress: async () => {
              try {
                const phoneNumber = `tel:${activeTrip.driverPhone}`;
                await Linking.openURL(phoneNumber);
              } catch (error) {
                Alert.alert('Error', 'Cannot make call');
              }
            }
          },
          {
            text: '💬 Message',
            onPress: async () => {
              try {
                const message = `Hello ${activeTrip.driver}, this is passenger on bus ${activeTrip.busNumber} (Ticket: ${activeTrip.ticketNumber}).`;
                const url = Platform.select({
                  ios: `sms:${activeTrip.driverPhone}&body=${encodeURIComponent(message)}`,
                  android: `sms:${activeTrip.driverPhone}?body=${encodeURIComponent(message)}`,
                });
                if (url) await Linking.openURL(url);
              } catch (error) {
                Alert.alert('Error', 'Cannot open messaging');
              }
            }
          },
        ]
      );
    } else {
      Alert.alert('No Contact', 'Driver contact information not available');
    }
  };

  const handleGetDirections = async () => {
    if (!trackingData?.busLocation) {
      Alert.alert('No Location', 'Bus location not available');
      return;
    }

    Alert.alert(
      'Get Directions',
      'Open in maps to get directions to bus location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OpenStreetMap',
          onPress: async () => {
            const url = `https://www.openstreetmap.org/directions?from=&to=${trackingData.busLocation.latitude},${trackingData.busLocation.longitude}&engine=graphhopper_foot`;
            await Linking.openURL(url);
          }
        },
        {
          text: 'Google Maps',
          onPress: async () => {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${trackingData.busLocation.latitude},${trackingData.busLocation.longitude}&travelmode=driving`;
            await Linking.openURL(url);
          }
        },
      ]
    );
  };

  const handleEmergency = () => {
    Alert.alert(
      '🚨 EMERGENCY 🚨',
      'Select emergency contact:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '📞 Call Driver',
          onPress: () => handleContactDriver()
        },
        {
          text: '📞 Support',
          onPress: async () => {
            await Linking.openURL('tel:+923001234567');
          }
        },
        {
          text: '🚨 Emergency Services',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Emergency Services',
              'Choose:',
              [
                { text: 'Police - 15', onPress: () => Linking.openURL('tel:15') },
                { text: 'Ambulance - 115', onPress: () => Linking.openURL('tel:115') },
                { text: 'Rescue - 1122', onPress: () => Linking.openURL('tel:1122') },
              ]
            );
          }
        },
        {
          text: '📍 Share Location',
          onPress: handleShareLocation
        },
      ]
    );
  };

  const handleViewAllAlerts = () => {
    navigation.navigate('Alerts', {
      tripId: activeTrip?.id || '',
      busNumber: activeTrip?.busNumber || ''
    });
  };

  const renderMapView = () => {
    const hasBusLocation = trackingData?.busLocation?.latitude && trackingData?.busLocation?.longitude;

    const userLat = 24.8607;
    const userLng = 67.0011;

    return (
      <View style={styles.mapContainer}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapTitle}>LIVE TRACKING</Text>
          <View style={styles.liveIndicator}>
            <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.mapWrapper}>
          {hasBusLocation ? (
            <OpenStreetMap
              latitude={userLat}
              longitude={userLng}
              busLatitude={trackingData.busLocation.latitude}
              busLongitude={trackingData.busLocation.longitude}
            />
          ) : (
            <View style={styles.noLocationContainer}>
              <Icon name="directions-bus" size={50} color="#CCC" />
              <Text style={styles.noLocationText}>Waiting for bus location...</Text>
              <Text style={styles.noLocationSubtext}>
                Driver will share location when trip starts
              </Text>
            </View>
          )}
        </View>

        <View style={styles.mapLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
            <Text style={styles.legendText}>Bus</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>You</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderTripInfo = () => (
    <View style={styles.tripInfoCard}>
      <View style={styles.tripHeader}>
        <View style={styles.tripRoute}>
          <View style={styles.locationRow}>
            <View style={styles.locationDot} />
            <Text style={styles.locationText}>{activeTrip?.from}</Text>
          </View>
          <Icon name="arrow-forward" size={20} color="#666" style={styles.arrowIcon} />
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, styles.destinationDot]} />
            <Text style={styles.locationText}>{activeTrip?.to}</Text>
          </View>
        </View>

        <View style={[
          styles.tripStatus,
          activeTrip?.delay === 'On time' ? styles.onTimeStatus : styles.delayedStatus
        ]}>
          <Icon name="directions-bus" size={20} color={activeTrip?.delay === 'On time' ? '#2E7D32' : '#F57C00'} />
          <Text style={[
            styles.statusText,
            activeTrip?.delay === 'On time' ? styles.onTimeText : styles.delayedText
          ]}>
            {activeTrip?.delay === 'On time' ? 'ON TIME' : activeTrip?.delay?.toUpperCase() || 'DELAYED'}
          </Text>
        </View>
      </View>

      <View style={styles.tripDetailsGrid}>
        <View style={styles.detailItem}>
          <Icon name="confirmation-number" size={18} color="#666" />
          <Text style={styles.detailLabel}>Ticket</Text>
          <Text style={styles.detailValue} numberOfLines={1}>{activeTrip?.ticketNumber}</Text>
        </View>

        <View style={styles.detailItem}>
          <Icon name="directions-bus" size={18} color="#666" />
          <Text style={styles.detailLabel}>Bus</Text>
          <Text style={styles.detailValue}>{activeTrip?.busNumber}</Text>
        </View>

        <View style={styles.detailItem}>
          <Icon name="event-seat" size={18} color="#666" />
          <Text style={styles.detailLabel}>Seats</Text>
          <Text style={styles.detailValue}>
            {activeTrip?.seats?.join(', ') || 'N/A'}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Icon name="person" size={18} color="#666" />
          <Text style={styles.detailLabel}>Driver</Text>
          <Text style={styles.detailValue}>{activeTrip?.driver}</Text>
        </View>
      </View>

      <View style={styles.tripDateTime}>
        <View style={styles.dateTimeItem}>
          <Icon name="event" size={16} color="#666" />
          <Text style={styles.dateTimeText}>{activeTrip?.date}</Text>
        </View>
        <View style={styles.dateTimeItem}>
          <Icon name="access-time" size={16} color="#666" />
          <Text style={styles.dateTimeText}>{activeTrip?.departureTime}</Text>
        </View>
      </View>
    </View>
  );

  const renderAlerts = () => (
    <View style={styles.alertsCard}>
      <View style={styles.alertsHeader}>
        <Text style={styles.alertsTitle}>ALERTS & UPDATES</Text>
        <TouchableOpacity onPress={handleViewAllAlerts}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {alerts.length === 0 ? (
        <View style={styles.noAlerts}>
          <Icon name="notifications-none" size={32} color="#CCC" />
          <Text style={styles.noAlertsText}>No alerts at this time</Text>
        </View>
      ) : (
        alerts.map(alert => (
          <View key={alert.id} style={styles.alertItem}>
            <Icon
              name={alert.type === 'delay' ? 'warning' : 'info'}
              size={20}
              color={alert.type === 'delay' ? '#F57C00' : '#2196F3'}
            />
            <View style={styles.alertContent}>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertTime}>{alert.time}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.actionsCard}>
      <Text style={styles.actionsTitle}>EMERGENCY</Text>

      <TouchableOpacity
        style={styles.emergencyButton}
        onPress={handleEmergency}
      >
        <Icon name="emergency" size={24} color="#FFF" />
        <Text style={styles.emergencyText}>EMERGENCY</Text>
      </TouchableOpacity>

      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionButton} onPress={handleRefresh}>
          <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
            <Icon name="refresh" size={24} color="#2196F3" />
          </View>
          <Text style={styles.actionText}>Refresh</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleShareLocation}>
          <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
            <Icon name="share" size={24} color="#4CAF50" />
          </View>
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleContactDriver}>
          <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
            <Icon name="phone" size={24} color="#FF9800" />
          </View>
          <Text style={styles.actionText}>Call Driver</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleGetDirections}>
          <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
            <Icon name="directions" size={24} color="#9C27B0" />
          </View>
          <Text style={styles.actionText}>Directions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTrackingInfo = () => (
    <View style={styles.trackingInfo}>
      <Text style={styles.trackingInfoTitle}>TRACKING STATUS</Text>

      <View style={styles.trackingRow}>
        <Icon name="update" size={16} color="#666" />
        <Text style={styles.trackingText}>
          Last updated: {trackingData?.lastUpdated || 'Waiting for data...'}
        </Text>
      </View>

      <View style={styles.trackingRow}>
        <Icon name="location-on" size={16} color="#666" />
        <Text style={styles.trackingText}>
          Status: {isTracking ? 'Live Tracking Active' : 'Waiting for driver...'}
        </Text>
      </View>

      {trackingData?.speed && (
        <View style={styles.trackingRow}>
          <Icon name="speed" size={16} color="#666" />
          <Text style={styles.trackingText}>Speed: {trackingData.speed} km/h</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading your trip...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activeTrip) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.noTripContainer}>
          <Icon name="directions-bus" size={80} color="#DDD" />
          <Text style={styles.noTripTitle}>No Active Trip</Text>
          <Text style={styles.noTripText}>
            You don't have any upcoming trips to track.
          </Text>

          <TouchableOpacity
            style={styles.bookTripButton}
            onPress={() => navigation.navigate('HomeTab')}
          >
            <Text style={styles.bookTripText}>BOOK A TRIP</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4A90E2']}
            tintColor="#4A90E2"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon name="location-on" size={32} color="#1A237E" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>TRACK BUS</Text>
              <Text style={styles.subtitle}>Live location & updates</Text>
            </View>
          </View>
        </View>

        {renderTripInfo()}
        {renderMapView()}
        {renderAlerts()}
        {renderQuickActions()}
        {renderTrackingInfo()}
      </ScrollView>
    </SafeAreaView>
  );
};

// Styles remain unchanged
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#4A90E2' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTextContainer: { marginLeft: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1A237E' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  tripInfoCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  tripRoute: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  locationRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  locationDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4A90E2', marginRight: 8 },
  destinationDot: { backgroundColor: '#4CAF50' },
  locationText: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  arrowIcon: { marginHorizontal: 8 },
  tripStatus: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  onTimeStatus: { backgroundColor: '#E8F5E9' },
  delayedStatus: { backgroundColor: '#FFF3E0' },
  statusText: { fontSize: 12, fontWeight: '600', marginLeft: 4 },
  onTimeText: { color: '#2E7D32' },
  delayedText: { color: '#F57C00' },
  tripDetailsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
  detailItem: { width: '48%', flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  detailLabel: { fontSize: 12, color: '#666', marginLeft: 8, marginRight: 4, minWidth: 40 },
  detailValue: { fontSize: 13, fontWeight: '500', color: '#1A1A1A', flex: 1 },
  tripDateTime: { flexDirection: 'row', justifyContent: 'flex-start', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  dateTimeItem: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  dateTimeText: { fontSize: 13, color: '#666', marginLeft: 8 },
  mapContainer: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  mapTitle: { fontSize: 18, fontWeight: '600', color: '#1A237E' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF5252', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF', marginRight: 6 },
  liveText: { fontSize: 12, fontWeight: 'bold', color: '#FFF' },
  mapWrapper: { height: 300, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  noLocationContainer: { height: 300, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  noLocationText: { fontSize: 16, color: '#666', marginTop: 12 },
  noLocationSubtext: { fontSize: 12, color: '#999', marginTop: 4 },
  mapLegend: { flexDirection: 'row', justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
  legendText: { fontSize: 12, color: '#666' },
  alertsCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  alertsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  alertsTitle: { fontSize: 18, fontWeight: '600', color: '#1A237E' },
  viewAllText: { fontSize: 14, color: '#4A90E2', fontWeight: '600' },
  noAlerts: { alignItems: 'center', paddingVertical: 20 },
  noAlertsText: { fontSize: 14, color: '#999', marginTop: 8 },
  alertItem: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 12, backgroundColor: '#F8F9FA', marginBottom: 8 },
  alertContent: { flex: 1, marginLeft: 12 },
  alertMessage: { fontSize: 14, color: '#1A1A1A', marginBottom: 4 },
  alertTime: { fontSize: 12, color: '#666' },
  actionsCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  actionsTitle: { fontSize: 18, fontWeight: '600', color: '#F44336', marginBottom: 16, textAlign: 'center' },
  emergencyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F44336', borderRadius: 12, paddingVertical: 16, marginBottom: 20 },
  emergencyText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 12 },
  actionsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  actionButton: { alignItems: 'center', width: '23%' },
  actionIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionText: { fontSize: 11, color: '#666', textAlign: 'center' },
  trackingInfo: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  trackingInfoTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 12 },
  trackingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  trackingText: { fontSize: 14, color: '#666', marginLeft: 12, flex: 1 },
  noTripContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  noTripTitle: { fontSize: 24, fontWeight: 'bold', color: '#666', marginTop: 20, marginBottom: 12 },
  noTripText: { fontSize: 16, color: '#999', textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  bookTripButton: { backgroundColor: '#4CAF50', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, width: '100%', alignItems: 'center' },
  bookTripText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});

export default TrackScreen;
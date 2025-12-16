import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PassengerStackParamList } from '../../navigation/PassengerNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';

type TrackScreenNavigationProp = StackNavigationProp<PassengerStackParamList>;

const { width } = Dimensions.get('window');

const TrackScreen = () => {
  const navigation = useNavigation<TrackScreenNavigationProp>();
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [selectedView, setSelectedView] = useState<'map' | 'stops'>('map');
  const [pulseAnim] = useState(new Animated.Value(1));

  // Dummy active trip data
  const dummyTrips = [
    {
      id: 'trip-001',
      ticketNumber: 'TKT-2024-0160',
      from: 'City Center',
      to: 'Airport',
      date: 'Today',
      time: '08:00 AM - 09:30 AM',
      busNumber: 'B-001',
      seat: '3A',
      driver: 'Ali Ahmed',
      driverContact: '+92 300 1112233',
      boardingTime: '07:45 AM',
      status: 'active',
      currentLocation: 'Near University',
      nextStop: 'University Stop',
      etaToNextStop: '8 minutes',
      etaToDestination: '45 minutes',
      progress: 30,
      speed: '45 km/h',
      occupancy: '32/40 seats',
      temperature: '22°C',
      delay: '+5 minutes',
    },
  ];

  // Dummy stops data
  const dummyStops = [
    {
      id: 'stop-1',
      name: 'Main Terminal',
      time: '08:00 AM',
      status: 'departed',
      delay: '+2 min',
      passed: true,
      sequence: 1,
    },
    {
      id: 'stop-2',
      name: 'City Center',
      time: '08:30 AM',
      status: 'departed',
      delay: '+2 min',
      passed: true,
      sequence: 2,
      isBoardingStop: true,
    },
    {
      id: 'stop-3',
      name: 'University',
      time: '08:45 AM',
      status: 'arriving',
      delay: '+5 min',
      passed: false,
      sequence: 3,
      isCurrent: true,
      passengersToBoard: 5,
    },
    {
      id: 'stop-4',
      name: 'Hospital',
      time: '09:00 AM',
      status: 'upcoming',
      delay: '+7 min',
      passed: false,
      sequence: 4,
    },
    {
      id: 'stop-5',
      name: 'Airport',
      time: '09:30 AM',
      status: 'destination',
      delay: '+5 min',
      passed: false,
      sequence: 5,
      isDestination: true,
    },
  ];

  // Dummy alerts
  const dummyAlerts = [
    {
      id: 'alert-1',
      type: 'delay',
      message: 'Traffic on University Road',
      time: '2 minutes ago',
      severity: 'medium',
    },
    {
      id: 'alert-2',
      type: 'info',
      message: 'Boarding completed at City Center',
      time: '10 minutes ago',
      severity: 'low',
    },
  ];

  useEffect(() => {
    // Load active trip on component mount
    if (dummyTrips.length > 0) {
      setActiveTrip(dummyTrips[0]);
      startTracking(dummyTrips[0]);
    }

    // Start pulse animation
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
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  const startTracking = (trip: any) => {
    setIsTracking(true);

    // Initial tracking data
    setTrackingData({
      busLocation: { lat: 24.8607, lng: 67.0011 }, // Karachi coordinates
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      distanceCovered: '12 km',
      distanceRemaining: '18 km',
      estimatedArrival: '09:35 AM',
    });

    // Simulate live updates every 10 seconds
    const interval = setInterval(() => {
      setTrackingData(prev => ({
        ...prev,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        distanceCovered: (parseFloat(prev.distanceCovered) + 0.5).toFixed(1) + ' km',
        distanceRemaining: (parseFloat(prev.distanceRemaining) - 0.5).toFixed(1) + ' km',
      }));
    }, 10000);

    setRefreshInterval(interval);
  };

  const stopTracking = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
    setIsTracking(false);
  };

  const handleRefresh = () => {
    Alert.alert('Refreshing', 'Updating location data...');
    // In real app, this would fetch fresh data from server
  };

  const handleShareLocation = () => {
    Alert.alert(
      'Share Location',
      'Share your live location with:',
      [
        { text: 'Family', onPress: () => Alert.alert('Shared', 'Location shared with family') },
        { text: 'Friends', onPress: () => Alert.alert('Shared', 'Location shared with friends') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleContactDriver = () => {
    if (activeTrip?.driverContact) {
      Alert.alert(
        'Contact Driver',
        `Contact ${activeTrip.driver}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Call', onPress: () => Alert.alert('Calling', `Calling ${activeTrip.driver}`) },
          { text: 'Message', onPress: () => Alert.alert('Messaging', `Message to ${activeTrip.driver}`) },
        ]
      );
    }
  };

  const handleGetDirections = () => {
    Alert.alert('Get Directions', 'Opening maps for directions to bus stop');
    // In real app: Linking.openURL(`maps://?q=${activeTrip.currentLocation}`);
  };

  const handleEmergency = () => {
    Alert.alert(
      'Emergency Contact',
      'Choose emergency option:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call Driver', onPress: () => Alert.alert('Calling', 'Calling driver') },
        { text: 'Contact Support', onPress: () => Alert.alert('Support', 'Connecting to support') },
        { text: 'Emergency Services', style: 'destructive', onPress: () => Alert.alert('Emergency', 'Calling emergency services') },
      ]
    );
  };

  const handleSelectTrip = () => {
    Alert.alert(
      'Select Trip',
      'Choose a trip to track:',
      [
        { text: 'Cancel', style: 'cancel' },
        ...dummyTrips.map(trip => ({
          text: `${trip.from} → ${trip.to} (${trip.time})`,
          onPress: () => {
            setActiveTrip(trip);
            startTracking(trip);
          },
        })),
      ]
    );
  };

  const renderMapView = () => (
    <View style={styles.mapContainer}>
      {/* Map Header */}
      <View style={styles.mapHeader}>
        <Text style={styles.mapTitle}>LIVE TRACKING</Text>
        <View style={styles.liveIndicator}>
          <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Simplified Map Visualization */}
      <View style={styles.simplifiedMap}>
        {/* Route Line */}
        <View style={styles.routeLine} />

        {/* Stops */}
        {[0, 1, 2, 3, 4].map((position) => (
          <View
            key={position}
            style={[
              styles.stopPoint,
              {
                left: `${position * 25}%`,
                top: position % 2 === 0 ? 40 : 80,
              },
              position < 2 && styles.stopPassed,
              position === 2 && styles.stopCurrent,
            ]}
          >
            {position < 2 && <Icon name="check-circle" size={16} color="#4CAF50" />}
            {position === 2 && (
              <View style={styles.currentStop}>
                <Icon name="location-on" size={20} color="#2196F3" />
              </View>
            )}
            {position > 2 && <View style={styles.upcomingStop} />}
          </View>
        ))}

        {/* Bus Icon */}
        <View style={styles.busIconContainer}>
          <Icon name="directions-bus" size={40} color="#2196F3" />
          <View style={styles.busPulse} />
        </View>

        {/* Your Location */}
        <View style={styles.yourLocation}>
          <Icon name="person-pin-circle" size={30} color="#4CAF50" />
          <Text style={styles.yourLocationText}>You</Text>
        </View>
      </View>

      {/* Map Legend */}
      <View style={styles.mapLegend}>
        <View style={styles.legendItem}>
          <Icon name="directions-bus" size={16} color="#2196F3" />
          <Text style={styles.legendText}>Your Bus</Text>
        </View>
        <View style={styles.legendItem}>
          <Icon name="person-pin-circle" size={16} color="#4CAF50" />
          <Text style={styles.legendText}>Your Location</Text>
        </View>
        <View style={styles.legendItem}>
          <Icon name="location-on" size={16} color="#2196F3" />
          <Text style={styles.legendText}>Current Stop</Text>
        </View>
        <View style={styles.legendItem}>
          <Icon name="check-circle" size={16} color="#4CAF50" />
          <Text style={styles.legendText}>Passed Stop</Text>
        </View>
      </View>
    </View>
  );

  const renderStopsView = () => (
    <View style={styles.stopsContainer}>
      <Text style={styles.stopsTitle}>STOP-BY-STOP PROGRESS</Text>

      <View style={styles.stopsList}>
        {dummyStops.map((stop, index) => (
          <View key={stop.id} style={styles.stopItem}>
            {/* Timeline */}
            <View style={styles.timeline}>
              <View style={[
                styles.timelineDot,
                stop.passed && styles.timelineDotPassed,
                stop.isCurrent && styles.timelineDotCurrent,
                stop.isDestination && styles.timelineDotDestination,
              ]}>
                {stop.passed && <Icon name="check" size={12} color="#FFF" />}
                {stop.isCurrent && <Icon name="directions-bus" size={12} color="#FFF" />}
                {stop.isDestination && <Icon name="flag" size={12} color="#FFF" />}
              </View>
              {index < dummyStops.length - 1 && (
                <View style={[
                  styles.timelineLine,
                  stop.passed && styles.timelineLinePassed,
                ]} />
              )}
            </View>

            {/* Stop Details */}
            <View style={[
              styles.stopDetails,
              stop.isCurrent && styles.currentStopDetails,
            ]}>
              <View style={styles.stopHeader}>
                <Text style={[
                  styles.stopName,
                  stop.isCurrent && styles.currentStopName,
                  stop.isDestination && styles.destinationStopName,
                ]}>
                  {stop.name}
                  {stop.isBoardingStop && ' (Your Boarding)'}
                  {stop.isDestination && ' (Your Destination)'}
                </Text>

                <View style={styles.stopTimeBadge}>
                  <Text style={styles.stopTime}>{stop.time}</Text>
                  {stop.delay && (
                    <Text style={[
                      styles.delayText,
                      stop.status === 'arriving' && styles.delayWarning,
                    ]}>
                      {stop.delay}
                    </Text>
                  )}
                </View>
              </View>

              <Text style={[
                styles.stopStatus,
                stop.status === 'departed' && styles.statusDeparted,
                stop.status === 'arriving' && styles.statusArriving,
                stop.status === 'upcoming' && styles.statusUpcoming,
                stop.status === 'destination' && styles.statusDestination,
              ]}>
                {stop.status === 'departed' && `Departed ${stop.delay} late`}
                {stop.status === 'arriving' && `Arriving in ${activeTrip?.etaToNextStop}`}
                {stop.status === 'upcoming' && `ETA: ${stop.delay} late`}
                {stop.status === 'destination' && `ETA: ${stop.delay} late`}
              </Text>

              {stop.isCurrent && stop.passengersToBoard && (
                <View style={styles.passengersInfo}>
                  <Icon name="people" size={16} color="#666" />
                  <Text style={styles.passengersText}>
                    {stop.passengersToBoard} passengers to board
                  </Text>
                </View>
              )}

              {stop.isCurrent && (
                <View style={styles.currentAlert}>
                  <Icon name="directions-bus" size={16} color="#2196F3" />
                  <Text style={styles.currentAlertText}>
                    Bus is approaching this stop
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );

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

        <View style={styles.tripStatus}>
          <Icon name="directions-bus" size={20} color="#2196F3" />
          <Text style={styles.statusText}>🟢 ON ROUTE</Text>
        </View>
      </View>

      <View style={styles.tripDetailsGrid}>
        <View style={styles.detailItem}>
          <Icon name="confirmation-number" size={18} color="#666" />
          <Text style={styles.detailLabel}>Ticket</Text>
          <Text style={styles.detailValue}>{activeTrip?.ticketNumber}</Text>
        </View>

        <View style={styles.detailItem}>
          <Icon name="directions-bus" size={18} color="#666" />
          <Text style={styles.detailLabel}>Bus</Text>
          <Text style={styles.detailValue}>{activeTrip?.busNumber}</Text>
        </View>

        <View style={styles.detailItem}>
          <Icon name="event-seat" size={18} color="#666" />
          <Text style={styles.detailLabel}>Seat</Text>
          <Text style={styles.detailValue}>{activeTrip?.seat}</Text>
        </View>

        <View style={styles.detailItem}>
          <Icon name="person" size={18} color="#666" />
          <Text style={styles.detailLabel}>Driver</Text>
          <Text style={styles.detailValue}>{activeTrip?.driver}</Text>
        </View>
      </View>
    </View>
  );

  const renderBusStats = () => (
    <View style={styles.statsCard}>
      <Text style={styles.statsTitle}>BUS STATS</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Icon name="speed" size={24} color="#2196F3" />
          <Text style={styles.statValue}>{activeTrip?.speed}</Text>
          <Text style={styles.statLabel}>Speed</Text>
        </View>

        <View style={styles.statItem}>
          <Icon name="people" size={24} color="#4CAF50" />
          <Text style={styles.statValue}>{activeTrip?.occupancy}</Text>
          <Text style={styles.statLabel}>Occupancy</Text>
        </View>

        <View style={styles.statItem}>
          <Icon name="thermostat" size={24} color="#FF9800" />
          <Text style={styles.statValue}>{activeTrip?.temperature}</Text>
          <Text style={styles.statLabel}>Temperature</Text>
        </View>

        <View style={styles.statItem}>
          <Icon name="schedule" size={24} color="#F44336" />
          <Text style={styles.statValue}>{activeTrip?.delay}</Text>
          <Text style={styles.statLabel}>Delay</Text>
        </View>
      </View>
    </View>
  );

  const renderAlerts = () => (
    <View style={styles.alertsCard}>
      <View style={styles.alertsHeader}>
        <Text style={styles.alertsTitle}>ALERTS & UPDATES</Text>
        <TouchableOpacity onPress={() => Alert.alert('All Alerts', 'View all alerts')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {dummyAlerts.map(alert => (
        <View key={alert.id} style={[
          styles.alertItem,
          alert.severity === 'medium' && styles.alertMedium,
          alert.severity === 'low' && styles.alertLow,
        ]}>
          <Icon
            name={alert.type === 'delay' ? 'warning' : 'info'}
            size={20}
            color={alert.severity === 'medium' ? '#FF9800' : '#2196F3'}
          />
          <View style={styles.alertContent}>
            <Text style={styles.alertMessage}>{alert.message}</Text>
            <Text style={styles.alertTime}>{alert.time}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.actionsCard}>
      <Text style={styles.actionsTitle}>QUICK ACTIONS</Text>

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
          <Text style={styles.actionText}>Contact</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleGetDirections}>
          <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
            <Icon name="directions" size={24} color="#9C27B0" />
          </View>
          <Text style={styles.actionText}>Directions</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.emergencyButton}
        onPress={handleEmergency}
      >
        <Icon name="emergency" size={24} color="#FFF" />
        <Text style={styles.emergencyText}>EMERGENCY</Text>
      </TouchableOpacity>
    </View>
  );

  if (!activeTrip) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.noTripContainer}>
          <Icon name="directions-bus" size={80} color="#DDD" />
          <Text style={styles.noTripTitle}>No Active Trip</Text>
          <Text style={styles.noTripText}>
            You don't have any active trips to track right now.
          </Text>

          <TouchableOpacity
            style={styles.viewTripsButton}
            onPress={() => navigation.navigate('MyTrips')}
          >
            <Text style={styles.viewTripsText}>VIEW MY TRIPS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bookTripButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.bookTripText}>BOOK A TRIP</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon name="location-on" size={32} color="#1A237E" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>TRACK BUS</Text>
              <Text style={styles.subtitle}>Live tracking & updates</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.selectTripButton}
            onPress={handleSelectTrip}
          >
            <Icon name="swap-horiz" size={24} color="#4A90E2" />
          </TouchableOpacity>
        </View>

        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.viewOption,
              selectedView === 'map' && styles.viewOptionActive,
            ]}
            onPress={() => setSelectedView('map')}
          >
            <Icon
              name="map"
              size={20}
              color={selectedView === 'map' ? '#FFF' : '#4A90E2'}
            />
            <Text style={[
              styles.viewOptionText,
              selectedView === 'map' && styles.viewOptionTextActive,
            ]}>
              Map View
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.viewOption,
              selectedView === 'stops' && styles.viewOptionActive,
            ]}
            onPress={() => setSelectedView('stops')}
          >
            <Icon
              name="list"
              size={20}
              color={selectedView === 'stops' ? '#FFF' : '#4A90E2'}
            />
            <Text style={[
              styles.viewOptionText,
              selectedView === 'stops' && styles.viewOptionTextActive,
            ]}>
              Stops View
            </Text>
          </TouchableOpacity>
        </View>

        {/* Trip Info */}
        {renderTripInfo()}

        {/* Selected View */}
        {selectedView === 'map' ? renderMapView() : renderStopsView()}

        {/* Bus Stats */}
        {renderBusStats()}

        {/* Alerts */}
        {renderAlerts()}

        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Tracking Info */}
        <View style={styles.trackingInfo}>
          <View style={styles.trackingRow}>
            <Icon name="update" size={16} color="#666" />
            <Text style={styles.trackingText}>
              Last updated: {trackingData?.lastUpdated}
            </Text>
          </View>

          <View style={styles.trackingRow}>
            <Icon name="speed" size={16} color="#666" />
            <Text style={styles.trackingText}>
              Distance covered: {trackingData?.distanceCovered}
            </Text>
          </View>

          <View style={styles.trackingRow}>
            <Icon name="location-on" size={16} color="#666" />
            <Text style={styles.trackingText}>
              Remaining: {trackingData?.distanceRemaining}
            </Text>
          </View>

          <View style={styles.trackingRow}>
            <Icon name="schedule" size={16} color="#666" />
            <Text style={styles.trackingText}>
              ETA to destination: {trackingData?.estimatedArrival}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTextContainer: {
    marginLeft: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  selectTripButton: {
    padding: 8,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  viewOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  viewOptionActive: {
    backgroundColor: '#4A90E2',
  },
  viewOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginLeft: 8,
  },
  viewOptionTextActive: {
    color: '#FFF',
  },
  // Trip Info
  tripInfoCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tripRoute: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4A90E2',
    marginRight: 8,
  },
  destinationDot: {
    backgroundColor: '#4CAF50',
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  arrowIcon: {
    marginHorizontal: 12,
  },
  tripStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
    marginLeft: 4,
  },
  tripDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    marginRight: 4,
    minWidth: 50,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  // Map View
  mapContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A237E',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5252',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
  },
  simplifiedMap: {
    height: 200,
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  routeLine: {
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    height: 4,
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },
  stopPoint: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  stopPassed: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },
  stopCurrent: {
    borderColor: '#2196F3',
    backgroundColor: '#FFF',
  },
  currentStop: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upcomingStop: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4A90E2',
  },
  busIconContainer: {
    position: 'absolute',
    left: '30%',
    top: '30%',
  },
  busPulse: {
    position: 'absolute',
    top: -10,
    left: -10,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
  },
  yourLocation: {
    position: 'absolute',
    right: 40,
    top: '60%',
    alignItems: 'center',
  },
  yourLocationText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
  },
  mapLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: '48%',
  },
  legendText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  // Stops View
  stopsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  stopsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 20,
  },
  stopsList: {
    paddingLeft: 10,
  },
  stopItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timeline: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    zIndex: 2,
  },
  timelineDotPassed: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  timelineDotCurrent: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  timelineDotDestination: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E0E0E0',
    marginTop: 4,
    marginBottom: -24,
  },
  timelineLinePassed: {
    backgroundColor: '#4CAF50',
  },
  stopDetails: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  currentStopDetails: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 12,
  },
  currentStopName: {
    color: '#2196F3',
  },
  destinationStopName: {
    color: '#FF9800',
  },
  stopTimeBadge: {
    alignItems: 'flex-end',
  },
  stopTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  delayText: {
    fontSize: 12,
    color: '#666',
  },
  delayWarning: {
    color: '#FF9800',
    fontWeight: '600',
  },
  stopStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusDeparted: {
    color: '#4CAF50',
  },
  statusArriving: {
    color: '#2196F3',
    fontWeight: '600',
  },
  statusUpcoming: {
    color: '#666',
  },
  statusDestination: {
    color: '#FF9800',
    fontWeight: '600',
  },
  passengersInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  passengersText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  currentAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  currentAlertText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
    marginLeft: 8,
  },
  // Stats
  statsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  // Alerts
  alertsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A237E',
  },
  viewAllText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    marginBottom: 12,
  },
  alertMedium: {
    backgroundColor: '#FFF3E0',
  },
  alertLow: {
    backgroundColor: '#E3F2FD',
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertMessage: {
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: '#666',
  },
  // Quick Actions
  actionsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
    width: '23%',
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 16,
  },
  emergencyText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Tracking Info
  trackingInfo: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trackingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  // No Trip State
  noTripContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noTripTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 12,
  },
  noTripText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  viewTripsButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  viewTripsText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bookTripButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  bookTripText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TrackScreen;
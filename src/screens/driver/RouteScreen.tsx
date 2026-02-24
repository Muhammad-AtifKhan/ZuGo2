import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Navigation types
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
  route?: any; // For params
}

interface Stop {
  id: string;
  number: number;
  name: string;
  scheduledTime: string;
  actualTime?: string;
  status: 'COMPLETED' | 'CURRENT' | 'UPCOMING';
  passengerCount: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface TripData {
  id: string;
  routeName: string;
  routeCode: string;
  busNumber: string;
  tripId: string;
  totalStops: number;
  completedStops: number;
  distanceCovered: number;
  totalDistance: number;
  timeElapsed: string;
  totalTime: string;
  nextStopETA: string;
  status: 'scheduled' | 'in-progress' | 'completed';
  startTime: any;
  estimatedEndTime: any;
}

const RouteScreen: React.FC<RouteScreenProps> = ({ navigation, route }) => {
  const user = auth().currentUser;
  const tripIdFromParams = route?.params?.tripId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }));

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

  // Fetch trip data from Firebase
  useEffect(() => {
    if (!user) return;

    let unsubscribeTrip: () => void;
    let unsubscribeStops: () => void;

    const fetchTripData = async () => {
      try {
        setLoading(true);

        // Find active trip for this driver
        let tripQuery;
        if (tripIdFromParams) {
          // If tripId provided in params
          tripQuery = firestore().collection('trips').doc(tripIdFromParams);
        } else {
          // Otherwise find active trip
          tripQuery = firestore()
            .collection('trips')
            .where('driverId', '==', user.uid)
            .where('status', 'in', ['in-progress', 'ready'])
            .limit(1);
        }

        if (tripIdFromParams) {
          // Single doc listener
          unsubscribeTrip = (tripQuery as firestore.DocumentReference).onSnapshot(
            (doc) => {
              if (doc.exists) {
                const data = doc.data();
                setTripData({
                  id: doc.id,
                  routeName: data?.routeName || 'City Express',
                  routeCode: data?.routeCode || 'RT-001',
                  busNumber: data?.busNumber || 'B-001',
                  tripId: doc.id,
                  totalStops: data?.totalStops || 12,
                  completedStops: data?.completedStops || 0,
                  distanceCovered: data?.distanceCovered || 0,
                  totalDistance: data?.totalDistance || 60,
                  timeElapsed: data?.timeElapsed || '0:00',
                  totalTime: data?.totalTime || '3:00',
                  nextStopETA: data?.nextStopETA || '--:--',
                  status: data?.status || 'in-progress',
                  startTime: data?.startTime,
                  estimatedEndTime: data?.estimatedEndTime,
                });
              } else {
                Alert.alert('Error', 'Trip not found');
                navigation.goBack();
              }
            },
            (error) => {
              console.error('Error fetching trip:', error);
              setLoading(false);
            }
          );

          // Fetch stops for this trip
          unsubscribeStops = firestore()
            .collection('stops')
            .where('tripId', '==', tripIdFromParams)
            .orderBy('number', 'asc')
            .onSnapshot(
              (snapshot) => {
                const stopsData: Stop[] = [];
                snapshot.forEach(doc => {
                  const data = doc.data();
                  stopsData.push({
                    id: doc.id,
                    number: data.number || 0,
                    name: data.name || 'Unknown Stop',
                    scheduledTime: data.scheduledTime || '--:--',
                    actualTime: data.actualTime,
                    status: data.status || 'UPCOMING',
                    passengerCount: data.passengerCount || 0,
                    location: data.location,
                  });

                  // Find current stop index
                  const currentIndex = stopsData.findIndex(s => s.status === 'CURRENT');
                  if (currentIndex !== -1) {
                    setCurrentStopIndex(currentIndex);
                  }
                });
                setStops(stopsData);
                setLoading(false);
                setRefreshing(false);
              },
              (error) => {
                console.error('Error fetching stops:', error);
                setLoading(false);
                setRefreshing(false);
              }
            );
        } else {
          // Collection query listener
          unsubscribeTrip = (tripQuery as firestore.Query).onSnapshot(
            async (snapshot) => {
              if (!snapshot.empty) {
                const tripDoc = snapshot.docs[0];
                const data = tripDoc.data();
                setTripData({
                  id: tripDoc.id,
                  routeName: data?.routeName || 'City Express',
                  routeCode: data?.routeCode || 'RT-001',
                  busNumber: data?.busNumber || 'B-001',
                  tripId: tripDoc.id,
                  totalStops: data?.totalStops || 12,
                  completedStops: data?.completedStops || 0,
                  distanceCovered: data?.distanceCovered || 0,
                  totalDistance: data?.totalDistance || 60,
                  timeElapsed: data?.timeElapsed || '0:00',
                  totalTime: data?.totalTime || '3:00',
                  nextStopETA: data?.nextStopETA || '--:--',
                  status: data?.status || 'in-progress',
                  startTime: data?.startTime,
                  estimatedEndTime: data?.estimatedEndTime,
                });

                // Fetch stops for this trip
                unsubscribeStops = firestore()
                  .collection('stops')
                  .where('tripId', '==', tripDoc.id)
                  .orderBy('number', 'asc')
                  .onSnapshot(
                    (stopSnapshot) => {
                      const stopsData: Stop[] = [];
                      stopSnapshot.forEach(doc => {
                        const data = doc.data();
                        stopsData.push({
                          id: doc.id,
                          number: data.number || 0,
                          name: data.name || 'Unknown Stop',
                          scheduledTime: data.scheduledTime || '--:--',
                          actualTime: data.actualTime,
                          status: data.status || 'UPCOMING',
                          passengerCount: data.passengerCount || 0,
                          location: data.location,
                        });

                        // Find current stop index
                        const currentIndex = stopsData.findIndex(s => s.status === 'CURRENT');
                        if (currentIndex !== -1) {
                          setCurrentStopIndex(currentIndex);
                        }
                      });
                      setStops(stopsData);
                      setLoading(false);
                      setRefreshing(false);
                    },
                    (error) => {
                      console.error('Error fetching stops:', error);
                      setLoading(false);
                      setRefreshing(false);
                    }
                  );
              } else {
                Alert.alert(
                  'No Active Trip',
                  'You don\'t have any active trip.',
                  [
                    {
                      text: 'Go to Dashboard',
                      onPress: () => navigation.navigate('Dashboard')
                    }
                  ]
                );
                setLoading(false);
              }
            },
            (error) => {
              console.error('Error fetching trip:', error);
              setLoading(false);
              setRefreshing(false);
            }
          );
        }

      } catch (error) {
        console.error('Error in fetchTripData:', error);
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchTripData();

    return () => {
      if (unsubscribeTrip) unsubscribeTrip();
      if (unsubscribeStops) unsubscribeStops();
    };
  }, [user, tripIdFromParams]);

  // Handle mark stop as reached
  const handleMarkReached = async () => {
    if (!tripData || !stops.length) return;

    const currentStop = stops[currentStopIndex];
    if (!currentStop) return;

    Alert.alert(
      'Confirm Stop Reached',
      `Have you reached ${currentStop.name}?\n\n${currentStop.passengerCount} passengers waiting to board.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Mark Reached',
          onPress: async () => {
            try {
              const batch = firestore().batch();
              const now = new Date();
              const currentTimeStr = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              }).slice(0, 5);

              // Update current stop
              const stopRef = firestore().collection('stops').doc(currentStop.id);
              batch.update(stopRef, {
                status: 'COMPLETED',
                actualTime: currentTimeStr,
                reachedAt: firestore.FieldValue.serverTimestamp(),
              });

              // Update next stop if exists
              if (currentStopIndex < stops.length - 1) {
                const nextStopRef = firestore().collection('stops').doc(stops[currentStopIndex + 1].id);
                batch.update(nextStopRef, {
                  status: 'CURRENT',
                });

                // Update trip progress
                const tripRef = firestore().collection('trips').doc(tripData.id);
                batch.update(tripRef, {
                  completedStops: currentStopIndex + 1,
                  currentStopId: stops[currentStopIndex + 1].id,
                  distanceCovered: ((currentStopIndex + 1) / stops.length) * tripData.totalDistance,
                  lastUpdated: firestore.FieldValue.serverTimestamp(),
                });

                setCurrentStopIndex(prev => prev + 1);
              } else {
                // Last stop reached - complete trip
                const tripRef = firestore().collection('trips').doc(tripData.id);
                batch.update(tripRef, {
                  status: 'completed',
                  completedStops: stops.length,
                  completedAt: firestore.FieldValue.serverTimestamp(),
                });

                Alert.alert(
                  'Trip Completed!',
                  'You have reached the final stop. Trip completed successfully.',
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.navigate('Dashboard')
                    }
                  ]
                );
              }

              await batch.commit();

              Alert.alert(
                'Stop Reached',
                `You have reached ${currentStop.name}. ${currentStop.passengerCount} passengers can now board.`,
                [{ text: 'OK' }]
              );

            } catch (error) {
              console.error('Error marking stop reached:', error);
              Alert.alert('Error', 'Failed to update stop status. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Handle report delay
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
                stopId: stops[currentStopIndex]?.id,
                stopName: stops[currentStopIndex]?.name,
                reason: 'Traffic Congestion',
                estimatedDelay: '10 min',
                timestamp: firestore.FieldValue.serverTimestamp(),
              });
              Alert.alert('Delay Reported', 'Traffic delay reported to dispatch.');
            } catch (error) {
              Alert.alert('Error', 'Failed to report delay.');
            }
          }
        },
        {
          text: 'Passenger Delay',
          onPress: async () => {
            try {
              await firestore().collection('delays').add({
                tripId: tripData.id,
                driverId: user?.uid,
                stopId: stops[currentStopIndex]?.id,
                stopName: stops[currentStopIndex]?.name,
                reason: 'Passenger Delay',
                estimatedDelay: '3 min',
                timestamp: firestore.FieldValue.serverTimestamp(),
              });
              Alert.alert('Delay Reported', 'Passenger delay reported.');
            } catch (error) {
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
                stopId: stops[currentStopIndex]?.id,
                stopName: stops[currentStopIndex]?.name,
                reason: 'Mechanical Issue',
                estimatedDelay: '20 min',
                timestamp: firestore.FieldValue.serverTimestamp(),
              });
              Alert.alert('Delay Reported', 'Mechanical issue reported to maintenance.');
            } catch (error) {
              Alert.alert('Error', 'Failed to report issue.');
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Handle emergency
  const handleEmergency = () => {
    Alert.alert(
      '🚨 EMERGENCY',
      'This will contact emergency services. Are you sure?',
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
                location: stops[currentStopIndex]?.name,
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

  // Render stop item
  const renderStopItem = (stop: Stop) => {
    let statusIndicator = '○';
    let statusColor = '#666666';
    let statusText = 'Upcoming';

    switch (stop.status) {
      case 'COMPLETED':
        statusIndicator = '✓';
        statusColor = '#4CAF50';
        statusText = `Reached at ${stop.actualTime}`;
        break;
      case 'CURRENT':
        statusIndicator = '→';
        statusColor = '#2196F3';
        statusText = 'Current Stop';
        break;
      case 'UPCOMING':
        statusIndicator = '○';
        statusColor = '#666666';
        statusText = `Scheduled: ${stop.scheduledTime}`;
        break;
    }

    return (
      <View key={stop.id} style={styles.stopItem}>
        <View style={styles.stopNumberContainer}>
          <View style={[styles.stopNumberCircle, { borderColor: statusColor }]}>
            <Text style={[styles.stopNumber, { color: statusColor }]}>{stop.number}</Text>
          </View>
          {stop.number < stops.length && (
            <View style={[styles.verticalLine, { backgroundColor: statusColor }]} />
          )}
        </View>

        <View style={styles.stopInfo}>
          <Text style={styles.stopName}>
            {stop.status === 'CURRENT' && '📍 '}{stop.name}
          </Text>
          <Text style={[styles.stopStatus, { color: statusColor }]}>
            {statusIndicator} {statusText}
          </Text>
          <Text style={styles.passengerInfo}>
            👥 {stop.passengerCount} passengers
          </Text>
        </View>
      </View>
    );
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    if (!tripData) return 0;
    return (tripData.completedStops / stops.length) * 100;
  };

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Data will auto-refresh via Firebase listeners
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading route data...</Text>
      </SafeAreaView>
    );
  }

  const currentStop = stops[currentStopIndex];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1A237E" barStyle="light-content" />

      {/* Top Bar */}
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Simple Map Representation */}
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapTitle}>📍 Route Map</Text>
            <Text style={styles.mapSubtitle}>{tripData?.routeName}</Text>

            {/* Simple map visualization */}
            <View style={styles.simpleMap}>
              {/* Route line */}
              <View style={styles.routeLine} />

              {/* Stops */}
              {stops.map((stop, index) => (
                <View
                  key={stop.id}
                  style={[
                    styles.mapStop,
                    {
                      left: `${(index / (stops.length - 1)) * 80}%`,
                      backgroundColor: stop.status === 'CURRENT' ? '#2196F3' :
                                     stop.status === 'COMPLETED' ? '#4CAF50' : '#E0E0E0'
                    }
                  ]}
                >
                  <Text style={styles.mapStopNumber}>{stop.number}</Text>
                </View>
              ))}

              {/* Driver position */}
              <View style={[styles.driverPosition, { left: `${(currentStopIndex / (stops.length - 1)) * 80}%` }]}>
                <Text style={styles.driverEmoji}>🚌</Text>
              </View>
            </View>

            {/* Map legend */}
            <View style={styles.mapLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#2196F3' }]} />
                <Text style={styles.legendText}>Current</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.legendText}>Completed</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#E0E0E0' }]} />
                <Text style={styles.legendText}>Upcoming</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Current Stop Section */}
        <View style={styles.currentStopSection}>
          <Text style={styles.sectionTitle}>📍 CURRENT STOP</Text>

          <View style={styles.currentStopCard}>
            <View style={styles.stopHeader}>
              <Text style={styles.stopNumberLarge}>#{currentStop?.number}</Text>
              <Text style={styles.stopNameLarge}>{currentStop?.name}</Text>
            </View>

            <View style={styles.stopTiming}>
              <View style={styles.timingItem}>
                <Text style={styles.timingLabel}>Scheduled</Text>
                <Text style={styles.timingValue}>{currentStop?.scheduledTime}</Text>
              </View>
              <View style={styles.timingDivider} />
              <View style={styles.timingItem}>
                <Text style={styles.timingLabel}>Actual</Text>
                <Text style={styles.timingValue}>
                  {currentStop?.actualTime || '--:--'}
                </Text>
              </View>
            </View>

            <Text style={styles.passengerAlert}>
              👥 {currentStop?.passengerCount || 0} passengers waiting to board
            </Text>

            {/* Control Buttons */}
            <View style={styles.controlButtons}>
              <TouchableOpacity
                style={[styles.controlButton, styles.reachedButton]}
                onPress={handleMarkReached}
              >
                <Text style={styles.reachedButtonText}>✓ MARK REACHED</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, styles.delayButton]}
                onPress={handleReportDelay}
              >
                <Text style={styles.delayButtonText}>⏰ REPORT DELAY</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* All Stops List */}
        <View style={styles.stopsSection}>
          <Text style={styles.sectionTitle}>🗺️ ALL STOPS ({stops.length})</Text>
          <View style={styles.stopsList}>
            {stops.map(renderStopItem)}
          </View>
        </View>

        {/* Trip Progress */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>📊 TRIP PROGRESS</Text>

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.tripId}>Trip ID: {tripData?.tripId?.slice(0, 8)}</Text>
              <Text style={styles.progressPercentage}>
                {Math.round(calculateProgress())}%
              </Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${calculateProgress()}%` }
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>Start</Text>
                <Text style={styles.progressLabel}>End</Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{tripData?.completedStops}/{tripData?.totalStops}</Text>
                <Text style={styles.statLabel}>Stops</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{Math.round(tripData?.distanceCovered || 0)} km</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{tripData?.nextStopETA}</Text>
                <Text style={styles.statLabel}>Next ETA</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Floating Emergency Button */}
      <TouchableOpacity
        style={styles.floatingEmergencyButton}
        onPress={handleEmergency}
        activeOpacity={0.8}
      >
        <View style={styles.emergencyButtonInner}>
          <Text style={styles.emergencyButtonEmoji}>🚨</Text>
          <Text style={styles.emergencyButtonText}>EMERGENCY</Text>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

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
    marginTop: 12,
    fontSize: 16,
    color: '#4A90E2',
  },
  topBar: {
    backgroundColor: '#1A237E',
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  routeSubtitle: {
    fontSize: 14,
    color: '#E3F2FD',
    marginTop: 2,
  },
  timeContainer: {
    alignItems: 'flex-end',
  },
  currentTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  mapContainer: {
    margin: 16,
  },
  mapPlaceholder: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  mapSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  simpleMap: {
    height: 120,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    marginBottom: 16,
    position: 'relative',
  },
  routeLine: {
    position: 'absolute',
    top: 60,
    left: '10%',
    right: '10%',
    height: 3,
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },
  mapStop: {
    position: 'absolute',
    top: 50,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  mapStopNumber: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  driverPosition: {
    position: 'absolute',
    top: 30,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverEmoji: {
    fontSize: 30,
  },
  mapLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666666',
  },
  currentStopSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
  },
  currentStopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stopNumberLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginRight: 12,
  },
  stopNameLarge: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A237E',
    flex: 1,
  },
  stopTiming: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  timingItem: {
    flex: 1,
    alignItems: 'center',
  },
  timingLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  timingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  timingDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  passengerAlert: {
    fontSize: 14,
    color: '#FF9800',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    textAlign: 'center',
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reachedButton: {
    backgroundColor: '#4CAF50',
  },
  delayButton: {
    backgroundColor: '#FF9800',
  },
  reachedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  delayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stopsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  stopsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stopItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stopNumberContainer: {
    width: 40,
    alignItems: 'center',
  },
  stopNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stopNumber: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  verticalLine: {
    width: 2,
    flex: 1,
  },
  stopInfo: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 4,
  },
  stopStatus: {
    fontSize: 13,
    marginBottom: 4,
  },
  passengerInfo: {
    fontSize: 12,
    color: '#666666',
  },
  progressSection: {
    marginHorizontal: 16,
    marginBottom: 120, // Extra space for floating button
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tripId: {
    fontSize: 14,
    color: '#666666',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  progressBarContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 12,
    color: '#666666',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  // Floating Emergency Button Styles
  floatingEmergencyButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#F44336',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
    flexDirection: 'row',
    minWidth: 140,
  },
  emergencyButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyButtonEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  emergencyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RouteScreen;
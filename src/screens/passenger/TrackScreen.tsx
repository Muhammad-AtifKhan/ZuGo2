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
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { PassengerStackParamList } from '../../navigation/PassengerNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

type TrackScreenNavigationProp = StackNavigationProp<PassengerStackParamList, 'Track'>;
type TrackScreenRouteProp = RouteProp<PassengerStackParamList, 'Track'>;

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
  seat: string;
  driver: string;
  driverId: string;
  driverContact: string;
  boardingTime: string;
  status: string;
  routeId: string;
  currentLocation?: string;
  nextStop?: string;
  etaToNextStop?: string;
  etaToDestination?: string;
  progress?: number;
  speed?: string;
  occupancy?: string;
  temperature?: string;
  delay?: string;
}

interface Stop {
  id: string;
  name: string;
  time: string;
  status: 'departed' | 'arriving' | 'upcoming' | 'destination';
  delay: string;
  passed: boolean;
  sequence: number;
  isCurrent?: boolean;
  isDestination?: boolean;
  isBoardingStop?: boolean;
  passengersToBoard?: number;
}

interface Alert {
  id: string;
  type: 'delay' | 'info' | 'warning';
  message: string;
  time: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: any;
}

interface TrackingData {
  busLocation: {
    lat: number;
    lng: number;
    address?: string;
  };
  lastUpdated: string;
  distanceCovered: string;
  distanceRemaining: string;
  estimatedArrival: string;
  speed: number;
  heading?: number;
}

const TrackScreen = () => {
  const navigation = useNavigation<TrackScreenNavigationProp>();
  const route = useRoute<TrackScreenRouteProp>();
  const user = auth().currentUser;

  // Get params from navigation
  const { tripId, busNumber, from, to, routeId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [selectedView, setSelectedView] = useState<'map' | 'stops'>('map');
  const [pulseAnim] = useState(new Animated.Value(1));

  // Refs for tracking interval
  const trackingInterval = useRef<NodeJS.Timeout | null>(null);

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
      if (trackingInterval.current) {
        clearInterval(trackingInterval.current);
      }
    };
  }, []);

  // Load trip data from Firebase
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (tripId) {
      loadTripData(tripId);
    } else {
      loadActiveTrip();
    }
  }, [user, tripId]);

  const loadTripData = async (id: string) => {
    try {
      setLoading(true);

      // Get booking/trip data
      const bookingDoc = await firestore().collection('bookings').doc(id).get();

      if (!bookingDoc.exists) {
        setLoading(false);
        return;
      }

      const bookingData = bookingDoc.data();

      // Get trip details
      const tripDoc = await firestore()
        .collection('trips')
        .doc(bookingData?.tripId)
        .get();

      if (!tripDoc.exists) {
        setLoading(false);
        return;
      }

      const tripData = tripDoc.data();

      // Get driver info
      let driverName = 'Not assigned';
      let driverContact = '';

      if (tripData?.driverId) {
        const driverDoc = await firestore()
          .collection('drivers')
          .doc(tripData.driverId)
          .get();

        if (driverDoc.exists) {
          const driverData = driverDoc.data();
          driverName = driverData?.fullName || 'Driver';
          driverContact = driverData?.contactNumber || '';
        }
      }

      // Set active trip
      const trip: Trip = {
        id: bookingDoc.id,
        ticketNumber: bookingData?.ticketNumber || `TKT-${id.slice(0, 8)}`,
        from: bookingData?.from || tripData?.from || '',
        to: bookingData?.to || tripData?.to || '',
        fromCode: bookingData?.fromCode || tripData?.fromCode || '',
        toCode: bookingData?.toCode || tripData?.toCode || '',
        date: formatDate(bookingData?.travelDate?.toDate?.() || new Date()),
        departureTime: tripData?.departureTime || '00:00',
        arrivalTime: tripData?.arrivalTime || '00:00',
        busNumber: tripData?.busNumber || 'N/A',
        busId: tripData?.busId || '',
        seat: bookingData?.seatNumber || bookingData?.seatIds?.[0] || 'N/A',
        driver: driverName,
        driverId: tripData?.driverId || '',
        driverContact: driverContact,
        boardingTime: tripData?.departureTime || '00:00',
        status: tripData?.status || 'scheduled',
        routeId: tripData?.routeId || '',
        currentLocation: tripData?.currentLocation || 'On route',
        nextStop: tripData?.nextStop || '',
        etaToNextStop: tripData?.etaToNextStop || '10 min',
        etaToDestination: tripData?.etaToDestination || '45 min',
        progress: tripData?.progress || 30,
        speed: tripData?.speed || '45 km/h',
        occupancy: `${bookingData?.seatIds?.length || 0}/${tripData?.totalSeats || 40} seats`,
        temperature: tripData?.temperature || '22°C',
        delay: tripData?.delay ? `+${tripData.delay} min` : 'On time',
      };

      setActiveTrip(trip);

      // Load stops for this route
      await loadStops(tripData?.routeId || tripData?.id);

      // Load alerts for this trip
      await loadAlerts(id);

      // Start real-time tracking
      startTracking(trip);

    } catch {
      Alert.alert('Error', 'Failed to load trip data');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveTrip = async () => {
    try {
      setLoading(true);

      // Find active trips for this user
      const snapshot = await firestore()
        .collection('bookings')
        .where('userId', '==', user?.uid)
        .where('status', 'in', ['confirmed', 'boarding'])
        .orderBy('travelDate', 'asc')
        .limit(1)
        .get();

      if (snapshot.empty) {
        setLoading(false);
        return;
      }

      const bookingDoc = snapshot.docs[0];
      await loadTripData(bookingDoc.id);

    } catch {
      setLoading(false);
    }
  };

  const loadStops = async (routeId: string) => {
    try {
      const snapshot = await firestore()
        .collection('stops')
        .where('routeId', '==', routeId)
        .orderBy('sequence', 'asc')
        .get();

      const stopsList: Stop[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        stopsList.push({
          id: doc.id,
          name: data.name,
          time: data.time,
          status: data.status || 'upcoming',
          delay: data.delay || '',
          passed: data.passed || false,
          sequence: data.sequence,
          isCurrent: data.isCurrent || false,
          isDestination: data.isDestination || false,
          isBoardingStop: data.isBoardingStop || false,
          passengersToBoard: data.passengersToBoard,
        });
      });

      setStops(stopsList);
    } catch (error) {
      console.error('Error loading stops:', error);
    }
  };

  const loadAlerts = async (tripId: string) => {
    try {
      const snapshot = await firestore()
        .collection('alerts')
        .where('tripId', '==', tripId)
        .orderBy('timestamp', 'desc')
        .limit(5)
        .get();

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
          severity: data.severity || 'low',
          timestamp: data.timestamp,
        });
      });

      setAlerts(alertsList);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return 'Yesterday';
  };

  const formatDate = (date: Date): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const startTracking = (trip: Trip) => {
    setIsTracking(true);

    // Initial tracking data
    setTrackingData({
      busLocation: {
        lat: 24.8607,
        lng: 67.0011,
        address: trip.currentLocation || 'On route',
      },
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      distanceCovered: '12 km',
      distanceRemaining: '18 km',
      estimatedArrival: trip.etaToDestination || '09:35 AM',
      speed: 45,
    });

    // Simulate real-time updates (in real app, use WebSocket or Firebase real-time listeners)
    if (trackingInterval.current) {
      clearInterval(trackingInterval.current);
    }

    trackingInterval.current = setInterval(() => {
      setTrackingData(prev => {
        if (!prev) return prev;

        const distanceCoveredNum = parseFloat(prev.distanceCovered) + 0.5;
        const distanceRemainingNum = parseFloat(prev.distanceRemaining) - 0.5;

        return {
          ...prev,
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          distanceCovered: distanceCoveredNum.toFixed(1) + ' km',
          distanceRemaining: distanceRemainingNum > 0 ? distanceRemainingNum.toFixed(1) + ' km' : '0 km',
        };
      });
    }, 10000);
  };

  const stopTracking = () => {
    if (trackingInterval.current) {
      clearInterval(trackingInterval.current);
      trackingInterval.current = null;
    }
    setIsTracking(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);

    // Simulate refresh
    setTimeout(() => {
      setTrackingData(prev => ({
        ...prev!,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      setRefreshing(false);
      Alert.alert('Updated', 'Location data refreshed successfully');
    }, 1000);
  };

  const handleShareLocation = async () => {
    try {
      const shareContent = {
        title: 'My Bus Location',
        message: `I'm currently tracking my bus:\n\nBus: ${activeTrip?.busNumber}\nFrom: ${activeTrip?.from}\nTo: ${activeTrip?.to}\nCurrent Location: ${activeTrip?.currentLocation}\nETA: ${activeTrip?.etaToDestination}\n\nLive tracking available on ZUGO App`,
      };

      const result = await Share.share(shareContent);

      if (result.action === Share.sharedAction) {
        Alert.alert('Shared', 'Location shared successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share location');
    }
  };

  const handleContactDriver = async () => {
    if (activeTrip?.driverContact) {
      Alert.alert(
        'Contact Driver',
        `Driver: ${activeTrip.driver}\nBus: ${activeTrip.busNumber}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: '📞 Call',
            onPress: async () => {
              try {
                const phoneNumber = `tel:${activeTrip.driverContact}`;
                const canOpen = await Linking.canOpenURL(phoneNumber);
                if (canOpen) {
                  await Linking.openURL(phoneNumber);
                } else {
                  Alert.alert('Cannot Call', 'Phone calling is not available on this device');
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to make phone call');
              }
            }
          },
          {
            text: '💬 Message',
            onPress: async () => {
              try {
                const message = `Hello ${activeTrip.driver}, this is passenger on bus ${activeTrip.busNumber} (Ticket: ${activeTrip.ticketNumber}).`;
                const url = Platform.select({
                  ios: `sms:${activeTrip.driverContact}&body=${encodeURIComponent(message)}`,
                  android: `sms:${activeTrip.driverContact}?body=${encodeURIComponent(message)}`,
                });

                if (url) {
                  const canOpen = await Linking.canOpenURL(url);
                  if (canOpen) {
                    await Linking.openURL(url);
                  } else {
                    Alert.alert('Cannot Message', 'SMS app is not available');
                  }
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to open messaging app');
              }
            }
          },
        ]
      );
    }
  };

  const handleGetDirections = async () => {
    if (activeTrip?.currentLocation) {
      Alert.alert(
        'Get Directions',
        `Get directions to ${activeTrip.currentLocation}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Google Maps',
            onPress: async () => {
              try {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeTrip.currentLocation!)}&travelmode=transit`;
                const canOpen = await Linking.canOpenURL(url);
                if (canOpen) {
                  await Linking.openURL(url);
                } else {
                  Alert.alert('Cannot Open', 'Google Maps is not installed');
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to open Google Maps');
              }
            }
          },
          {
            text: 'Apple Maps',
            onPress: async () => {
              try {
                const url = `http://maps.apple.com/?daddr=${encodeURIComponent(activeTrip.currentLocation!)}&dirflg=r`;
                const canOpen = await Linking.canOpenURL(url);
                if (canOpen) {
                  await Linking.openURL(url);
                } else {
                  Alert.alert('Cannot Open', 'Apple Maps is not available');
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to open Apple Maps');
              }
            }
          },
        ]
      );
    }
  };

  const handleEmergency = () => {
    Alert.alert(
      '🚨 EMERGENCY CONTACT 🚨',
      'Choose emergency contact option:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '📞 Call Driver',
          onPress: async () => {
            if (activeTrip?.driverContact) {
              try {
                const phoneNumber = `tel:${activeTrip.driverContact}`;
                await Linking.openURL(phoneNumber);
              } catch (error) {
                Alert.alert('Error', 'Cannot make emergency call');
              }
            }
          }
        },
        {
          text: '📞 Contact Support',
          onPress: async () => {
            try {
              await Linking.openURL('tel:+923001234567');
            } catch (error) {
              Alert.alert('Support', 'Call: +92 300 1234567');
            }
          }
        },
        {
          text: '🚨 Emergency Services',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Emergency Services',
              'Choose emergency service:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Police - 15',
                  onPress: async () => {
                    try {
                      await Linking.openURL('tel:15');
                    } catch (error) {
                      Alert.alert('Police', 'Dial: 15');
                    }
                  }
                },
                {
                  text: 'Ambulance - 115',
                  onPress: async () => {
                    try {
                      await Linking.openURL('tel:115');
                    } catch (error) {
                      Alert.alert('Ambulance', 'Dial: 115');
                    }
                  }
                },
                {
                  text: 'Rescue - 1122',
                  onPress: async () => {
                    try {
                      await Linking.openURL('tel:1122');
                    } catch (error) {
                      Alert.alert('Rescue', 'Dial: 1122');
                    }
                  }
                },
              ]
            );
          }
        },
        {
          text: '📍 Share Emergency Location',
          onPress: () => {
            const emergencyMessage = `🚨 EMERGENCY ALERT 🚨\n\nI'm on bus ${activeTrip?.busNumber}\nFrom: ${activeTrip?.from}\nTo: ${activeTrip?.to}\nCurrent Location: ${activeTrip?.currentLocation}\nDriver: ${activeTrip?.driver}\nTicket: ${activeTrip?.ticketNumber}\n\n🚨 NEED IMMEDIATE ASSISTANCE 🚨`;

            Share.share({
              title: 'EMERGENCY ALERT',
              message: emergencyMessage,
            });
          }
        },
      ]
    );
  };

  const handleViewAllAlerts = () => {
    navigation.navigate('Alerts', {
      tripId: activeTrip?.id,
      busNumber: activeTrip?.busNumber
    });
  };

  const handleAlertPress = (alert: Alert) => {
    Alert.alert(
      alert.type === 'delay' ? 'Delay Alert' : 'Information',
      alert.message,
      [
        { text: 'OK' },
        {
          text: 'Mark as Read',
          onPress: async () => {
            try {
              await firestore().collection('alerts').doc(alert.id).update({
                read: true,
              });
              // Remove from local state
              setAlerts(prev => prev.filter(a => a.id !== alert.id));
            } catch (error) {
              console.error('Error marking alert as read:', error);
            }
          }
        }
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
        {stops.map((stop, index) => {
          const position = (index / (stops.length - 1)) * 100;
          return (
            <View
              key={stop.id}
              style={[
                styles.stopPoint,
                {
                  left: `${position}%`,
                  top: index % 2 === 0 ? 40 : 80,
                },
                stop.passed && styles.stopPassed,
                stop.isCurrent && styles.stopCurrent,
              ]}
            >
              {stop.passed && <Icon name="check-circle" size={16} color="#4CAF50" />}
              {stop.isCurrent && (
                <View style={styles.currentStop}>
                  <Icon name="location-on" size={20} color="#2196F3" />
                </View>
              )}
              {!stop.passed && !stop.isCurrent && <View style={styles.upcomingStop} />}
            </View>
          );
        })}

        {/* Bus Icon */}
        <View style={[styles.busIconContainer, { left: `${activeTrip?.progress || 30}%` }]}>
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
        {stops.map((stop, index) => (
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
              {index < stops.length - 1 && (
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
                  {stop.delay ? (
                    <Text style={[
                      styles.delayText,
                      stop.status === 'arriving' && styles.delayWarning,
                    ]}>
                      {stop.delay}
                    </Text>
                  ) : null}
                </View>
              </View>

              <Text style={[
                styles.stopStatus,
                stop.status === 'departed' && styles.statusDeparted,
                stop.status === 'arriving' && styles.statusArriving,
                stop.status === 'upcoming' && styles.statusUpcoming,
                stop.status === 'destination' && styles.statusDestination,
              ]}>
                {stop.status === 'departed' && `Departed ${stop.delay}`}
                {stop.status === 'arriving' && `Arriving in ${activeTrip?.etaToNextStop}`}
                {stop.status === 'upcoming' && `ETA: ${stop.delay}`}
                {stop.status === 'destination' && `ETA: ${stop.delay}`}
              </Text>

              {stop.isCurrent && stop.passengersToBoard ? (
                <View style={styles.passengersInfo}>
                  <Icon name="people" size={16} color="#666" />
                  <Text style={styles.passengersText}>
                    {stop.passengersToBoard} passengers to board
                  </Text>
                </View>
              ) : null}

              {stop.isCurrent ? (
                <View style={styles.currentAlert}>
                  <Icon name="directions-bus" size={16} color="#2196F3" />
                  <Text style={styles.currentAlertText}>
                    Bus is approaching this stop
                  </Text>
                </View>
              ) : null}
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
          <Text style={styles.statusText}>
            {activeTrip?.delay === 'On time' ? '🟢 ON TIME' : '🟡 DELAYED'}
          </Text>
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
        <TouchableOpacity onPress={handleViewAllAlerts}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {alerts.map(alert => (
        <TouchableOpacity
          key={alert.id}
          style={[
            styles.alertItem,
            alert.severity === 'medium' && styles.alertMedium,
            alert.severity === 'high' && styles.alertHigh,
            alert.severity === 'low' && styles.alertLow,
          ]}
          onPress={() => handleAlertPress(alert)}
        >
          <Icon
            name={alert.type === 'delay' ? 'warning' : 'info'}
            size={20}
            color={
              alert.severity === 'high' ? '#F44336' :
              alert.severity === 'medium' ? '#FF9800' : '#2196F3'
            }
          />
          <View style={styles.alertContent}>
            <Text style={styles.alertMessage}>{alert.message}</Text>
            <Text style={styles.alertTime}>{alert.time}</Text>
          </View>
        </TouchableOpacity>
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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading tracking data...</Text>
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon name="location-on" size={32} color="#1A237E" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>TRACK BUS</Text>
              <Text style={styles.subtitle}>Live tracking & updates</Text>
            </View>
          </View>
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
  alertHigh: {
    backgroundColor: '#FFEBEE',
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
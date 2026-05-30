// src/screens/passenger/MyTripsScreen.tsx - STANDARDIZED STATUSES
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PassengerStackParamList } from '../../navigation/PassengerNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// ✅ Import standardized status constants
import { TRIP_STATUS } from '../../constants/status';

type MyTripsScreenNavigationProp = StackNavigationProp<PassengerStackParamList>;

interface Trip {
  id: string;
  ticketNumber: string;
  bookingCode?: string;
  from: string;
  to: string;
  fromCode: string;
  toCode: string;
  date: string;
  rawDate: Date;
  time: string;
  departureTime: string;
  arrivalTime: string;
  busNumber: string;
  busId: string;
  tripId: string;
  seat: string;
  seatIds: string[];
  status: 'pending' | 'confirmed' | 'boarding' | 'active' | 'completed' | 'cancelled' | 'expired';
  statusText: string;
  color: string;
  boardingTime: string;
  driver: string;
  driverId: string;
  driverContact: string;
  fare: number;
  serviceFee: number;
  total: number;
  qrCode: string;
  stops: Stop[];
  amenities: string[];
  rating?: number;
  canRate?: boolean;
  feedback?: string;
  bookingDate: any;
  routeId: string;
  routeName: string;
  busType: string;
  paymentMethod?: string;
  paymentDeadline?: Date;
}

interface Stop {
  name: string;
  time: string;
  order: number;
}

const MyTripsScreen = () => {
  const navigation = useNavigation<MyTripsScreenNavigationProp>();
  const user = auth().currentUser;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'upcoming' | 'active' | 'past'>('upcoming');

  // State for trips
  const [upcomingTrips, setUpcomingTrips] = useState<Trip[]>([]);
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [pastTrips, setPastTrips] = useState<Trip[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);

  // Modal states
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'view' | 'cancel' | 'reschedule' | 'rate'>('view');

  // Cancellation states
  const [cancellationReason, setCancellationReason] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const cancellationReasons = [
    'Change of plans',
    'Found cheaper option',
    'Bus timing not suitable',
    'Personal emergency',
    'Travel dates changed',
    'Other reason',
  ];

  // Reschedule states
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);

  // Rating state
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  // Fetch user's trips from Firebase
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchUserTrips();
  }, [user]);

  // ✅ Updated: Map trip status to standardized status
  const mapTripStatus = (tripStatus: string): string => {
    if (tripStatus === TRIP_STATUS.SCHEDULED) return TRIP_STATUS.SCHEDULED;
    if (tripStatus === TRIP_STATUS.BOARDING) return TRIP_STATUS.BOARDING;
    if (tripStatus === TRIP_STATUS.IN_PROGRESS) return TRIP_STATUS.IN_PROGRESS;
    if (tripStatus === TRIP_STATUS.COMPLETED) return TRIP_STATUS.COMPLETED;
    if (tripStatus === TRIP_STATUS.CANCELLED) return TRIP_STATUS.CANCELLED;
    if (tripStatus === TRIP_STATUS.DELAYED) return TRIP_STATUS.DELAYED;
    if (tripStatus === TRIP_STATUS.EXPIRED) return TRIP_STATUS.EXPIRED;

    // Map legacy statuses
    if (tripStatus === 'scheduled' || tripStatus === 'upcoming') return TRIP_STATUS.SCHEDULED;
    if (tripStatus === 'boarding') return TRIP_STATUS.BOARDING;
    if (tripStatus === 'active' || tripStatus === 'in-progress' || tripStatus === 'in_progress') return TRIP_STATUS.IN_PROGRESS;
    if (tripStatus === 'completed') return TRIP_STATUS.COMPLETED;
    if (tripStatus === 'cancelled') return TRIP_STATUS.CANCELLED;
    if (tripStatus === 'expired') return TRIP_STATUS.EXPIRED;

    return TRIP_STATUS.SCHEDULED;
  };

  // ✅ Updated: Determine display status based on booking and trip status
  const determineTripStatus = (
    tripStatus: string,
    bookingStatus: string,
    paymentStatus?: string,
    travelDate?: Date
  ) => {
    const now = new Date();
    const isPastTrip = travelDate && travelDate < now;

    // Map trip status to standardized first
    const mappedTripStatus = mapTripStatus(tripStatus);

    // PENDING PAYMENT
    if (bookingStatus === 'pending_payment' || paymentStatus === 'pending') {
      return {
        status: 'pending' as const,
        text: '⏳ PAYMENT PENDING',
        color: '#FF9800',
      };
    }

    // CANCELLED
    if (bookingStatus === 'cancelled') {
      return {
        status: 'cancelled' as const,
        text: '❌ CANCELLED',
        color: '#F44336',
      };
    }

    // COMPLETED (from booking)
    if (bookingStatus === 'completed') {
      return {
        status: 'completed' as const,
        text: '✅ COMPLETED',
        color: '#9E9E9E',
      };
    }

    // Based on standardized trip status
    switch (mappedTripStatus) {
      case TRIP_STATUS.BOARDING:
        return {
          status: 'boarding' as const,
          text: '👥 BOARDING',
          color: '#FF9800',
        };
      case TRIP_STATUS.IN_PROGRESS: // 'active'
        return {
          status: 'active' as const,
          text: '🚌 ACTIVE',
          color: '#2196F3',
        };
      case TRIP_STATUS.COMPLETED:
        return {
          status: 'completed' as const,
          text: '✅ COMPLETED',
          color: '#9E9E9E',
        };
      case TRIP_STATUS.CANCELLED:
        return {
          status: 'cancelled' as const,
          text: '❌ CANCELLED',
          color: '#F44336',
        };
      case TRIP_STATUS.EXPIRED:
        return {
          status: 'expired' as const,
          text: '⏰ EXPIRED',
          color: '#FF6B6B',
        };
      case TRIP_STATUS.SCHEDULED:
      default:
        if (bookingStatus === 'confirmed') {
          if (isPastTrip) {
            return {
              status: 'completed' as const,
              text: '✅ COMPLETED',
              color: '#9E9E9E',
            };
          }
          return {
            status: 'confirmed' as const,
            text: '✅ CONFIRMED',
            color: '#4CAF50',
          };
        }
        return {
          status: 'confirmed' as const,
          text: '✅ CONFIRMED',
          color: '#4CAF50',
        };
    }
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const fetchUserTrips = async () => {
    try {
      setLoading(true);

      const snapshot = await firestore()
        .collection('bookings')
        .where('userId', '==', user?.uid)
        .orderBy('createdAt', 'desc')
        .get();

      const tripsList: Trip[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();

        const tripSnapshot = await firestore()
          .collection('trips')
          .doc(data.tripId)
          .get();

        if (tripSnapshot.exists) {
          const tripData = tripSnapshot.data();
          const travelDate = data.travelDate?.toDate?.() || new Date();

          let driverName = 'Not assigned';
          let driverContact = '';

          if (tripData?.driverId) {
            const driverSnapshot = await firestore()
              .collection('drivers')
              .doc(tripData.driverId)
              .get();

            if (driverSnapshot.exists) {
              const driverData = driverSnapshot.data();
              driverName = driverData?.fullName || 'Driver';
              driverContact = driverData?.contactNumber || '';
            }
          }

          const tripStatus = determineTripStatus(
            tripData?.status || TRIP_STATUS.SCHEDULED,
            data.status,
            data.paymentStatus,
            travelDate
          );

          tripsList.push({
            id: doc.id,
            ticketNumber: data.ticketNumber || `TKT-${doc.id.slice(0, 8)}`,
            bookingCode: data.bookingCode,
            from: data.from || tripData?.from || '',
            to: data.to || tripData?.to || '',
            fromCode: data.fromCode || tripData?.fromCode || '',
            toCode: data.toCode || tripData?.toCode || '',
            date: formatDate(travelDate),
            rawDate: travelDate,
            time: `${tripData?.departureTime || '00:00'} - ${tripData?.arrivalTime || '00:00'}`,
            departureTime: tripData?.departureTime || '00:00',
            arrivalTime: tripData?.arrivalTime || '00:00',
            busNumber: tripData?.busNumber || 'N/A',
            busId: tripData?.busId || '',
            tripId: data.tripId,
            seat: data.seatNumber || data.seatIds?.[0] || 'N/A',
            seatIds: data.seatIds || [],
            status: tripStatus.status,
            statusText: tripStatus.text,
            color: tripStatus.color,
            boardingTime: tripData?.departureTime || '00:00',
            driver: driverName,
            driverId: tripData?.driverId || '',
            driverContact: driverContact,
            fare: data.baseFare || data.fare || 0,
            serviceFee: data.serviceFee || 1,
            total: data.totalAmount || data.total || (data.baseFare || 0) + 1,
            qrCode: data.qrCode || doc.id,
            stops: tripData?.stops || [],
            amenities: tripData?.amenities || ['AC', 'WiFi'],
            rating: data.rating,
            canRate: !data.rating && tripStatus.status === 'completed',
            bookingDate: data.createdAt,
            routeId: data.routeId || '',
            routeName: tripData?.name || '',
            busType: tripData?.busType || 'Standard',
            paymentMethod: data.paymentMethod,
            paymentDeadline: data.paymentDeadline?.toDate?.(),
          });
        }
      }

      setAllTrips(tripsList);
      filterTripsByStatus(tripsList);

    } catch (error) {
      console.error('Error fetching trips:', error);
      Alert.alert('Error', 'Failed to load your trips');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterTripsByStatus = (trips: Trip[]) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcoming: Trip[] = [];
    const active: Trip[] = [];
    const past: Trip[] = [];

    trips.forEach(trip => {
      const tripDate = new Date(trip.rawDate);
      tripDate.setHours(0, 0, 0, 0);

      if (trip.status === 'boarding' || trip.status === 'active') {
        active.push(trip);
      }
      else if (trip.status === 'pending') {
        upcoming.push(trip);
      }
      else if (trip.status === 'confirmed') {
        if (tripDate >= now) {
          upcoming.push(trip);
        } else {
          past.push(trip);
        }
      }
      else if (trip.status === 'completed' || trip.status === 'cancelled' || trip.status === 'expired') {
        past.push(trip);
      }
      else {
        if (tripDate >= now) {
          upcoming.push(trip);
        } else {
          past.push(trip);
        }
      }
    });

    upcoming.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
    past.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

    setUpcomingTrips(upcoming);
    setActiveTrips(active);
    setPastTrips(past);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserTrips();
  };

  const handleViewTicket = (trip: Trip) => {
    setSelectedTrip(trip);
    setModalType('view');
    setModalVisible(true);
  };

  const handleCompletePayment = (trip: Trip) => {
    navigation.navigate('BookingConfirmation', {
      bookingId: trip.id,
    });
  };

  const handleCancelTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setModalType('cancel');
    setSelectedReason('');
    setCancellationReason('');
    setModalVisible(true);
  };

  const handleReschedule = (trip: Trip) => {
    setSelectedTrip(trip);
    setModalType('reschedule');
    fetchAvailableSlots(trip);
    setModalVisible(true);
  };

  const handleRateTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setModalType('rate');
    setRating(0);
    setFeedback('');
    setModalVisible(true);
  };

  const handleTrackBus = (trip: Trip) => {
    navigation.navigate('Track', {
      tripId: trip.tripId,
      busNumber: trip.busNumber,
      from: trip.from,
      to: trip.to,
      routeId: trip.routeId,
    });
  };

  const handleContactDriver = async (trip: Trip) => {
    Alert.alert(
      'Contact Driver',
      `Driver: ${trip.driver}\nContact: ${trip.driverContact}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: async () => {
            try {
              const phoneNumber = `tel:${trip.driverContact}`;
              const canOpen = await Linking.canOpenURL(phoneNumber);
              if (canOpen) {
                await Linking.openURL(phoneNumber);
              } else {
                Alert.alert('Error', 'Cannot make phone calls from this device');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to make phone call');
            }
          }
        },
        {
          text: 'Message',
          onPress: async () => {
            try {
              const message = `Hello ${trip.driver}, I'm passenger on bus ${trip.busNumber} (Ticket: ${trip.ticketNumber})`;
              const url = Platform.select({
                ios: `sms:${trip.driverContact}&body=${encodeURIComponent(message)}`,
                android: `sms:${trip.driverContact}?body=${encodeURIComponent(message)}`,
              });

              if (url) {
                const canOpen = await Linking.canOpenURL(url);
                if (canOpen) {
                  await Linking.openURL(url);
                } else {
                  Alert.alert('Error', 'Cannot send SMS from this device');
                }
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to send SMS');
            }
          }
        },
      ]
    );
  };

  // ✅ Updated: Use standardized status for fetching available slots
  const fetchAvailableSlots = async (trip: Trip) => {
    try {
      const snapshot = await firestore()
        .collection('trips')
        .where('routeId', '==', trip.routeId)
        .where('status', '==', TRIP_STATUS.SCHEDULED)
        .where('availableSeats', '>', 0)
        .limit(5)
        .get();

      const slots: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        slots.push({
          id: doc.id,
          date: data.date,
          departureTime: data.departureTime,
          arrivalTime: data.arrivalTime,
          busNumber: data.busNumber,
          availableSeats: data.availableSeats,
          fare: data.fare,
        });
      });
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
    }
  };

  const confirmCancellation = async () => {
    if (!selectedReason && !cancellationReason.trim()) {
      Alert.alert('Reason Required', 'Please select or enter a cancellation reason');
      return;
    }

    const reason = selectedReason || cancellationReason;
    const refundAmount = selectedTrip ? (selectedTrip.fare * 0.9).toFixed(2) : '0';

    Alert.alert(
      'Confirm Cancellation',
      `Cancel trip ${selectedTrip?.ticketNumber}?\n\nReason: ${reason}\nRefund: PKR ${refundAmount} (90% refund)\n\nRefund will be processed within 3-5 business days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Cancellation',
          style: 'destructive',
          onPress: async () => {
            if (selectedTrip && user) {
              try {
                await firestore().collection('bookings').doc(selectedTrip.id).update({
                  status: 'cancelled',
                  cancellationReason: reason,
                  cancelledAt: firestore.FieldValue.serverTimestamp(),
                  refundAmount: parseFloat(refundAmount),
                });

                if (selectedTrip.seatIds.length > 0 && selectedTrip.status !== 'pending') {
                  await firestore().collection('trips').doc(selectedTrip.tripId).update({
                    availableSeats: firestore.FieldValue.increment(selectedTrip.seatIds.length),
                  });
                }

                await firestore().collection('notifications').add({
                  userId: user.uid,
                  type: 'booking',
                  title: 'Trip Cancelled',
                  message: `Your trip ${selectedTrip.ticketNumber} has been cancelled. Refund of PKR ${refundAmount} will be processed.`,
                  timestamp: firestore.FieldValue.serverTimestamp(),
                  read: false,
                });

                setModalVisible(false);
                fetchUserTrips();

                Alert.alert(
                  'Trip Cancelled',
                  `Refund of PKR ${refundAmount} will be processed.\n\nReason: ${reason}`
                );
              } catch (error) {
                console.error('Error cancelling trip:', error);
                Alert.alert('Error', 'Failed to cancel trip');
              }
            }
          },
        },
      ]
    );
  };

  const confirmReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime) {
      Alert.alert('Required', 'Please select new date and time');
      return;
    }

    Alert.alert(
      'Confirm Reschedule',
      `Reschedule trip ${selectedTrip?.ticketNumber}?\n\nNew Date: ${rescheduleDate}\nNew Time: ${rescheduleTime}\n\nA small fee may apply if fare difference exists.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Reschedule',
          onPress: async () => {
            if (selectedTrip && user) {
              try {
                await firestore().collection('bookings').doc(selectedTrip.id).update({
                  rescheduleDate: rescheduleDate,
                  rescheduleTime: rescheduleTime,
                  rescheduledAt: firestore.FieldValue.serverTimestamp(),
                });

                await firestore().collection('notifications').add({
                  userId: user.uid,
                  type: 'booking',
                  title: 'Trip Rescheduled',
                  message: `Your trip ${selectedTrip.ticketNumber} has been rescheduled to ${rescheduleDate} at ${rescheduleTime}`,
                  timestamp: firestore.FieldValue.serverTimestamp(),
                  read: false,
                });

                setModalVisible(false);
                fetchUserTrips();

                Alert.alert(
                  'Trip Rescheduled',
                  `Your trip has been rescheduled to:\n${rescheduleDate} at ${rescheduleTime}`
                );
              } catch (error) {
                console.error('Error rescheduling trip:', error);
                Alert.alert('Error', 'Failed to reschedule trip');
              }
            }
          },
        },
      ]
    );
  };

  const submitRating = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating');
      return;
    }

    if (selectedTrip && user) {
      try {
        await firestore().collection('bookings').doc(selectedTrip.id).update({
          rating: rating,
          feedback: feedback,
          ratedAt: firestore.FieldValue.serverTimestamp(),
        });

        setModalVisible(false);
        fetchUserTrips();

        Alert.alert('Thank You!', `You rated this trip ${rating} stars`);
      } catch (error) {
        console.error('Error submitting rating:', error);
        Alert.alert('Error', 'Failed to submit rating');
      }
    }
  };

  const handleBookNow = () => {
    navigation.navigate('HomeTab');
  };

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`;
  };

  // Render functions remain the same as original...
  // (Keeping renderViewTicketModal, renderCancelModal, renderRescheduleModal, renderRateModal, renderTripCard unchanged)

  const renderViewTicketModal = () => (
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>TICKET DETAILS</Text>
        <TouchableOpacity onPress={() => setModalVisible(false)}>
          <Icon name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalBody}>
        <View style={styles.ticketHeader}>
          <Text style={styles.ticketNumber}>
            {selectedTrip?.status === 'pending' ? selectedTrip?.bookingCode : selectedTrip?.ticketNumber}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: selectedTrip?.color + '20' }]}>
            <Text style={[styles.statusText, { color: selectedTrip?.color }]}>
              {selectedTrip?.statusText}
            </Text>
          </View>
        </View>

        {selectedTrip?.status === 'pending' && selectedTrip?.paymentDeadline && (
          <View style={[styles.deadlineCard, { backgroundColor: '#FFF3E0', marginBottom: 16 }]}>
            <Icon name="access-time" size={20} color="#FF9800" />
            <View style={styles.deadlineInfo}>
              <Text style={styles.deadlineLabel}>Payment Deadline</Text>
              <Text style={styles.deadlineTime}>
                {selectedTrip.paymentDeadline.toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>PASSENGER</Text>
          <Text style={styles.sectionValue}>{user?.displayName || 'Passenger'}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>JOURNEY</Text>
          <View style={styles.journeyContainer}>
            <View style={styles.locationRow}>
              <View style={styles.locationDot} />
              <View>
                <Text style={styles.locationLabel}>FROM</Text>
                <Text style={styles.locationText}>{selectedTrip?.from}</Text>
                <Text style={styles.locationCode}>{selectedTrip?.fromCode}</Text>
              </View>
            </View>

            <Icon name="arrow-forward" size={20} color="#666" style={styles.arrowIcon} />

            <View style={styles.locationRow}>
              <View style={[styles.locationDot, styles.destinationDot]} />
              <View>
                <Text style={styles.locationLabel}>TO</Text>
                <Text style={styles.locationText}>{selectedTrip?.to}</Text>
                <Text style={styles.locationCode}>{selectedTrip?.toCode}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>TRIP DETAILS</Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Icon name="calendar-today" size={18} color="#666" />
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{selectedTrip?.date}</Text>
            </View>

            <View style={styles.detailItem}>
              <Icon name="schedule" size={18} color="#666" />
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>{selectedTrip?.departureTime}</Text>
            </View>

            <View style={styles.detailItem}>
              <Icon name="directions-bus" size={18} color="#666" />
              <Text style={styles.detailLabel}>Bus</Text>
              <Text style={styles.detailValue}>{selectedTrip?.busNumber}</Text>
            </View>

            <View style={styles.detailItem}>
              <Icon name="event-seat" size={18} color="#666" />
              <Text style={styles.detailLabel}>Seat</Text>
              <Text style={styles.detailValue}>{selectedTrip?.seat}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>PAYMENT SUMMARY</Text>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Base Fare:</Text>
            <Text style={styles.fareValue}>{formatCurrency(selectedTrip?.fare || 0)}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Service Fee:</Text>
            <Text style={styles.fareValue}>{formatCurrency(selectedTrip?.serviceFee || 1)}</Text>
          </View>
          <View style={[styles.fareRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{formatCurrency(selectedTrip?.total || (selectedTrip?.fare || 0) + 1)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.modalFooter}>
        <TouchableOpacity
          style={styles.modalButton}
          onPress={() => {
            Alert.alert('Download', 'Ticket downloaded successfully');
          }}
        >
          <Icon name="download" size={20} color="#4A90E2" />
          <Text style={styles.modalButtonText}>Download</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, styles.shareButton]}
          onPress={() => {
            Alert.alert('Share', 'Ticket shared successfully');
          }}
        >
          <Icon name="share" size={20} color="#FFF" />
          <Text style={[styles.modalButtonText, styles.shareButtonText]}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCancelModal = () => (
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>CANCEL TRIP</Text>
        <TouchableOpacity onPress={() => setModalVisible(false)}>
          <Icon name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalBody}>
        <View style={styles.cancelInfo}>
          <Icon name="warning" size={40} color="#F44336" />
          <Text style={styles.cancelTitle}>Cancel Trip {selectedTrip?.ticketNumber}</Text>
          <Text style={styles.cancelSubtitle}>
            You will receive a refund of {formatCurrency(selectedTrip ? selectedTrip.fare * 0.9 : 0)} (90%)
          </Text>
        </View>

        <View style={styles.refundDetails}>
          <Text style={styles.refundTitle}>Refund Details:</Text>
          <View style={styles.refundRow}>
            <Text style={styles.refundLabel}>Original Amount:</Text>
            <Text style={styles.refundValue}>{formatCurrency(selectedTrip?.fare || 0)}</Text>
          </View>
          <View style={styles.refundRow}>
            <Text style={styles.refundLabel}>Cancellation Fee (10%):</Text>
            <Text style={styles.refundValue}>
              -{formatCurrency(selectedTrip ? selectedTrip.fare * 0.1 : 0)}
            </Text>
          </View>
          <View style={[styles.refundRow, styles.refundTotal]}>
            <Text style={styles.refundTotalLabel}>Refund Amount:</Text>
            <Text style={styles.refundTotalValue}>
              {formatCurrency(selectedTrip ? selectedTrip.fare * 0.9 : 0)}
            </Text>
          </View>
          <Text style={styles.refundNote}>
            Refund will be processed within 3-5 business days
          </Text>
        </View>

        <View style={styles.reasonSection}>
          <Text style={styles.reasonTitle}>Select Cancellation Reason</Text>
          {cancellationReasons.map((reason, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.reasonOption,
                selectedReason === reason && styles.reasonOptionSelected,
              ]}
              onPress={() => {
                setSelectedReason(reason);
                setCancellationReason('');
              }}
            >
              <View style={styles.radioContainer}>
                <View style={[
                  styles.radio,
                  selectedReason === reason && styles.radioSelected,
                ]} />
              </View>
              <Text style={[
                styles.reasonText,
                selectedReason === reason && styles.reasonTextSelected,
              ]}>
                {reason}
              </Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.orText}>OR</Text>

          <TextInput
            style={styles.customReasonInput}
            placeholder="Enter your own reason..."
            placeholderTextColor="#999"
            value={cancellationReason}
            onChangeText={setCancellationReason}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View style={styles.modalFooter}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelModalButton]}
          onPress={() => setModalVisible(false)}
        >
          <Text style={styles.cancelModalButtonText}>Keep Trip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, styles.confirmCancelButton]}
          onPress={confirmCancellation}
        >
          <Icon name="cancel" size={20} color="#FFF" />
          <Text style={styles.confirmCancelButtonText}>Cancel Trip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRescheduleModal = () => (
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>RESCHEDULE TRIP</Text>
        <TouchableOpacity onPress={() => setModalVisible(false)}>
          <Icon name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalBody}>
        <View style={styles.rescheduleInfo}>
          <Icon name="schedule" size={40} color="#4A90E2" />
          <Text style={styles.rescheduleTitle}>
            Reschedule Trip {selectedTrip?.ticketNumber}
          </Text>
          <Text style={styles.rescheduleSubtitle}>
            Select new date and time for your trip
          </Text>
        </View>

        <View style={styles.currentBooking}>
          <Text style={styles.currentBookingTitle}>Current Booking:</Text>
          <View style={styles.bookingDetails}>
            <View style={styles.bookingRow}>
              <Icon name="calendar-today" size={18} color="#666" />
              <Text style={styles.bookingText}>{selectedTrip?.date}</Text>
            </View>
            <View style={styles.bookingRow}>
              <Icon name="schedule" size={18} color="#666" />
              <Text style={styles.bookingText}>{selectedTrip?.departureTime}</Text>
            </View>
            <View style={styles.bookingRow}>
              <Icon name="directions-bus" size={18} color="#666" />
              <Text style={styles.bookingText}>Bus {selectedTrip?.busNumber}</Text>
            </View>
            <View style={styles.bookingRow}>
              <Icon name="event-seat" size={18} color="#666" />
              <Text style={styles.bookingText}>Seat {selectedTrip?.seat}</Text>
            </View>
          </View>
        </View>

        <View style={styles.newScheduleSection}>
          <Text style={styles.sectionTitle}>Available Slots</Text>

          {availableSlots.map((slot, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionCard,
                rescheduleTime === slot.departureTime && styles.optionCardSelected
              ]}
              onPress={() => {
                setRescheduleDate(slot.date);
                setRescheduleTime(slot.departureTime);
              }}
            >
              <Text style={styles.optionTime}>{slot.departureTime} - {slot.arrivalTime}</Text>
              <Text style={styles.optionDate}>{slot.date}</Text>
              <View style={styles.optionDetails}>
                <Text style={styles.optionBus}>Bus {slot.busNumber}</Text>
                <Text style={styles.optionSeats}>{slot.availableSeats} seats available</Text>
              </View>
              <Text style={styles.optionFare}>{formatCurrency(slot.fare)}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.rescheduleNote}>
            <Icon name="info" size={18} color="#FF9800" />
            <Text style={styles.noteText}>
              Note: A small rescheduling fee may apply if there's a fare difference
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.modalFooter}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelModalButton]}
          onPress={() => setModalVisible(false)}
        >
          <Text style={styles.cancelModalButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, styles.confirmRescheduleButton]}
          onPress={confirmReschedule}
          disabled={!rescheduleDate || !rescheduleTime}
        >
          <Icon name="check-circle" size={20} color="#FFF" />
          <Text style={styles.confirmRescheduleButtonText}>Reschedule</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRateModal = () => (
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>RATE YOUR TRIP</Text>
        <TouchableOpacity onPress={() => setModalVisible(false)}>
          <Icon name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalBody}>
        <View style={styles.rateInfo}>
          <Icon name="star" size={50} color="#FFD700" />
          <Text style={styles.rateTitle}>
            How was your trip {selectedTrip?.ticketNumber}?
          </Text>
          <Text style={styles.rateSubtitle}>
            Your feedback helps us improve our service
          </Text>
        </View>

        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starButton}
            >
              <Icon
                name={star <= rating ? "star" : "star-border"}
                size={40}
                color={star <= rating ? "#FFD700" : "#DDD"}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackLabel}>Additional Feedback (Optional)</Text>
          <TextInput
            style={styles.feedbackInput}
            placeholder="Share your experience..."
            placeholderTextColor="#999"
            value={feedback}
            onChangeText={setFeedback}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View style={styles.modalFooter}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelModalButton]}
          onPress={() => setModalVisible(false)}
        >
          <Text style={styles.cancelModalButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, styles.submitRateButton]}
          onPress={submitRating}
          disabled={rating === 0}
        >
          <Icon name="send" size={20} color="#FFF" />
          <Text style={styles.submitRateButtonText}>Submit Rating</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderModalContent = () => {
    switch (modalType) {
      case 'view': return renderViewTicketModal();
      case 'cancel': return renderCancelModal();
      case 'reschedule': return renderRescheduleModal();
      case 'rate': return renderRateModal();
      default: return null;
    }
  };

  const renderTripCard = (trip: Trip) => {
    return (
      <View key={trip.id} style={styles.tripCard}>
        <View style={styles.tripHeader}>
          <View style={styles.tripTime}>
            <Icon name="schedule" size={20} color="#4A90E2" />
            <Text style={styles.tripDateTime}>
              {trip.date} • {trip.departureTime}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: trip.color + '20' }]}>
            <Text style={[styles.statusText, { color: trip.color }]}>
              {trip.statusText}
            </Text>
          </View>
        </View>

        <View style={styles.tripDetails}>
          <View style={styles.routeContainer}>
            <View style={styles.locationRow}>
              <View style={styles.locationDot} />
              <Text style={styles.locationText}>{trip.from}</Text>
            </View>

            <View style={styles.dottedLine} />

            <View style={styles.locationRow}>
              <View style={[styles.locationDot, styles.destinationDot]} />
              <Text style={styles.locationText}>{trip.to}</Text>
            </View>
          </View>

          <View style={styles.tripInfo}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Icon name="confirmation-number" size={16} color="#666" />
                <Text style={styles.infoLabel}>Ticket:</Text>
                <Text style={styles.infoValue}>{trip.status === 'pending' ? trip.bookingCode : trip.ticketNumber}</Text>
              </View>

              <View style={styles.infoItem}>
                <Icon name="directions-bus" size={16} color="#666" />
                <Text style={styles.infoLabel}>Bus:</Text>
                <Text style={styles.infoValue}>{trip.busNumber}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Icon name="event-seat" size={16} color="#666" />
                <Text style={styles.infoLabel}>Seat:</Text>
                <Text style={styles.infoValue}>{trip.seat}</Text>
              </View>

              <View style={styles.infoItem}>
                <Icon name="person" size={16} color="#666" />
                <Text style={styles.infoLabel}>Driver:</Text>
                <Text style={styles.infoValue}>{trip.driver}</Text>
              </View>
            </View>
          </View>
        </View>

        {trip.status === 'pending' && (
          <Text style={styles.pendingWarning}>
            ⚠️ Complete payment to confirm your booking
          </Text>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleViewTicket(trip)}
          >
            <Icon name="receipt" size={20} color="#4A90E2" />
            <Text style={styles.actionButtonText}>View Ticket</Text>
          </TouchableOpacity>

          {trip.status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.pendingActionButton]}
              onPress={() => handleCompletePayment(trip)}
            >
              <Icon name="payment" size={20} color="#FFF" />
              <Text style={[styles.actionButtonText, { color: '#FFF' }]}>
                Complete Payment
              </Text>
            </TouchableOpacity>
          )}

          {trip.status === 'confirmed' && (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleCancelTrip(trip)}
              >
                <Icon name="cancel" size={20} color="#F44336" />
                <Text style={[styles.actionButtonText, styles.cancelText]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleReschedule(trip)}
              >
                <Icon name="schedule" size={20} color="#FF9800" />
                <Text style={styles.actionButtonText}>Reschedule</Text>
              </TouchableOpacity>
            </>
          )}

          {(trip.status === 'boarding' || trip.status === 'active') && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryAction]}
                onPress={() => handleTrackBus(trip)}
              >
                <Icon name="location-on" size={20} color="#FFF" />
                <Text style={[styles.actionButtonText, styles.primaryActionText]}>
                  Track Bus
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleContactDriver(trip)}
              >
                <Icon name="phone" size={20} color="#4A90E2" />
                <Text style={styles.actionButtonText}>Contact</Text>
              </TouchableOpacity>
            </>
          )}

          {trip.status === 'completed' && trip.canRate && (
            <TouchableOpacity
              style={[styles.actionButton, styles.rateButton]}
              onPress={() => handleRateTrip(trip)}
            >
              <Icon name="star" size={20} color="#FFD700" />
              <Text style={[styles.actionButtonText, styles.rateText]}>Rate Trip</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading your trips...</Text>
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
            onRefresh={onRefresh}
            colors={['#4A90E2']}
            tintColor="#4A90E2"
          />
        }
      >
        <View style={styles.header}>
          <Icon name="history" size={32} color="#1A237E" />
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>My Trips</Text>
            <Text style={styles.subtitle}>Manage your bookings</Text>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'upcoming' && styles.tabActive]}
            onPress={() => setSelectedTab('upcoming')}
          >
            <Text style={[styles.tabText, selectedTab === 'upcoming' && styles.tabTextActive]}>
              Upcoming ({upcomingTrips.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === 'active' && styles.tabActive]}
            onPress={() => setSelectedTab('active')}
          >
            <Text style={[styles.tabText, selectedTab === 'active' && styles.tabTextActive]}>
              Active ({activeTrips.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === 'past' && styles.tabActive]}
            onPress={() => setSelectedTab('past')}
          >
            <Text style={[styles.tabText, selectedTab === 'past' && styles.tabTextActive]}>
              Past ({pastTrips.length})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tripsContainer}>
          {selectedTab === 'upcoming' && upcomingTrips.map(renderTripCard)}
          {selectedTab === 'active' && activeTrips.map(renderTripCard)}
          {selectedTab === 'past' && pastTrips.map(renderTripCard)}

          {((selectedTab === 'upcoming' && upcomingTrips.length === 0) ||
            (selectedTab === 'active' && activeTrips.length === 0) ||
            (selectedTab === 'past' && pastTrips.length === 0)) && (
            <View style={styles.emptyState}>
              <Icon name="inbox" size={60} color="#DDD" />
              <Text style={styles.emptyStateText}>No {selectedTab} trips</Text>
              {selectedTab === 'upcoming' && (
                <TouchableOpacity style={styles.bookNowButton} onPress={handleBookNow}>
                  <Text style={styles.bookNowText}>BOOK A TRIP</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {renderModalContent()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Styles remain unchanged from original
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#4A90E2' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 10 },
  headerTextContainer: { flex: 1, marginLeft: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1A237E' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 4 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, padding: 4, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 8 },
  tabActive: { backgroundColor: '#4A90E2' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#4A90E2' },
  tabTextActive: { color: '#FFF' },
  tripsContainer: { marginBottom: 30 },
  tripCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tripTime: { flexDirection: 'row', alignItems: 'center' },
  tripDateTime: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginLeft: 8 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  tripDetails: { marginBottom: 20 },
  routeContainer: { marginBottom: 16 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  locationDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4A90E2', marginRight: 12 },
  destinationDot: { backgroundColor: '#4CAF50' },
  locationText: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  locationCode: { fontSize: 12, color: '#4A90E2', marginTop: 2 },
  dottedLine: { height: 20, width: 2, backgroundColor: 'transparent', borderLeftWidth: 2, borderLeftColor: '#DDD', borderStyle: 'dashed', marginLeft: 4 },
  tripInfo: { marginTop: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  infoItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  infoLabel: { fontSize: 14, color: '#666', marginLeft: 8, marginRight: 4, minWidth: 50 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', flex: 1 },
  pendingWarning: { fontSize: 13, color: '#FF9800', marginBottom: 12, textAlign: 'center' },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 16, flexWrap: 'wrap', gap: 8 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, marginHorizontal: 4, borderRadius: 8, borderWidth: 1, borderColor: '#E3E8EF', minWidth: 100 },
  primaryAction: { backgroundColor: '#4A90E2', borderColor: '#4A90E2' },
  pendingActionButton: { backgroundColor: '#FF9800', borderColor: '#FF9800' },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: '#4A90E2', marginLeft: 6 },
  primaryActionText: { color: '#FFF' },
  cancelText: { color: '#F44336' },
  rateButton: { borderColor: '#FFD700' },
  rateText: { color: '#FFD700' },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#FFF', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  emptyStateText: { fontSize: 20, fontWeight: '600', color: '#666', marginTop: 20, marginBottom: 8 },
  bookNowButton: { backgroundColor: '#4A90E2', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  bookNowText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalContent: { padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A237E' },
  modalBody: { maxHeight: 400 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  modalButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E3E8EF' },
  modalButtonText: { fontSize: 16, fontWeight: '600', color: '#4A90E2', marginLeft: 8 },
  shareButton: { backgroundColor: '#4A90E2', borderColor: '#4A90E2' },
  shareButtonText: { color: '#FFF' },
  cancelModalButton: { borderColor: '#E3E8EF' },
  cancelModalButtonText: { color: '#666', fontWeight: '600' },
  confirmCancelButton: { backgroundColor: '#F44336', borderColor: '#F44336' },
  confirmCancelButtonText: { color: '#FFF', marginLeft: 8 },
  confirmRescheduleButton: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  confirmRescheduleButtonText: { color: '#FFF', marginLeft: 8 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  ticketNumber: { fontSize: 24, fontWeight: 'bold', color: '#4A90E2' },
  infoSection: { marginBottom: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  sectionValue: { fontSize: 18, fontWeight: '600', color: '#1A1A1A' },
  journeyContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locationLabel: { fontSize: 12, color: '#666', marginBottom: 2 },
  arrowIcon: { marginHorizontal: 16 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  detailItem: { width: '48%', marginBottom: 16 },
  detailLabel: { fontSize: 12, color: '#666', marginTop: 4, marginBottom: 2 },
  detailValue: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  fareLabel: { fontSize: 16, color: '#666' },
  fareValue: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  totalRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#1A237E' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#4CAF50' },
  deadlineCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8 },
  deadlineInfo: { marginLeft: 12, flex: 1 },
  deadlineLabel: { fontSize: 12, color: '#E65100', fontWeight: '600' },
  deadlineTime: { fontSize: 14, color: '#1A1A1A', fontWeight: '600' },
  cancelInfo: { alignItems: 'center', marginBottom: 24 },
  cancelTitle: { fontSize: 20, fontWeight: 'bold', color: '#F44336', marginTop: 12, marginBottom: 4 },
  cancelSubtitle: { fontSize: 16, color: '#666', textAlign: 'center' },
  refundDetails: { backgroundColor: '#FFF3F3', borderRadius: 8, padding: 16, marginBottom: 24 },
  refundTitle: { fontSize: 16, fontWeight: '600', color: '#F44336', marginBottom: 12 },
  refundRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  refundLabel: { fontSize: 14, color: '#666' },
  refundValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  refundTotal: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#FFCDD2' },
  refundTotalLabel: { fontSize: 16, fontWeight: 'bold', color: '#F44336' },
  refundTotalValue: { fontSize: 18, fontWeight: 'bold', color: '#4CAF50' },
  refundNote: { fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 12, textAlign: 'center' },
  reasonSection: { marginBottom: 20 },
  reasonTitle: { fontSize: 16, fontWeight: '600', color: '#1A237E', marginBottom: 16 },
  reasonOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E3E8EF', marginBottom: 8 },
  reasonOptionSelected: { borderColor: '#4A90E2', backgroundColor: '#F0F8FF' },
  radioContainer: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#E3E8EF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  radio: { width: 12, height: 12, borderRadius: 6 },
  radioSelected: { backgroundColor: '#4A90E2' },
  reasonText: { fontSize: 14, color: '#666', flex: 1 },
  reasonTextSelected: { color: '#4A90E2', fontWeight: '600' },
  orText: { textAlign: 'center', color: '#999', marginVertical: 16, fontSize: 14 },
  customReasonInput: { borderWidth: 1, borderColor: '#E3E8EF', borderRadius: 8, padding: 12, fontSize: 14, color: '#1A1A1A', minHeight: 80 },
  rescheduleInfo: { alignItems: 'center', marginBottom: 24 },
  rescheduleTitle: { fontSize: 20, fontWeight: 'bold', color: '#4A90E2', marginTop: 12, marginBottom: 4 },
  rescheduleSubtitle: { fontSize: 16, color: '#666', textAlign: 'center' },
  currentBooking: { backgroundColor: '#F0F8FF', borderRadius: 8, padding: 16, marginBottom: 24 },
  currentBookingTitle: { fontSize: 16, fontWeight: '600', color: '#4A90E2', marginBottom: 12 },
  bookingDetails: { marginLeft: 8 },
  bookingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  bookingText: { fontSize: 14, color: '#666', marginLeft: 12 },
  newScheduleSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1A237E', marginBottom: 16 },
  optionCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E3E8EF', borderRadius: 8, padding: 16, marginBottom: 12 },
  optionCardSelected: { borderColor: '#4A90E2', backgroundColor: '#F0F8FF' },
  optionTime: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  optionDate: { fontSize: 14, color: '#666', marginBottom: 4 },
  optionDetails: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  optionBus: { fontSize: 14, color: '#4A90E2' },
  optionSeats: { fontSize: 14, color: '#2E7D32' },
  optionFare: { fontSize: 14, fontWeight: '600', color: '#4CAF50', marginTop: 4 },
  rescheduleNote: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFF3E0', padding: 12, borderRadius: 8 },
  noteText: { fontSize: 14, color: '#FF9800', marginLeft: 8, flex: 1 },
  rateInfo: { alignItems: 'center', marginBottom: 24 },
  rateTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A237E', marginTop: 12, marginBottom: 4 },
  rateSubtitle: { fontSize: 16, color: '#666', textAlign: 'center' },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  starButton: { marginHorizontal: 4 },
  feedbackSection: { marginBottom: 20 },
  feedbackLabel: { fontSize: 16, fontWeight: '600', color: '#1A237E', marginBottom: 12 },
  feedbackInput: { borderWidth: 1, borderColor: '#E3E8EF', borderRadius: 8, padding: 12, fontSize: 14, color: '#1A1A1A', minHeight: 100 },
  submitRateButton: { backgroundColor: '#FF9800', borderColor: '#FF9800' },
  submitRateButtonText: { color: '#FFF', marginLeft: 8 },
});

export default MyTripsScreen;
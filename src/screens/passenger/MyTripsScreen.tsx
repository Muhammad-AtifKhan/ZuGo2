import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PassengerStackParamList } from '../../navigation/PassengerNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';

type MyTripsScreenNavigationProp = StackNavigationProp<PassengerStackParamList>;

const MyTripsScreen = () => {
  const navigation = useNavigation<MyTripsScreenNavigationProp>();
  const [selectedTab, setSelectedTab] = useState<'upcoming' | 'active' | 'past'>('upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'view' | 'cancel' | 'reschedule'>('view');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationReasons] = useState([
    'Change of plans',
    'Found cheaper option',
    'Bus timing not suitable',
    'Personal emergency',
    'Travel dates changed',
    'Other reason',
  ]);
  const [selectedReason, setSelectedReason] = useState('');

  // Dummy trip data
  const [trips, setTrips] = useState({
    upcoming: [
      {
        id: 'trip-001',
        ticketNumber: 'TKT-2024-0157',
        from: 'City Center',
        to: 'Airport',
        date: 'Today, 15 March',
        time: '08:00 AM - 09:30 AM',
        busNumber: 'B-001',
        seat: '3A',
        status: 'confirmed',
        statusText: '✅ CONFIRMED',
        color: '#4CAF50',
        boardingTime: '07:45 AM',
        driver: 'Ali Ahmed',
        driverContact: '+923001112233',
        fare: 12,
        serviceFee: 1,
        total: 13,
        qrCode: 'QR-CODE-001',
        stops: [
          { name: 'City Center', time: '08:00 AM' },
          { name: 'University', time: '08:30 AM' },
          { name: 'Airport', time: '09:30 AM' },
        ],
        amenities: ['AC', 'WiFi', 'Water'],
      },
      {
        id: 'trip-002',
        ticketNumber: 'TKT-2024-0158',
        from: 'Airport',
        to: 'City Center',
        date: 'Tomorrow, 16 March',
        time: '09:00 AM - 10:30 AM',
        busNumber: 'B-003',
        seat: '5B',
        status: 'confirmed',
        statusText: '✅ CONFIRMED',
        color: '#4CAF50',
        boardingTime: '08:45 AM',
        driver: 'Sara Khan',
        driverContact: '+923002223344',
        fare: 15,
        serviceFee: 1,
        total: 16,
        qrCode: 'QR-CODE-002',
        stops: [
          { name: 'Airport', time: '09:00 AM' },
          { name: 'Business District', time: '09:45 AM' },
          { name: 'City Center', time: '10:30 AM' },
        ],
        amenities: ['AC', 'TV'],
      },
    ],
    active: [
      {
        id: 'trip-003',
        ticketNumber: 'TKT-2024-0159',
        from: 'University',
        to: 'Mall',
        date: 'Now',
        time: '02:00 PM - 03:00 PM',
        busNumber: 'B-002',
        seat: '7C',
        status: 'boarding',
        statusText: '🚌 BOARDING NOW',
        color: '#2196F3',
        boardingTime: '01:45 PM',
        driver: 'Usman Ali',
        driverContact: '+923003334455',
        fare: 8,
        serviceFee: 1,
        total: 9,
        qrCode: 'QR-CODE-003',
        delay: '+10 minutes',
        currentLocation: 'Near University',
        nextStop: 'Stop 3',
        eta: '15 minutes',
        occupancy: '32/40 seats',
        speed: '45 km/h',
        busLocation: {
          latitude: 31.5204,
          longitude: 74.3587,
          route: 'University → Mall Route',
        },
      },
    ],
    past: [
      {
        id: 'trip-004',
        ticketNumber: 'TKT-2024-0156',
        from: 'City Center',
        to: 'Airport',
        date: '14 March',
        time: '10:00 AM - 11:30 AM',
        busNumber: 'B-004',
        seat: '2A',
        status: 'completed',
        statusText: '✅ COMPLETED',
        color: '#9E9E9E',
        driver: 'Ali Ahmed',
        fare: 12,
        serviceFee: 1,
        total: 13,
        rating: 4.5,
        canRate: true,
        feedback: '',
      },
    ],
  });

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Alert.alert('Refreshed', 'Your trips have been updated');
    }, 1500);
  };

  const handleViewTicket = (trip: any) => {
    setSelectedTrip(trip);
    setModalType('view');
    setModalVisible(true);
  };

  const handleCancelTrip = (trip: any) => {
    setSelectedTrip(trip);
    setModalType('cancel');
    setModalVisible(true);
  };

  const handleReschedule = (trip: any) => {
    setSelectedTrip(trip);
    setModalType('reschedule');
    setRescheduleDate('Tomorrow, 17 March');
    setRescheduleTime('10:00 AM - 11:30 AM');
    setModalVisible(true);
  };

  const handleTrackBus = (trip: any) => {
    // Navigate to Track screen with trip details
    navigation.navigate('Track', {
      tripId: trip.id,
      busNumber: trip.busNumber,
      from: trip.from,
      to: trip.to,
      busLocation: trip.busLocation,
      currentLocation: trip.currentLocation,
      nextStop: trip.nextStop,
      eta: trip.eta,
    });
  };

  const handleContactDriver = async (trip: any) => {
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

  const handleRateTrip = (trip: any) => {
    Alert.alert(
      'Rate Your Trip',
      `How was your trip ${trip.ticketNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '1 Star', onPress: () => updateTripRating(trip.id, 1) },
        { text: '2 Stars', onPress: () => updateTripRating(trip.id, 2) },
        { text: '3 Stars', onPress: () => updateTripRating(trip.id, 3) },
        { text: '4 Stars', onPress: () => updateTripRating(trip.id, 4) },
        { text: '5 Stars', onPress: () => updateTripRating(trip.id, 5) },
      ]
    );
  };

  const updateTripRating = (tripId: string, rating: number) => {
    const updatedTrips = {
      ...trips,
      past: trips.past.map(trip =>
        trip.id === tripId
          ? { ...trip, rating, canRate: false }
          : trip
      ),
    };
    setTrips(updatedTrips);
    Alert.alert('Thank You!', `You rated this trip ${rating} stars`);
  };

  const confirmCancellation = () => {
    if (!selectedReason && !cancellationReason.trim()) {
      Alert.alert('Reason Required', 'Please select or enter a cancellation reason');
      return;
    }

    const reason = selectedReason || cancellationReason;
    const refundAmount = selectedTrip ? (selectedTrip.fare * 0.9).toFixed(2) : '0';

    Alert.alert(
      'Confirm Cancellation',
      `Cancel trip ${selectedTrip?.ticketNumber}?\n\nReason: ${reason}\nRefund: $${refundAmount} (90% refund)\n\nRefund will be processed within 3-5 business days.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm Cancellation',
          style: 'destructive',
          onPress: () => {
            if (selectedTrip) {
              const updatedTrips = {
                ...trips,
                upcoming: trips.upcoming.filter(t => t.id !== selectedTrip.id),
                past: [
                  {
                    ...selectedTrip,
                    status: 'cancelled',
                    statusText: '❌ CANCELLED',
                    color: '#F44336',
                    refund: parseFloat(refundAmount),
                    cancellationReason: reason,
                  },
                  ...trips.past,
                ],
              };
              setTrips(updatedTrips);
              setModalVisible(false);
              Alert.alert(
                'Trip Cancelled',
                `Refund of $${refundAmount} will be processed.\n\nReason: ${reason}`
              );
            }
          },
        },
      ]
    );
  };

  const confirmReschedule = () => {
    if (!rescheduleDate || !rescheduleTime) {
      Alert.alert('Required', 'Please select new date and time');
      return;
    }

    Alert.alert(
      'Confirm Reschedule',
      `Reschedule trip ${selectedTrip?.ticketNumber}?\n\nNew Date: ${rescheduleDate}\nNew Time: ${rescheduleTime}\n\nA small fee may apply if fare difference exists.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm Reschedule',
          onPress: () => {
            if (selectedTrip) {
              const updatedTrip = {
                ...selectedTrip,
                date: rescheduleDate,
                time: rescheduleTime,
                statusText: '🔄 RESCHEDULED',
              };

              const updatedTrips = {
                ...trips,
                upcoming: trips.upcoming.map(t =>
                  t.id === selectedTrip.id ? updatedTrip : t
                ),
              };
              setTrips(updatedTrips);
              setModalVisible(false);
              Alert.alert(
                'Trip Rescheduled',
                `Your trip has been rescheduled to:\n${rescheduleDate} at ${rescheduleTime}`
              );
            }
          },
        },
      ]
    );
  };

  // Handle navigation to Home screen
  const handleBookNow = () => {
    navigation.navigate('HomeTab');
  };

  const renderViewTicketModal = () => (
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>TICKET DETAILS</Text>
        <TouchableOpacity onPress={() => setModalVisible(false)}>
          <Icon name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalBody}>
        {/* Ticket Header */}
        <View style={styles.ticketHeader}>
          <Text style={styles.ticketNumber}>{selectedTrip?.ticketNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: selectedTrip?.color + '20' }]}>
            <Text style={[styles.statusText, { color: selectedTrip?.color }]}>
              {selectedTrip?.statusText}
            </Text>
          </View>
        </View>

        {/* Passenger Info */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>PASSENGER</Text>
          <Text style={styles.sectionValue}>Ali Ahmed</Text>
        </View>

        {/* Journey Info */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>JOURNEY</Text>
          <View style={styles.journeyContainer}>
            <View style={styles.locationRow}>
              <View style={styles.locationDot} />
              <View>
                <Text style={styles.locationLabel}>FROM</Text>
                <Text style={styles.locationText}>{selectedTrip?.from}</Text>
              </View>
            </View>

            <Icon name="arrow-forward" size={20} color="#666" style={styles.arrowIcon} />

            <View style={styles.locationRow}>
              <View style={[styles.locationDot, styles.destinationDot]} />
              <View>
                <Text style={styles.locationLabel}>TO</Text>
                <Text style={styles.locationText}>{selectedTrip?.to}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Trip Details */}
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
              <Text style={styles.detailValue}>{selectedTrip?.time}</Text>
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

        {/* Stops Information */}
        {selectedTrip?.stops && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionLabel}>STOPS</Text>
            <View style={styles.stopsContainer}>
              {selectedTrip.stops.map((stop: any, index: number) => (
                <View key={index} style={styles.stopItem}>
                  <View style={styles.stopDot} />
                  <Text style={styles.stopName}>{stop.name}</Text>
                  <Text style={styles.stopTime}>{stop.time}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Amenities */}
        {selectedTrip?.amenities && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionLabel}>AMENITIES</Text>
            <View style={styles.amenitiesContainer}>
              {selectedTrip.amenities.map((amenity: string, index: number) => (
                <View key={index} style={styles.amenityBadge}>
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Fare Breakdown */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>FARE BREAKDOWN</Text>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Base Fare:</Text>
            <Text style={styles.fareValue}>${selectedTrip?.fare}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Service Fee:</Text>
            <Text style={styles.fareValue}>${selectedTrip?.serviceFee || 1}</Text>
          </View>
          <View style={[styles.fareRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>${selectedTrip?.total || selectedTrip?.fare + 1}</Text>
          </View>
        </View>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <View style={styles.qrPlaceholder}>
            <Icon name="qr-code" size={80} color="#4A90E2" />
            <Text style={styles.qrText}>Scan at boarding</Text>
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
            You will receive a refund of ${selectedTrip ? (selectedTrip.fare * 0.9).toFixed(2) : '0'} (90%)
          </Text>
        </View>

        <View style={styles.refundDetails}>
          <Text style={styles.refundTitle}>Refund Details:</Text>
          <View style={styles.refundRow}>
            <Text style={styles.refundLabel}>Original Amount:</Text>
            <Text style={styles.refundValue}>${selectedTrip?.fare}</Text>
          </View>
          <View style={styles.refundRow}>
            <Text style={styles.refundLabel}>Cancellation Fee (10%):</Text>
            <Text style={styles.refundValue}>
              -${selectedTrip ? (selectedTrip.fare * 0.1).toFixed(2) : '0'}
            </Text>
          </View>
          <View style={[styles.refundRow, styles.refundTotal]}>
            <Text style={styles.refundTotalLabel}>Refund Amount:</Text>
            <Text style={styles.refundTotalValue}>
              ${selectedTrip ? (selectedTrip.fare * 0.9).toFixed(2) : '0'}
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
              <Text style={styles.bookingText}>{selectedTrip?.time}</Text>
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
          <Text style={styles.sectionTitle}>Select New Schedule</Text>

          <View style={styles.dateInputContainer}>
            <Text style={styles.inputLabel}>New Date</Text>
            <TouchableOpacity style={styles.dateInput}>
              <Icon name="calendar-today" size={20} color="#4A90E2" />
              <Text style={styles.dateInputText}>
                {rescheduleDate || 'Select new date'}
              </Text>
              <Icon name="arrow-drop-down" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.timeInputContainer}>
            <Text style={styles.inputLabel}>New Time Slot</Text>
            <TouchableOpacity style={styles.timeInput}>
              <Icon name="schedule" size={20} color="#4A90E2" />
              <Text style={styles.timeInputText}>
                {rescheduleTime || 'Select new time'}
              </Text>
              <Icon name="arrow-drop-down" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.availableOptions}>
            <Text style={styles.optionsTitle}>Available Options:</Text>
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => {
                setRescheduleDate('Tomorrow, 17 March');
                setRescheduleTime('10:00 AM - 11:30 AM');
              }}
            >
              <Text style={styles.optionTime}>10:00 AM - 11:30 AM</Text>
              <Text style={styles.optionDate}>Tomorrow, 17 March</Text>
              <Text style={styles.optionBus}>Bus B-006 • 12 seats available</Text>
              <Text style={styles.optionFare}>Fare: $12</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => {
                setRescheduleDate('Tomorrow, 17 March');
                setRescheduleTime('02:00 PM - 03:30 PM');
              }}
            >
              <Text style={styles.optionTime}>02:00 PM - 03:30 PM</Text>
              <Text style={styles.optionDate}>Tomorrow, 17 March</Text>
              <Text style={styles.optionBus}>Bus B-007 • 8 seats available</Text>
              <Text style={styles.optionFare}>Fare: $15 (Premium)</Text>
            </TouchableOpacity>
          </View>

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

  const renderModalContent = () => {
    switch (modalType) {
      case 'view':
        return renderViewTicketModal();
      case 'cancel':
        return renderCancelModal();
      case 'reschedule':
        return renderRescheduleModal();
      default:
        return null;
    }
  };

  const renderTripCard = (trip: any) => {
    return (
      <View key={trip.id} style={styles.tripCard}>
        {/* Trip Header */}
        <View style={styles.tripHeader}>
          <View style={styles.tripTime}>
            <Icon name="schedule" size={20} color="#4A90E2" />
            <Text style={styles.tripDateTime}>
              {trip.date} • {trip.time}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: trip.color + '20' }]}>
            <Text style={[styles.statusText, { color: trip.color }]}>
              {trip.statusText}
            </Text>
          </View>
        </View>

        {/* Trip Details */}
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
                <Text style={styles.infoValue}>{trip.ticketNumber}</Text>
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

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleViewTicket(trip)}
          >
            <Icon name="receipt" size={20} color="#4A90E2" />
            <Text style={styles.actionButtonText}>View Ticket</Text>
          </TouchableOpacity>

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

          {trip.status === 'boarding' && (
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
        {/* Header */}
        <View style={styles.header}>
          <Icon name="history" size={32} color="#1A237E" />
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>My Trips</Text>
            <Text style={styles.subtitle}>Manage your bookings</Text>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              selectedTab === 'upcoming' && styles.tabActive,
            ]}
            onPress={() => setSelectedTab('upcoming')}
          >
            <Text style={[
              styles.tabText,
              selectedTab === 'upcoming' && styles.tabTextActive,
            ]}>
              Upcoming ({trips.upcoming.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              selectedTab === 'active' && styles.tabActive,
            ]}
            onPress={() => setSelectedTab('active')}
          >
            <Text style={[
              styles.tabText,
              selectedTab === 'active' && styles.tabTextActive,
            ]}>
              Active ({trips.active.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              selectedTrip === 'past' && styles.tabActive,
            ]}
            onPress={() => setSelectedTab('past')}
          >
            <Text style={[
              styles.tabText,
              selectedTab === 'past' && styles.tabTextActive,
            ]}>
              Past ({trips.past.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Trips List */}
        <View style={styles.tripsContainer}>
          {selectedTab === 'upcoming' && trips.upcoming.map(renderTripCard)}
          {selectedTab === 'active' && trips.active.map(renderTripCard)}
          {selectedTab === 'past' && trips.past.map(renderTripCard)}

          {((selectedTab === 'upcoming' && trips.upcoming.length === 0) ||
            (selectedTab === 'active' && trips.active.length === 0) ||
            (selectedTab === 'past' && trips.past.length === 0)) && (
            <View style={styles.emptyState}>
              <Icon name="inbox" size={60} color="#DDD" />
              <Text style={styles.emptyStateText}>
                No {selectedTab} trips
              </Text>
              {selectedTab === 'upcoming' && (
                <TouchableOpacity
                  style={styles.bookNowButton}
                  onPress={handleBookNow}
                >
                  <Text style={styles.bookNowText}>BOOK A TRIP</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal */}
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

// Styles remain the same...
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
    marginBottom: 24,
    marginTop: 10,
  },
  headerTextContainer: {
    flex: 1,
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
  tabContainer: {
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
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#4A90E2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  tabTextActive: {
    color: '#FFF',
  },
  tripsContainer: {
    marginBottom: 30,
  },
  tripCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tripTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripDateTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tripDetails: {
    marginBottom: 20,
  },
  routeContainer: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4A90E2',
    marginRight: 12,
  },
  destinationDot: {
    backgroundColor: '#4CAF50',
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  dottedLine: {
    height: 20,
    width: 2,
    backgroundColor: 'transparent',
    borderLeftWidth: 2,
    borderLeftColor: '#DDD',
    borderStyle: 'dashed',
    marginLeft: 4,
  },
  tripInfo: {
    marginTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginRight: 4,
    minWidth: 50,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3E8EF',
  },
  primaryAction: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginLeft: 6,
  },
  primaryActionText: {
    color: '#FFF',
  },
  cancelText: {
    color: '#F44336',
  },
  rateButton: {
    borderColor: '#FFD700',
  },
  rateText: {
    color: '#FFD700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
    marginBottom: 8,
  },
  bookNowButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  bookNowText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalContent: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  modalBody: {
    maxHeight: 400,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3E8EF',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginLeft: 8,
  },
  shareButton: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  shareButtonText: {
    color: '#FFF',
  },
  cancelModalButton: {
    borderColor: '#E3E8EF',
  },
  cancelModalButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  confirmCancelButton: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  confirmCancelButtonText: {
    color: '#FFF',
    marginLeft: 8,
  },
  confirmRescheduleButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  confirmRescheduleButtonText: {
    color: '#FFF',
    marginLeft: 8,
  },
  // View Ticket Modal
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  ticketNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  infoSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  sectionValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  journeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  arrowIcon: {
    marginHorizontal: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    width: '48%',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  stopsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stopDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
    marginRight: 12,
  },
  stopName: {
    fontSize: 14,
    color: '#1A1A1A',
    flex: 1,
  },
  stopTime: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityBadge: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  amenityText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fareLabel: {
    fontSize: 16,
    color: '#666',
  },
  fareValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    borderRadius: 12,
    marginTop: 10,
  },
  qrPlaceholder: {
    alignItems: 'center',
  },
  qrText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '500',
  },
  // Cancel Modal
  cancelInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  cancelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 12,
    marginBottom: 4,
  },
  cancelSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  refundDetails: {
    backgroundColor: '#FFF3F3',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  refundTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
    marginBottom: 12,
  },
  refundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  refundLabel: {
    fontSize: 14,
    color: '#666',
  },
  refundValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  refundTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FFCDD2',
  },
  refundTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F44336',
  },
  refundTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  refundNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },
  reasonSection: {
    marginBottom: 20,
  },
  reasonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 16,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    marginBottom: 8,
  },
  reasonOptionSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0F8FF',
  },
  radioContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E3E8EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radio: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  radioSelected: {
    backgroundColor: '#4A90E2',
  },
  reasonText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  reasonTextSelected: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  orText: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 16,
    fontSize: 14,
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: '#E3E8EF',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1A1A1A',
    minHeight: 80,
  },
  // Reschedule Modal
  rescheduleInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  rescheduleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginTop: 12,
    marginBottom: 4,
  },
  rescheduleSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  currentBooking: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  currentBookingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 12,
  },
  bookingDetails: {
    marginLeft: 8,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  newScheduleSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 16,
  },
  dateInputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3E8EF',
    borderRadius: 8,
    padding: 14,
  },
  dateInputText: {
    fontSize: 16,
    color: '#1A1A1A',
    flex: 1,
    marginLeft: 12,
  },
  timeInputContainer: {
    marginBottom: 24,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3E8EF',
    borderRadius: 8,
    padding: 14,
  },
  timeInputText: {
    fontSize: 16,
    color: '#1A1A1A',
    flex: 1,
    marginLeft: 12,
  },
  availableOptions: {
    marginBottom: 20,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 12,
  },
  optionCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E3E8EF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  optionTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  optionDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  optionBus: {
    fontSize: 14,
    color: '#4A90E2',
    marginBottom: 4,
  },
  optionFare: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  rescheduleNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#FF9800',
    marginLeft: 8,
    flex: 1,
  },
});

export default MyTripsScreen;
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Share,
  Linking,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PassengerStackParamList } from '../../navigation/PassengerNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';

type BookingConfirmationScreenNavigationProp = StackNavigationProp<PassengerStackParamList, 'BookingConfirmation'>;
type BookingConfirmationScreenRouteProp = RouteProp<PassengerStackParamList, 'BookingConfirmation'>;

const BookingConfirmationScreen = () => {
  const navigation = useNavigation<BookingConfirmationScreenNavigationProp>();
  const route = useRoute<BookingConfirmationScreenRouteProp>();
  const { bookingId } = route.params;

  const [bookingDetails, setBookingDetails] = useState({
    ticketNumber: bookingId,
    passengerName: 'Ali Ahmed',
    busNumber: 'B-001',
    busType: 'Toyota Coaster',
    from: 'City Center',
    to: 'Airport',
    date: new Date().toLocaleDateString(),
    time: '08:00 AM',
    seat: '3A',
    boardingTime: '07:45 AM',
    arrivalTime: '09:30 AM',
    fare: 12,
    serviceFee: 1,
    total: 13,
  });

  useEffect(() => {
    // In real app, fetch booking details from API
    // setBookingDetails(fetchedData);
  }, []);

  const handleAddToCalendar = () => {
    Alert.alert('Add to Calendar', 'This would add the trip to your calendar in a real app');
  };

  const handleShareTicket = async () => {
    try {
      const message = `My Bus Ticket\n\nTicket: ${bookingDetails.ticketNumber}\nFrom: ${bookingDetails.from}\nTo: ${bookingDetails.to}\nDate: ${bookingDetails.date}\nTime: ${bookingDetails.time}\nSeat: ${bookingDetails.seat}`;

      await Share.share({
        message,
        title: 'Share Bus Ticket',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share ticket');
    }
  };

  const handleViewTrip = () => {
    navigation.navigate('Home');
  };

  const handleSetReminder = () => {
    Alert.alert('Set Reminder', 'Reminder set for 1 hour before departure');
  };

  const handleDownloadTicket = () => {
    Alert.alert('Download Ticket', 'Ticket downloaded successfully');
  };

  const handleContactSupport = () => {
    Linking.openURL('tel:+1234567890');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Success Icon */}
        <View style={styles.successContainer}>
          <View style={styles.successCircle}>
            <Icon name="check" size={60} color="#FFF" />
          </View>
          <Text style={styles.successTitle}>BOOKING CONFIRMED!</Text>
          <Text style={styles.successSubtitle}>Your ticket has been issued</Text>
        </View>

        {/* Ticket Number */}
        <View style={styles.ticketNumberCard}>
          <Text style={styles.ticketNumberLabel}>TICKET NUMBER</Text>
          <Text style={styles.ticketNumber}>{bookingDetails.ticketNumber}</Text>
        </View>

        {/* Ticket Details */}
        <View style={styles.ticketCard}>
          {/* Passenger Info */}
          <View style={styles.ticketSection}>
            <View style={styles.sectionHeader}>
              <Icon name="person" size={20} color="#4A90E2" />
              <Text style={styles.sectionTitle}>PASSENGER</Text>
            </View>
            <Text style={styles.detailText}>{bookingDetails.passengerName}</Text>
          </View>

          {/* Journey Info */}
          <View style={styles.ticketSection}>
            <View style={styles.sectionHeader}>
              <Icon name="route" size={20} color="#4A90E2" />
              <Text style={styles.sectionTitle}>JOURNEY</Text>
            </View>

            <View style={styles.journeyRow}>
              <View style={styles.locationItem}>
                <View style={styles.locationDot} />
                <View>
                  <Text style={styles.locationLabel}>FROM</Text>
                  <Text style={styles.locationText}>{bookingDetails.from}</Text>
                </View>
              </View>

              <Icon name="arrow-forward" size={24} color="#666" style={styles.arrowIcon} />

              <View style={styles.locationItem}>
                <View style={[styles.locationDot, styles.destinationDot]} />
                <View>
                  <Text style={styles.locationLabel}>TO</Text>
                  <Text style={styles.locationText}>{bookingDetails.to}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Trip Details */}
          <View style={styles.ticketSection}>
            <View style={styles.sectionHeader}>
              <Icon name="directions-bus" size={20} color="#4A90E2" />
              <Text style={styles.sectionTitle}>TRIP DETAILS</Text>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Icon name="calendar-today" size={16} color="#666" />
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{bookingDetails.date}</Text>
              </View>

              <View style={styles.detailItem}>
                <Icon name="schedule" size={16} color="#666" />
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{bookingDetails.time}</Text>
              </View>

              <View style={styles.detailItem}>
                <Icon name="event-seat" size={16} color="#666" />
                <Text style={styles.detailLabel}>Seat</Text>
                <Text style={styles.detailValue}>{bookingDetails.seat}</Text>
              </View>

              <View style={styles.detailItem}>
                <Icon name="confirmation-number" size={16} color="#666" />
                <Text style={styles.detailLabel}>Bus</Text>
                <Text style={styles.detailValue}>{bookingDetails.busNumber}</Text>
              </View>
            </View>
          </View>

          {/* Boarding Info */}
          <View style={styles.ticketSection}>
            <View style={styles.sectionHeader}>
              <Icon name="info" size={20} color="#4A90E2" />
              <Text style={styles.sectionTitle}>BOARDING INFORMATION</Text>
            </View>

            <View style={styles.boardingInfo}>
              <View style={styles.boardingItem}>
                <Icon name="access-time" size={20} color="#4CAF50" />
                <View style={styles.boardingTextContainer}>
                  <Text style={styles.boardingLabel}>Boarding Starts</Text>
                  <Text style={styles.boardingValue}>{bookingDetails.boardingTime}</Text>
                </View>
              </View>

              <View style={styles.boardingItem}>
                <Icon name="location-on" size={20} color="#4CAF50" />
                <View style={styles.boardingTextContainer}>
                  <Text style={styles.boardingLabel}>Location</Text>
                  <Text style={styles.boardingValue}>City Center Bus Stop, Gate 3</Text>
                </View>
              </View>
            </View>
          </View>

          {/* QR Code Placeholder */}
          <View style={styles.qrContainer}>
            <View style={styles.qrPlaceholder}>
              <Icon name="qr-code" size={100} color="#4A90E2" />
              <Text style={styles.qrText}>Scan at boarding</Text>
            </View>
          </View>
        </View>

        {/* Important Notes */}
        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>IMPORTANT REMINDERS</Text>

          <View style={styles.noteItem}>
            <Icon name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.noteText}>Arrive at least 15 minutes before boarding time</Text>
          </View>

          <View style={styles.noteItem}>
            <Icon name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.noteText}>Show QR code to driver for boarding</Text>
          </View>

          <View style={styles.noteItem}>
            <Icon name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.noteText}>Carry valid ID proof</Text>
          </View>

          <View style={styles.noteItem}>
            <Icon name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.noteText}>Boarding starts at {bookingDetails.boardingTime}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleAddToCalendar}
            >
              <Icon name="calendar-today" size={24} color="#4A90E2" />
              <Text style={styles.actionText}>Calendar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShareTicket}
            >
              <Icon name="share" size={24} color="#4A90E2" />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSetReminder}
            >
              <Icon name="notifications" size={24} color="#4A90E2" />
              <Text style={styles.actionText}>Reminder</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDownloadTicket}
            >
              <Icon name="download" size={24} color="#4A90E2" />
              <Text style={styles.actionText}>Download</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleContactSupport}
            >
              <Icon name="support-agent" size={24} color="#4A90E2" />
              <Text style={styles.actionText}>Support</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleViewTrip}
            >
              <Icon name="visibility" size={24} color="#4A90E2" />
              <Text style={styles.actionText}>View Trip</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Done Button */}
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.doneButtonText}>DONE</Text>
          <Icon name="check-circle" size={20} color="#FFF" />
        </TouchableOpacity>
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
  successContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  ticketNumberCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  ticketNumberLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
  },
  ticketNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A90E2',
    letterSpacing: 2,
  },
  ticketCard: {
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
  ticketSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginLeft: 12,
  },
  detailText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4A90E2',
    marginRight: 12,
  },
  destinationDot: {
    backgroundColor: '#4CAF50',
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  arrowIcon: {
    marginHorizontal: 20,
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
  boardingInfo: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
  },
  boardingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  boardingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  boardingLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  boardingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    borderRadius: 12,
    marginTop: 20,
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
  notesCard: {
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
  notesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 16,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  actionsContainer: {
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
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
    width: '30%',
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
});

export default BookingConfirmationScreen;
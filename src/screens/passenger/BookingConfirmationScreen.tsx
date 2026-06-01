// src/screens/passenger/BookingConfirmationScreen.tsx
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
  Platform,
  ActivityIndicator,
  Clipboard,
  Modal,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PassengerStackParamList } from '../../navigation/PassengerNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import QRCode from 'react-native-qrcode-svg';

type BookingConfirmationScreenNavigationProp = StackNavigationProp<PassengerStackParamList, 'BookingConfirmation'>;
type BookingConfirmationScreenRouteProp = RouteProp<PassengerStackParamList, 'BookingConfirmation'>;

interface BookingDetails {
  id: string;
  userId: string;
  ticketNumber: string;
  bookingCode?: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  busNumber: string;
  busType: string;
  from: string;
  to: string;
  fromCode: string;
  toCode: string;
  date: string;
  time: string;
  seatNumbers: string[];
  seatCount: number;
  boardingTime: string;
  arrivalTime: string;
  fare: number;
  serviceFee: number;
  discountAmount: number;
  total: number;
  paymentMethod: 'online_card' | 'jazzcash' | 'easypaisa' | 'cash_counter' | 'bank_transfer';
  paymentStatus: 'paid' | 'pending' | 'failed';
  status: 'confirmed' | 'pending_payment' | 'cancelled' | 'expired';
  paymentDeadline?: Date;
  tripId?: string;
  bankDetails?: {
    accountNumber: string;
    accountTitle: string;
    bankName: string;
  };
  createdAt: Date;
}

const BookingConfirmationScreen = () => {
  const navigation = useNavigation<BookingConfirmationScreenNavigationProp>();
  const route = useRoute<BookingConfirmationScreenRouteProp>();
  const bookingId = route.params?.bookingId ?? '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [qrValue, setQrValue] = useState<string>('');
  const [qrModalVisible, setQrModalVisible] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        setError('Invalid booking ID');
        setLoading(false);
        return;
      }
      try {
        const doc = await firestore().collection('bookings').doc(bookingId).get();
        if (!doc.exists) {
          setError('Booking not found');
          setLoading(false);
          return;
        }
        const data = doc.data() ?? {};

        const travelDate = data.travelDate?.toDate?.() ?? new Date();
        const paymentDeadline = data.paymentDeadline?.toDate?.();

        let tripTime = data.departureTime ?? '--:--';
        let arrivalTime = data.arrivalTime ?? '--:--';

        if (data.tripId) {
          const tripDoc = await firestore().collection('trips').doc(data.tripId).get();
          const tripData = tripDoc.data();
          tripTime = tripData?.departureTime ?? tripTime;
          arrivalTime = tripData?.arrivalTime ?? arrivalTime;
        }

        const details: BookingDetails = {
          id: doc.id,
          userId: data.userId ?? '',
          ticketNumber: data.ticketNumber ?? doc.id,
          bookingCode: data.bookingCode,
          passengerName: data.passengerName ?? 'Passenger',
          passengerEmail: data.passengerEmail ?? '',
          passengerPhone: data.passengerPhone ?? '',
          busNumber: data.busNumber ?? 'N/A',
          busType: data.busType ?? 'Standard',
          from: data.from ?? '',
          to: data.to ?? '',
          fromCode: data.fromCode ?? '',
          toCode: data.toCode ?? '',
          date: travelDate.toLocaleDateString(),
          time: tripTime,
          seatNumbers: data.seatNumbers ?? [],
          seatCount: data.seatCount ?? 1,
          boardingTime: tripTime,
          arrivalTime,
          fare: data.baseFare ?? data.fare ?? 0,
          serviceFee: data.serviceFee ?? 0,
          discountAmount: data.discountAmount ?? 0,
          total: data.totalAmount ?? data.total ?? 0,
          paymentMethod: data.paymentMethod ?? 'online_card',
          paymentStatus: data.paymentStatus ?? 'pending',
          status: data.status ?? 'pending_payment',
          paymentDeadline,
          tripId: data.tripId,
          bankDetails: data.bankDetails,
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
        };
        setBookingDetails(details);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load booking');
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [bookingId]);

  // Generate QR code when booking is paid
  useEffect(() => {
    if (bookingDetails && bookingDetails.paymentStatus === 'paid') {
      const qrData = {
        bookingId: bookingDetails.id,
        ticketNumber: bookingDetails.ticketNumber,
        bookingCode: bookingDetails.bookingCode,
        passengerName: bookingDetails.passengerName,
        busNumber: bookingDetails.busNumber,
        from: bookingDetails.from,
        fromCode: bookingDetails.fromCode,
        to: bookingDetails.to,
        toCode: bookingDetails.toCode,
        date: bookingDetails.date,
        time: bookingDetails.time,
        seatNumbers: bookingDetails.seatNumbers,
        total: bookingDetails.total,
        timestamp: new Date().toISOString(),
      };
      setQrValue(JSON.stringify(qrData));
    }
  }, [bookingDetails]);

  // Countdown timer for pending payments
  useEffect(() => {
    if (!bookingDetails?.paymentDeadline || bookingDetails.paymentStatus === 'paid') {
      return;
    }

    const timer = setInterval(() => {
      const now = new Date();
      const deadline = bookingDetails.paymentDeadline;
      const diff = deadline.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');
        clearInterval(timer);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [bookingDetails]);

  const handleManualPaymentConfirm = async () => {
    if (!bookingDetails) return;

    if (bookingDetails.paymentStatus === 'paid') {
      Alert.alert('Already Confirmed', 'This booking is already confirmed.');
      return;
    }

    if (bookingDetails.paymentDeadline && bookingDetails.paymentDeadline < new Date()) {
      Alert.alert(
        'Payment Deadline Passed',
        'The payment deadline for this booking has expired. Please make a new booking.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    setIsConfirming(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const bookingRef = firestore().collection('bookings').doc(bookingDetails.id);

      await bookingRef.update({
        status: 'confirmed',
        paymentStatus: 'paid',
        confirmedAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      const seatNumbers = bookingDetails.seatNumbers;
      const tripId = bookingDetails.tripId;

      if (tripId) {
        for (const seatNum of seatNumbers) {
          const seatRef = firestore()
            .collection('trips')
            .doc(tripId)
            .collection('seats')
            .doc(seatNum);

          await seatRef.update({
            status: 'booked',
            isBooked: true,
            bookedBy: bookingDetails.userId || auth().currentUser?.uid || bookingDetails.id,
            reservedBy: null,
            reservedUntil: null,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
        }

        await firestore().collection('trips').doc(tripId).update({
          availableSeats: firestore.FieldValue.increment(-seatNumbers.length),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      setBookingDetails(prev => prev ? {
        ...prev,
        status: 'confirmed',
        paymentStatus: 'paid',
      } : null);

      Alert.alert(
        'Payment Confirmed!',
        'Your booking is now confirmed. Your tickets are ready.',
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      console.error('Manual confirmation error:', error);
      Alert.alert('Error', error.message || 'Failed to confirm payment. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleAddToCalendar = () => {
    if (!bookingDetails) return;
    Alert.alert(
      'Add to Calendar',
      'Would you like to add this trip to your calendar?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to Google Calendar',
          onPress: () => {
            const eventTitle = `Bus Trip: ${bookingDetails.from} → ${bookingDetails.to}`;
            const eventDetails = `Ticket: ${bookingDetails.ticketNumber}\nBus: ${bookingDetails.busNumber}\nSeat: ${bookingDetails.seatNumbers.join(', ')}\nBoarding: ${bookingDetails.boardingTime}\nFrom: ${bookingDetails.from}\nTo: ${bookingDetails.to}`;

            if (Platform.OS === 'ios') {
              const calendarUrl = `calshow://?title=${encodeURIComponent(eventTitle)}&notes=${encodeURIComponent(eventDetails)}`;
              Linking.openURL(calendarUrl).catch(() => {
                Alert.alert('Error', 'Could not open calendar app');
              });
            } else {
              Alert.alert(
                'Add to Calendar',
                'Please add this event to your calendar manually:\n\n' + eventDetails,
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const handleShareTicket = async () => {
    if (!bookingDetails) return;

    const statusEmoji = bookingDetails.paymentStatus === 'paid' ? '✅' : '⏳';
    const statusText = bookingDetails.paymentStatus === 'paid' ? 'CONFIRMED' : 'PENDING PAYMENT';

    let ticketContent = `
${statusEmoji} BUS TICKET ${statusEmoji}
${statusText}
`;

    if (bookingDetails.paymentStatus === 'paid') {
      ticketContent += `
📋 Ticket: ${bookingDetails.ticketNumber}
👤 Passenger: ${bookingDetails.passengerName}
🚌 Bus: ${bookingDetails.busNumber}

📍 FROM: ${bookingDetails.from} (${bookingDetails.fromCode})
📍 TO: ${bookingDetails.to} (${bookingDetails.toCode})

📅 Date: ${bookingDetails.date}
⏰ Time: ${bookingDetails.time}
💺 Seats: ${bookingDetails.seatNumbers.join(', ')}

💰 Total: PKR ${bookingDetails.total.toLocaleString()}
`;
    } else {
      ticketContent += `
📋 Booking Code: ${bookingDetails.bookingCode}
👤 Passenger: ${bookingDetails.passengerName}
📍 FROM: ${bookingDetails.from} (${bookingDetails.fromCode})
📍 TO: ${bookingDetails.to} (${bookingDetails.toCode})
📅 Date: ${bookingDetails.date}
⏰ Time: ${bookingDetails.time}
💺 Seats: ${bookingDetails.seatNumbers.join(', ')}
💰 Total: PKR ${bookingDetails.total.toLocaleString()}
⏰ Payment Deadline: ${bookingDetails.paymentDeadline?.toLocaleString()}
⚠️ Please complete payment within the deadline to confirm your seats.
`;
    }

    ticketContent += `\n📱 Booked via ZuGo`;

    try {
      await Share.share({
        message: ticketContent,
        title: 'Share Bus Ticket',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share ticket');
    }
  };

  const handleCopyBookingCode = () => {
    if (bookingDetails?.bookingCode) {
      Clipboard.setString(bookingDetails.bookingCode);
      Alert.alert('Copied!', 'Booking code copied to clipboard');
    }
  };

  const handleViewTrip = () => {
    navigation.navigate('MyTrips');
  };

  const handleSetReminder = () => {
    if (!bookingDetails) return;
    Alert.alert(
      'Set Reminder',
      'When would you like to be reminded?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '1 hour before',
          onPress: () => {
            Alert.alert(
              'Reminder Set',
              `Reminder set for 1 hour before boarding (${bookingDetails.boardingTime})`,
              [{ text: 'OK' }]
            );
          }
        },
        {
          text: '30 minutes before',
          onPress: () => {
            Alert.alert(
              'Reminder Set',
              `Reminder set for 30 minutes before boarding (${bookingDetails.boardingTime})`,
              [{ text: 'OK' }]
            );
          }
        }
      ]
    );
  };

  const handleDownloadTicket = () => {
    if (!bookingDetails) return;

    const ticketContent = `
╔══════════════════════════════════════════╗
║          ✅ BUS TICKET ✅                ║
║              CONFIRMED                   ║
╠══════════════════════════════════════════╣
║ 🎫 Ticket: ${bookingDetails.ticketNumber.padEnd(25)} ║
║ 👤 Passenger: ${bookingDetails.passengerName.padEnd(22)} ║
╠══════════════════════════════════════════╣
║ 🚌 Bus: ${bookingDetails.busNumber.padEnd(29)} ║
║ 📅 Date: ${bookingDetails.date.padEnd(28)} ║
║ ⏰ Time: ${bookingDetails.time.padEnd(28)} ║
║ 💺 Seats: ${bookingDetails.seatNumbers.join(', ').padEnd(26)} ║
╠══════════════════════════════════════════╣
║ 📍 FROM: ${(bookingDetails.from + ' (' + bookingDetails.fromCode + ')').padEnd(26)} ║
║ 📍 TO:   ${(bookingDetails.to + ' (' + bookingDetails.toCode + ')').padEnd(26)} ║
╠══════════════════════════════════════════╣
║ 💰 Total: PKR ${bookingDetails.total.toLocaleString().padEnd(24)} ║
╚══════════════════════════════════════════╝
    `;

    Alert.alert(
      'Download Ticket',
      'Your ticket has been saved.',
      [
        { text: 'OK' },
        {
          text: 'Copy to Clipboard',
          onPress: () => {
            Clipboard.setString(ticketContent);
            Alert.alert('Copied!', 'Ticket copied to clipboard');
          }
        }
      ]
    );
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'How would you like to contact support?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '📞 Call Support', onPress: () => Linking.openURL('tel:+923001234567') },
        { text: '📧 Email Support', onPress: () => Linking.openURL('mailto:support@zugo.com') },
      ]
    );
  };

  const getPaymentMethodName = (method: string): string => {
    const methods: Record<string, string> = {
      'online_card': 'Credit/Debit Card',
      'jazzcash': 'JazzCash',
      'easypaisa': 'Easypaisa',
      'cash_counter': 'Cash at Counter',
      'bank_transfer': 'Bank Transfer',
    };
    return methods[method] || method;
  };

  const getStatusColor = () => {
    if (!bookingDetails) return '#666';
    if (bookingDetails.paymentStatus === 'paid') return '#4CAF50';
    if (bookingDetails.status === 'expired') return '#F44336';
    return '#FF9800';
  };

  const getStatusIcon = () => {
    if (!bookingDetails) return 'info';
    if (bookingDetails.paymentStatus === 'paid') return 'check-circle';
    if (bookingDetails.status === 'expired') return 'error';
    return 'hourglass-empty';
  };

  const getStatusText = () => {
    if (!bookingDetails) return '';
    if (bookingDetails.paymentStatus === 'paid') return 'CONFIRMED';
    if (bookingDetails.status === 'expired') return 'EXPIRED';
    return 'PENDING PAYMENT';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !bookingDetails) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={60} color="#F44336" />
          <Text style={styles.errorText}>{error || 'Booking not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isPaid = bookingDetails.paymentStatus === 'paid';
  const isPending = !isPaid && bookingDetails.status === 'pending_payment';
  const isExpired = bookingDetails.status === 'expired';
  const showManualConfirmButton = isPending &&
    (bookingDetails.paymentMethod === 'jazzcash' || 
     bookingDetails.paymentMethod === 'easypaisa' || 
     bookingDetails.paymentMethod === 'bank_transfer');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Status Icon */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusCircle, { backgroundColor: getStatusColor() }]}>
            <Icon name={getStatusIcon()} size={60} color="#FFF" />
          </View>
          <Text style={[styles.statusTitle, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
          {isPaid && <Text style={styles.statusSubtitle}>Your ticket has been issued</Text>}
          {isPending && (
            <Text style={styles.statusSubtitle}>
              Complete payment and tap "I HAVE PAID" to confirm your booking
            </Text>
          )}
          {isExpired && <Text style={styles.statusSubtitle}>Payment deadline has passed</Text>}
        </View>

        {/* I HAVE PAID Button */}
        {showManualConfirmButton && (
          <TouchableOpacity
            style={styles.manualConfirmButton}
            onPress={handleManualPaymentConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <>
                <ActivityIndicator size="small" color="#FFF" />
                <Text style={styles.manualConfirmButtonText}>VERIFYING...</Text>
              </>
            ) : (
              <>
                <Icon name="check-circle" size={24} color="#FFF" />
                <Text style={styles.manualConfirmButtonText}>I HAVE PAID</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Ticket Number Card */}
        <View style={styles.ticketNumberCard}>
          <Text style={styles.ticketNumberLabel}>
            {isPaid ? 'TICKET NUMBER' : 'BOOKING CODE'}
          </Text>
          <Text style={styles.ticketNumber}>
            {isPaid ? bookingDetails.ticketNumber : bookingDetails.bookingCode}
          </Text>
          {!isPaid && bookingDetails.bookingCode && (
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyBookingCode}>
              <Icon name="content-copy" size={20} color="#4A90E2" />
              <Text style={styles.copyButtonText}>Copy Code</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Payment Deadline */}
        {isPending && bookingDetails.paymentDeadline && (
          <View style={styles.deadlineCard}>
            <Icon name="access-time" size={24} color="#FF9800" />
            <View style={styles.deadlineInfo}>
              <Text style={styles.deadlineLabel}>Payment Deadline</Text>
              <Text style={styles.deadlineTime}>
                {bookingDetails.paymentDeadline.toLocaleString()}
              </Text>
              <Text style={styles.deadlineCountdown}>Time remaining: {timeRemaining}</Text>
            </View>
          </View>
        )}

        {/* Payment Instructions */}
        {isPending && bookingDetails.paymentMethod === 'cash_counter' && (
          <View style={styles.instructionsCard}>
            <Icon name="store" size={24} color="#4A90E2" />
            <Text style={styles.instructionsTitle}>Cash Payment Instructions</Text>
            <View style={styles.instructionItem}>
              <Icon name="looks-one" size={20} color="#4A90E2" />
              <Text style={styles.instructionText}>Visit any ZUGO customer service counter</Text>
            </View>
            <View style={styles.instructionItem}>
              <Icon name="looks-two" size={20} color="#4A90E2" />
              <Text style={styles.instructionText}>Show your booking code: {bookingDetails.bookingCode}</Text>
            </View>
            <View style={styles.instructionItem}>
              <Icon name="looks-three" size={20} color="#4A90E2" />
              <Text style={styles.instructionText}>Pay PKR {bookingDetails.total.toLocaleString()} in cash</Text>
            </View>
          </View>
        )}

        {isPending && bookingDetails.paymentMethod === 'bank_transfer' && (
          <View style={styles.instructionsCard}>
            <Icon name="account-balance" size={24} color="#4A90E2" />
            <Text style={styles.instructionsTitle}>Bank Transfer Instructions</Text>
            <View style={styles.bankDetailsCard}>
              <Text style={styles.bankDetailLabel}>Bank Name:</Text>
              <Text style={styles.bankDetailValue}>HBL - Habib Bank Limited</Text>
              <Text style={styles.bankDetailLabel}>Account Title:</Text>
              <Text style={styles.bankDetailValue}>ZUGO TRANSPORT SERVICES</Text>
              <Text style={styles.bankDetailLabel}>Account Number:</Text>
              <Text style={styles.bankDetailValue}>1234 5678 9012 3456</Text>
              <Text style={styles.bankDetailLabel}>Amount:</Text>
              <Text style={styles.bankDetailValue}>PKR {bookingDetails.total.toLocaleString()}</Text>
            </View>
          </View>
        )}

        {isPending && (bookingDetails.paymentMethod === 'jazzcash' || bookingDetails.paymentMethod === 'easypaisa') && (
          <View style={styles.instructionsCard}>
            <Icon name="phone-android" size={24} color="#4A90E2" />
            <Text style={styles.instructionsTitle}>
              {bookingDetails.paymentMethod === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} Payment
            </Text>
            <View style={styles.instructionItem}>
              <Icon name="looks-one" size={20} color="#4A90E2" />
              <Text style={styles.instructionText}>Open {bookingDetails.paymentMethod === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} app</Text>
            </View>
            <View style={styles.instructionItem}>
              <Icon name="looks-two" size={20} color="#4A90E2" />
              <Text style={styles.instructionText}>Go to "Pay Merchant" or "Scan QR"</Text>
            </View>
            <View style={styles.instructionItem}>
              <Icon name="looks-three" size={20} color="#4A90E2" />
              <Text style={styles.instructionText}>Enter Merchant ID: ZUGO123</Text>
            </View>
            <View style={styles.instructionItem}>
              <Icon name="looks-four" size={20} color="#4A90E2" />
              <Text style={styles.instructionText}>Amount: PKR {bookingDetails.total.toLocaleString()}</Text>
            </View>
          </View>
        )}

        {/* Ticket Card */}
        <View style={styles.ticketCard}>
          {/* Passenger Info */}
          <View style={styles.ticketSection}>
            <View style={styles.sectionHeader}>
              <Icon name="person" size={20} color="#4A90E2" />
              <Text style={styles.sectionTitle}>PASSENGER</Text>
            </View>
            <Text style={styles.detailText}>{bookingDetails.passengerName}</Text>
            <Text style={styles.detailSubText}>{bookingDetails.passengerEmail}</Text>
            <Text style={styles.detailSubText}>{bookingDetails.passengerPhone}</Text>
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
                  <Text style={styles.locationText}>
                    {bookingDetails.from} ({bookingDetails.fromCode})
                  </Text>
                </View>
              </View>
              <Icon name="arrow-forward" size={24} color="#666" style={styles.arrowIcon} />
              <View style={styles.locationItem}>
                <View style={[styles.locationDot, styles.destinationDot]} />
                <View>
                  <Text style={styles.locationLabel}>TO</Text>
                  <Text style={styles.locationText}>
                    {bookingDetails.to} ({bookingDetails.toCode})
                  </Text>
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
                <Text style={styles.detailLabel}>Seats</Text>
                <Text style={styles.detailValue}>{bookingDetails.seatNumbers.join(', ')}</Text>
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
                  <Text style={styles.boardingLabel}>Boarding Time</Text>
                  <Text style={styles.boardingValue}>{bookingDetails.boardingTime}</Text>
                </View>
              </View>
              <View style={styles.boardingItem}>
                <Icon name="location-on" size={20} color="#4CAF50" />
                <View style={styles.boardingTextContainer}>
                  <Text style={styles.boardingLabel}>Boarding Point</Text>
                  <Text style={styles.boardingValue}>City Center Bus Stop, Gate 3</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Payment Summary */}
          <View style={styles.ticketSection}>
            <View style={styles.sectionHeader}>
              <Icon name="payment" size={20} color="#4A90E2" />
              <Text style={styles.sectionTitle}>PAYMENT SUMMARY</Text>
            </View>
            <View style={styles.paymentSummary}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Base Fare ({bookingDetails.seatCount} seats)</Text>
                <Text style={styles.paymentValue}>PKR {bookingDetails.fare.toLocaleString()}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Service Fee</Text>
                <Text style={styles.paymentValue}>PKR {bookingDetails.serviceFee}</Text>
              </View>
              {bookingDetails.discountAmount > 0 && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Discount</Text>
                  <Text style={[styles.paymentValue, styles.discountText]}>
                    -PKR {bookingDetails.discountAmount.toLocaleString()}
                  </Text>
                </View>
              )}
              <View style={[styles.paymentRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalValue}>PKR {bookingDetails.total.toLocaleString()}</Text>
              </View>
              <View style={styles.paymentMethodRow}>
                <Text style={styles.paymentMethodLabel}>Payment Method:</Text>
                <Text style={styles.paymentMethodValue}>
                  {getPaymentMethodName(bookingDetails.paymentMethod)}
                </Text>
              </View>
              <View style={styles.paymentStatusRow}>
                <Text style={styles.paymentStatusLabel}>Payment Status:</Text>
                <View style={[styles.paymentStatusBadge, { backgroundColor: getStatusColor() }]}>
                  <Text style={styles.paymentStatusBadgeText}>
                    {bookingDetails.paymentStatus.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ✅ REAL QR CODE - Only for paid bookings */}
          {isPaid && qrValue && (
            <View style={styles.qrContainer}>
              <View style={styles.qrWrapper}>
                <QRCode
                  value={qrValue}
                  size={160}
                  color="#1A237E"
                  backgroundColor="#FFFFFF"
                />
                <Text style={styles.qrText}>📱 Scan at Boarding</Text>
                <Text style={styles.qrSubText}>Show this QR code to the driver</Text>
              </View>
              <TouchableOpacity
                style={styles.enlargeQrButton}
                onPress={() => setQrModalVisible(true)}
              >
                <Icon name="fullscreen" size={20} color="#4A90E2" />
                <Text style={styles.enlargeQrText}>View Full Screen</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Important Notes */}
        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>IMPORTANT REMINDERS</Text>
          <View style={styles.noteItem}>
            <Icon name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.noteText}>Arrive at least 15 minutes before boarding time</Text>
          </View>
          {isPaid && (
            <View style={styles.noteItem}>
              <Icon name="check-circle" size={16} color="#4CAF50" />
              <Text style={styles.noteText}>Show QR code or ticket to driver for boarding</Text>
            </View>
          )}
          {!isPaid && (
            <View style={styles.noteItem}>
              <Icon name="warning" size={16} color="#FF9800" />
              <Text style={styles.noteText}>Complete payment and tap "I HAVE PAID" to confirm your seats</Text>
            </View>
          )}
          <View style={styles.noteItem}>
            <Icon name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.noteText}>Carry valid ID proof</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handleAddToCalendar}>
              <Icon name="calendar-today" size={24} color="#4A90E2" />
              <Text style={styles.actionText}>Calendar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShareTicket}>
              <Icon name="share" size={24} color="#4A90E2" />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleSetReminder}>
              <Icon name="notifications" size={24} color="#4A90E2" />
              <Text style={styles.actionText}>Reminder</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handleDownloadTicket}>
              <Icon name="download" size={24} color="#4A90E2" />
              <Text style={styles.actionText}>Download</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleContactSupport}>
              <Icon name="support-agent" size={24} color="#4A90E2" />
              <Text style={styles.actionText}>Support</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleViewTrip}>
              <Icon name="visibility" size={24} color="#4A90E2" />
              <Text style={styles.actionText}>My Trips</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Done Button */}
        <TouchableOpacity style={styles.doneButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.doneButtonText}>DONE</Text>
          <Icon name="check-circle" size={20} color="#FFF" />
        </TouchableOpacity>
      </ScrollView>

      {/* Full Screen QR Code Modal */}
      <Modal
        visible={qrModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContent}>
            <TouchableOpacity
              style={styles.qrModalClose}
              onPress={() => setQrModalVisible(false)}
            >
              <Icon name="close" size={30} color="#FFF" />
            </TouchableOpacity>
            <QRCode
              value={qrValue}
              size={280}
              color="#1A237E"
              backgroundColor="#FFFFFF"
            />
            <Text style={styles.qrModalText}>ZUGO Transport</Text>
            <Text style={styles.qrModalSubText}>Show this QR code at boarding</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { marginTop: 16, fontSize: 16, color: '#F44336', textAlign: 'center' },
  retryButton: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#4A90E2', borderRadius: 8 },
  retryButtonText: { color: '#FFF', fontWeight: '600' },
  container: { flex: 1, padding: 16 },
  statusContainer: { alignItems: 'center', marginVertical: 20 },
  statusCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  statusTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  statusSubtitle: { fontSize: 16, color: '#666', textAlign: 'center' },
  manualConfirmButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  manualConfirmButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  ticketNumberCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  ticketNumberLabel: { fontSize: 14, color: '#666', fontWeight: '600', marginBottom: 8 },
  ticketNumber: { fontSize: 24, fontWeight: 'bold', color: '#4A90E2', letterSpacing: 1, marginBottom: 8 },
  copyButton: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  copyButtonText: { fontSize: 14, color: '#4A90E2', marginLeft: 4 },
  deadlineCard: { backgroundColor: '#FFF3E0', borderRadius: 12, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FFE0B2' },
  deadlineInfo: { marginLeft: 12, flex: 1 },
  deadlineLabel: { fontSize: 14, color: '#E65100', fontWeight: '600', marginBottom: 4 },
  deadlineTime: { fontSize: 16, color: '#1A1A1A', fontWeight: '600', marginBottom: 2 },
  deadlineCountdown: { fontSize: 14, color: '#FF9800', fontWeight: '600' },
  instructionsCard: { backgroundColor: '#F0F8FF', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#BBDEFB' },
  instructionsTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A237E', marginTop: 12, marginBottom: 16 },
  instructionItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  instructionText: { fontSize: 14, color: '#666', marginLeft: 12, flex: 1 },
  bankDetailsCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16 },
  bankDetailLabel: { fontSize: 14, color: '#666', marginTop: 8 },
  bankDetailValue: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 },
  ticketCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  ticketSection: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1A237E', marginLeft: 12 },
  detailText: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  detailSubText: { fontSize: 14, color: '#666', marginBottom: 2 },
  journeyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locationItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  locationDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4A90E2', marginRight: 12 },
  destinationDot: { backgroundColor: '#4CAF50' },
  locationLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  locationText: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  arrowIcon: { marginHorizontal: 20 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  detailItem: { width: '48%', marginBottom: 16 },
  detailLabel: { fontSize: 12, color: '#666', marginTop: 4, marginBottom: 2 },
  detailValue: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  boardingInfo: { backgroundColor: '#F0F8FF', borderRadius: 12, padding: 16 },
  boardingItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  boardingTextContainer: { marginLeft: 12, flex: 1 },
  boardingLabel: { fontSize: 14, color: '#666', marginBottom: 2 },
  boardingValue: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  paymentSummary: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 16 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  paymentLabel: { fontSize: 14, color: '#666' },
  paymentValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  discountText: { color: '#4CAF50' },
  totalRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#1A237E' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#4CAF50' },
  paymentMethodRow:
   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  paymentMethodLabel: { fontSize: 14, color: '#666' },
  paymentMethodValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  paymentStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  paymentStatusLabel: { fontSize: 14, color: '#666' },
  paymentStatusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  paymentStatusBadgeText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  qrContainer: { alignItems: 'center', padding: 20, borderWidth: 1, borderColor: '#E3E8EF', borderRadius: 12, marginTop: 20, backgroundColor: '#FFF' },
  qrWrapper: { alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderRadius: 12 },
  qrText: { fontSize: 16, color: '#4CAF50', marginTop: 16, fontWeight: 'bold' },
  qrSubText: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' },
  enlargeQrButton: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#F0F8FF', borderRadius: 20 },
  enlargeQrText: { fontSize: 12, color: '#4A90E2', marginLeft: 8 },
  qrModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  qrModalContent: { alignItems: 'center', padding: 20 },
  qrModalClose: { position: 'absolute', top: -40, right: 0, padding: 10 },
  qrModalText: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginTop: 24 },
  qrModalSubText: { fontSize: 14, color: '#CCC', marginTop: 8 },
  notesCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  notesTitle: { fontSize: 18, fontWeight: '600', color: '#1A237E', marginBottom: 16 },
  noteItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  noteText: { fontSize: 14, color: '#666', marginLeft: 12, flex: 1, lineHeight: 20 },
  actionsContainer: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  actionButton: { alignItems: 'center', width: '30%' },
  actionText: { fontSize: 12, color: '#666', marginTop: 8, textAlign: 'center' },
  doneButton: { backgroundColor: '#4A90E2', borderRadius: 12, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 30, shadowColor: '#4A90E2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  doneButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginRight: 10 },
});

export default BookingConfirmationScreen;
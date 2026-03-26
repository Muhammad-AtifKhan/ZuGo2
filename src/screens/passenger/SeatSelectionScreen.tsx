// src/screens/passenger/SeatSelectionScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PassengerStackParamList } from '../../navigation/PassengerNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// Import seat helpers
import {
  getAllSeats,
  getAvailableSeats,
  checkSeatsAvailability,
  holdSeats,
  releaseSeats,
} from '../../utils/seatHelpers';

type SeatSelectionScreenNavigationProp = StackNavigationProp<PassengerStackParamList, 'SeatSelection'>;
type SeatSelectionScreenRouteProp = RouteProp<PassengerStackParamList, 'SeatSelection'>;

const { width } = Dimensions.get('window');
const SEAT_SIZE = (width - 60) / 5;
const AISLE_WIDTH = SEAT_SIZE * 1.5;

interface Seat {
  id: string;
  seatNumber: string;
  number: string;
  row: number;
  column: number;
  type: string;
  isAvailable: boolean;
  status: string;
  isWheelchairAccessible: boolean;
  hasExtraLegroom: boolean;
  isPremium: boolean;
  price: number;
  reservedBy?: string | null;
  reservedUntil?: any;
}

const SeatSelectionScreen = () => {
  const navigation = useNavigation<SeatSelectionScreenNavigationProp>();
  const route = useRoute<SeatSelectionScreenRouteProp>();
  const params = route.params ?? {};
  const tripId = params.tripId ?? '';
  const busId = params.busId ?? '';
  const from = params.from ?? '';
  const to = params.to ?? '';
  const date = params.date ?? '';
  const time = params.time ?? '';
  const farePerSeat = params.fare ?? 12;
  const busNumber = params.busNumber ?? 'N/A';
  const fromCode = params.fromCode;
  const toCode = params.toCode;

  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [passengerCount, setPassengerCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [holdingSeats, setHoldingSeats] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [specialNeeds, setSpecialNeeds] = useState({
    wheelchair: false,
    extraLegroom: false,
    nearExit: false,
  });

  const user = auth().currentUser;

  // ✅ Fetch real seats from Firestore
  useEffect(() => {
    fetchSeats();
  }, [tripId]);

  const fetchSeats = async () => {
    setLoading(true);
    try {
      console.log('🪑 Fetching seats for trip:', tripId);

      // Get all seats from Firestore
      const seatsData = await getAllSeats(tripId);

      if (seatsData.length === 0) {
        Alert.alert('Error', 'No seats found for this trip');
        setSeats([]);
        return;
      }

      // Transform to component format
      const formattedSeats = seatsData.map(seat => ({
        ...seat,
        id: `seat-${seat.seatNumber}`,
        number: seat.seatNumber,
        isAvailable: seat.status === 'available',
        isPremium: seat.row <= 2,
      }));

      setSeats(formattedSeats);
      console.log(`✅ Loaded ${formattedSeats.length} seats`);

    } catch (error) {
      console.error('Error fetching seats:', error);
      Alert.alert('Error', 'Failed to load seats. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Countdown timer for held seats
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0) {
      // Time's up - release seats
      Alert.alert(
        'Hold Expired',
        'Seat hold time has expired. Please select seats again.',
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedSeats([]);
              setCountdown(null);
              fetchSeats(); // Refresh seats
            }
          }
        ]
      );
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  // ✅ Handle seat selection with hold mechanism
  const handleSeatSelect = async (seatId: string, seatNumber: string) => {
    const seat = seats.find(s => s.id === seatId);

    if (!seat) return;

    if (!seat.isAvailable) {
      Alert.alert('Seat Unavailable', `Seat ${seatNumber} is already booked.`);
      return;
    }

    if (selectedSeats.includes(seatId)) {
      // Deselect seat
      const newSelected = selectedSeats.filter(id => id !== seatId);
      setSelectedSeats(newSelected);

      // If no seats selected, clear hold
      if (newSelected.length === 0) {
        setCountdown(null);
      }

    } else {
      // Check if we've reached passenger count limit
      if (selectedSeats.length >= passengerCount) {
        Alert.alert('Limit Reached', `You can only select ${passengerCount} seat(s).`);
        return;
      }

      // Check special needs constraints
      if (specialNeeds.wheelchair && !seat.isWheelchairAccessible) {
        Alert.alert('Invalid Selection', 'Please select a wheelchair accessible seat.');
        return;
      }

      if (specialNeeds.extraLegroom && !seat.hasExtraLegroom) {
        Alert.alert('Invalid Selection', 'Please select an extra legroom seat.');
        return;
      }

      // Select seat
      const newSelected = [...selectedSeats, seatId];
      setSelectedSeats(newSelected);

      // If we've reached passenger count, hold the seats
      if (newSelected.length === passengerCount) {
        await holdSelectedSeats(newSelected);
      }
    }
  };

  // ✅ Hold seats function
  const holdSelectedSeats = async (seatIds: string[]) => {
    if (!user) {
      Alert.alert('Error', 'Please login to continue');
      return;
    }

    setHoldingSeats(true);

    try {
      const seatNumbers = seatIds.map(id => id.replace('seat-', ''));

      // Check availability first
      const availabilityCheck = await checkSeatsAvailability(tripId, seatNumbers);

      const unavailableSeats = availabilityCheck.filter(s => !s.available);
      if (unavailableSeats.length > 0) {
        Alert.alert(
          'Seats No Longer Available',
          `The following seats are no longer available: ${unavailableSeats.map(s => s.seatNumber).join(', ')}`
        );
        setSelectedSeats([]);
        await fetchSeats(); // Refresh seats
        return;
      }

      // Hold the seats
      const result = await holdSeats(tripId, seatNumbers, user.uid);

      if (result.success) {
        // Calculate countdown in seconds (15 minutes = 900 seconds)
        const now = new Date();
        const deadline = result.reservedUntil;
        const secondsLeft = Math.floor((deadline.getTime() - now.getTime()) / 1000);

        setCountdown(secondsLeft);

        Alert.alert(
          'Seats Held',
          `Your seats are held for 15 minutes. Complete payment within this time.`,
          [{ text: 'OK' }]
        );
      }

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to hold seats');
      setSelectedSeats([]);
    } finally {
      setHoldingSeats(false);
    }
  };

  // ✅ Temporary button for generating seats (Option A)
  const handleGenerateSeats = async () => {
    Alert.alert(
      'Generate Seats',
      'This will generate seats for this trip if they don\'t exist. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setLoading(true);
            try {
              // Check if seats already exist
              const existingSeats = await getAllSeats(tripId);

              if (existingSeats.length > 0) {
                Alert.alert('Info', 'Seats already exist for this trip');
                await fetchSeats();
                return;
              }

              // Generate seats using the same logic as ScheduleTripScreen
              const db = firestore();
              const batch = db.batch();
              const seatsRef = db.collection('trips').doc(tripId).collection('seats');

              // Get trip data to know totalSeats and fare
              const tripDoc = await db.collection('trips').doc(tripId).get();
              const tripData = tripDoc.data();
              const totalSeats = tripData?.totalSeats || 40;
              const fare = tripData?.fare || farePerSeat;

              const rows = Math.ceil(totalSeats / 5);
              const columns = 5;

              for (let row = 1; row <= rows; row++) {
                for (let col = 1; col <= columns; col++) {
                  const seatNumber = `${row}${String.fromCharCode(64 + col)}`;
                  const seatRef = seatsRef.doc(seatNumber);

                  const isPremium = row <= 2;
                  const isWindow = col === 1 || col === 5;
                  const isAisle = col === 3;
                  const isMiddle = col === 2 || col === 4;
                  const hasExtraLegroom = row === 1;
                  const isWheelchairAccessible = row === rows && (col === 1 || col === 2);

                  batch.set(seatRef, {
                    seatNumber,
                    row,
                    column: col,
                    isBooked: false,
                    status: 'available',
                    price: isPremium ? Math.round(fare * 1.25) : fare,
                    type: isWindow ? 'window' : isAisle ? 'aisle' : 'middle',
                    isWindow,
                    isAisle,
                    isMiddle,
                    hasExtraLegroom,
                    isWheelchairAccessible,
                    reservedBy: null,
                    reservedUntil: null,
                    bookingId: null,
                    createdAt: firestore.FieldValue.serverTimestamp(),
                    updatedAt: firestore.FieldValue.serverTimestamp()
                  });
                }
              }

              await batch.commit();
              Alert.alert('Success', 'Seats generated successfully!');
              await fetchSeats();

            } catch (error) {
              console.error('Error generating seats:', error);
              Alert.alert('Error', 'Failed to generate seats');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSpecialNeedToggle = (need: keyof typeof specialNeeds) => {
    setSpecialNeeds(prev => ({
      ...prev,
      [need]: !prev[need],
    }));

    // Clear selections if special need is toggled
    setSelectedSeats([]);
    setCountdown(null);
  };

  const handleProceedToPayment = () => {
    if (!tripId || !busId) {
      Alert.alert('Error', 'Invalid trip data. Please go back and try again.');
      return;
    }
    if (selectedSeats.length === 0) {
      Alert.alert('No Seats Selected', 'Please select at least one seat.');
      return;
    }
    if (selectedSeats.length !== passengerCount) {
      Alert.alert('Seat Count Mismatch', `Please select exactly ${passengerCount} seat(s).`);
      return;
    }

    const seatNumbers = selectedSeats.map(id => id.replace('seat-', ''));
    const totalAmount = selectedSeats.reduce((sum, seatId) => {
      const seat = seats.find(s => s.id === seatId);
      return sum + (seat?.price ?? farePerSeat);
    }, 0);

    navigation.navigate('Payment', {
      tripId,
      busId,
      seatIds: selectedSeats,
      seatNumbers,
      totalAmount,
      from,
      to,
      date,
      time,
      fare: farePerSeat,
      busNumber,
      fromCode,
      toCode,
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderSeatLayout = () => {
    if (!seats || seats.length === 0) return null;

    const rows = Math.max(...seats.map(s => s.row));
    const layout = [];

    for (let row = 1; row <= rows; row++) {
      const rowSeats = seats.filter(seat => seat.row === row);

      layout.push(
        <View key={`row-${row}`} style={styles.seatRow}>
          {/* Left side seats */}
          <View style={styles.seatGroup}>
            {rowSeats.filter(seat => seat.column <= 2).map(seat => (
              <TouchableOpacity
                key={seat.id}
                style={[
                  styles.seat,
                  seat.column === 1 ? styles.windowSeat : styles.aisleSeat,
                  !seat.isAvailable && styles.seatBooked,
                  selectedSeats.includes(seat.id) && styles.seatSelected,
                  seat.isWheelchairAccessible && styles.wheelchairSeat,
                  seat.hasExtraLegroom && styles.premiumSeat,
                ]}
                onPress={() => handleSeatSelect(seat.id, seat.number)}
                disabled={!seat.isAvailable || holdingSeats}
              >
                <Text style={[
                  styles.seatText,
                  !seat.isAvailable && styles.seatTextBooked,
                  selectedSeats.includes(seat.id) && styles.seatTextSelected,
                ]}>
                  {seat.number}
                </Text>
                {seat.isWheelchairAccessible && (
                  <Icon name="accessible" size={10} color="#FFF" style={styles.seatIcon} />
                )}
                {seat.hasExtraLegroom && (
                  <Icon name="star" size={10} color="#FFD700" style={styles.seatIcon} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Aisle */}
          <View style={styles.aisle}>
            <Text style={styles.rowNumber}>{row}</Text>
          </View>

          {/* Right side seats */}
          <View style={styles.seatGroup}>
            {rowSeats.filter(seat => seat.column > 2).map(seat => (
              <TouchableOpacity
                key={seat.id}
                style={[
                  styles.seat,
                  seat.column === 4 ? styles.windowSeat : styles.aisleSeat,
                  !seat.isAvailable && styles.seatBooked,
                  selectedSeats.includes(seat.id) && styles.seatSelected,
                  seat.isWheelchairAccessible && styles.wheelchairSeat,
                  seat.hasExtraLegroom && styles.premiumSeat,
                ]}
                onPress={() => handleSeatSelect(seat.id, seat.number)}
                disabled={!seat.isAvailable || holdingSeats}
              >
                <Text style={[
                  styles.seatText,
                  !seat.isAvailable && styles.seatTextBooked,
                  selectedSeats.includes(seat.id) && styles.seatTextSelected,
                ]}>
                  {seat.number}
                </Text>
                {seat.isWheelchairAccessible && (
                  <Icon name="accessible" size={10} color="#FFF" style={styles.seatIcon} />
                )}
                {seat.hasExtraLegroom && (
                  <Icon name="star" size={10} color="#FFD700" style={styles.seatIcon} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    return layout;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading seats...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#1A237E" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>SELECT SEATS</Text>
            <Text style={styles.headerSubtitle}>Bus {busNumber}</Text>
          </View>

          {/* ✅ TEMPORARY BUTTON for generating seats (Option A) */}
          {__DEV__ && (
            <TouchableOpacity
              style={styles.generateButton}
              onPress={handleGenerateSeats}
            >
              <Icon name="build" size={24} color="#4A90E2" />
            </TouchableOpacity>
          )}
        </View>

        {/* Trip Summary */}
        <View style={styles.tripSummaryCard}>
          <View style={styles.tripInfo}>
            <View style={styles.locationRow}>
              <View style={styles.locationDot} />
              <Text style={styles.locationText}>{from}</Text>
              {fromCode && <Text style={styles.locationCode}> ({fromCode})</Text>}
            </View>
            <View style={styles.verticalLine} />
            <View style={styles.locationRow}>
              <View style={[styles.locationDot, styles.destinationDot]} />
              <Text style={styles.locationText}>{to}</Text>
              {toCode && <Text style={styles.locationCode}> ({toCode})</Text>}
            </View>
          </View>

          <View style={styles.tripDetails}>
            <View style={styles.detailItem}>
              <Icon name="calendar-today" size={16} color="#666" />
              <Text style={styles.detailText}>{date}</Text>
            </View>
            <View style={styles.detailItem}>
              <Icon name="access-time" size={16} color="#666" />
              <Text style={styles.detailText}>{time}</Text>
            </View>
            <View style={styles.detailItem}>
              <Icon name="attach-money" size={16} color="#666" />
              <Text style={styles.detailText}>PKR {farePerSeat} per seat</Text>
            </View>
          </View>
        </View>

        {/* Countdown Timer */}
        {countdown !== null && countdown > 0 && (
          <View style={styles.countdownContainer}>
            <Icon name="timer" size={20} color="#FF9800" />
            <Text style={styles.countdownText}>
              Seats held for: {formatTime(countdown)}
            </Text>
          </View>
        )}

        {/* Seat Layout Container */}
        <View style={styles.seatLayoutContainer}>
          <Text style={styles.sectionTitle}>CHOOSE YOUR SEATS</Text>

          {/* Bus Front */}
          <View style={styles.busFront}>
            <Icon name="directions-bus" size={40} color="#4A90E2" />
            <Text style={styles.busFrontText}>Front</Text>
          </View>

          {/* Seat Layout */}
          <View style={styles.layoutContainer}>
            {renderSeatLayout()}
          </View>

          {/* Legend */}
          <View style={styles.legendContainer}>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.seatAvailable]} />
                <Text style={styles.legendText}>Available</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.seatSelected]} />
                <Text style={styles.legendText}>Selected</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.seatBooked]} />
                <Text style={styles.legendText}>Booked</Text>
              </View>
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.wheelchairSeat]} />
                <Text style={styles.legendText}>Wheelchair</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.premiumSeat]}>
                  <Icon name="star" size={12} color="#FFD700" />
                </View>
                <Text style={styles.legendText}>Premium</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Passenger Count */}
        <View style={styles.passengerSection}>
          <Text style={styles.sectionTitle}>PASSENGERS</Text>
          <View style={styles.passengerCountContainer}>
            <TouchableOpacity
              style={styles.countButton}
              onPress={() => {
                setPassengerCount(prev => Math.max(1, prev - 1));
                setSelectedSeats([]);
                setCountdown(null);
              }}
            >
              <Icon name="remove" size={24} color="#4A90E2" />
            </TouchableOpacity>

            <View style={styles.countDisplay}>
              <Text style={styles.countText}>{passengerCount}</Text>
              <Text style={styles.countLabel}>Adult(s)</Text>
            </View>

            <TouchableOpacity
              style={styles.countButton}
              onPress={() => {
                setPassengerCount(prev => Math.min(10, prev + 1));
                setSelectedSeats([]);
                setCountdown(null);
              }}
            >
              <Icon name="add" size={24} color="#4A90E2" />
            </TouchableOpacity>
          </View>

          <Text style={styles.selectionNote}>
            Select exactly {passengerCount} seat(s)
          </Text>
        </View>

        {/* Special Needs */}
        <View style={styles.specialNeedsSection}>
          <Text style={styles.sectionTitle}>SPECIAL NEEDS</Text>
          <View style={styles.needsContainer}>
            <TouchableOpacity
              style={[
                styles.needOption,
                specialNeeds.wheelchair && styles.needOptionSelected,
              ]}
              onPress={() => handleSpecialNeedToggle('wheelchair')}
            >
              <Icon
                name="accessible"
                size={24}
                color={specialNeeds.wheelchair ? '#FFF' : '#4A90E2'}
              />
              <Text style={[
                styles.needText,
                specialNeeds.wheelchair && styles.needTextSelected,
              ]}>
                Wheelchair
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.needOption,
                specialNeeds.extraLegroom && styles.needOptionSelected,
              ]}
              onPress={() => handleSpecialNeedToggle('extraLegroom')}
            >
              <Icon
                name="airline-seat-legroom-extra"
                size={24}
                color={specialNeeds.extraLegroom ? '#FFF' : '#4A90E2'}
              />
              <Text style={[
                styles.needText,
                specialNeeds.extraLegroom && styles.needTextSelected,
              ]}>
                Extra Legroom
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.needOption,
                specialNeeds.nearExit && styles.needOptionSelected,
              ]}
              onPress={() => handleSpecialNeedToggle('nearExit')}
            >
              <Icon
                name="exit-to-app"
                size={24}
                color={specialNeeds.nearExit ? '#FFF' : '#4A90E2'}
              />
              <Text style={[
                styles.needText,
                specialNeeds.nearExit && styles.needTextSelected,
              ]}>
                Near Exit
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary & Action */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Selected Seats:</Text>
            <Text style={styles.summaryValue}>
              {selectedSeats.length > 0
                ? selectedSeats.map(id => seats.find(s => s.id === id)?.number).join(', ')
                : 'None'
              }
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Fare per seat:</Text>
            <Text style={styles.summaryValue}>PKR {farePerSeat}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Fee:</Text>
            <Text style={styles.summaryValue}>PKR 1</Text>
          </View>

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalAmount}>
              PKR {selectedSeats.length * farePerSeat + 1}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.proceedButton,
              (selectedSeats.length === 0 || holdingSeats) && styles.proceedButtonDisabled,
            ]}
            onPress={handleProceedToPayment}
            disabled={selectedSeats.length === 0 || holdingSeats}
          >
            {holdingSeats ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Text style={styles.proceedButtonText}>
                  PROCEED TO PAYMENT
                </Text>
                <Icon name="arrow-forward" size={20} color="#FFF" />
              </>
            )}
          </TouchableOpacity>
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  generateButton: {
    padding: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  countdownText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
    marginLeft: 8,
  },
  tripSummaryCard: {
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
  tripInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
  locationCode: {
    fontSize: 12,
    color: '#4A90E2',
    marginLeft: 4,
  },
  verticalLine: {
    width: 40,
    height: 2,
    backgroundColor: '#DDD',
    marginHorizontal: 12,
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  seatLayoutContainer: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 16,
  },
  busFront: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  busFrontText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  layoutContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  seatGroup: {
    flexDirection: 'row',
  },
  aisle: {
    width: AISLE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowNumber: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  seat: {
    width: SEAT_SIZE,
    height: SEAT_SIZE,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    borderWidth: 1,
  },
  windowSeat: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0F8FF',
  },
  aisleSeat: {
    borderColor: '#87CEEB',
    backgroundColor: '#F0FFFF',
  },
  seatSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#388E3C',
  },
  seatBooked: {
    backgroundColor: '#FFCDD2',
    borderColor: '#F44336',
  },
  wheelchairSeat: {
    backgroundColor: '#FF9800',
    borderColor: '#F57C00',
  },
  premiumSeat: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFB74D',
  },
  seatText: {
    fontSize: 12,
    fontWeight: '600',
  },
  seatTextSelected: {
    color: '#FFF',
  },
  seatTextBooked: {
    color: '#666',
    textDecorationLine: 'line-through',
  },
  seatIcon: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  legendContainer: {
    marginTop: 20,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatAvailable: {
    backgroundColor: '#F0F8FF',
    borderColor: '#4A90E2',
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  passengerSection: {
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
  passengerCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  countButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countDisplay: {
    alignItems: 'center',
    marginHorizontal: 30,
  },
  countText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  countLabel: {
    fontSize: 14,
    color: '#666',
  },
  selectionNote: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  specialNeedsSection: {
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
  needsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  needOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    width: '30%',
  },
  needOptionSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  needText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  needTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  summaryCard: {
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  totalRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  proceedButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  proceedButtonDisabled: {
    backgroundColor: '#CCC',
    shadowColor: '#999',
  },
  proceedButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
});

export default SeatSelectionScreen;
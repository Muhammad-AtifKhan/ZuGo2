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
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PassengerStackParamList } from '../../navigation/PassengerNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';

type SeatSelectionScreenNavigationProp = StackNavigationProp<PassengerStackParamList, 'SeatSelection'>;
type SeatSelectionScreenRouteProp = RouteProp<PassengerStackParamList, 'SeatSelection'>;

const { width } = Dimensions.get('window');
const SEAT_SIZE = (width - 60) / 5;
const AISLE_WIDTH = SEAT_SIZE * 1.5;

const SeatSelectionScreen = () => {
  const navigation = useNavigation<SeatSelectionScreenNavigationProp>();
  const route = useRoute<SeatSelectionScreenRouteProp>();
  const { busId, from, to, date, time } = route.params;

  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [passengerCount, setPassengerCount] = useState(1);
  const [specialNeeds, setSpecialNeeds] = useState({
    wheelchair: false,
    extraLegroom: false,
    nearExit: false,
  });

  // Dummy seat data - Actual bus layout (10 rows, 4 columns with aisle)
  const [seats, setSeats] = useState(() => {
    const seatArray = [];
    const rows = 10;
    const cols = 4;

    for (let row = 1; row <= rows; row++) {
      for (let col = 1; col <= cols; col++) {
        const seatNumber = `${row}${String.fromCharCode(64 + col)}`;
        const isAvailable = Math.random() > 0.3; // 70% available
        const type = col === 1 || col === 4 ? 'window' : 'aisle';
        const hasExtraLegroom = row === 1 || row === 2;
        const isWheelchairAccessible = row === 10 && (col === 1 || col === 2);
        const isPremium = row <= 3;

        seatArray.push({
          id: `seat-${seatNumber}`,
          number: seatNumber,
          row,
          column: col,
          type,
          isAvailable,
          isWheelchairAccessible,
          hasExtraLegroom,
          isPremium,
          price: isPremium ? 15 : 12,
        });
      }
    }
    return seatArray;
  });

  const baseFare = 12;
  const totalAmount = selectedSeats.length * baseFare;

  // Filter seats based on special needs
  useEffect(() => {
    if (specialNeeds.wheelchair) {
      const wheelchairSeats = seats.filter(seat => seat.isWheelchairAccessible && seat.isAvailable);
      if (wheelchairSeats.length === 0) {
        Alert.alert('No Wheelchair Seats', 'No wheelchair accessible seats available');
      }
    }

    if (specialNeeds.extraLegroom) {
      const legroomSeats = seats.filter(seat => seat.hasExtraLegroom && seat.isAvailable);
      if (legroomSeats.length === 0) {
        Alert.alert('No Extra Legroom', 'No extra legroom seats available');
      }
    }
  }, [specialNeeds]);

  const handleSeatSelect = (seatId: string, seatNumber: string) => {
    const seat = seats.find(s => s.id === seatId);

    if (!seat) return;

    if (!seat.isAvailable) {
      Alert.alert('Seat Unavailable', `Seat ${seatNumber} is already booked.`);
      return;
    }

    if (selectedSeats.includes(seatId)) {
      // Deselect seat
      setSelectedSeats(prev => prev.filter(id => id !== seatId));
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
      setSelectedSeats(prev => [...prev, seatId]);
    }
  };

  const handleSpecialNeedToggle = (need: keyof typeof specialNeeds) => {
    setSpecialNeeds(prev => ({
      ...prev,
      [need]: !prev[need],
    }));

    // Clear selections if special need is toggled off
    if (specialNeeds[need]) {
      setSelectedSeats([]);
    }
  };

  const handleProceedToPayment = () => {
    if (selectedSeats.length === 0) {
      Alert.alert('No Seats Selected', 'Please select at least one seat.');
      return;
    }

    if (selectedSeats.length !== passengerCount) {
      Alert.alert('Seat Count Mismatch', `Please select exactly ${passengerCount} seat(s).`);
      return;
    }

    const selectedSeatNumbers = selectedSeats.map(seatId => {
      const seat = seats.find(s => s.id === seatId);
      return seat?.number;
    });

    navigation.navigate('Payment', {
      busId,
      seatIds: selectedSeats,
      totalAmount,
    });

    Alert.alert('Proceeding to Payment', `Selected seats: ${selectedSeatNumbers.join(', ')}`);
  };

  const renderSeatLayout = () => {
    const layout = [];
    const rows = 10;

    for (let row = 1; row <= rows; row++) {
      const rowSeats = seats.filter(seat => seat.row === row);

      layout.push(
        <View key={`row-${row}`} style={styles.seatRow}>
          {/* Left side seats (1A, 1B) */}
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
                disabled={!seat.isAvailable}
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

          {/* Right side seats (1C, 1D) */}
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
                disabled={!seat.isAvailable}
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
            <Text style={styles.headerSubtitle}>Bus {busId}</Text>
          </View>
        </View>

        {/* Trip Summary */}
        <View style={styles.tripSummaryCard}>
          <View style={styles.tripInfo}>
            <View style={styles.locationRow}>
              <View style={styles.locationDot} />
              <Text style={styles.locationText}>{from}</Text>
            </View>
            <View style={styles.verticalLine} />
            <View style={styles.locationRow}>
              <View style={[styles.locationDot, styles.destinationDot]} />
              <Text style={styles.locationText}>{to}</Text>
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
              <Text style={styles.detailText}>${baseFare} per seat</Text>
            </View>
          </View>
        </View>

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
              onPress={() => setPassengerCount(prev => Math.max(1, prev - 1))}
            >
              <Icon name="remove" size={24} color="#4A90E2" />
            </TouchableOpacity>

            <View style={styles.countDisplay}>
              <Text style={styles.countText}>{passengerCount}</Text>
              <Text style={styles.countLabel}>Adult(s)</Text>
            </View>

            <TouchableOpacity
              style={styles.countButton}
              onPress={() => setPassengerCount(prev => Math.min(10, prev + 1))}
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
            <Text style={styles.summaryValue}>${baseFare}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Fee:</Text>
            <Text style={styles.summaryValue}>$1</Text>
          </View>

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalAmount}>
              ${selectedSeats.length * baseFare + 1}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.proceedButton,
              selectedSeats.length === 0 && styles.proceedButtonDisabled,
            ]}
            onPress={handleProceedToPayment}
            disabled={selectedSeats.length === 0}
          >
            <Text style={styles.proceedButtonText}>
              PROCEED TO PAYMENT
            </Text>
            <Icon name="arrow-forward" size={20} color="#FFF" />
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
    marginRight: 12,
  },
  destinationDot: {
    backgroundColor: '#4CAF50',
  },
  locationText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
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
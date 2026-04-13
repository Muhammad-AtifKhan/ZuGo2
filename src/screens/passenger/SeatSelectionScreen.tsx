// src/screens/passenger/SeatSelectionScreen.tsx - WITH REAL-TIME SNAPSHOT LISTENER
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { RouteProp, useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PassengerStackParamList } from '../../navigation/PassengerNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

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

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdDeadlineRef = useRef<Date | null>(null);
  const isMountedRef = useRef(true);
  const selectedSeatsRef = useRef<string[]>([]);
  const tripIdRef = useRef(tripId);
  const userIdRef = useRef<string | undefined>(undefined);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const user = auth().currentUser;
  userIdRef.current = user?.uid;

  // Keep refs in sync
  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
    tripIdRef.current = tripId;
  }, [selectedSeats, tripId]);

  // ✅ REAL-TIME SNAPSHOT LISTENER FOR SEATS
  useEffect(() => {
    if (!tripId) return;

    console.log('🪑 Setting up REAL-TIME seat listener for trip:', tripId);
    setLoading(true);

    const db = firestore();
    const seatsRef = db
      .collection('trips')
      .doc(tripId)
      .collection('seats');

    // ✅ onSnapshot for real-time updates
    const unsubscribe = seatsRef.onSnapshot(
      (snapshot) => {
        if (!isMountedRef.current) return;

        console.log(`📡 Real-time update: ${snapshot.docs.length} seats received`);

        const seatsData: Seat[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          const isReservedByCurrentUser = data.reservedBy === userIdRef.current;
          const isReservedExpired = data.reservedUntil && data.reservedUntil.toDate() < new Date();

          // Determine seat availability
          let isAvailable = false;
          if (data.status === 'available') {
            isAvailable = true;
          } else if (data.status === 'reserved' && isReservedByCurrentUser && !isReservedExpired) {
            // Current user's own reservation - treat as available for selection
            isAvailable = true;
          } else if (data.status === 'reserved' && isReservedExpired) {
            // Expired reservation - should be available
            isAvailable = true;
          } else {
            isAvailable = false;
          }

          seatsData.push({
            id: `seat-${doc.id}`,
            seatNumber: doc.id,
            number: doc.id,
            row: data.row,
            column: data.column,
            type: data.type || 'standard',
            isAvailable,
            status: data.status,
            isWheelchairAccessible: data.isWheelchairAccessible || false,
            hasExtraLegroom: data.hasExtraLegroom || false,
            isPremium: data.row <= 2,
            price: data.price || farePerSeat,
            reservedBy: data.reservedBy,
            reservedUntil: data.reservedUntil,
          });
        });

        // Sort seats by row and column
        seatsData.sort((a, b) => {
          if (a.row !== b.row) return a.row - b.row;
          return a.column - b.column;
        });

        setSeats(seatsData);
        setLoading(false);

        // ✅ CRITICAL: Check if current user's selected seats are still available
        if (selectedSeatsRef.current.length > 0 && userIdRef.current) {
          const unavailableSeats = selectedSeatsRef.current.filter(seatId => {
            const seat = seatsData.find(s => s.id === seatId);
            return !seat?.isAvailable;
          });

          if (unavailableSeats.length > 0) {
            console.log('⚠️ Some selected seats are no longer available:', unavailableSeats);

            const unavailableNumbers = unavailableSeats.map(id => {
              const seat = seatsData.find(s => s.id === id);
              return seat?.number;
            }).join(', ');

            Alert.alert(
              'Seat Status Changed',
              `Seat(s) ${unavailableNumbers} are no longer available. Another user may have booked them.`,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // Clear only the unavailable seats, keep the available ones
                    const stillAvailable = selectedSeatsRef.current.filter(
                      seatId => !unavailableSeats.includes(seatId)
                    );
                    setSelectedSeats(stillAvailable);

                    // If no seats left, clear hold
                    if (stillAvailable.length === 0 && countdown !== null) {
                      releaseHeldSeats();
                      setCountdown(null);
                    }
                  }
                }
              ]
            );
          }
        }

        console.log(`✅ Real-time seats updated: ${seatsData.filter(s => s.isAvailable).length} available`);
      },
      (error) => {
        console.error('❌ Error in real-time seat listener:', error);
        if (isMountedRef.current) {
          Alert.alert('Error', 'Failed to get real-time seat updates. Please refresh.');
          setLoading(false);
        }
      }
    );

    // Store unsubscribe function for cleanup
    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount
    return () => {
      console.log('🪑 Cleaning up real-time seat listener');
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [tripId, farePerSeat]);

  // ✅ Release seats function
  const releaseHeldSeats = useCallback(async () => {
    const currentSelectedSeats = selectedSeatsRef.current;
    const currentTripId = tripIdRef.current;
    const currentUserId = userIdRef.current;

    if (!currentUserId || currentSelectedSeats.length === 0) return;

    try {
      const seatNumbers = currentSelectedSeats.map(id => id.replace('seat-', ''));
      console.log('🔄 Releasing held seats:', seatNumbers);

      const db = firestore();
      const tripRef = db.collection('trips').doc(currentTripId);

      await db.runTransaction(async (transaction) => {
        const tripDoc = await transaction.get(tripRef);
        if (!tripDoc.exists) return;

        for (const seatNumber of seatNumbers) {
          const seatRef = tripRef.collection('seats').doc(seatNumber);
          const seatDoc = await transaction.get(seatRef);

          if (seatDoc.exists && seatDoc.data()?.reservedBy === currentUserId) {
            transaction.update(seatRef, {
              status: 'available',
              reservedBy: null,
              reservedUntil: null,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });
          }
        }

        if (tripDoc.data()?.heldSeats) {
          transaction.update(tripRef, {
            heldSeats: firestore.FieldValue.increment(-currentSelectedSeats.length),
            availableSeats: firestore.FieldValue.increment(currentSelectedSeats.length),
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
        }
      });

      console.log('✅ Seats released successfully');
    } catch (error) {
      console.error('Error releasing seats:', error);
    }
  }, []);

  // ✅ Clean up on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // Clean up interval
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

      // Release seats on unmount if any are selected
      if (selectedSeatsRef.current.length > 0 && userIdRef.current) {
        releaseHeldSeats();
      }

      // Snapshot listener cleanup is handled in its own useEffect
    };
  }, [releaseHeldSeats]);

  // ✅ Focus effect
  useFocusEffect(
    useCallback(() => {
      console.log('📱 SeatSelection screen focused');

      return () => {
        console.log('📱 SeatSelection screen unfocused');

        // Clean up interval
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }

        // Release held seats if any
        if (selectedSeatsRef.current.length > 0 && userIdRef.current) {
          releaseHeldSeats();
        }
      };
    }, [releaseHeldSeats])
  );

  // ✅ Countdown timer
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [countdown]);

  // ✅ Auto-release when countdown reaches 0
  useEffect(() => {
    if (countdown === 0) {
      const autoRelease = async () => {
        console.log('⏰ Countdown expired, auto-releasing seats');
        await releaseHeldSeats();

        if (isMountedRef.current) {
          Alert.alert(
            'Hold Expired',
            'Seat hold time has expired. Please select seats again.',
            [
              {
                text: 'OK',
                onPress: () => {
                  setSelectedSeats([]);
                  setCountdown(null);
                }
              }
            ]
          );
        }
      };

      autoRelease();
    }
  }, [countdown, releaseHeldSeats]);

  // ✅ Hold seats with transaction
  const holdSelectedSeats = async (seatIds: string[]) => {
    if (!user) {
      Alert.alert('Error', 'Please login to continue');
      return;
    }

    if (seatIds.length === 0) return;

    setHoldingSeats(true);

    try {
      const db = firestore();
      const tripRef = db.collection('trips').doc(tripId);
      const seatNumbers = seatIds.map(id => id.replace('seat-', ''));
      const holdDurationMinutes = 15;
      const reservedUntil = new Date();
      reservedUntil.setMinutes(reservedUntil.getMinutes() + holdDurationMinutes);

      await db.runTransaction(async (transaction) => {
        const seatRefs = seatNumbers.map(num => tripRef.collection('seats').doc(num));
        const seatDocs = await Promise.all(seatRefs.map(ref => transaction.get(ref)));

        for (let i = 0; i < seatDocs.length; i++) {
          const doc = seatDocs[i];
          const data = doc.data();

          if (!doc.exists) {
            throw new Error(`Seat ${seatNumbers[i]} does not exist`);
          }

          if (data?.status === 'booked') {
            throw new Error(`Seat ${seatNumbers[i]} is already booked`);
          }

          if (data?.status === 'reserved' && data?.reservedBy !== user.uid) {
            throw new Error(`Seat ${seatNumbers[i]} is reserved by another user`);
          }
        }

        for (let i = 0; i < seatRefs.length; i++) {
          transaction.update(seatRefs[i], {
            status: 'reserved',
            reservedBy: user.uid,
            reservedUntil,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
        }

        transaction.update(tripRef, {
          availableSeats: firestore.FieldValue.increment(-seatNumbers.length),
          heldSeats: firestore.FieldValue.increment(seatNumbers.length),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      });

      const secondsLeft = Math.floor((reservedUntil.getTime() - new Date().getTime()) / 1000);
      setCountdown(secondsLeft);
      holdDeadlineRef.current = reservedUntil;

      Alert.alert(
        'Seats Held',
        `Your seats are held for ${holdDurationMinutes} minutes. Complete payment within this time.`,
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      console.error('Error holding seats:', error);
      Alert.alert('Hold Failed', error.message || 'Failed to hold seats. Please try again.');
      setSelectedSeats([]);
    } finally {
      setHoldingSeats(false);
    }
  };

  const calculateTotalAmount = useCallback(() => {
    let total = 0;
    for (const seatId of selectedSeats) {
      const seat = seats.find(s => s.id === seatId);
      total += seat?.price || farePerSeat;
    }
    return total;
  }, [selectedSeats, seats, farePerSeat]);

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

      if (newSelected.length === 0 && countdown !== null) {
        await releaseHeldSeats();
        setCountdown(null);
      }

    } else {
      if (selectedSeats.length >= passengerCount) {
        Alert.alert('Limit Reached', `You can only select ${passengerCount} seat(s).`);
        return;
      }

      if (specialNeeds.wheelchair && !seat.isWheelchairAccessible) {
        Alert.alert('Invalid Selection', 'Please select a wheelchair accessible seat.');
        return;
      }

      if (specialNeeds.extraLegroom && !seat.hasExtraLegroom) {
        Alert.alert('Invalid Selection', 'Please select an extra legroom seat.');
        return;
      }

      const newSelected = [...selectedSeats, seatId];
      setSelectedSeats(newSelected);

      if (newSelected.length === passengerCount) {
        await holdSelectedSeats(newSelected);
      }
    }
  };

  const handleSpecialNeedToggle = (need: keyof typeof specialNeeds) => {
    setSpecialNeeds(prev => ({
      ...prev,
      [need]: !prev[need],
    }));

    if (selectedSeats.length > 0) {
      releaseHeldSeats();
      setSelectedSeats([]);
      setCountdown(null);
    }
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
    const totalAmount = calculateTotalAmount();

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

          <View style={styles.aisle}>
            <Text style={styles.rowNumber}>{row}</Text>
          </View>

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

  if (loading && seats.length === 0) {
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
          {/* Real-time indicator */}
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

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
              <Text style={styles.detailText}>From PKR {farePerSeat}</Text>
            </View>
          </View>
        </View>

        {countdown !== null && countdown > 0 && (
          <View style={styles.countdownContainer}>
            <Icon name="timer" size={20} color="#FF9800" />
            <Text style={styles.countdownText}>
              Seats held for: {formatTime(countdown)}
            </Text>
          </View>
        )}

        <View style={styles.seatLayoutContainer}>
          <Text style={styles.sectionTitle}>CHOOSE YOUR SEATS</Text>

          {/* Real-time update notice */}
          <View style={styles.realtimeNotice}>
            <Icon name="update" size={14} color="#4CAF50" />
            <Text style={styles.realtimeNoticeText}>Seats update in real-time</Text>
          </View>

          <View style={styles.busFront}>
            <Icon name="directions-bus" size={40} color="#4A90E2" />
            <Text style={styles.busFrontText}>Front</Text>
          </View>

          <View style={styles.layoutContainer}>
            {renderSeatLayout()}
          </View>

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

        <View style={styles.passengerSection}>
          <Text style={styles.sectionTitle}>PASSENGERS</Text>
          <View style={styles.passengerCountContainer}>
            <TouchableOpacity
              style={styles.countButton}
              onPress={() => {
                setPassengerCount(prev => Math.max(1, prev - 1));
                if (selectedSeats.length > 0) {
                  releaseHeldSeats();
                  setSelectedSeats([]);
                  setCountdown(null);
                }
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
                if (selectedSeats.length > 0) {
                  releaseHeldSeats();
                  setSelectedSeats([]);
                  setCountdown(null);
                }
              }}
            >
              <Icon name="add" size={24} color="#4A90E2" />
            </TouchableOpacity>
          </View>

          <Text style={styles.selectionNote}>
            Select exactly {passengerCount} seat(s)
          </Text>
        </View>

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
            <Text style={styles.summaryLabel}>Total Amount:</Text>
            <Text style={styles.summaryValue}>PKR {calculateTotalAmount()}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.proceedButton,
              (selectedSeats.length === 0 || holdingSeats || selectedSeats.length !== passengerCount) && styles.proceedButtonDisabled,
            ]}
            onPress={handleProceedToPayment}
            disabled={selectedSeats.length === 0 || holdingSeats || selectedSeats.length !== passengerCount}
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
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  backButton: { padding: 8, marginRight: 16 },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1A237E' },
  headerSubtitle: { fontSize: 16, color: '#666', marginTop: 4 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 4 },
  liveText: { fontSize: 10, fontWeight: 'bold', color: '#4CAF50' },
  realtimeNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  realtimeNoticeText: { fontSize: 12, color: '#4CAF50', marginLeft: 4 },
  countdownContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', padding: 12, borderRadius: 8, marginBottom: 16 },
  countdownText: { fontSize: 14, color: '#FF9800', fontWeight: '600', marginLeft: 8 },
  tripSummaryCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  tripInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  locationRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  locationDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4A90E2', marginRight: 8 },
  destinationDot: { backgroundColor: '#4CAF50' },
  locationText: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  locationCode: { fontSize: 12, color: '#4A90E2', marginLeft: 4 },
  verticalLine: { width: 40, height: 2, backgroundColor: '#DDD', marginHorizontal: 12 },
  tripDetails: { flexDirection: 'row', justifyContent: 'space-around' },
  detailItem: { flexDirection: 'row', alignItems: 'center' },
  detailText: { fontSize: 14, color: '#666', marginLeft: 8 },
  seatLayoutContainer: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1A237E', marginBottom: 16 },
  busFront: { alignItems: 'center', marginBottom: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  busFrontText: { fontSize: 14, color: '#666', marginTop: 8 },
  layoutContainer: { alignItems: 'center', marginBottom: 20 },
  seatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  seatGroup: { flexDirection: 'row' },
  aisle: { width: AISLE_WIDTH, alignItems: 'center', justifyContent: 'center' },
  rowNumber: { fontSize: 14, color: '#999', fontWeight: '600' },
  seat: { width: SEAT_SIZE, height: SEAT_SIZE, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginHorizontal: 2, borderWidth: 1 },
  windowSeat: { borderColor: '#4A90E2', backgroundColor: '#F0F8FF' },
  aisleSeat: { borderColor: '#87CEEB', backgroundColor: '#F0FFFF' },
  seatSelected: { backgroundColor: '#4CAF50', borderColor: '#388E3C' },
  seatBooked: { backgroundColor: '#FFCDD2', borderColor: '#F44336' },
  wheelchairSeat: { backgroundColor: '#FF9800', borderColor: '#F57C00' },
  premiumSeat: { backgroundColor: '#FFF3E0', borderColor: '#FFB74D' },
  seatText: { fontSize: 12, fontWeight: '600' },
  seatTextSelected: { color: '#FFF' },
  seatTextBooked: { color: '#666', textDecorationLine: 'line-through' },
  seatIcon: { position: 'absolute', top: 2, right: 2 },
  legendContainer: { marginTop: 20 },
  legendRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendBox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  seatAvailable: { backgroundColor: '#F0F8FF', borderColor: '#4A90E2' },
  legendText: { fontSize: 12, color: '#666' },
  passengerSection: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  passengerCountContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  countButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#4A90E2', justifyContent: 'center', alignItems: 'center' },
  countDisplay: { alignItems: 'center', marginHorizontal: 30 },
  countText: { fontSize: 36, fontWeight: 'bold', color: '#1A237E' },
  countLabel: { fontSize: 14, color: '#666' },
  selectionNote: { fontSize: 14, color: '#666', textAlign: 'center', fontStyle: 'italic' },
  specialNeedsSection: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  needsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  needOption: { alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E3E8EF', width: '30%' },
  needOptionSelected: { backgroundColor: '#4A90E2', borderColor: '#4A90E2' },
  needText: { fontSize: 12, color: '#666', marginTop: 8, textAlign: 'center' },
  needTextSelected: { color: '#FFF', fontWeight: '600' },
  summaryCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryLabel: { fontSize: 16, color: '#666' },
  summaryValue: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  proceedButton: { backgroundColor: '#4A90E2', borderRadius: 12, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, shadowColor: '#4A90E2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  proceedButtonDisabled: { backgroundColor: '#CCC', shadowColor: '#999' },
  proceedButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginRight: 10 },
});

export default SeatSelectionScreen;
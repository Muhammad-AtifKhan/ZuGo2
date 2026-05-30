// src/screens/passenger/SeatSelectionScreen.tsx - COMPLETELY FIXED
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
const SCREEN_PADDING = 32;
const SEAT_CARD_PADDING = 32;
const SEAT_HORIZONTAL_MARGIN = 3;
const AISLE_WIDTH = 20;
const SEAT_LAYOUT_WIDTH = width - SCREEN_PADDING - SEAT_CARD_PADDING;
const SEAT_SIZE = Math.floor(
  (SEAT_LAYOUT_WIDTH - AISLE_WIDTH - SEAT_HORIZONTAL_MARGIN * 2 * 5) / 5
);

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
  isExpiredReservation?: boolean;
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

  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
    tripIdRef.current = tripId;
  }, [selectedSeats, tripId]);

  // REAL-TIME SNAPSHOT LISTENER FOR SEATS
  useEffect(() => {
    if (!tripId) return;

    console.log('Setting up REAL-TIME seat listener for trip:', tripId);
    setLoading(true);

    const db = firestore();
    const seatsRef = db
      .collection('trips')
      .doc(tripId)
      .collection('seats');

    const unsubscribe = seatsRef.onSnapshot(
      async (snapshot) => {
        if (!isMountedRef.current) return;

        const seatsData: Seat[] = [];
        const now = new Date();

        for (const doc of snapshot.docs) {
          const data = doc.data();
          const isReservedByCurrentUser = data.reservedBy === userIdRef.current;

          let isExpired = false;
          if (data.reservedUntil) {
            const expiryDate = data.reservedUntil?.toDate
              ? data.reservedUntil.toDate()
              : new Date(data.reservedUntil);
            isExpired = expiryDate < now;
          }

          let isAvailable = false;
          if (data.status === 'available') {
            isAvailable = true;
          } else if (data.status === 'booked') {
            isAvailable = false;
          } else if (data.status === 'reserved') {
            if (isReservedByCurrentUser) {
              isAvailable = true;
            } else if (isExpired) {
              isAvailable = true;
              if (!isReservedByCurrentUser && isExpired) {
                try {
                  await doc.ref.update({
                    status: 'available',
                    reservedBy: null,
                    reservedUntil: null,
                    updatedAt: firestore.FieldValue.serverTimestamp(),
                  });
                } catch (e) {
                  console.error('Error auto-releasing expired seat:', e);
                }
              }
            } else {
              isAvailable = false;
            }
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
            isExpiredReservation: data.status === 'reserved' && isExpired && !isReservedByCurrentUser,
          });
        }

        seatsData.sort((a, b) => {
          if (a.row !== b.row) return a.row - b.row;
          return a.column - b.column;
        });

        setSeats(seatsData);
        setLoading(false);

        if (selectedSeatsRef.current.length > 0 && userIdRef.current) {
          const unavailableSeats = selectedSeatsRef.current.filter(seatId => {
            const seat = seatsData.find(s => s.id === seatId);
            return !seat?.isAvailable;
          });

          if (unavailableSeats.length > 0) {
            const unavailableNumbers = unavailableSeats.map(id => {
              const seat = seatsData.find(s => s.id === id);
              return seat?.number;
            }).join(', ');

            Alert.alert(
              'Seat Status Changed',
              `Seat(s) ${unavailableNumbers} are no longer available.`,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    const stillAvailable = selectedSeatsRef.current.filter(
                      seatId => !unavailableSeats.includes(seatId)
                    );
                    setSelectedSeats(stillAvailable);

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
      },
      (error) => {
        console.error('Error in real-time seat listener:', error);
        if (isMountedRef.current) {
          Alert.alert('Error', 'Failed to get real-time seat updates.');
          setLoading(false);
        }
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [tripId, farePerSeat]);

  const releaseHeldSeats = useCallback(async () => {
    const currentSelectedSeats = selectedSeatsRef.current;
    const currentTripId = tripIdRef.current;
    const currentUserId = userIdRef.current;

    if (!currentUserId || currentSelectedSeats.length === 0) return;

    try {
      const seatNumbers = currentSelectedSeats.map(id => id.replace('seat-', ''));
      const db = firestore();

      for (const seatNumber of seatNumbers) {
        const seatRef = db
          .collection('trips')
          .doc(currentTripId)
          .collection('seats')
          .doc(seatNumber);

        const seatDoc = await seatRef.get();

        if (seatDoc.exists && seatDoc.data()?.reservedBy === currentUserId) {
          await seatRef.update({
            status: 'available',
            reservedBy: null,
            reservedUntil: null,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      const tripRef = db.collection('trips').doc(currentTripId);
      const tripDoc = await tripRef.get();

      if (tripDoc.exists) {
        await tripRef.update({
          heldSeats: firestore.FieldValue.increment(-currentSelectedSeats.length),
          availableSeats: firestore.FieldValue.increment(currentSelectedSeats.length),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error releasing seats:', error);
    }
  }, []);

  const holdSelectedSeats = async (seatIds: string[]) => {
    if (!user) {
      Alert.alert('Error', 'Please login to continue');
      return;
    }

    if (seatIds.length === 0) return;

    setHoldingSeats(true);

    try {
      const db = firestore();
      const seatNumbers = seatIds.map(id => id.replace('seat-', ''));
      const reservedUntil = new Date();
      reservedUntil.setMinutes(reservedUntil.getMinutes() + 15);
      const now = new Date();

      for (const seatNumber of seatNumbers) {
        const seatRef = db
          .collection('trips')
          .doc(tripId)
          .collection('seats')
          .doc(seatNumber);

        const seatDoc = await seatRef.get();
        const data = seatDoc.data();

        if (!seatDoc.exists) {
          throw new Error(`Seat ${seatNumber} does not exist`);
        }

        if (data?.status === 'booked') {
          throw new Error(`Seat ${seatNumber} is already booked`);
        }

        if (data?.status === 'reserved' && data?.reservedBy !== user.uid) {
          const expiryDate = data.reservedUntil?.toDate
            ? data.reservedUntil.toDate()
            : new Date(data.reservedUntil);
          const isExpired = expiryDate < now;

          if (isExpired) {
            await seatRef.update({
              status: 'available',
              reservedBy: null,
              reservedUntil: null,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });
          } else {
            throw new Error(`Seat ${seatNumber} is reserved by another user`);
          }
        }
      }

      for (const seatNumber of seatNumbers) {
        const seatRef = db
          .collection('trips')
          .doc(tripId)
          .collection('seats')
          .doc(seatNumber);

        await seatRef.update({
          status: 'reserved',
          reservedBy: user.uid,
          reservedUntil: firestore.Timestamp.fromDate(reservedUntil),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      const tripRef = db.collection('trips').doc(tripId);
      await tripRef.update({
        availableSeats: firestore.FieldValue.increment(-seatNumbers.length),
        heldSeats: firestore.FieldValue.increment(seatNumbers.length),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      const secondsLeft = 15 * 60;
      setCountdown(secondsLeft);

      Alert.alert(
        'Seats Held',
        `Your seats are held for 15 minutes. Complete payment within this time.`,
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      console.error('Error holding seats:', error);

      if (error.code === 'permission-denied') {
        Alert.alert(
          'Permission Error',
          'Unable to reserve seats. Please check if you are logged in properly.'
        );
      } else {
        Alert.alert('Hold Failed', error.message || 'Failed to hold seats. Please try again.');
      }

      setSelectedSeats([]);
    } finally {
      setHoldingSeats(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (selectedSeatsRef.current.length > 0 && userIdRef.current) {
        releaseHeldSeats();
      }
    };
  }, [releaseHeldSeats]);

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

  useEffect(() => {
    if (countdown === 0) {
      const autoRelease = async () => {
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
      Alert.alert('Error', 'Invalid trip data.');
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
      const leftSeats = rowSeats.filter(seat => seat.column <= 2).sort((a, b) => a.column - b.column);
      const rightSeats = rowSeats.filter(seat => seat.column > 2).sort((a, b) => a.column - b.column);

      layout.push(
        <View key={`row-${row}`} style={styles.seatRow}>
          <View style={styles.seatGroup}>
            {leftSeats.map(seat => renderSeatButton(seat))}
          </View>
          <View style={styles.aisle} />
          <View style={styles.seatGroup}>
            {rightSeats.map(seat => renderSeatButton(seat))}
          </View>
        </View>
      );
    }

    return layout;
  };

  const renderSeatButton = (seat: Seat) => {
    const isExpired = seat.isExpiredReservation;

    return (
      <TouchableOpacity
        key={seat.id}
        style={[
          styles.seat,
          !seat.isAvailable && styles.seatBooked,
          selectedSeats.includes(seat.id) && styles.seatSelected,
          isExpired && styles.seatExpired,
          seat.isWheelchairAccessible && !selectedSeats.includes(seat.id) && seat.isAvailable && !isExpired && styles.wheelchairSeat,
          seat.hasExtraLegroom && !selectedSeats.includes(seat.id) && seat.isAvailable && !isExpired && styles.premiumSeat,
        ]}
        onPress={() => handleSeatSelect(seat.id, seat.number)}
        disabled={!seat.isAvailable || holdingSeats}
      >
        <Text style={[
          styles.seatText,
          !seat.isAvailable && styles.seatTextBooked,
          selectedSeats.includes(seat.id) && styles.seatTextSelected,
          isExpired && styles.seatTextExpired,
        ]}>
          {seat.number}
        </Text>
        {isExpired && (
          <Text style={styles.expiredBadge}>!</Text>
        )}
        {seat.isWheelchairAccessible && seat.isAvailable && !selectedSeats.includes(seat.id) && !isExpired && (
          <Icon name="accessible" size={10} color="#FFF" style={styles.seatIcon} />
        )}
        {seat.hasExtraLegroom && seat.isAvailable && !selectedSeats.includes(seat.id) && !isExpired && (
          <Icon name="star" size={10} color="#FFD700" style={styles.seatIcon} />
        )}
      </TouchableOpacity>
    );
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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#1A237E" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>SELECT SEATS</Text>
            <Text style={styles.headerSubtitle}>Bus {busNumber}</Text>
          </View>
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
            <Text style={styles.countdownText}>Seats held for: {formatTime(countdown)}</Text>
          </View>
        )}

        <View style={styles.seatLayoutContainer}>
          <Text style={styles.sectionTitle}>CHOOSE YOUR SEATS</Text>

          <View style={styles.realtimeNotice}>
            <Icon name="update" size={14} color="#4CAF50" />
            <Text style={styles.realtimeNoticeText}>Seats update in real-time</Text>
          </View>

          <View style={styles.busFront}>
            <Icon name="directions-bus" size={40} color="#4A90E2" />
            <Text style={styles.busFrontText}>Front</Text>
          </View>

          <View style={styles.layoutContainer}>{renderSeatLayout()}</View>

          <View style={styles.legendContainer}>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.seatAvailable]} />
                <Text style={styles.legendText}>Available</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.seatSelectedLegend]} />
                <Text style={styles.legendText}>Selected</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.seatBookedLegend]} />
                <Text style={styles.legendText}>Booked</Text>
              </View>
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.wheelchairSeatLegend]} />
                <Text style={styles.legendText}>Wheelchair</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.premiumSeatLegend]} />
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
          <Text style={styles.selectionNote}>Select exactly {passengerCount} seat(s)</Text>
        </View>

        <View style={styles.specialNeedsSection}>
          <Text style={styles.sectionTitle}>SPECIAL NEEDS</Text>
          <View style={styles.needsContainer}>
            <TouchableOpacity
              style={[styles.needOption, specialNeeds.wheelchair && styles.needOptionSelected]}
              onPress={() => handleSpecialNeedToggle('wheelchair')}
            >
              <Icon name="accessible" size={24} color={specialNeeds.wheelchair ? '#FFF' : '#4A90E2'} />
              <Text style={[styles.needText, specialNeeds.wheelchair && styles.needTextSelected]}>Wheelchair</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.needOption, specialNeeds.extraLegroom && styles.needOptionSelected]}
              onPress={() => handleSpecialNeedToggle('extraLegroom')}
            >
              <Icon name="airline-seat-legroom-extra" size={24} color={specialNeeds.extraLegroom ? '#FFF' : '#4A90E2'} />
              <Text style={[styles.needText, specialNeeds.extraLegroom && styles.needTextSelected]}>Extra Legroom</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.needOption, specialNeeds.nearExit && styles.needOptionSelected]}
              onPress={() => handleSpecialNeedToggle('nearExit')}
            >
              <Icon name="exit-to-app" size={24} color={specialNeeds.nearExit ? '#FFF' : '#4A90E2'} />
              <Text style={[styles.needText, specialNeeds.nearExit && styles.needTextSelected]}>Near Exit</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Selected Seats:</Text>
            <Text style={styles.summaryValue}>
              {selectedSeats.length > 0
                ? selectedSeats.map(id => seats.find(s => s.id === id)?.number).join(', ')
                : 'None'}
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
                <Text style={styles.proceedButtonText}>PROCEED TO PAYMENT</Text>
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
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
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

  countdownContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', padding: 12, borderRadius: 8, marginBottom: 16 },
  countdownText: { fontSize: 14, color: '#FF9800', fontWeight: '600', marginLeft: 8 },

  seatLayoutContainer: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1A237E', marginBottom: 16 },
  realtimeNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  realtimeNoticeText: { fontSize: 12, color: '#4CAF50', marginLeft: 4 },
  busFront: { alignItems: 'center', marginBottom: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  busFrontText: { fontSize: 14, color: '#666', marginTop: 8 },
  layoutContainer: { alignItems: 'center', alignSelf: 'stretch', marginBottom: 20 },

  seatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 8 },
  seatGroup: { flexDirection: 'row', flexShrink: 0 },
  aisle: { width: AISLE_WIDTH, alignItems: 'center', justifyContent: 'center' },

  seat: {
    width: SEAT_SIZE,
    height: SEAT_SIZE,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SEAT_HORIZONTAL_MARGIN,
    borderWidth: 1,
    backgroundColor: '#F0F8FF',
    borderColor: '#4A90E2',
  },
  seatBooked: { backgroundColor: '#FFCDD2', borderColor: '#F44336' },
  seatSelected: { backgroundColor: '#4CAF50', borderColor: '#388E3C' },
  seatExpired: { backgroundColor: '#FFF9C4', borderColor: '#FBC02D' },
  wheelchairSeat: { backgroundColor: '#FF9800', borderColor: '#F57C00' },
  premiumSeat: { backgroundColor: '#FFF3E0', borderColor: '#FFB74D' },
  seatText: { fontSize: 12, fontWeight: '600', color: '#1A237E' },
  seatTextSelected: { color: '#FFF' },
  seatTextBooked: { color: '#666', textDecorationLine: 'line-through' },
  seatTextExpired: { color: '#F57C00' },
  seatIcon: { position: 'absolute', top: 2, right: 2 },
  expiredBadge: { position: 'absolute', bottom: 2, right: 2, fontSize: 10, fontWeight: 'bold', color: '#F57C00' },

  legendContainer: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  legendRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendBox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  seatAvailable: { backgroundColor: '#F0F8FF', borderColor: '#4A90E2' },
  seatSelectedLegend: { backgroundColor: '#4CAF50', borderColor: '#388E3C' },
  seatBookedLegend: { backgroundColor: '#FFCDD2', borderColor: '#F44336' },
  wheelchairSeatLegend: { backgroundColor: '#FF9800', borderColor: '#F57C00' },
  premiumSeatLegend: { backgroundColor: '#FFF3E0', borderColor: '#FFB74D' },
  legendText: { fontSize: 11, color: '#666' },

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
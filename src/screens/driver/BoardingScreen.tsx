// src/screens/driver/BoardingScreen.tsx - STANDARDIZED STATUSES
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Vibration,
  Platform,
  Animated,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import NetInfo from '@react-native-community/netinfo';
import Sound from 'react-native-sound';

// ✅ Import standardized status constants
import {
  BUS_STATUS,
  DRIVER_STATUS,
  TRIP_STATUS,
  TRIP_STATUS_CONFIG,
} from '../../constants/status';

// Enable sound for Android
if (Platform.OS === 'android') {
  Sound.setCategory('Playback');
}

type BoardingScreenProps = {
  navigation: StackNavigationProp<any>;
  route?: any;
};

interface Passenger {
  id: string;
  bookingId: string;
  passengerName: string;
  seatNumber: string;
  ticketNumber: string;
  status: 'PENDING' | 'BOARDED' | 'MISSED';
  phoneNumber?: string;
  email?: string;
  boardedAt?: any;
}

interface TripInfo {
  id: string;
  routeName: string;
  routeCode: string;
  busNumber: string;
  busId: string;
  departureTime: string;
  arrivalTime: string;
  from: string;
  to: string;
  totalSeats: number;
  boardedSeats: number;
  status: string; // Now using TRIP_STATUS values
  boardingOpen: boolean;
}

// Alphanumeric sorting function
const alphanumericSort = (a: Passenger, b: Passenger): number => {
  const regex = /(\d+)|(\D+)/g;
  const ax = a.seatNumber.match(regex) || [];
  const bx = b.seatNumber.match(regex) || [];

  for (let i = 0; i < Math.max(ax.length, bx.length); i++) {
    if (!ax[i]) return -1;
    if (!bx[i]) return 1;

    const an = parseInt(ax[i], 10);
    const bn = parseInt(bx[i], 10);

    if (!isNaN(an) && !isNaN(bn)) {
      if (an !== bn) return an - bn;
    } else {
      if (ax[i] !== bx[i]) return ax[i].localeCompare(bx[i]);
    }
  }
  return 0;
};

const BoardingScreen: React.FC<BoardingScreenProps> = ({ navigation, route }) => {
  const user = auth().currentUser;
  const tripId = route?.params?.tripId;
  const dutyDetails = route?.params?.dutyDetails;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [driverUid, setDriverUid] = useState<string>('');
  const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [totalPassengers, setTotalPassengers] = useState(0);
  const [boardingOpen, setBoardingOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isOnline, setIsOnline] = useState(true);

  const [showManualEntry, setShowManualEntry] = useState(false);
  const [ticketInput, setTicketInput] = useState('');
  const [manualSearchLoading, setManualSearchLoading] = useState(false);

  const [successSound, setSuccessSound] = useState<any>(null);
  const [errorSound, setErrorSound] = useState<any>(null);

  const nextPassengerAnim = useRef(new Animated.Value(1)).current;

  const flatListRef = useRef<FlatList>(null);
  const unsubscribeRefs = useRef<(() => void)[]>([]);

  const sortedPassengers = [...passengers].sort(alphanumericSort);

  const filteredPassengers = sortedPassengers.filter(p =>
    p.passengerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.seatNumber.includes(searchQuery)
  );

  const boardedCount = passengers.filter(p => p.status === 'BOARDED').length;
  const pendingCount = passengers.filter(p => p.status === 'PENDING').length;
  const missedCount = passengers.filter(p => p.status === 'MISSED').length;
  const progress = totalPassengers > 0 ? (boardedCount / totalPassengers) * 100 : 0;

  const nextPassenger = sortedPassengers.find(p => p.status === 'PENDING');

  useEffect(() => {
    if (nextPassenger && flatListRef.current) {
      const index = filteredPassengers.findIndex(p => p.id === nextPassenger.id);
      if (index !== -1) {
        flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      }
    }
  }, [passengers, filteredPassengers, nextPassenger]);

  useEffect(() => {
    if (nextPassenger) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(nextPassengerAnim, {
            toValue: 1.02,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(nextPassengerAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      nextPassengerAnim.setValue(1);
    }
  }, [nextPassenger]);

  useEffect(() => {
    if (ticketInput.length >= 6 && showManualEntry) {
      searchTicket();
    }
  }, [ticketInput]);

  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
      if (!state.isConnected) {
        Alert.alert('Offline Mode', 'You are offline. Boarding will be queued.');
      }
    });
    return () => unsubscribeNetInfo();
  }, []);

  useEffect(() => {
    const success = new Sound('beep_success.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) console.log('Failed to load success sound', error);
    });
    const error = new Sound('beep_error.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) console.log('Failed to load error sound', error);
    });
    setSuccessSound(success);
    setErrorSound(error);

    return () => {
      success.release();
      error.release();
    };
  }, []);

  const playSuccessFeedback = () => {
    Vibration.vibrate(100);
    if (successSound?.isLoaded()) {
      successSound.play();
    }
  };

  const playErrorFeedback = () => {
    Vibration.vibrate([0, 200, 100, 200]);
    if (errorSound?.isLoaded()) {
      errorSound.play();
    }
  };

  const getDriverUid = useCallback(async (authUid: string): Promise<string> => {
    try {
      const driverDoc = await firestore().collection('drivers').doc(authUid).get();
      if (driverDoc.exists) {
        setDriverUid(authUid);
        return authUid;
      } else {
        const userDoc = await firestore().collection('users').doc(authUid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const driverQuery = await firestore()
            .collection('drivers')
            .where('email', '==', userData?.email)
            .limit(1)
            .get();
          if (!driverQuery.empty) {
            const driverId = driverQuery.docs[0].id;
            setDriverUid(driverId);
            return driverId;
          }
        }
        setDriverUid(authUid);
        return authUid;
      }
    } catch (error) {
      console.error('Error getting driver UID:', error);
      return authUid;
    }
  }, []);

  // ✅ Updated: Map Firebase status to standardized
  const mapTripStatus = (firebaseStatus: string): string => {
    // Return the actual status - we'll use TRIP_STATUS directly
    if (firebaseStatus === TRIP_STATUS.SCHEDULED) return TRIP_STATUS.SCHEDULED;
    if (firebaseStatus === TRIP_STATUS.IN_PROGRESS) return TRIP_STATUS.IN_PROGRESS;
    if (firebaseStatus === TRIP_STATUS.COMPLETED) return TRIP_STATUS.COMPLETED;
    if (firebaseStatus === TRIP_STATUS.DELAYED) return TRIP_STATUS.DELAYED;
    if (firebaseStatus === TRIP_STATUS.CANCELLED) return TRIP_STATUS.CANCELLED;

    // Map legacy statuses
    if (firebaseStatus === 'scheduled' || firebaseStatus === 'upcoming') return TRIP_STATUS.SCHEDULED;
    if (firebaseStatus === 'in-progress' || firebaseStatus === 'active') return TRIP_STATUS.IN_PROGRESS;
    if (firebaseStatus === 'completed') return TRIP_STATUS.COMPLETED;

    return TRIP_STATUS.SCHEDULED;
  };

  const mapBoardingStatus = (status: string): Passenger['status'] => {
    switch (status) {
      case 'boarded': return 'BOARDED';
      case 'missed': return 'MISSED';
      default: return 'PENDING';
    }
  };

  // Fetch trip and passenger data
  useEffect(() => {
    if (!user || !tripId) {
      Alert.alert('Error', 'No trip information found');
      navigation.goBack();
      return;
    }

    const setupListeners = async () => {
      unsubscribeRefs.current.forEach(unsub => unsub());
      unsubscribeRefs.current = [];

      const uid = await getDriverUid(user.uid);
      const driverId = uid;

      const unsubscribeTrip = firestore()
        .collection('trips')
        .doc(tripId)
        .onSnapshot(
          (doc) => {
            if (doc.exists) {
              const data = doc.data();
              const rawStatus = data?.status || TRIP_STATUS.SCHEDULED;
              const mappedStatus = mapTripStatus(rawStatus);

              const tripData: TripInfo = {
                id: doc.id,
                routeName: data?.routeName || 'Unknown Route',
                routeCode: data?.routeCode || '',
                busNumber: data?.busNumber || 'B-001',
                busId: data?.busId || '',
                departureTime: data?.departureTime || '--:--',
                arrivalTime: data?.arrivalTime || '--:--',
                from: data?.from || data?.startLocation || 'Unknown',
                to: data?.to || data?.endLocation || 'Unknown',
                totalSeats: data?.totalSeats || 40,
                boardedSeats: data?.boardedSeats || 0,
                status: mappedStatus,
                boardingOpen: data?.boardingOpen || false,
              };
              setTripInfo(tripData);
              setBoardingOpen(tripData.boardingOpen);

              // ✅ Check if trip is already in progress
              if (mappedStatus === TRIP_STATUS.IN_PROGRESS) {
                Alert.alert(
                  'Trip Already Started',
                  'This trip is already in progress. Redirecting to route...',
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.replace('Route', { tripId })
                    }
                  ]
                );
              }
            } else {
              Alert.alert('Error', 'Trip not found');
              navigation.goBack();
            }
          },
          (error) => console.error('Error fetching trip:', error)
        );

      const unsubscribeBookings = firestore()
        .collection('bookings')
        .where('tripId', '==', tripId)
        .onSnapshot(
          (snapshot) => {
            const passengersList: Passenger[] = [];
            snapshot.forEach(doc => {
              const data = doc.data();
              passengersList.push({
                id: doc.id,
                bookingId: doc.id,
                passengerName: data?.passengerName || data?.fullName || 'Unknown',
                seatNumber: data?.seatNumber || 'N/A',
                ticketNumber: data?.ticketNumber || data?.bookingId || doc.id.slice(0, 8),
                status: mapBoardingStatus(data?.boardingStatus),
                phoneNumber: data?.phoneNumber,
                email: data?.email,
                boardedAt: data?.boardedAt,
              });
            });
            setPassengers(passengersList);
            setTotalPassengers(passengersList.length);
            setLoading(false);
            setRefreshing(false);
          },
          (error) => {
            console.error('Error fetching bookings:', error);
            setLoading(false);
            setRefreshing(false);
          }
        );

      unsubscribeRefs.current.push(unsubscribeTrip);
      unsubscribeRefs.current.push(unsubscribeBookings);
    };

    setupListeners();

    return () => {
      unsubscribeRefs.current.forEach(unsub => unsub());
      unsubscribeRefs.current = [];
    };
  }, [user, tripId, navigation, getDriverUid]);

  // Open boarding
  const handleOpenBoarding = async () => {
    if (!tripInfo) return;

    // ✅ Only allow opening if trip is SCHEDULED
    if (tripInfo.status !== TRIP_STATUS.SCHEDULED) {
      const statusConfig = TRIP_STATUS_CONFIG[tripInfo.status as keyof typeof TRIP_STATUS_CONFIG];
      Alert.alert(
        'Cannot Open Boarding',
        `Trip is ${statusConfig?.label || tripInfo.status}. It must be Scheduled.`
      );
      return;
    }

    Alert.alert(
      'Open Boarding',
      'Are you sure you want to open boarding for this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Boarding',
          onPress: async () => {
            try {
              setSaving(true);
              await firestore().collection('trips').doc(tripInfo.id).update({
                boardingOpen: true,
                boardingStartedAt: firestore.FieldValue.serverTimestamp(),
              });
              playSuccessFeedback();
            } catch (error) {
              console.error('Error opening boarding:', error);
              Alert.alert('Error', 'Failed to open boarding');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const handleBoardPassenger = async (passenger: Passenger) => {
    if (!tripInfo) return;

    if (!isOnline) {
      Alert.alert('Offline', 'You are offline. Please check your connection and try again.');
      playErrorFeedback();
      return;
    }

    if (!boardingOpen) {
      Alert.alert('Boarding Closed', 'Please open boarding first.');
      playErrorFeedback();
      return;
    }

    if (passenger.status !== 'PENDING') {
      Alert.alert('Already Processed', `This passenger is already ${passenger.status}.`);
      playErrorFeedback();
      return;
    }

    if (processingIds.has(passenger.id)) return;
    if (saving) return;

    setSaving(true);
    setProcessingIds(prev => new Set(prev).add(passenger.id));

    try {
      await firestore().runTransaction(async (transaction) => {
        const bookingRef = firestore().collection('bookings').doc(passenger.id);
        const tripRef = firestore().collection('trips').doc(tripInfo.id);

        const bookingDoc = await transaction.get(bookingRef);
        if (!bookingDoc.exists) throw new Error('Booking not found');
        const bookingData = bookingDoc.data();
        if (bookingData?.tripId !== tripInfo.id) throw new Error('Invalid ticket for this trip');
        if (bookingData?.boardingStatus === 'boarded') throw new Error('Already boarded');

        transaction.update(bookingRef, {
          boardingStatus: 'boarded',
          boardedAt: firestore.FieldValue.serverTimestamp(),
          boardedBy: driverUid || user?.uid,
        });
      });

      playSuccessFeedback();
    } catch (error: any) {
      console.error('Error boarding passenger:', error);
      playErrorFeedback();
      let errorMessage = 'Failed to board passenger';
      if (error.message === 'Already boarded') errorMessage = 'Already boarded';
      else if (error.message === 'Invalid ticket for this trip') errorMessage = 'Invalid ticket';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(passenger.id);
        return newSet;
      });
    }
  };

  const handleManualEntry = () => {
    if (!boardingOpen) {
      Alert.alert('Boarding Closed', 'Please open boarding first.');
      return;
    }
    setShowManualEntry(true);
    setTicketInput('');
  };

  const searchTicket = async () => {
    if (!ticketInput.trim()) {
      Alert.alert('Error', 'Please enter ticket number');
      return;
    }

    const normalizedTicket = ticketInput.trim().toUpperCase();
    setManualSearchLoading(true);

    try {
      const bookingQuery = await firestore()
        .collection('bookings')
        .where('tripId', '==', tripInfo?.id)
        .where('ticketNumber', '==', normalizedTicket)
        .limit(1)
        .get();

      if (bookingQuery.empty) {
        Alert.alert('Not Found', 'No booking found with this ticket number');
        playErrorFeedback();
        return;
      }

      const bookingDoc = bookingQuery.docs[0];
      const passenger = passengers.find(p => p.id === bookingDoc.id);
      if (!passenger) {
        Alert.alert('Error', 'Passenger not found in manifest');
        playErrorFeedback();
        return;
      }

      setShowManualEntry(false);
      setTicketInput('');
      await handleBoardPassenger(passenger);
    } catch (error) {
      console.error('Error searching ticket:', error);
      Alert.alert('Error', 'Failed to search ticket');
      playErrorFeedback();
    } finally {
      setManualSearchLoading(false);
    }
  };

  // ✅ Close boarding and start trip - UPDATED with standardized statuses
  const handleCloseBoarding = async () => {
    if (!tripInfo) return;

    Alert.alert(
      'Close Boarding & Start Trip',
      `Are you sure you want to close boarding and start the trip?\n\n` +
      `✅ Boarded: ${boardedCount}\n` +
      `⏳ Pending: ${pendingCount}\n` +
      `❌ Missed: ${missedCount}\n\n` +
      `Pending passengers will be marked as MISSED.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Trip',
          onPress: async () => {
            if (saving) return;
            setSaving(true);

            try {
              await firestore().runTransaction(async (transaction) => {
                const tripRef = firestore().collection('trips').doc(tripInfo.id);
                const driverRef = firestore().collection('drivers').doc(driverUid || user?.uid);
                const busRef = firestore().collection('buses').doc(tripInfo.busId);

                // Mark all pending passengers as missed
                const pendingPassengers = passengers.filter(p => p.status === 'PENDING');
                for (const passenger of pendingPassengers) {
                  const bookingRef = firestore().collection('bookings').doc(passenger.id);
                  transaction.update(bookingRef, {
                    boardingStatus: 'missed',
                    missedAt: firestore.FieldValue.serverTimestamp(),
                  });
                }

                // ✅ Update trip: SCHEDULED → IN_PROGRESS
                transaction.update(tripRef, {
                  status: TRIP_STATUS.IN_PROGRESS,
                  boardingOpen: false,
                  startedAt: firestore.FieldValue.serverTimestamp(),
                  boardedSeats: boardedCount,
                  pendingMarkedMissed: pendingPassengers.length,
                });

                // ✅ Update driver: should already be ON_TRIP from dashboard, ensure it is
                transaction.update(driverRef, {
                  status: DRIVER_STATUS.ON_TRIP,
                  currentTripId: tripInfo.id,
                  lastTripStarted: firestore.FieldValue.serverTimestamp(),
                });

                // ✅ Update bus: should already be ON_TRIP, ensure it is
                transaction.update(busRef, {
                  status: BUS_STATUS.ON_TRIP,
                  currentTripId: tripInfo.id,
                });

                // Create trip activity log
                const activityRef = firestore().collection('trip_activities').doc();
                transaction.set(activityRef, {
                  tripId: tripInfo.id,
                  type: 'started',
                  timestamp: firestore.FieldValue.serverTimestamp(),
                  driverId: driverUid || user?.uid,
                  busId: tripInfo.busId,
                  boardedCount,
                  missedCount: pendingPassengers.length,
                });
              });

              playSuccessFeedback();
              setBoardingOpen(false);

              Alert.alert(
                'Trip Started! 🚌',
                `Trip started successfully with ${boardedCount} passengers.\n${missedCount} passengers marked as missed.`,
                [
                  {
                    text: 'Go to Route',
                    onPress: () => navigation.replace('Route', { tripId: tripInfo.id })
                  }
                ]
              );
            } catch (error) {
              console.error('Error starting trip:', error);
              Alert.alert('Error', 'Failed to start trip');
              playErrorFeedback();
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 80,
    offset: 80 * index,
    index,
  }), []);

  const renderPassenger = ({ item, index }: { item: Passenger; index: number }) => {
    const isNext = item.id === nextPassenger?.id;
    const isProcessing = processingIds.has(item.id);

    const getStatusColor = (status: Passenger['status']) => {
      switch (status) {
        case 'BOARDED': return '#4CAF50';
        case 'MISSED': return '#F44336';
        default: return '#FF9800';
      }
    };

    const getStatusEmoji = (status: Passenger['status']) => {
      switch (status) {
        case 'BOARDED': return '✅';
        case 'MISSED': return '❌';
        default: return '⏳';
      }
    };

    return (
      <Animated.View
        style={[
          styles.passengerItem,
          item.status === 'BOARDED' && styles.passengerItemBoarded,
          item.status === 'MISSED' && styles.passengerItemMissed,
          isNext && styles.nextPassenger,
          isNext && { transform: [{ scale: nextPassengerAnim }] },
        ]}
      >
        <TouchableOpacity
          style={styles.passengerTouchable}
          onPress={() => handleBoardPassenger(item)}
          disabled={item.status !== 'PENDING' || saving || !boardingOpen || isProcessing}
          activeOpacity={0.7}
        >
          <View style={styles.passengerSeat}>
            <Text style={styles.seatNumber}>{item.seatNumber}</Text>
          </View>

          <View style={styles.passengerInfo}>
            <Text style={styles.passengerName}>{item.passengerName}</Text>
            <Text style={styles.ticketNumber}>🎫 {item.ticketNumber}</Text>
            {item.phoneNumber && <Text style={styles.phoneNumber}>📞 {item.phoneNumber}</Text>}
          </View>

          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusEmoji(item.status)} {item.status}
              {isProcessing && ' 🔄'}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading boarding data...</Text>
      </SafeAreaView>
    );
  }

  // Get status display for trip
  const tripStatusConfig = tripInfo ? TRIP_STATUS_CONFIG[tripInfo.status as keyof typeof TRIP_STATUS_CONFIG] : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1A237E" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👥 PASSENGER BOARDING</Text>
        {tripInfo && (
          <>
            <Text style={styles.routeInfo}>
              {tripInfo.routeName} • {tripInfo.busNumber}
            </Text>
            <Text style={styles.routeDetails}>
              {tripInfo.from} → {tripInfo.to} • {tripInfo.departureTime}
            </Text>
            {tripStatusConfig && (
              <Text style={[styles.tripStatus, { color: tripStatusConfig.color }]}>
                {tripStatusConfig.icon} {tripStatusConfig.label}
              </Text>
            )}
          </>
        )}
      </View>

      {/* Boarding Status Bar */}
      <View style={styles.statusBar}>
        <View style={[styles.statusIndicator, { backgroundColor: boardingOpen ? '#4CAF50' : '#FF9800' }]}>
          <Text style={styles.statusBarText}>
            {boardingOpen ? '🟢 BOARDING OPEN' : '⏸️ BOARDING CLOSED'}
          </Text>
        </View>
        {!boardingOpen && tripInfo?.status === TRIP_STATUS.SCHEDULED && (
          <TouchableOpacity style={styles.openBoardingButton} onPress={handleOpenBoarding} disabled={saving}>
            <Text style={styles.openBoardingButtonText}>OPEN BOARDING</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Boarding Progress</Text>
          <Text style={styles.progressCount}>{boardedCount}/{totalPassengers} boarded</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statItem}>✅ Boarded: {boardedCount}</Text>
          <Text style={styles.statItem}>⏳ Pending: {pendingCount}</Text>
          <Text style={styles.statItem}>❌ Missed: {missedCount}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search by name, ticket, or seat..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.manualButton]}
          onPress={handleManualEntry}
          disabled={!boardingOpen || saving}
        >
          <Text style={styles.manualButtonText}>📝 MANUAL ENTRY</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.closeButton]}
          onPress={handleCloseBoarding}
          disabled={saving || boardedCount === 0}
        >
          <Text style={styles.closeButtonText}>🚌 START TRIP</Text>
        </TouchableOpacity>
      </View>

      {/* Passenger List */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>
          PASSENGER MANIFEST {filteredPassengers.length !== passengers.length ? `(${filteredPassengers.length} results)` : ''}
        </Text>
        <FlatList
          ref={flatListRef}
          data={filteredPassengers}
          renderItem={renderPassenger}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(false)} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No matching passengers' : 'No Passengers Found'}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery ? 'Try a different search term.' : 'No bookings found for this trip.'}
              </Text>
            </View>
          }
          onScrollToIndexFailed={info => {
            const wait = new Promise(resolve => setTimeout(resolve, 500));
            wait.then(() => flatListRef.current?.scrollToIndex({ index: info.index, animated: true }));
          }}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={10}
          removeClippedSubviews={true}
          getItemLayout={getItemLayout}
        />
      </View>

      {/* Manual Entry Modal */}
      <Modal
        visible={showManualEntry}
        animationType="slide"
        transparent
        onRequestClose={() => setShowManualEntry(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📝 MANUAL TICKET ENTRY</Text>
              <TouchableOpacity onPress={() => setShowManualEntry(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Enter Ticket Number</Text>
              <TextInput
                style={styles.ticketInput}
                value={ticketInput}
                onChangeText={setTicketInput}
                placeholder="e.g., TKT-001"
                placeholderTextColor="#999"
                autoCapitalize="characters"
                autoFocus
              />
              <Text style={styles.scanHint}>🔍 Auto-search after 6 characters</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={() => setShowManualEntry(false)}
                >
                  <Text style={styles.cancelModalButtonText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.searchModalButton]}
                  onPress={searchTicket}
                  disabled={manualSearchLoading}
                >
                  {manualSearchLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.searchModalButtonText}>SEARCH</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {saving && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingOverlayText}>Processing...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#4A90E2' },
  header: { backgroundColor: '#1A237E', paddingHorizontal: 20, paddingVertical: 20, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  routeInfo: { fontSize: 16, color: '#E3F2FD', marginBottom: 2 },
  routeDetails: { fontSize: 14, color: '#E3F2FD' },
  tripStatus: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  statusIndicator: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  statusBarText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  openBoardingButton: { backgroundColor: '#4A90E2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  openBoardingButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  progressContainer: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressTitle: { fontSize: 14, fontWeight: '600', color: '#1A237E' },
  progressCount: { fontSize: 14, color: '#4A90E2', fontWeight: '600' },
  progressBar: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { fontSize: 12, color: '#666666' },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  searchInput: { backgroundColor: '#F8F9FA', borderRadius: 8, padding: 12, fontSize: 14, color: '#1A237E', borderWidth: 1, borderColor: '#E0E0E0' },
  actionRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  actionButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  manualButton: { backgroundColor: '#FF9800' },
  closeButton: { backgroundColor: '#4CAF50' },
  manualButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  closeButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  listContainer: { flex: 1, paddingHorizontal: 16 },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A237E', marginBottom: 12 },
  listContent: { paddingBottom: 20 },
  passengerTouchable: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  passengerItem: { backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, overflow: 'hidden' },
  passengerItemBoarded: { backgroundColor: '#E8F5E9', opacity: 0.8 },
  passengerItemMissed: { backgroundColor: '#FFEBEE', opacity: 0.8 },
  nextPassenger: { borderWidth: 2, borderColor: '#FF9800', backgroundColor: '#FFF3E0' },
  passengerSeat: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', marginHorizontal: 12 },
  seatNumber: { fontSize: 18, fontWeight: 'bold', color: '#1A237E' },
  passengerInfo: { flex: 1, paddingVertical: 12, paddingRight: 8 },
  passengerName: { fontSize: 16, fontWeight: '600', color: '#1A237E', marginBottom: 4 },
  ticketNumber: { fontSize: 14, color: '#666666', marginBottom: 2 },
  phoneNumber: { fontSize: 12, color: '#999999' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A237E', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#666666', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '90%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A237E' },
  modalClose: { fontSize: 24, color: '#666666', padding: 4 },
  modalBody: { padding: 20 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#1A237E', marginBottom: 8 },
  ticketInput: { backgroundColor: '#F8F9FA', borderRadius: 8, padding: 16, fontSize: 16, color: '#1A237E', borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 8 },
  scanHint: { fontSize: 12, color: '#666666', marginBottom: 20, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  cancelModalButton: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E0E0E0' },
  searchModalButton: { backgroundColor: '#FF9800' },
  cancelModalButtonText: { fontSize: 14, fontWeight: '600', color: '#666666' },
  searchModalButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  loadingOverlayText: { marginTop: 12, fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
});

export default BoardingScreen;
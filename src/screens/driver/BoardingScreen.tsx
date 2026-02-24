import React, { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

interface Passenger {
  id: string;
  name: string;
  seat: string;
  fromStop: string;
  toStop: string;
  status: 'BOARDED' | 'PENDING' | 'MISSED';
  ticketNumber: string;
  bookingId: string;
  stopId?: string;
}

interface TripInfo {
  id: string;
  busNumber: string;
  routeName: string;
  currentStop: string;
  nextStop: string;
  nextStopETA: string;
  totalSeats: number;
  bookedSeats: number;
  boardedSeats: number;
}

const BoardingScreen: React.FC = ({ navigation }: any) => {
  const user = auth().currentUser;

  const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [currentStop, setCurrentStop] = useState('Stop 3: University');
  const [nextStop, setNextStop] = useState('Stop 4: Hospital');
  const [nextStopETA, setNextStopETA] = useState('15 min');

  const [showScanModal, setShowScanModal] = useState(false);
  const [showPassengerModal, setShowPassengerModal] = useState(false);
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'BOARDED' | 'PENDING'>('ALL');
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Fetch current trip and passengers
  useEffect(() => {
    if (!user) return;

    let unsubscribePassengers: () => void;
    let unsubscribeTrip: () => void;

    const fetchData = async () => {
      try {
        setLoading(true);

        // First find active trip for this driver
        const tripsSnapshot = await firestore()
          .collection('trips')
          .where('driverId', '==', user.uid)
          .where('status', 'in', ['in-progress', 'ready'])
          .limit(1)
          .get();

        if (tripsSnapshot.empty) {
          setLoading(false);
          Alert.alert(
            'No Active Trip',
            'You don\'t have any active trip. Please start a duty first.',
            [
              {
                text: 'Go to Dashboard',
                onPress: () => navigation.navigate('Dashboard')
              }
            ]
          );
          return;
        }

        const tripDoc = tripsSnapshot.docs[0];
        const tripData = tripDoc.data();

        // Set trip info
        setTripInfo({
          id: tripDoc.id,
          busNumber: tripData.busNumber || '',
          routeName: tripData.routeName || '',
          currentStop: tripData.currentStop || 'Stop 1',
          nextStop: tripData.nextStop || 'Stop 2',
          nextStopETA: tripData.nextStopETA || '10 min',
          totalSeats: tripData.totalSeats || 40,
          bookedSeats: tripData.bookedSeats || 0,
          boardedSeats: tripData.boardedSeats || 0,
        });

        setCurrentStop(tripData.currentStop || 'Stop 3: University');
        setNextStop(tripData.nextStop || 'Stop 4: Hospital');
        setNextStopETA(tripData.nextStopETA || '15 min');

        // Listen to bookings for this trip
        unsubscribePassengers = firestore()
          .collection('bookings')
          .where('tripId', '==', tripDoc.id)
          .onSnapshot(
            (snapshot) => {
              const passengersData: Passenger[] = [];
              snapshot.forEach(doc => {
                const data = doc.data();
                passengersData.push({
                  id: doc.id,
                  name: data.passengerName || 'Unknown',
                  seat: data.seatNumber || 'N/A',
                  fromStop: data.fromStop || 'Stop 1',
                  toStop: data.toStop || 'Stop 5',
                  status: mapBoardingStatus(data.boardingStatus),
                  ticketNumber: data.ticketNumber || `TKT-${doc.id.slice(0,8)}`,
                  bookingId: doc.id,
                  stopId: data.stopId,
                });
              });
              setPassengers(passengersData);
              setLoading(false);
              setRefreshing(false);
            },
            (error) => {
              console.error('Error fetching passengers:', error);
              setLoading(false);
              setRefreshing(false);
            }
          );

        // Listen to trip updates
        unsubscribeTrip = firestore()
          .collection('trips')
          .doc(tripDoc.id)
          .onSnapshot(
            (doc) => {
              if (doc.exists) {
                const data = doc.data();
                setCurrentStop(data?.currentStop || 'Stop 3: University');
                setNextStop(data?.nextStop || 'Stop 4: Hospital');
                setNextStopETA(data?.nextStopETA || '15 min');
              }
            },
            (error) => {
              console.error('Error listening to trip:', error);
            }
          );

      } catch (error) {
        console.error('Error fetching trip data:', error);
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchData();

    return () => {
      if (unsubscribePassengers) unsubscribePassengers();
      if (unsubscribeTrip) unsubscribeTrip();
    };
  }, [user]);

  // Map Firebase boarding status to local status
  const mapBoardingStatus = (firebaseStatus: string): Passenger['status'] => {
    switch (firebaseStatus) {
      case 'boarded': return 'BOARDED';
      case 'pending': return 'PENDING';
      case 'missed': return 'MISSED';
      default: return 'PENDING';
    }
  };

  // Map local status to Firebase status
  const mapToFirebaseStatus = (localStatus: Passenger['status']): string => {
    switch (localStatus) {
      case 'BOARDED': return 'boarded';
      case 'PENDING': return 'pending';
      case 'MISSED': return 'missed';
      default: return 'pending';
    }
  };

  // Handle QR scan
  const handleScanQR = () => {
    setShowScanModal(true);
    setIsScanning(true);
    setScanResult(null);

    // Simulate QR scan (in real app, this would use camera)
    setTimeout(() => {
      setScanResult('success');
      setIsScanning(false);

      setTimeout(() => {
        const pendingPassengers = passengers.filter(p => p.status === 'PENDING');
        if (pendingPassengers.length > 0) {
          const randomIndex = Math.floor(Math.random() * pendingPassengers.length);
          setSelectedPassenger(pendingPassengers[randomIndex]);
          setShowScanModal(false);
          setShowPassengerModal(true);
          setScanResult(null);
        } else {
          Alert.alert('No Pending Passengers', 'All passengers have been processed.');
          setShowScanModal(false);
        }
      }, 1000);
    }, 2000);
  };

  // Handle manual boarding
  const handleManualBoarding = () => {
    Alert.alert(
      'Manual Boarding',
      'Enter ticket number or select passenger:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enter Ticket Number',
          onPress: () => {
            Alert.prompt(
              'Enter Ticket Number',
              'Please enter the ticket number:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Search',
                  onPress: async (ticketNumber) => {
                    if (!ticketNumber || !tripInfo) return;

                    const booking = passengers.find(p =>
                      p.ticketNumber.toLowerCase() === ticketNumber.toLowerCase()
                    );

                    if (booking) {
                      setSelectedPassenger(booking);
                      setShowPassengerModal(true);
                    } else {
                      Alert.alert('Not Found', 'No booking found with this ticket number.');
                    }
                  }
                }
              ]
            );
          }
        },
        {
          text: 'Select from List',
          onPress: () => {
            const pendingPassengers = passengers.filter(p => p.status === 'PENDING');
            if (pendingPassengers.length > 0) {
              const passengerOptions = pendingPassengers.map(p => ({
                text: `${p.name} (${p.ticketNumber})`,
                onPress: () => {
                  setSelectedPassenger(p);
                  setShowPassengerModal(true);
                }
              }));

              Alert.alert(
                'Select Passenger',
                'Choose a passenger to board:',
                [
                  ...passengerOptions,
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
            } else {
              Alert.alert('No Pending Passengers', 'All passengers have been processed.');
            }
          }
        }
      ]
    );
  };

  // Handle confirm boarding
  const handleConfirmBoarding = async () => {
    if (!selectedPassenger || !tripInfo) return;

    try {
      // Update booking status in Firebase
      await firestore()
        .collection('bookings')
        .doc(selectedPassenger.id)
        .update({
          boardingStatus: 'boarded',
          boardedAt: firestore.FieldValue.serverTimestamp(),
          boardedStop: currentStop,
        });

      // Update trip boarded count
      await firestore()
        .collection('trips')
        .doc(tripInfo.id)
        .update({
          boardedSeats: firestore.FieldValue.increment(1),
        });

      Alert.alert(
        'Boarding Confirmed',
        `${selectedPassenger.name} has been boarded successfully.\nSeat: ${selectedPassenger.seat}\nTicket: ${selectedPassenger.ticketNumber}`
      );

      setShowPassengerModal(false);
      setSelectedPassenger(null);

    } catch (error) {
      console.error('Error confirming boarding:', error);
      Alert.alert('Error', 'Failed to confirm boarding. Please try again.');
    }
  };

  // Handle mark as missed
  const handleMarkMissed = async (passengerId: string) => {
    if (!tripInfo) return;

    Alert.alert(
      'Mark as Missed',
      'Are you sure you want to mark this passenger as missed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Missed',
          onPress: async () => {
            try {
              await firestore()
                .collection('bookings')
                .doc(passengerId)
                .update({
                  boardingStatus: 'missed',
                  missedAt: firestore.FieldValue.serverTimestamp(),
                });

              Alert.alert('Marked as Missed', 'Passenger has been marked as missed.');

              if (selectedPassenger?.id === passengerId) {
                setShowPassengerModal(false);
                setSelectedPassenger(null);
              }

            } catch (error) {
              console.error('Error marking as missed:', error);
              Alert.alert('Error', 'Failed to update status.');
            }
          }
        }
      ]
    );
  };

  // Handle close doors
  const handleCloseDoors = async () => {
    if (!tripInfo) return;

    Alert.alert(
      'Close Doors',
      'Are you sure you want to close the doors?\n\nAll pending passengers will be marked as missed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Doors',
          onPress: async () => {
            try {
              const batch = firestore().batch();
              const pendingBookings = passengers.filter(p => p.status === 'PENDING');

              pendingBookings.forEach(booking => {
                const bookingRef = firestore().collection('bookings').doc(booking.id);
                batch.update(bookingRef, {
                  boardingStatus: 'missed',
                  missedAt: firestore.FieldValue.serverTimestamp(),
                });
              });

              await batch.commit();

              Alert.alert(
                'Doors Closed',
                `${pendingBookings.length} passengers marked as missed.`
              );

            } catch (error) {
              console.error('Error closing doors:', error);
              Alert.alert('Error', 'Failed to close doors.');
            }
          }
        }
      ]
    );
  };

  // Handle report delay
  const handleReportDelay = async () => {
    if (!tripInfo) return;

    Alert.alert(
      'Report Delay',
      'Select delay reason:',
      [
        {
          text: 'Traffic Congestion (5-10 min)',
          onPress: async () => {
            try {
              await firestore().collection('delays').add({
                tripId: tripInfo.id,
                driverId: user?.uid,
                reason: 'Traffic Congestion',
                estimatedDelay: '10 min',
                timestamp: firestore.FieldValue.serverTimestamp(),
              });
              Alert.alert('Delay Reported', 'Traffic delay reported to dispatch and passengers.');
            } catch (error) {
              Alert.alert('Error', 'Failed to report delay.');
            }
          }
        },
        {
          text: 'Passenger Delay (2-3 min)',
          onPress: async () => {
            try {
              await firestore().collection('delays').add({
                tripId: tripInfo.id,
                driverId: user?.uid,
                reason: 'Passenger Delay',
                estimatedDelay: '3 min',
                timestamp: firestore.FieldValue.serverTimestamp(),
              });
              Alert.alert('Delay Reported', 'Passenger delay reported.');
            } catch (error) {
              Alert.alert('Error', 'Failed to report delay.');
            }
          }
        },
        {
          text: 'Mechanical Issue',
          onPress: async () => {
            try {
              await firestore().collection('delays').add({
                tripId: tripInfo.id,
                driverId: user?.uid,
                reason: 'Mechanical Issue',
                estimatedDelay: '20 min',
                timestamp: firestore.FieldValue.serverTimestamp(),
              });
              Alert.alert('Delay Reported', 'Mechanical issue reported to maintenance.');
            } catch (error) {
              Alert.alert('Error', 'Failed to report issue.');
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Handle make announcement
  const handleAnnounce = async () => {
    if (!tripInfo) return;

    Alert.alert(
      'Make Announcement',
      'Select announcement type:',
      [
        {
          text: 'Next Stop Announcement',
          onPress: async () => {
            try {
              await firestore().collection('announcements').add({
                tripId: tripInfo.id,
                driverId: user?.uid,
                type: 'next-stop',
                message: `Next stop: ${nextStop}. ETA: ${nextStopETA}`,
                timestamp: firestore.FieldValue.serverTimestamp(),
              });
              Alert.alert('Announcement Made', 'Next stop announcement broadcasted.');
            } catch (error) {
              Alert.alert('Error', 'Failed to make announcement.');
            }
          }
        },
        {
          text: 'Welcome Announcement',
          onPress: async () => {
            try {
              await firestore().collection('announcements').add({
                tripId: tripInfo.id,
                driverId: user?.uid,
                type: 'welcome',
                message: 'Welcome aboard! Thank you for choosing our service.',
                timestamp: firestore.FieldValue.serverTimestamp(),
              });
              Alert.alert('Announcement Made', 'Welcome announcement broadcasted.');
            } catch (error) {
              Alert.alert('Error', 'Failed to make announcement.');
            }
          }
        },
        {
          text: 'Safety Announcement',
          onPress: async () => {
            try {
              await firestore().collection('announcements').add({
                tripId: tripInfo.id,
                driverId: user?.uid,
                type: 'safety',
                message: 'Please keep aisles clear and hold handrails while standing.',
                timestamp: firestore.FieldValue.serverTimestamp(),
              });
              Alert.alert('Announcement Made', 'Safety announcement broadcasted.');
            } catch (error) {
              Alert.alert('Error', 'Failed to make announcement.');
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Calculate counts
  const pendingCount = passengers.filter(p => p.status === 'PENDING').length;
  const boardedCount = passengers.filter(p => p.status === 'BOARDED').length;
  const missedCount = passengers.filter(p => p.status === 'MISSED').length;
  const totalPassengers = passengers.length;

  // Filter passengers
  const filteredPassengers = passengers.filter(passenger => {
    if (filter === 'ALL') return true;
    if (filter === 'BOARDED') return passenger.status === 'BOARDED';
    if (filter === 'PENDING') return passenger.status === 'PENDING';
    return true;
  });

  // Get status color
  const getStatusColor = (status: Passenger['status']) => {
    switch (status) {
      case 'BOARDED': return '#4CAF50';
      case 'PENDING': return '#FF9800';
      case 'MISSED': return '#F44336';
      default: return '#666666';
    }
  };

  // Get status emoji
  const getStatusEmoji = (status: Passenger['status']) => {
    switch (status) {
      case 'BOARDED': return '✅';
      case 'PENDING': return '⏳';
      case 'MISSED': return '❌';
      default: return '🔘';
    }
  };

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Data will auto-refresh via Firebase listeners
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading trip data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1A237E" barStyle="light-content" />

      {/* Top Info Bar */}
      <View style={styles.topBar}>
        <View style={styles.stopInfo}>
          <Text style={styles.currentStop}>📍 {currentStop}</Text>
          <Text style={styles.nextStop}>Next: {nextStop} • ETA: {nextStopETA}</Text>
          {tripInfo && (
            <Text style={styles.busInfo}>
              🚌 {tripInfo.busNumber} • {tripInfo.routeName}
            </Text>
          )}
        </View>
        <View style={styles.passengerCount}>
          <Text style={styles.countText}>
            👥 {boardedCount}/{totalPassengers}
          </Text>
          <Text style={styles.countLabel}>Boarded</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* QR Scan Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SCAN QR CODE</Text>
          <TouchableOpacity style={styles.scanButton} onPress={handleScanQR}>
            <Text style={styles.scanButtonEmoji}>📱</Text>
            <Text style={styles.scanButtonText}>TAP TO SCAN QR CODE</Text>
            <Text style={styles.scanButtonSubtext}>Position QR code within frame</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.manualButton} onPress={handleManualBoarding}>
            <Text style={styles.manualButtonText}>📝 MANUAL BOARDING</Text>
          </TouchableOpacity>
        </View>

        {/* Boarding Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BOARDING STATUS</Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <Text style={styles.statusNumber}>{boardedCount}</Text>
              <Text style={styles.statusLabel}>✅ Boarded</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusNumber}>{pendingCount}</Text>
              <Text style={styles.statusLabel}>⏳ Pending</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusNumber}>{missedCount}</Text>
              <Text style={styles.statusLabel}>❌ Missed</Text>
            </View>
          </View>

          <Text style={styles.currentStopInfo}>
            Current Stop: {currentStop}
          </Text>
        </View>

        {/* Passenger List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>PASSENGER LIST</Text>
            <Text style={styles.passengerCountText}>
              {filteredPassengers.length} passengers
            </Text>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterTabs}>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'ALL' && styles.filterTabActive]}
              onPress={() => setFilter('ALL')}
            >
              <Text style={[styles.filterTabText, filter === 'ALL' && styles.filterTabTextActive]}>
                ALL ({totalPassengers})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filter === 'BOARDED' && styles.filterTabActive]}
              onPress={() => setFilter('BOARDED')}
            >
              <Text style={[styles.filterTabText, filter === 'BOARDED' && styles.filterTabTextActive]}>
                ✅ BOARDED ({boardedCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filter === 'PENDING' && styles.filterTabActive]}
              onPress={() => setFilter('PENDING')}
            >
              <Text style={[styles.filterTabText, filter === 'PENDING' && styles.filterTabTextActive]}>
                ⏳ PENDING ({pendingCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Passenger Cards */}
          <View style={styles.passengerList}>
            {filteredPassengers.length > 0 ? (
              filteredPassengers.map(passenger => (
                <TouchableOpacity
                  key={passenger.id}
                  style={styles.passengerCard}
                  onPress={() => {
                    setSelectedPassenger(passenger);
                    setShowPassengerModal(true);
                  }}
                >
                  <View style={styles.passengerHeader}>
                    <Text style={styles.passengerName}>{passenger.name}</Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(passenger.status) + '20' }
                    ]}>
                      <Text style={[styles.statusBadgeText, { color: getStatusColor(passenger.status) }]}>
                        {getStatusEmoji(passenger.status)} {passenger.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.passengerDetails}>
                    <Text style={styles.passengerSeat}>Seat: {passenger.seat}</Text>
                    <Text style={styles.passengerRoute}>
                      To: {passenger.toStop}
                    </Text>
                  </View>

                  <Text style={styles.passengerTicket}>
                    Ticket: {passenger.ticketNumber}
                  </Text>

                  {passenger.status === 'PENDING' && (
                    <View style={styles.passengerActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                          setSelectedPassenger(passenger);
                          setShowPassengerModal(true);
                        }}
                      >
                        <Text style={styles.actionButtonText}>BOARD</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, styles.missedButton]}
                        onPress={() => handleMarkMissed(passenger.id)}
                      >
                        <Text style={styles.missedButtonText}>MISSED</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>👥</Text>
                <Text style={styles.emptyTitle}>No Passengers Found</Text>
                <Text style={styles.emptyText}>
                  {filter === 'ALL'
                    ? 'No passengers on this trip'
                    : `No ${filter.toLowerCase()} passengers`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={handleAnnounce}>
            <Text style={styles.quickActionEmoji}>📢</Text>
            <Text style={styles.quickActionText}>Announce</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} onPress={handleCloseDoors}>
            <Text style={styles.quickActionEmoji}>🚪</Text>
            <Text style={styles.quickActionText}>Close Doors</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} onPress={handleReportDelay}>
            <Text style={styles.quickActionEmoji}>⏰</Text>
            <Text style={styles.quickActionText}>Delay</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* QR Scan Modal */}
      <Modal
        visible={showScanModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsScanning(false);
          setShowScanModal(false);
          setScanResult(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.scanModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📱 SCAN QR CODE</Text>
              <TouchableOpacity onPress={() => {
                setIsScanning(false);
                setShowScanModal(false);
                setScanResult(null);
              }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.scanFrame}>
              {scanResult === 'success' ? (
                <View style={styles.scanSuccess}>
                  <Text style={styles.scanSuccessEmoji}>✅</Text>
                  <Text style={styles.scanSuccessText}>QR Code Scanned Successfully!</Text>
                  <Text style={styles.scanSuccessSubtext}>Processing passenger details...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.qrFrame} />
                  <Text style={styles.scanInstruction}>
                    Position QR code within frame
                  </Text>
                  {isScanning && (
                    <View style={styles.scanningContainer}>
                      <ActivityIndicator size="large" color="#4A90E2" />
                      <Text style={styles.scanningText}>
                        Scanning...
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setIsScanning(false);
                setShowScanModal(false);
                setScanResult(null);
              }}
            >
              <Text style={styles.cancelButtonText}>CANCEL SCAN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Passenger Details Modal */}
      <Modal
        visible={showPassengerModal && selectedPassenger !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowPassengerModal(false);
          setSelectedPassenger(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.passengerModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>👤 PASSENGER DETAILS</Text>
              <TouchableOpacity onPress={() => {
                setShowPassengerModal(false);
                setSelectedPassenger(null);
              }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedPassenger && (
              <>
                <View style={styles.passengerInfo}>
                  <Text style={styles.passengerNameLarge}>{selectedPassenger.name}</Text>
                  <Text style={styles.passengerTicketLarge}>
                    Ticket: {selectedPassenger.ticketNumber}
                  </Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Seat Number:</Text>
                    <Text style={styles.detailValue}>{selectedPassenger.seat}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>From Stop:</Text>
                    <Text style={styles.detailValue}>{selectedPassenger.fromStop}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>To Stop:</Text>
                    <Text style={styles.detailValue}>{selectedPassenger.toStop}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={[styles.detailValue, { color: getStatusColor(selectedPassenger.status) }]}>
                      {getStatusEmoji(selectedPassenger.status)} {selectedPassenger.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  {selectedPassenger.status === 'PENDING' && (
                    <>
                      <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={handleConfirmBoarding}
                      >
                        <Text style={styles.confirmButtonText}>✅ CONFIRM BOARDING</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.missedModalButton}
                        onPress={() => handleMarkMissed(selectedPassenger.id)}
                      >
                        <Text style={styles.missedModalButtonText}>❌ MARK AS MISSED</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {(selectedPassenger.status === 'BOARDED' || selectedPassenger.status === 'MISSED') && (
                    <TouchableOpacity
                      style={[styles.confirmButton, {
                        backgroundColor: selectedPassenger.status === 'BOARDED' ? '#4CAF50' : '#F44336'
                      }]}
                      onPress={() => {
                        setShowPassengerModal(false);
                        setSelectedPassenger(null);
                      }}
                    >
                      <Text style={styles.confirmButtonText}>
                        {selectedPassenger.status === 'BOARDED' ? '✅ ALREADY BOARDED' : '❌ MISSED'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                      setShowPassengerModal(false);
                      setSelectedPassenger(null);
                    }}
                  >
                    <Text style={styles.closeButtonText}>CLOSE</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  topBar: {
    backgroundColor: '#1A237E',
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stopInfo: {
    flex: 1,
  },
  currentStop: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  nextStop: {
    fontSize: 14,
    color: '#E3F2FD',
  },
  busInfo: {
    fontSize: 12,
    color: '#E3F2FD',
    marginTop: 4,
  },
  passengerCount: {
    alignItems: 'center',
  },
  countText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  countLabel: {
    fontSize: 12,
    color: '#E3F2FD',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
  },
  scanButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  scanButtonEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  scanButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  scanButtonSubtext: {
    fontSize: 14,
    color: '#E3F2FD',
  },
  manualButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  manualButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statusNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666666',
  },
  currentStopInfo: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  passengerCountText: {
    fontSize: 14,
    color: '#666666',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#4A90E2',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  passengerList: {
    gap: 12,
  },
  passengerCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
    marginBottom: 8,
  },
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  passengerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  passengerSeat: {
    fontSize: 14,
    color: '#666666',
  },
  passengerRoute: {
    fontSize: 14,
    color: '#666666',
  },
  passengerTicket: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  passengerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  missedButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  missedButtonText: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 32,
  },
  quickAction: {
    alignItems: 'center',
    padding: 16,
  },
  quickActionEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#1A237E',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  scanModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  passengerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  modalClose: {
    fontSize: 24,
    color: '#666666',
    padding: 4,
  },
  scanFrame: {
    alignItems: 'center',
    padding: 40,
  },
  qrFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderStyle: 'dashed',
    borderRadius: 8,
    marginBottom: 20,
  },
  scanInstruction: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  scanningContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  scanningText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 8,
  },
  scanSuccess: {
    alignItems: 'center',
  },
  scanSuccessEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  scanSuccessText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  scanSuccessSubtext: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  passengerInfo: {
    padding: 20,
  },
  passengerNameLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 8,
  },
  passengerTicketLarge: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
  },
  modalActions: {
    padding: 20,
    gap: 12,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  missedModalButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  missedModalButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BoardingScreen;
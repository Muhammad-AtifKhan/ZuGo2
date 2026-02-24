// screens/driver/DashboardScreen.tsx - FIXED VERSION
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
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import auth from '@react-native-firebase/auth';  // ✅ Direct Firebase import
import firestore from '@react-native-firebase/firestore';  // ✅ Direct Firestore

// NO useContext import needed

type RootDrawerParamList = {
  Main: undefined;
  Schedule: undefined;
  VehicleCheck: undefined;
  Earnings: undefined;
  Emergency: undefined;
  Profile: undefined;
  Notifications: undefined;
  Boarding: undefined;
  Route: undefined;
};

type DashboardScreenProps = {
  navigation: DrawerNavigationProp<RootDrawerParamList, 'Main'>;
};

// Types
interface Duty {
  id: string;
  busNumber: string;
  busModel: string;
  routeName: string;
  timeSlot: string;
  passengers: string;
  status: 'UPCOMING' | 'READY' | 'ACTIVE' | 'COMPLETED';
  startTime: string;
  endTime: string;
  busId: string;
  routeId: string;
  driverId: string;
  date: string;
  bookedSeats: number;
  totalSeats: number;
}

interface DriverStats {
  totalTrips: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  onlineHours: number;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  // ✅ Direct Firebase auth - exactly like transporter dashboard
  const user = auth().currentUser;

  const [driverStatus, setDriverStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [currentDate] = useState(new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }));

  // Firebase states
  const [duties, setDuties] = useState<Duty[]>([]);
  const [allDuties, setAllDuties] = useState<Duty[]>([]);
  const [showAllDuties, setShowAllDuties] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverStats, setDriverStats] = useState<DriverStats>({
    totalTrips: 0,
    totalEarnings: 0,
    averageRating: 0,
    totalReviews: 0,
    onlineHours: 0,
  });
  const [driverName, setDriverName] = useState('');

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }));
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // ✅ Fetch driver data - same pattern as transporter dashboard
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchDriverData = async () => {
      try {
        setLoading(true);

        // Get driver details from users collection - LIKE TRANSPORTER
        const userDoc = await firestore().collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          setDriverName(userDoc.data()?.fullName || 'Driver');
        }

        // Get driver profile from drivers collection
        const driverDoc = await firestore().collection('drivers').doc(user.uid).get();
        if (driverDoc.exists) {
          const driverData = driverDoc.data();
          setDriverStatus(driverData?.status === 'on-duty' ? 'ACTIVE' : 'INACTIVE');

          setDriverStats({
            totalTrips: driverData?.totalRides || 0,
            totalEarnings: driverData?.totalEarnings || 0,
            averageRating: driverData?.rating || 0,
            totalReviews: driverData?.totalRatings || 0,
            onlineHours: driverData?.onlineHours || 0,
          });
        }

        // Listen to today's trips - LIKE TRANSPORTER
        const today = new Date().toISOString().split('T')[0];

        const unsubscribeTrips = firestore()
          .collection('trips')
          .where('driverId', '==', user.uid)
          .where('date', '==', today)
          .orderBy('departureTime', 'asc')
          .onSnapshot(
            (snapshot) => {
              const tripsData: Duty[] = [];
              snapshot.forEach(doc => {
                const data = doc.data();
                tripsData.push({
                  id: doc.id,
                  busNumber: data.busNumber || 'N/A',
                  busModel: data.busModel || 'Standard Bus',
                  routeName: data.routeName || 'Unknown Route',
                  timeSlot: `${data.departureTime} - ${data.arrivalTime}`,
                  passengers: `${data.bookedSeats || 0}/${data.totalSeats || 0}`,
                  status: mapTripStatus(data.status),
                  startTime: data.departureTime || '00:00',
                  endTime: data.arrivalTime || '00:00',
                  busId: data.busId || '',
                  routeId: data.routeId || '',
                  driverId: data.driverId || '',
                  date: data.date || today,
                  bookedSeats: data.bookedSeats || 0,
                  totalSeats: data.totalSeats || 0,
                });
              });

              setAllDuties(tripsData);
              setDuties(tripsData.slice(0, 3));
              setLoading(false);
              setRefreshing(false);
            },
            (error) => {
              console.error('Error fetching trips:', error);
              setLoading(false);
              setRefreshing(false);
            }
          );

        return () => unsubscribeTrips();
      } catch (error) {
        console.error('Error fetching driver data:', error);
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchDriverData();
  }, [user]);  // ✅ user as dependency - exactly like transporter

  // Map trip status from Firebase to local status
  const mapTripStatus = (firebaseStatus: string): Duty['status'] => {
    switch (firebaseStatus) {
      case 'scheduled': return 'UPCOMING';
      case 'ready': return 'READY';
      case 'in-progress': return 'ACTIVE';
      case 'completed': return 'COMPLETED';
      default: return 'UPCOMING';
    }
  };

  // Map local status to Firebase status
  const mapToFirebaseStatus = (localStatus: Duty['status']): string => {
    switch (localStatus) {
      case 'UPCOMING': return 'scheduled';
      case 'READY': return 'ready';
      case 'ACTIVE': return 'in-progress';
      case 'COMPLETED': return 'completed';
      default: return 'scheduled';
    }
  };

  // Toggle driver status
  const toggleDriverStatus = async () => {
    if (!user) return;

    const newStatus = driverStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const firebaseStatus = newStatus === 'ACTIVE' ? 'on-duty' : 'offline';

    try {
      await firestore().collection('drivers').doc(user.uid).update({
        status: firebaseStatus,
        lastStatusUpdate: firestore.FieldValue.serverTimestamp(),
      });

      setDriverStatus(newStatus);

      Alert.alert(
        'Status Updated',
        `You are now ${newStatus === 'ACTIVE' ? 'ACTIVE (Ready for duties)' : 'INACTIVE (Offline)'}`,
        [{ text: 'OK' }]
      );

      if (newStatus === 'ACTIVE') {
        const activeDuty = allDuties.find(d => d.status === 'ACTIVE');
        if (activeDuty) {
          Alert.alert(
            'Active Duty Found',
            `You have an active duty for ${activeDuty.routeName}. Would you like to continue?`,
            [
              { text: 'Later', style: 'cancel' },
              { text: 'Go to Route', onPress: () => navigation.navigate('Route', { tripId: activeDuty.id }) }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  // Handle start duty
  const handleStartDuty = async (dutyId: string) => {
    const duty = allDuties.find(d => d.id === dutyId);
    if (!duty || !user) return;

    try {
      if (duty.status === 'ACTIVE') {
        navigation.navigate('Route', { tripId: duty.id });
        return;
      }

      Alert.alert(
        'Start Duty',
        `Start duty for ${duty.busNumber} - ${duty.routeName}?\n\nTime: ${duty.timeSlot}\nPassengers: ${duty.passengers}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Duty',
            onPress: async () => {
              try {
                await firestore().collection('trips').doc(duty.id).update({
                  status: 'in-progress',
                  actualStartTime: firestore.FieldValue.serverTimestamp(),
                });

                await firestore().collection('buses').doc(duty.busId).update({
                  status: 'active',
                  currentTripId: duty.id,
                });

                await firestore().collection('drivers').doc(user.uid).update({
                  status: 'on-duty',
                  currentTripId: duty.id,
                });

                navigation.navigate('VehicleCheck', {
                  dutyId: duty.id,
                  dutyDetails: {
                    busNumber: duty.busNumber,
                    routeName: duty.routeName,
                    timeSlot: duty.timeSlot
                  }
                });

              } catch (error) {
                console.error('Error starting duty:', error);
                Alert.alert('Error', 'Failed to start duty');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleStartDuty:', error);
      Alert.alert('Error', 'Failed to process duty start');
    }
  };

  // Handle end duty
  const handleEndDuty = async () => {
    if (!user) return;

    const activeDuty = allDuties.find(d => d.status === 'ACTIVE');
    if (!activeDuty) {
      Alert.alert('No Active Duty', 'You are not currently on any active duty.');
      return;
    }

    Alert.alert(
      'End Duty',
      `Are you sure you want to end duty for ${activeDuty.routeName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Duty',
          onPress: async () => {
            try {
              const estimatedEarnings = Math.floor(Math.random() * 100 + 50);

              await firestore().collection('trips').doc(activeDuty.id).update({
                status: 'completed',
                actualEndTime: firestore.FieldValue.serverTimestamp(),
                earnings: estimatedEarnings,
              });

              await firestore().collection('buses').doc(activeDuty.busId).update({
                status: 'available',
                currentTripId: null,
              });

              await firestore().collection('drivers').doc(user.uid).update({
                status: 'online',
                currentTripId: null,
                totalRides: firestore.FieldValue.increment(1),
                totalEarnings: firestore.FieldValue.increment(estimatedEarnings),
              });

              Alert.alert(
                'Duty Completed Successfully!',
                `🚌 Bus: ${activeDuty.busNumber}\n📍 Route: ${activeDuty.routeName}\n💰 Earnings: $${estimatedEarnings}`,
                [
                  { text: 'View Earnings', onPress: () => navigation.navigate('Earnings') },
                  { text: 'OK' }
                ]
              );

            } catch (error) {
              console.error('Error ending duty:', error);
              Alert.alert('Error', 'Failed to end duty');
            }
          }
        }
      ]
    );
  };

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Listeners will auto-refresh
  }, []);

  // Quick actions
  const quickActions = [
    { id: 1, title: 'Start Next Duty', emoji: '🚀', action: () => {
        const nextDuty = allDuties.find(d => d.status === 'UPCOMING' || d.status === 'READY');
        nextDuty ? handleStartDuty(nextDuty.id) : Alert.alert('No Upcoming Duties');
      }
    },
    { id: 2, title: 'End Current Duty', emoji: '🛑', action: handleEndDuty },
    { id: 3, title: 'Check Vehicle', emoji: '🔧', action: () => navigation.navigate('VehicleCheck') },
    { id: 4, title: 'View Schedule', emoji: '📅', action: () => navigation.navigate('Schedule') },
  ];

  // Render methods (same as before)
  const getStatusColor = (status: Duty['status']) => {
    switch (status) {
      case 'ACTIVE': return '#4CAF50';
      case 'UPCOMING': return '#2196F3';
      case 'READY': return '#FF9800';
      case 'COMPLETED': return '#9E9E9E';
      default: return '#666666';
    }
  };

  const getStatusEmoji = (status: Duty['status']) => {
    switch (status) {
      case 'ACTIVE': return '🚌';
      case 'UPCOMING': return '⏰';
      case 'READY': return '✅';
      case 'COMPLETED': return '🏁';
      default: return '🔘';
    }
  };

  const renderDutyCard = (duty: Duty) => (
    <View key={duty.id} style={styles.dutyCard}>
      <View style={styles.dutyHeader}>
        <View style={styles.busInfo}>
          <Text style={styles.busNumber}>{duty.busNumber}</Text>
          <Text style={styles.busModel}>{duty.busModel}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(duty.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(duty.status) }]}>
            {getStatusEmoji(duty.status)} {duty.status}
          </Text>
        </View>
      </View>

      <View style={styles.dutyDetails}>
        <Text style={styles.routeName}>📍 {duty.routeName}</Text>
        <Text style={styles.timeSlot}>🕒 {duty.timeSlot}</Text>
        <Text style={styles.passengerCount}>👥 Passengers: {duty.passengers}</Text>
      </View>

      <View style={styles.dutyActions}>
        <TouchableOpacity
          style={[styles.actionButton, duty.status === 'ACTIVE' ? styles.activeButton : styles.startButton]}
          onPress={() => duty.status === 'ACTIVE' ? navigation.navigate('Route', { tripId: duty.id }) : handleStartDuty(duty.id)}
        >
          <Text style={styles.actionButtonText}>
            {duty.status === 'ACTIVE' ? 'GO TO ROUTE' : 'START DUTY'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => Alert.alert('Duty Details', `${duty.routeName}\nBus: ${duty.busNumber}\nTime: ${duty.timeSlot}`)}
        >
          <Text style={styles.viewButtonText}>DETAILS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.welcomeText}>Welcome, {driverName || 'Driver'}! 👋</Text>
            <View style={styles.statusRow}>
              <View style={[styles.driverStatusBadge, { backgroundColor: driverStatus === 'ACTIVE' ? '#4CAF50' : '#FF9800' }]}>
                <Text style={styles.driverStatusText}>
                  {driverStatus === 'ACTIVE' ? '✅ ACTIVE' : '⏸️ INACTIVE'}
                </Text>
              </View>
              <TouchableOpacity onPress={toggleDriverStatus}>
                <Text style={styles.toggleStatusText}>Tap to toggle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.timeContainer}>
          <Text style={styles.dateText}>{currentDate}</Text>
          <Text style={styles.timeText}>{currentTime}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Today's Duties */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              📋 {showAllDuties ? 'ALL DUTIES' : "TODAY'S DUTIES"} ({duties.length})
            </Text>
            <TouchableOpacity onPress={() => setShowAllDuties(!showAllDuties)}>
              <Text style={styles.seeAllText}>{showAllDuties ? 'SHOW LESS' : 'SEE ALL'}</Text>
            </TouchableOpacity>
          </View>

          {duties.length > 0 ? (
            (showAllDuties ? allDuties : duties).map(renderDutyCard)
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={styles.emptyTitle}>No Duties Today</Text>
              <Text style={styles.emptyText}>Check your schedule for future duties</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ QUICK ACTIONS</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map(action => (
              <TouchableOpacity key={action.id} style={styles.quickActionCard} onPress={action.action}>
                <Text style={styles.quickActionEmoji}>{action.emoji}</Text>
                <Text style={styles.quickActionText}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{driverStats.totalTrips}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${driverStats.totalEarnings}</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{driverStats.averageRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Styles (same as before)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  topBar: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  driverStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  driverStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  toggleStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    opacity: 0.8,
    textDecorationLine: 'underline',
  },
  timeContainer: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  timeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
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
  },
  seeAllText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
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
  dutyCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  dutyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  busInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  busNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  busModel: {
    fontSize: 14,
    color: '#666666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dutyDetails: {
    marginBottom: 16,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 4,
  },
  timeSlot: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  passengerCount: {
    fontSize: 14,
    color: '#666666',
  },
  dutyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4A90E2',
  },
  activeButton: {
    backgroundColor: '#4CAF50',
  },
  viewButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  viewButtonText: {
    color: '#4A90E2',
    fontWeight: '600',
    fontSize: 14,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A237E',
    textAlign: 'center',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
});

export default DashboardScreen;
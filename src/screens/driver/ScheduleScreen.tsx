// src/screens/driver/ScheduleScreen.tsx - WITH TODAY, UPCOMING, COMPLETED TABS
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { DrawerNavigationProp } from '@react-navigation/drawer';

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

interface ScheduleScreenProps {
  navigation: DrawerNavigationProp<RootDrawerParamList, 'Schedule'>;
}

interface Duty {
  id: string;
  tripId: string;
  date: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  busNumber: string;
  busId: string;
  routeName: string;
  routeId: string;
  from: string;
  to: string;
  distance: string;
  status: 'UPCOMING' | 'VEHICLE_CHECK' | 'BOARDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  fare: number;
  totalSeats: number;
  bookedSeats: number;
  repeatType?: string;
  startDate?: any;
  endDate?: any;
  days?: string[];
}

const ScheduleScreen: React.FC<ScheduleScreenProps> = ({ navigation }) => {
  const user = auth().currentUser;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayDuties, setTodayDuties] = useState<Duty[]>([]);
  const [upcomingDuties, setUpcomingDuties] = useState<Duty[]>([]);
  const [completedDuties, setCompletedDuties] = useState<Duty[]>([]);
  const [selectedTab, setSelectedTab] = useState<'today' | 'upcoming' | 'completed'>('today');
  const [driverId, setDriverId] = useState<string>('');

  // Get correct driver ID from auth
  const getDriverId = useCallback(async (authUid: string): Promise<string> => {
    try {
      console.log('🔍 Getting driver ID for auth UID:', authUid);

      const driverDoc = await firestore().collection('drivers').doc(authUid).get();
      if (driverDoc.exists) {
        console.log('✅ Found driver with auth UID as doc ID:', authUid);
        setDriverId(authUid);
        return authUid;
      }

      const userDoc = await firestore().collection('users').doc(authUid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const email = userData?.email;

        if (email) {
          const driverQuery = await firestore()
            .collection('drivers')
            .where('email', '==', email)
            .limit(1)
            .get();

          if (!driverQuery.empty) {
            const foundDriverId = driverQuery.docs[0].id;
            console.log('✅ Found driver by email, ID:', foundDriverId);
            setDriverId(foundDriverId);
            return foundDriverId;
          }
        }
      }

      console.log('⚠️ No driver found, using auth UID as fallback:', authUid);
      setDriverId(authUid);
      return authUid;
    } catch (error) {
      console.error('Error getting driver ID:', error);
      setDriverId(authUid);
      return authUid;
    }
  }, []);

  // Check if trip is valid for a specific date
  const isTripValidForDate = (tripData: any, targetDate: string): boolean => {
    // Get start and end dates
    let startDate = '';
    let endDate = '';

    if (tripData.startDate) {
      if (tripData.startDate.toDate) {
        startDate = tripData.startDate.toDate().toISOString().split('T')[0];
      } else if (typeof tripData.startDate === 'string') {
        startDate = tripData.startDate;
      }
    } else if (tripData.date) {
      startDate = tripData.date;
    }

    if (tripData.endDate) {
      if (tripData.endDate.toDate) {
        endDate = tripData.endDate.toDate().toISOString().split('T')[0];
      } else if (typeof tripData.endDate === 'string') {
        endDate = tripData.endDate;
      }
    } else {
      endDate = startDate;
    }

    // Date range check
    if (targetDate < startDate || targetDate > endDate) return false;

    // Repeat type logic
    const targetDay = new Date(targetDate).toLocaleDateString('en-US', { weekday: 'short' });

    if (tripData.repeatType === 'daily') return true;
    if (tripData.repeatType === 'weekly') {
      return tripData.days?.includes(targetDay) ?? false;
    }
    if (tripData.repeatType === 'weekdays') {
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(targetDay);
    }
    if (tripData.repeatType === 'weekends') {
      return ['Sat', 'Sun'].includes(targetDay);
    }

    // Single trip
    return startDate === targetDate;
  };

  // Convert Firebase status to display status
  const mapStatus = (firebaseStatus: string): Duty['status'] => {
    switch (firebaseStatus) {
      case 'upcoming':
      case 'scheduled':
        return 'UPCOMING';
      case 'vehicle_check':
        return 'VEHICLE_CHECK';
      case 'boarding':
        return 'BOARDING';
      case 'active':
      case 'in-progress':
        return 'IN_PROGRESS';
      case 'completed':
        return 'COMPLETED';
      case 'cancelled':
        return 'CANCELLED';
      default:
        return 'UPCOMING';
    }
  };

  // Get status color
  const getStatusColor = (status: Duty['status']): string => {
    switch (status) {
      case 'UPCOMING': return '#FF9800';
      case 'VEHICLE_CHECK': return '#2196F3';
      case 'BOARDING': return '#9C27B0';
      case 'IN_PROGRESS': return '#4CAF50';
      case 'COMPLETED': return '#9E9E9E';
      case 'CANCELLED': return '#F44336';
      default: return '#666666';
    }
  };

  // Get status icon
  const getStatusIcon = (status: Duty['status']): string => {
    switch (status) {
      case 'UPCOMING': return '⏰';
      case 'VEHICLE_CHECK': return '🔧';
      case 'BOARDING': return '👥';
      case 'IN_PROGRESS': return '🚌';
      case 'COMPLETED': return '✅';
      case 'CANCELLED': return '❌';
      default: return '📋';
    }
  };

  // Format trip to duty
  const formatTripToDuty = (doc: any): Duty => {
    const data = doc.data();

    // Format date properly
    let tripDate = '';
    if (data.startDate) {
      if (data.startDate.toDate) {
        tripDate = data.startDate.toDate().toISOString().split('T')[0];
      } else if (typeof data.startDate === 'string') {
        tripDate = data.startDate;
      }
    } else if (data.date) {
      tripDate = data.date;
    } else {
      tripDate = 'Date not set';
    }

    const dayOfWeek = tripDate !== 'Date not set'
      ? new Date(tripDate).toLocaleDateString('en-US', { weekday: 'short' })
      : 'N/A';

    return {
      id: doc.id,
      tripId: doc.id,
      date: tripDate,
      dayOfWeek: dayOfWeek,
      startTime: data.departureTime || data.startTime || '00:00',
      endTime: data.arrivalTime || data.endTime || '00:00',
      busNumber: data.busNumber || 'N/A',
      busId: data.busId || '',
      routeName: data.routeName || 'Unknown Route',
      routeId: data.routeId || '',
      from: data.from || '',
      to: data.to || '',
      distance: data.distance || '',
      status: mapStatus(data.status),
      fare: data.fare || 0,
      totalSeats: data.totalSeats || 0,
      bookedSeats: data.bookedSeats || 0,
      repeatType: data.repeatType,
      startDate: data.startDate,
      endDate: data.endDate,
      days: data.days,
    };
  };

  // Fetch all trips and categorize them
  const fetchAndCategorizeDuties = useCallback(async (driverUid: string) => {
    try {
      console.log('📡 Fetching trips for driver ID:', driverUid);

      const tripsSnapshot = await firestore()
        .collection('trips')
        .where('driverId', '==', driverUid)
        .get();

      console.log(`📊 Found ${tripsSnapshot.docs.length} total trips for driver`);

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const todayList: Duty[] = [];
      const upcomingList: Duty[] = [];
      const completedList: Duty[] = [];

      tripsSnapshot.forEach(doc => {
        const data = doc.data();
        const duty = formatTripToDuty(doc);

        // Check if trip is completed
        if (duty.status === 'COMPLETED' || duty.status === 'CANCELLED') {
          completedList.push(duty);
          return;
        }

        // Check if trip is valid for today
        const isValidToday = isTripValidForDate(data, todayStr);

        if (isValidToday) {
          todayList.push(duty);
        } else {
          // For upcoming, check if trip date is in future
          if (duty.date !== 'Date not set' && duty.date > todayStr) {
            upcomingList.push(duty);
          } else if (duty.repeatType && duty.repeatType !== 'one-time') {
            // For recurring trips that don't have a specific date in future but are recurring
            // We'll include them in upcoming if they have future occurrences
            upcomingList.push(duty);
          }
        }
      });

      // Sort today's trips by time
      todayList.sort((a, b) => a.startTime.localeCompare(b.startTime));

      // Sort upcoming trips by date then time
      upcomingList.sort((a, b) => {
        if (a.date === 'Date not set') return 1;
        if (b.date === 'Date not set') return -1;
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });

      // Sort completed trips by date (newest first)
      completedList.sort((a, b) => {
        if (a.date === 'Date not set') return 1;
        if (b.date === 'Date not set') return -1;
        return b.date.localeCompare(a.date);
      });

      console.log(`✅ Today: ${todayList.length}, Upcoming: ${upcomingList.length}, Completed: ${completedList.length}`);

      setTodayDuties(todayList);
      setUpcomingDuties(upcomingList);
      setCompletedDuties(completedList);

    } catch (error) {
      console.error('Error fetching duties:', error);
      Alert.alert('Error', 'Failed to load duties. Please try again.');
    }
  }, []);

  // Handle tab change
  const handleTabChange = (tab: 'today' | 'upcoming' | 'completed') => {
    setSelectedTab(tab);
  };

  // Handle duty press - show details only (no start button)
  const handleDutyPress = (duty: Duty) => {
    Alert.alert(
      'Duty Details',
      `🚌 Bus: ${duty.busNumber}\n` +
      `📍 Route: ${duty.routeName}\n` +
      `${duty.from && duty.to ? `🔄 From/To: ${duty.from} → ${duty.to}\n` : ''}` +
      `🕒 Time: ${duty.startTime} - ${duty.endTime}\n` +
      `📅 Date: ${duty.date} (${duty.dayOfWeek})\n` +
      `${duty.repeatType && duty.repeatType !== 'one-time' && duty.repeatType !== 'single' ? `🔄 Schedule: ${duty.repeatType === 'daily' ? 'Daily' : duty.repeatType === 'weekdays' ? 'Weekdays only' : duty.repeatType === 'weekends' ? 'Weekends only' : duty.repeatType === 'weekly' ? 'Weekly' : duty.repeatType}\n` : ''}` +
      `💰 Fare: PKR ${duty.fare}\n` +
      `💺 Seats: ${duty.bookedSeats}/${duty.totalSeats} booked\n` +
      `📊 Status: ${duty.status}`,
      [{ text: 'Close', style: 'cancel' }]
    );
  };

  // Render duty card (without start button)
  const renderDutyCard = (duty: Duty) => {
    const statusColor = getStatusColor(duty.status);
    const statusIcon = getStatusIcon(duty.status);

    return (
      <TouchableOpacity
        key={duty.id}
        style={styles.dutyCard}
        onPress={() => handleDutyPress(duty)}
        activeOpacity={0.7}
      >
        <View style={styles.dutyCardHeader}>
          <View style={styles.busInfo}>
            <Text style={styles.busNumber}>🚌 {duty.busNumber}</Text>
            <Text style={styles.routeName}>{duty.routeName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusIcon} {duty.status}
            </Text>
          </View>
        </View>

        <View style={styles.dutyCardBody}>
          <View style={styles.dutyRow}>
            <Text style={styles.dutyLabel}>📅 Date:</Text>
            <Text style={styles.dutyValue}>{duty.date} ({duty.dayOfWeek})</Text>
          </View>

          <View style={styles.dutyRow}>
            <Text style={styles.dutyLabel}>⏰ Time:</Text>
            <Text style={styles.dutyValue}>{duty.startTime} - {duty.endTime}</Text>
          </View>

          {duty.from && duty.to && (
            <View style={styles.dutyRow}>
              <Text style={styles.dutyLabel}>📍 Route:</Text>
              <Text style={styles.dutyValue}>{duty.from} → {duty.to}</Text>
            </View>
          )}

          <View style={styles.dutyRow}>
            <Text style={styles.dutyLabel}>💺 Seats:</Text>
            <Text style={styles.dutyValue}>{duty.bookedSeats} / {duty.totalSeats} booked</Text>
          </View>

          <View style={styles.dutyRow}>
            <Text style={styles.dutyLabel}>💰 Fare:</Text>
            <Text style={styles.dutyValue}>PKR {duty.fare}</Text>
          </View>

          {duty.repeatType && duty.repeatType !== 'one-time' && duty.repeatType !== 'single' && (
            <View style={styles.dutyRow}>
              <Text style={styles.dutyLabel}>🔄 Schedule:</Text>
              <Text style={styles.dutyValue}>
                {duty.repeatType === 'daily' ? 'Daily' :
                 duty.repeatType === 'weekdays' ? 'Weekdays only' :
                 duty.repeatType === 'weekends' ? 'Weekends only' :
                 duty.repeatType === 'weekly' ? 'Weekly' : duty.repeatType}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Get current duties based on selected tab
  const getCurrentDuties = () => {
    switch (selectedTab) {
      case 'today':
        return todayDuties;
      case 'upcoming':
        return upcomingDuties;
      case 'completed':
        return completedDuties;
      default:
        return todayDuties;
    }
  };

  // Get empty message based on tab
  const getEmptyMessage = () => {
    switch (selectedTab) {
      case 'today':
        return {
          emoji: '😴',
          title: 'No Duties Today',
          message: 'You have no scheduled duties for today. Enjoy your day off!'
        };
      case 'upcoming':
        return {
          emoji: '📅',
          title: 'No Upcoming Duties',
          message: 'You have no upcoming duties scheduled. Check back later for new assignments.'
        };
      case 'completed':
        return {
          emoji: '✅',
          title: 'No Completed Duties',
          message: 'You haven\'t completed any duties yet. Your completed trips will appear here.'
        };
      default:
        return {
          emoji: '📭',
          title: 'No Duties Found',
          message: 'No duties found.'
        };
    }
  };

  // Load data on mount
  useEffect(() => {
    if (!user) {
      console.log('❌ No user logged in');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      console.log('🚀 Loading schedule for user:', user.uid);

      const driverUid = await getDriverId(user.uid);
      console.log('🎯 Using driver ID:', driverUid);

      await fetchAndCategorizeDuties(driverUid);
      setLoading(false);
    };

    loadData();
  }, [user, getDriverId, fetchAndCategorizeDuties]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user) {
      const driverUid = await getDriverId(user.uid);
      await fetchAndCategorizeDuties(driverUid);
    }
    setRefreshing(false);
  }, [user, getDriverId, fetchAndCategorizeDuties]);

  const currentDuties = getCurrentDuties();
  const emptyState = getEmptyMessage();

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading your schedule...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>📅 My Schedule</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'today' && styles.activeTab]}
          onPress={() => handleTabChange('today')}
        >
          <Text style={[styles.tabText, selectedTab === 'today' && styles.activeTabText]}>
            Today ({todayDuties.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'upcoming' && styles.activeTab]}
          onPress={() => handleTabChange('upcoming')}
        >
          <Text style={[styles.tabText, selectedTab === 'upcoming' && styles.activeTabText]}>
            Upcoming ({upcomingDuties.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'completed' && styles.activeTab]}
          onPress={() => handleTabChange('completed')}
        >
          <Text style={[styles.tabText, selectedTab === 'completed' && styles.activeTabText]}>
            Completed ({completedDuties.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {currentDuties.length > 0 ? (
          currentDuties.map(renderDutyCard)
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>{emptyState.emoji}</Text>
            <Text style={styles.emptyTitle}>{emptyState.title}</Text>
            <Text style={styles.emptyText}>{emptyState.message}</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
            >
              <Text style={styles.refreshButtonText}>↻ Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  header: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#E3F2FD',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  activeTabText: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  dutyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  dutyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  busInfo: {
    flex: 1,
  },
  busNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  routeName: {
    fontSize: 14,
    color: '#666666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dutyCardBody: {
    marginBottom: 8,
  },
  dutyRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dutyLabel: {
    width: 70,
    fontSize: 13,
    color: '#666666',
  },
  dutyValue: {
    flex: 1,
    fontSize: 13,
    color: '#1A237E',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 60,
    marginTop: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ScheduleScreen;
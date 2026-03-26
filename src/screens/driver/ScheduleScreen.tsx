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
  date: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  busNumber: string;
  busId: string;
  routeName: string;
  routeId: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  shiftType: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
}

interface WeeklySchedule {
  weekStart: string;
  weekEnd: string;
  duties: Duty[];
}

const ScheduleScreen: React.FC<ScheduleScreenProps> = ({ navigation }) => {
  const user = auth().currentUser;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule | null>(null);
  const [todayDuties, setTodayDuties] = useState<Duty[]>([]);
  const [currentMonth, setCurrentMonth] = useState('');
  const [currentYear, setCurrentYear] = useState('');
  const [weekDays, setWeekDays] = useState<any[]>([]);

  // Map trip to duties for days it applies (trips have date ranges + repeatType)
  const expandTripsToDuties = (trips: any[], weekStart: Date, weekEnd: Date): Duty[] => {
    const dutiesList: Duty[] = [];
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + d);
      const dateStr = day.toISOString().split('T')[0];
      const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });

      trips.forEach(trip => {
        const startDate = trip.startDate ?? trip.date ?? dateStr;
        const endDate = trip.endDate ?? trip.date ?? dateStr;
        if (dateStr < startDate || dateStr > endDate) return;

        let applies = false;
        if (trip.repeatType === 'daily') applies = true;
        else if (trip.repeatType === 'weekly') applies = trip.days?.includes(dayName) ?? false;
        else if (trip.repeatType === 'weekdays') applies = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(dayName);
        else if (trip.repeatType === 'weekends') applies = ['Sat', 'Sun'].includes(dayName);
        else if (trip.repeatType === 'one-time') applies = startDate === dateStr;
        else applies = true;

        if (applies) {
          dutiesList.push({
            id: `${trip.id}-${dateStr}`,
            date: dateStr,
            dayOfWeek: dayName,
            startTime: trip.departureTime ?? trip.startTime ?? '00:00',
            endTime: trip.arrivalTime ?? trip.endTime ?? '00:00',
            busNumber: trip.busNumber ?? 'N/A',
            busId: trip.busId ?? '',
            routeName: trip.routeName ?? 'Unknown',
            routeId: trip.routeId ?? '',
            status: mapDutyStatus(trip.status),
            shiftType: 'MORNING',
          });
        }
      });
    }
    return dutiesList.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  };

  // Fetch driver schedule from trips (app uses trips, not duties)
  useEffect(() => {
    if (!user) return;

    let unsubscribeTrips: () => void;

    const setupSchedule = () => {
      const now = new Date();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      setCurrentMonth(monthNames[now.getMonth()]);
      setCurrentYear(now.getFullYear().toString());

      const weekStart = new Date(now);
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStart.setDate(now.getDate() - diffToMonday);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekDaysArray = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        weekDaysArray.push({
          dayName: day.toLocaleDateString('en-US', { weekday: 'short' }),
          date: day.getDate().toString(),
          fullDate: day.toISOString().split('T')[0],
          isToday: day.toDateString() === now.toDateString(),
        });
      }
      setWeekDays(weekDaysArray);
    };

    const fetchSchedule = async () => {
      try {
        setLoading(true);
        setupSchedule();

        const now = new Date();
        const weekStart = new Date(now);
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekStart.setDate(now.getDate() - diffToMonday);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        // Listen to trips for this driver (trips, not duties)
        unsubscribeTrips = firestore()
          .collection('trips')
          .where('driverId', '==', user.uid)
          .onSnapshot(
            (snapshot) => {
              const tripsData: any[] = [];
              snapshot.forEach(doc => {
                tripsData.push({ id: doc.id, ...doc.data() });
              });

              const dutiesList = expandTripsToDuties(tripsData, weekStart, weekEnd);
              const todayStr = now.toISOString().split('T')[0];
              const today = dutiesList.filter(d => d.date === todayStr);
              setTodayDuties(today);
              setWeeklySchedule({
                weekStart: weekStart.toISOString().split('T')[0],
                weekEnd: weekEnd.toISOString().split('T')[0],
                duties: dutiesList,
              });
              setLoading(false);
              setRefreshing(false);
            },
            () => {
              setLoading(false);
              setRefreshing(false);
            }
          );
      } catch {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchSchedule();

    return () => {
      if (unsubscribeTrips) unsubscribeTrips();
    };
  }, [user]);

  // Map Firebase status to local status
  const mapDutyStatus = (firebaseStatus: string): Duty['status'] => {
    switch (firebaseStatus) {
      case 'scheduled': return 'SCHEDULED';
      case 'in-progress': return 'IN_PROGRESS';
      case 'completed': return 'COMPLETED';
      case 'cancelled': return 'CANCELLED';
      default: return 'SCHEDULED';
    }
  };

  // Get duties for a specific date
  const getDutiesForDate = (date: string) => {
    if (!weeklySchedule) return 'OFF';

    const dutiesForDate = weeklySchedule.duties.filter(d => d.date === date);
    if (dutiesForDate.length === 0) return 'OFF';

    // Format: "8:00 AM - 5:00 PM" (show first duty time range)
    const firstDuty = dutiesForDate[0];
    return `${firstDuty.startTime} - ${firstDuty.endTime}`;
  };

  // Get status color
  const getStatusColor = (status: Duty['status']) => {
    switch (status) {
      case 'SCHEDULED': return '#FF9800';
      case 'IN_PROGRESS': return '#2196F3';
      case 'COMPLETED': return '#4CAF50';
      case 'CANCELLED': return '#F44336';
      default: return '#666666';
    }
  };

  // Handle duty press
  const handleDutyPress = (duty: Duty) => {
    Alert.alert(
      'Duty Details',
      `🕒 Time: ${duty.startTime} - ${duty.endTime}\n` +
      `🚌 Bus: ${duty.busNumber}\n` +
      `📍 Route: ${duty.routeName}\n` +
      `📊 Status: ${duty.status}`,
      [
        { text: 'Close', style: 'cancel' },
        {
          text: duty.status === 'SCHEDULED' ? 'Request Swap' : 'View Details',
          onPress: () => {
            if (duty.status === 'SCHEDULED') {
              handleRequestSwap(duty);
            }
          }
        }
      ]
    );
  };

  // Handle request swap
  const handleRequestSwap = (duty: Duty) => {
    Alert.alert(
      'Request Shift Swap',
      'This feature will be available soon. You will be able to:\n\n' +
      '• Swap with another driver\n' +
      '• Request time off\n' +
      '• Change shift timing',
      [{ text: 'OK' }]
    );
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
        <Text style={styles.loadingText}>Loading schedule...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>📅 MY SCHEDULE</Text>
        <Text style={styles.headerSubtitle}>{currentMonth} {currentYear}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Weekly Calendar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WEEKLY VIEW</Text>
          <View style={styles.calendarContainer}>
            {weekDays.map((item, index) => {
              const duties = getDutiesForDate(item.fullDate);
              const isToday = item.isToday;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCard,
                    isToday && styles.todayCard
                  ]}
                  onPress={() => {
                    if (duties !== 'OFF') {
                      Alert.alert(
                        `${item.dayName}, ${item.date}`,
                        duties,
                        [{ text: 'OK' }]
                      );
                    }
                  }}
                >
                  <Text style={[
                    styles.dayName,
                    isToday && styles.todayText
                  ]}>
                    {item.dayName}
                  </Text>
                  <Text style={[
                    styles.dateNumber,
                    isToday && styles.todayText
                  ]}>
                    {item.date}
                  </Text>
                  <Text style={[
                    styles.dutyHours,
                    duties === 'OFF' ? styles.offDay : styles.workingDay
                  ]}>
                    {duties}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Today's Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TODAY'S DUTIES</Text>
          <View style={styles.dutiesContainer}>
            {todayDuties.length > 0 ? (
              todayDuties.map((duty, index) => (
                <TouchableOpacity
                  key={duty.id}
                  style={styles.dutyCard}
                  onPress={() => handleDutyPress(duty)}
                >
                  <Text style={styles.dutyTime}>
                    {duty.startTime} - {duty.endTime}
                  </Text>
                  <Text style={styles.dutyDetails}>
                    Bus: {duty.busNumber} | Route: {duty.routeName}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(duty.status) + '20' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: getStatusColor(duty.status) }
                    ]}>
                      {duty.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noDutiesContainer}>
                <Text style={styles.noDutiesEmoji}>😴</Text>
                <Text style={styles.noDutiesTitle}>No Duties Today</Text>
                <Text style={styles.noDutiesText}>
                  You have no scheduled duties for today. Enjoy your day off!
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>⚡ QUICK ACTIONS</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => Alert.alert('Coming Soon', 'Request time off feature coming soon!')}
            >
              <Text style={styles.quickActionEmoji}>🏖️</Text>
              <Text style={styles.quickActionText}>Request Time Off</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => Alert.alert('Coming Soon', 'Shift swap feature coming soon!')}
            >
              <Text style={styles.quickActionEmoji}>🔄</Text>
              <Text style={styles.quickActionText}>Swap Shift</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => Alert.alert('Coming Soon', 'Monthly schedule view coming soon!')}
            >
              <Text style={styles.quickActionEmoji}>📆</Text>
              <Text style={styles.quickActionText}>Monthly View</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => Alert.alert('Coming Soon', 'Set availability feature coming soon!')}
            >
              <Text style={styles.quickActionEmoji}>⏰</Text>
              <Text style={styles.quickActionText}>Set Availability</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Summary */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {weeklySchedule?.duties.filter(d => d.status === 'SCHEDULED').length || 0}
            </Text>
            <Text style={styles.statLabel}>Scheduled</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {weeklySchedule?.duties.filter(d => d.status === 'COMPLETED').length || 0}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {weeklySchedule?.duties.filter(d => d.status === 'IN_PROGRESS').length || 0}
            </Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E3F2FD',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
  },
  calendarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCard: {
    alignItems: 'center',
    flex: 1,
    padding: 8,
    borderRadius: 8,
  },
  todayCard: {
    backgroundColor: '#E3F2FD',
  },
  dayName: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  todayText: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  dateNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  dutyHours: {
    fontSize: 10,
    textAlign: 'center',
    height: 28,
  },
  workingDay: {
    color: '#4CAF50',
  },
  offDay: {
    color: '#F44336',
  },
  dutiesContainer: {
    gap: 12,
  },
  dutyCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  dutyTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 4,
  },
  dutyDetails: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  noDutiesContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noDutiesEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  noDutiesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 8,
  },
  noDutiesText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  quickActionsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    fontSize: 12,
    fontWeight: '500',
    color: '#1A237E',
    textAlign: 'center',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 32,
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

export default ScheduleScreen;
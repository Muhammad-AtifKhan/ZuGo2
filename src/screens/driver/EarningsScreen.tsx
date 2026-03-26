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

interface EarningsScreenProps {
  navigation: DrawerNavigationProp<RootDrawerParamList, 'Earnings'>;
}

interface TripEarning {
  id: string;
  date: string;
  dayOfWeek: string;
  tripId: string;
  routeName: string;
  busNumber: string;
  baseFare: number;
  distanceFare: number;
  bonus: number;
  total: number;
  status: 'completed' | 'in-progress' | 'cancelled';
  passengerCount: number;
  distance: number;
  duration: string;
}

interface DailyEarning {
  date: string;
  dayName: string;
  amount: number;
  trips: number;
}

interface PeriodEarnings {
  total: number;
  baseFare: number;
  distanceFare: number;
  bonus: number;
  trips: number;
  hours: number;
  distance: number;
}

const EarningsScreen: React.FC<EarningsScreenProps> = ({ navigation }) => {
  const user = auth().currentUser;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  // Today's earnings
  const [todayEarnings, setTodayEarnings] = useState<PeriodEarnings>({
    total: 0,
    baseFare: 0,
    distanceFare: 0,
    bonus: 0,
    trips: 0,
    hours: 0,
    distance: 0,
  });

  // Weekly earnings
  const [weeklyEarnings, setWeeklyEarnings] = useState<DailyEarning[]>([]);
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [weeklyStats, setWeeklyStats] = useState({
    total: 0,
    trips: 0,
    hours: 0,
    distance: 0,
  });

  // Monthly earnings
  const [monthlyEarnings, setMonthlyEarnings] = useState<DailyEarning[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [monthlyStats, setMonthlyStats] = useState({
    total: 0,
    trips: 0,
    hours: 0,
    distance: 0,
  });

  // Recent trips
  const [recentTrips, setRecentTrips] = useState<TripEarning[]>([]);

  // Fetch earnings data
  useEffect(() => {
    if (!user) return;

    let unsubscribeToday: () => void;
    let unsubscribeWeek: () => void;
    let unsubscribeMonth: () => void;
    let unsubscribeRecent: () => void;

    const fetchEarnings = async () => {
      try {
        setLoading(true);

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // Calculate week start (Monday) and end (Sunday)
        const weekStart = new Date(now);
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekStart.setDate(now.getDate() - diffToMonday);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Calculate month start and end
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);

        // Listen to today's earnings
        unsubscribeToday = firestore()
          .collection('driver_earnings')
          .where('driverId', '==', user.uid)
          .where('date', '==', todayStr)
          .onSnapshot(
            (snapshot) => {
              let totalBase = 0;
              let totalDistance = 0;
              let totalBonus = 0;
              let totalAmount = 0;
              let tripCount = 0;
              let totalHours = 0;
              let totalDistanceKm = 0;

              snapshot.forEach(doc => {
                const data = doc.data();
                totalBase += data.baseFare || 0;
                totalDistance += data.distanceFare || 0;
                totalBonus += data.bonus || 0;
                totalAmount += data.total || 0;
                tripCount++;
                totalHours += data.duration || 0;
                totalDistanceKm += data.distance || 0;
              });

              setTodayEarnings({
                total: totalAmount,
                baseFare: totalBase,
                distanceFare: totalDistance,
                bonus: totalBonus,
                trips: tripCount,
                hours: totalHours,
                distance: totalDistanceKm,
              });
            },
            () => {}
          );

        // Listen to weekly earnings
        unsubscribeWeek = firestore()
          .collection('driver_earnings')
          .where('driverId', '==', user.uid)
          .where('timestamp', '>=', weekStart)
          .where('timestamp', '<=', weekEnd)
          .orderBy('timestamp', 'asc')
          .onSnapshot(
            (snapshot) => {
              const daysMap = new Map<string, { amount: number; trips: number }>();
              let totalAmount = 0;
              let tripCount = 0;
              let totalHours = 0;
              let totalDistance = 0;

              snapshot.forEach(doc => {
                const data = doc.data();
                const date = data.date;
                const amount = data.total || 0;

                if (!daysMap.has(date)) {
                  daysMap.set(date, { amount: 0, trips: 0 });
                }

                const dayData = daysMap.get(date)!;
                dayData.amount += amount;
                dayData.trips++;

                totalAmount += amount;
                tripCount++;
                totalHours += data.duration || 0;
                totalDistance += data.distance || 0;
              });

              // Convert to array for the week
              const weekDays = [];
              for (let i = 0; i < 7; i++) {
                const day = new Date(weekStart);
                day.setDate(weekStart.getDate() + i);
                const dateStr = day.toISOString().split('T')[0];
                const dayName = day.toLocaleDateString('en-US', { weekday: 'long' });

                weekDays.push({
                  date: dateStr,
                  dayName: dayName,
                  amount: daysMap.get(dateStr)?.amount || 0,
                  trips: daysMap.get(dateStr)?.trips || 0,
                });
              }

              setWeeklyEarnings(weekDays);
              setWeeklyTotal(totalAmount);
              setWeeklyStats({
                total: totalAmount,
                trips: tripCount,
                hours: totalHours,
                distance: totalDistance,
              });
            },
            () => {}
          );

        // Listen to monthly earnings
        unsubscribeMonth = firestore()
          .collection('driver_earnings')
          .where('driverId', '==', user.uid)
          .where('timestamp', '>=', monthStart)
          .where('timestamp', '<=', monthEnd)
          .orderBy('timestamp', 'asc')
          .onSnapshot(
            (snapshot) => {
              const daysMap = new Map<string, { amount: number; trips: number }>();
              let totalAmount = 0;
              let tripCount = 0;
              let totalHours = 0;
              let totalDistance = 0;

              snapshot.forEach(doc => {
                const data = doc.data();
                const date = data.date;
                const amount = data.total || 0;

                if (!daysMap.has(date)) {
                  daysMap.set(date, { amount: 0, trips: 0 });
                }

                const dayData = daysMap.get(date)!;
                dayData.amount += amount;
                dayData.trips++;

                totalAmount += amount;
                tripCount++;
                totalHours += data.duration || 0;
                totalDistance += data.distance || 0;
              });

              // Convert to array for display (last 30 days)
              const monthDays = [];
              const daysInMonth = monthEnd.getDate();
              for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                const day = new Date(now.getFullYear(), now.getMonth(), i);
                const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });

                monthDays.push({
                  date: dateStr,
                  dayName: dayName,
                  amount: daysMap.get(dateStr)?.amount || 0,
                  trips: daysMap.get(dateStr)?.trips || 0,
                });
              }

              setMonthlyEarnings(monthDays);
              setMonthlyTotal(totalAmount);
              setMonthlyStats({
                total: totalAmount,
                trips: tripCount,
                hours: totalHours,
                distance: totalDistance,
              });
            },
            () => {}
          );

        // Listen to recent trips
        unsubscribeRecent = firestore()
          .collection('driver_earnings')
          .where('driverId', '==', user.uid)
          .orderBy('timestamp', 'desc')
          .limit(10)
          .onSnapshot(
            (snapshot) => {
              const trips: TripEarning[] = [];
              snapshot.forEach(doc => {
                const data = doc.data();
                trips.push({
                  id: doc.id,
                  date: data.date,
                  dayOfWeek: data.dayOfWeek,
                  tripId: data.tripId,
                  routeName: data.routeName,
                  busNumber: data.busNumber,
                  baseFare: data.baseFare || 0,
                  distanceFare: data.distanceFare || 0,
                  bonus: data.bonus || 0,
                  total: data.total || 0,
                  status: data.status || 'completed',
                  passengerCount: data.passengerCount || 0,
                  distance: data.distance || 0,
                  duration: data.duration || '0 min',
                });
              });
              setRecentTrips(trips);
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

    fetchEarnings();

    return () => {
      if (unsubscribeToday) unsubscribeToday();
      if (unsubscribeWeek) unsubscribeWeek();
      if (unsubscribeMonth) unsubscribeMonth();
      if (unsubscribeRecent) unsubscribeRecent();
    };
  }, [user, selectedPeriod]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Data will auto-refresh via Firebase listeners
  }, []);

  // Format currency (PKR)
  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`;
  };

  // Handle trip press
  const handleTripPress = (trip: TripEarning) => {
    Alert.alert(
      'Trip Details',
      `🚌 Route: ${trip.routeName}\n` +
      `📅 Date: ${trip.date}\n` +
      `👥 Passengers: ${trip.passengerCount}\n` +
      `📏 Distance: ${trip.distance} km\n` +
      `⏱️ Duration: ${trip.duration}\n\n` +
      `💰 Base Fare: ${formatCurrency(trip.baseFare)}\n` +
      `🛣️ Distance Fare: ${formatCurrency(trip.distanceFare)}\n` +
      `🎁 Bonus: ${formatCurrency(trip.bonus)}\n` +
      `💵 Total: ${formatCurrency(trip.total)}`,
      [{ text: 'OK' }]
    );
  };

  // Calculate projected monthly earnings
  const calculateProjectedMonthly = () => {
    if (weeklyStats.total === 0) return 0;
    return weeklyStats.total * 4.33; // Average weeks in a month
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading earnings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 MY EARNINGS</Text>
        <Text style={styles.headerSubtitle}>Track your income</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'today' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('today')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === 'today' && styles.periodButtonTextActive]}>
              TODAY
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'week' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('week')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === 'week' && styles.periodButtonTextActive]}>
              WEEK
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('month')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === 'month' && styles.periodButtonTextActive]}>
              MONTH
            </Text>
          </TouchableOpacity>
        </View>

        {/* Today's Earnings */}
        {selectedPeriod === 'today' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TODAY'S BREAKDOWN</Text>
            <View style={styles.earningsCard}>
              <View style={styles.earningRow}>
                <Text style={styles.earningLabel}>Base Fare</Text>
                <Text style={styles.earningValue}>{formatCurrency(todayEarnings.baseFare)}</Text>
              </View>
              <View style={styles.earningRow}>
                <Text style={styles.earningLabel}>Distance Fare</Text>
                <Text style={styles.earningValue}>{formatCurrency(todayEarnings.distanceFare)}</Text>
              </View>
              <View style={styles.earningRow}>
                <Text style={styles.earningLabel}>Bonus</Text>
                <Text style={styles.earningValue}>+{formatCurrency(todayEarnings.bonus)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.earningRow}>
                <Text style={styles.earningLabelTotal}>TOTAL</Text>
                <Text style={styles.earningValueTotal}>{formatCurrency(todayEarnings.total)}</Text>
              </View>
            </View>

            {/* Today's Stats */}
            <View style={styles.todayStats}>
              <View style={styles.todayStat}>
                <Text style={styles.todayStatValue}>{todayEarnings.trips}</Text>
                <Text style={styles.todayStatLabel}>Trips</Text>
              </View>
              <View style={styles.todayStat}>
                <Text style={styles.todayStatValue}>{todayEarnings.hours.toFixed(1)}h</Text>
                <Text style={styles.todayStatLabel}>Hours</Text>
              </View>
              <View style={styles.todayStat}>
                <Text style={styles.todayStatValue}>{todayEarnings.distance.toFixed(0)}km</Text>
                <Text style={styles.todayStatLabel}>Distance</Text>
              </View>
            </View>
          </View>
        )}

        {/* Weekly Earnings */}
        {selectedPeriod === 'week' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>WEEKLY EARNINGS</Text>
            <View style={styles.earningsCard}>
              {weeklyEarnings.map((day, index) => (
                <View key={index} style={styles.earningRow}>
                  <Text style={styles.earningLabel}>{day.dayName}</Text>
                  <View style={styles.earningRight}>
                    <Text style={styles.earningTrips}>({day.trips} trips)</Text>
                    <Text style={styles.earningValue}>{formatCurrency(day.amount)}</Text>
                  </View>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.earningRow}>
                <Text style={styles.earningLabelTotal}>WEEKLY TOTAL</Text>
                <Text style={styles.earningValueTotal}>{formatCurrency(weeklyStats.total)}</Text>
              </View>
            </View>

            {/* Weekly Stats */}
            <View style={styles.periodStats}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{weeklyStats.trips}</Text>
                <Text style={styles.statLabel}>Trips</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{weeklyStats.hours.toFixed(1)}h</Text>
                <Text style={styles.statLabel}>Hours</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{weeklyStats.distance.toFixed(0)}km</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
            </View>
          </View>
        )}

        {/* Monthly Earnings */}
        {selectedPeriod === 'month' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MONTHLY EARNINGS</Text>
            <View style={styles.earningsCard}>
              {monthlyEarnings.filter(day => day.amount > 0).map((day, index) => (
                <View key={index} style={styles.earningRow}>
                  <Text style={styles.earningLabel}>{day.date} ({day.dayName})</Text>
                  <View style={styles.earningRight}>
                    <Text style={styles.earningTrips}>({day.trips} trips)</Text>
                    <Text style={styles.earningValue}>{formatCurrency(day.amount)}</Text>
                  </View>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.earningRow}>
                <Text style={styles.earningLabelTotal}>MONTHLY TOTAL</Text>
                <Text style={styles.earningValueTotal}>{formatCurrency(monthlyStats.total)}</Text>
              </View>
            </View>

            {/* Monthly Stats */}
            <View style={styles.periodStats}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{monthlyStats.trips}</Text>
                <Text style={styles.statLabel}>Trips</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{monthlyStats.hours.toFixed(1)}h</Text>
                <Text style={styles.statLabel}>Hours</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{monthlyStats.distance.toFixed(0)}km</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
            </View>
          </View>
        )}

        {/* Stats Overview */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(weeklyStats.total)}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(calculateProjectedMonthly())}</Text>
            <Text style={styles.statLabel}>Projected Monthly</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{monthlyStats.trips}</Text>
            <Text style={styles.statLabel}>Monthly Trips</Text>
          </View>
        </View>

        {/* Recent Trips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECENT TRIPS</Text>
          <View style={styles.recentTrips}>
            {recentTrips.length > 0 ? (
              recentTrips.map((trip) => (
                <TouchableOpacity
                  key={trip.id}
                  style={styles.tripCard}
                  onPress={() => handleTripPress(trip)}
                >
                  <View style={styles.tripHeader}>
                    <Text style={styles.tripRoute}>{trip.routeName}</Text>
                    <Text style={styles.tripAmount}>{formatCurrency(trip.total)}</Text>
                  </View>
                  <View style={styles.tripDetails}>
                    <Text style={styles.tripTime}>{trip.date} • {trip.duration}</Text>
                    <Text style={styles.tripPassengers}>👥 {trip.passengerCount} passengers</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noTripsContainer}>
                <Text style={styles.noTripsEmoji}>🚌</Text>
                <Text style={styles.noTripsTitle}>No Trips Yet</Text>
                <Text style={styles.noTripsText}>Your completed trips will appear here</Text>
              </View>
            )}
          </View>
        </View>

        {/* Coming Soon */}
        <View style={styles.comingSoonSection}>
          <Text style={styles.comingSoonTitle}>📈 Coming Soon</Text>
          <Text style={styles.comingSoonText}>
            • Detailed earnings reports{"\n"}
            • Tax calculations{"\n"}
            • Payment history{"\n"}
            • Withdrawal options
          </Text>
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
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#4A90E2',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
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
    marginBottom: 16,
  },
  earningsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  earningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  earningLabel: {
    fontSize: 14,
    color: '#666666',
  },
  earningValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
  },
  earningLabelTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  earningValueTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  earningRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  earningTrips: {
    fontSize: 12,
    color: '#666666',
  },
  divider: {
    height: 1,
    backgroundColor: '#4A90E2',
    marginVertical: 8,
  },
  todayStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  todayStat: {
    alignItems: 'center',
  },
  todayStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  todayStatLabel: {
    fontSize: 12,
    color: '#666666',
  },
  periodStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
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
  recentTrips: {
    gap: 12,
  },
  tripCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripRoute: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
  },
  tripAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripTime: {
    fontSize: 12,
    color: '#666666',
  },
  tripPassengers: {
    fontSize: 12,
    color: '#666666',
  },
  noTripsContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noTripsEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  noTripsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 8,
  },
  noTripsText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  comingSoonSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
  },
  comingSoonText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 24,
    textAlign: 'center',
  },
});

export default EarningsScreen;
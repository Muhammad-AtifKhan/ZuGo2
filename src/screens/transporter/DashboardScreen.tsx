import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';

// Mock Data
const mockBuses: Bus[] = [
  { id: '1', number: 'B-001', registration: 'ABC-123', status: 'active', driver: 'Ali Ahmed', lastMaintenance: '2024-01-10' },
  { id: '2', number: 'B-002', registration: 'XYZ-789', status: 'maintenance', driver: undefined, lastMaintenance: '2024-01-05' },
  { id: '3', number: 'B-003', registration: 'DEF-456', status: 'active', driver: 'Ahmed Khan', lastMaintenance: '2024-01-12' },
  { id: '4', number: 'B-004', registration: 'GHI-789', status: 'inactive', driver: undefined, lastMaintenance: '2023-12-20' },
];

const mockDrivers: Driver[] = [
  { id: '1', name: 'Ali Ahmed', contact: '+92 300 1234567', status: 'on-duty', busAssigned: 'B-001', rating: 4.5 },
  { id: '2', name: 'Ahmed Khan', contact: '+92 300 7654321', status: 'online', busAssigned: 'B-003', rating: 4.2 },
  { id: '3', name: 'Sara Ali', contact: '+92 300 9876543', status: 'offline', busAssigned: undefined, rating: 4.8 },
  { id: '4', name: 'Usman Khan', contact: '+92 300 4567890', status: 'on-duty', busAssigned: 'B-005', rating: 4.0 },
];

const mockTrips: Trip[] = [
  { id: '1', time: '08:00 AM', route: 'Downtown Express', bus: 'B-001', driver: 'Ali Ahmed', status: 'on-time', passengers: 32 },
  { id: '2', time: '09:30 AM', route: 'University Shuttle', bus: 'B-003', driver: 'Ahmed Khan', status: 'delayed', passengers: 28 },
  { id: '3', time: '11:00 AM', route: 'Mall Route', bus: 'B-005', driver: 'Usman Khan', status: 'upcoming', passengers: 0 },
  { id: '4', time: '02:00 PM', route: 'Airport Express', bus: 'B-002', driver: 'Sara Ali', status: 'completed', passengers: 40 },
];

const mockAlerts: Alert[] = [
  { id: '1', message: 'Bus B-005 maintenance due tomorrow', type: 'warning', timestamp: '2 hours ago' },
  { id: '2', message: 'Driver Ahmed Khan completed 50 trips today', type: 'success', timestamp: '4 hours ago' },
  { id: '3', message: 'Route R-003 delayed by 15 minutes', type: 'error', timestamp: '1 hour ago' },
  { id: '4', message: 'Monthly revenue target achieved', type: 'success', timestamp: '1 day ago' },
];

const DashboardScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalBuses: 0,
    activeBuses: 0,
    activeDrivers: 0,
    todayRevenue: 0,
    todayTrips: 0,
    onTimePerformance: 0,
  });

  useEffect(() => {
    calculateStats();
  }, []);

  const calculateStats = () => {
    const totalBuses = mockBuses.length;
    const activeBuses = mockBuses.filter(bus => bus.status === 'active').length;
    const activeDrivers = mockDrivers.filter(driver => driver.status === 'online' || driver.status === 'on-duty').length;
    const todayTrips = mockTrips.length;
    const onTimeTrips = mockTrips.filter(trip => trip.status === 'on-time').length;

    setStats({
      totalBuses,
      activeBuses,
      activeDrivers,
      todayRevenue: 125000,
      todayTrips,
      onTimePerformance: todayTrips > 0 ? Math.round((onTimeTrips / todayTrips) * 100) : 0,
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      calculateStats();
      setRefreshing(false);
      Alert.alert('Refreshed', 'Dashboard data updated');
    }, 1000);
  };

  const handleAddBus = () => {
    Alert.alert('Add New Bus', 'This will open bus registration form');
  };

  const handleAddDriver = () => {
    Alert.alert('Add New Driver', 'This will open driver registration form');
  };

  const handleScheduleTrip = () => {
    Alert.alert('Schedule Trip', 'This will open trip scheduling');
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'active': case 'on-time': return '🟢';
      case 'maintenance': case 'delayed': return '🟡';
      case 'inactive': case 'completed': return '🔵';
      case 'upcoming': return '⚪';
      default: return '⚫';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': case 'on-time': return '#4CAF50';
      case 'maintenance': case 'delayed': return '#FF9800';
      case 'inactive': case 'completed': return '#2196F3';
      case 'upcoming': return '#9C27B0';
      default: return '#666666';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>City Transport Co.</Text>
            <Text style={styles.companySubtitle}>Transporter Dashboard</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Text style={styles.notificationIcon}>🔔</Text>
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <Text style={styles.sectionTitle}>📊 Business Overview</Text>
        <View style={styles.statsContainer}>
          <StatCard
            icon="🚌"
            value={stats.totalBuses}
            label="Total Buses"
            sublabel={`${stats.activeBuses} active`}
            color="#4A90E2"
          />
          <StatCard
            icon="👤"
            value={stats.activeDrivers}
            label="Active Drivers"
            sublabel="Online/On-duty"
            color="#4CAF50"
          />
          <StatCard
            icon="💰"
            value={`₹${stats.todayRevenue.toLocaleString()}`}
            label="Today's Revenue"
            sublabel="+12% from yesterday"
            color="#FF9800"
          />
          <StatCard
            icon="📊"
            value={`${stats.onTimePerformance}%`}
            label="On-time"
            sublabel="Performance"
            color="#9C27B0"
          />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <QuickActionButton
            icon="🚌"
            title="Add Bus"
            color="#4A90E2"
            onPress={handleAddBus}
          />
          <QuickActionButton
            icon="👤"
            title="Add Driver"
            color="#4CAF50"
            onPress={handleAddDriver}
          />
          <QuickActionButton
            icon="📅"
            title="Schedule Trip"
            color="#FF9800"
            onPress={handleScheduleTrip}
          />
          <QuickActionButton
            icon="📢"
            title="Announce"
            color="#9C27B0"
            onPress={() => Alert.alert('Announcement', 'Send message to all drivers')}
          />
        </View>

        {/* Today's Trips */}
        <Text style={styles.sectionTitle}>📅 Today's Operations</Text>
        <View style={styles.tripsContainer}>
          {mockTrips.slice(0, 3).map((trip) => (
            <View key={trip.id} style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <Text style={styles.tripTime}>{trip.time}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
                  <Text style={styles.statusBadgeText}>
                    {getStatusIcon(trip.status)} {trip.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.tripRoute}>{trip.route}</Text>
              <View style={styles.tripDetails}>
                <Text style={styles.tripDetail}>🚌 {trip.bus}</Text>
                <Text style={styles.tripDetail}>👤 {trip.driver}</Text>
                <Text style={styles.tripDetail}>👥 {trip.passengers} passengers</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All Trips →</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Alerts */}
        <Text style={styles.sectionTitle}>🔔 Recent Alerts</Text>
        <View style={styles.alertsContainer}>
          {mockAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              message={alert.message}
              type={alert.type}
              timestamp={alert.timestamp}
            />
          ))}
        </View>

        {/* Live Stats */}
        <Text style={styles.sectionTitle}>📈 Live Statistics</Text>
        <View style={styles.liveStatsContainer}>
          <View style={styles.liveStat}>
            <Text style={styles.liveStatValue}>38</Text>
            <Text style={styles.liveStatLabel}>Active Trips</Text>
          </View>
          <View style={styles.liveStat}>
            <Text style={styles.liveStatValue}>5</Text>
            <Text style={styles.liveStatLabel}>Delayed</Text>
          </View>
          <View style={styles.liveStat}>
            <Text style={styles.liveStatValue}>12</Text>
            <Text style={styles.liveStatLabel}>Upcoming</Text>
          </View>
          <View style={styles.liveStat}>
            <Text style={styles.liveStatValue}>₹1.25L</Text>
            <Text style={styles.liveStatLabel}>Today</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Reusable Components
const StatCard = ({ icon, value, label, sublabel, color }: any) => (
  <View style={styles.statCard}>
    <Text style={[styles.statIcon, { color }]}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statSubLabel}>{sublabel}</Text>
  </View>
);

const QuickActionButton = ({ icon, title, color, onPress }: any) => (
  <TouchableOpacity
    style={[styles.actionButton, { backgroundColor: color }]}
    onPress={onPress}
  >
    <Text style={styles.actionIcon}>{icon}</Text>
    <Text style={styles.actionText}>{title}</Text>
  </TouchableOpacity>
);

const AlertCard = ({ message, type, timestamp }: any) => {
  const getAlertIcon = () => {
    switch(type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  return (
    <View style={styles.alertCard}>
      <Text style={styles.alertIcon}>{getAlertIcon()}</Text>
      <View style={styles.alertContent}>
        <Text style={styles.alertMessage}>{message}</Text>
        <Text style={styles.alertTimestamp}>{timestamp}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#1A237E',
  },
  companyName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  companySubtitle: {
    fontSize: 14,
    color: '#E0E0E0',
    marginTop: 2,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#F44336',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A237E',
    marginTop: 24,
    marginBottom: 16,
    marginLeft: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  statSubLabel: {
    fontSize: 12,
    color: '#999999',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  actionButton: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tripsContainer: {
    paddingHorizontal: 16,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tripRoute: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 12,
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripDetail: {
    fontSize: 12,
    color: '#666666',
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  alertsContainer: {
    paddingHorizontal: 16,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 4,
  },
  alertTimestamp: {
    fontSize: 12,
    color: '#999999',
  },
  liveStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 30,
  },
  liveStat: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '23%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  liveStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 4,
  },
  liveStatLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
});

export default DashboardScreen;
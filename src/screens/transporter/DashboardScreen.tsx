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
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Types
type Bus = {
  id: string;
  number: string;
  registration: string;
  status: 'active' | 'maintenance' | 'inactive';
  driver?: string;
  lastMaintenance: string;
};

type Driver = {
  id: string;
  name: string;
  contact: string;
  status: 'on-duty' | 'online' | 'offline';
  busAssigned?: string;
  rating: number;
};

type Trip = {
  id: string;
  time: string;
  route: string;
  bus: string;
  driver: string;
  status: 'on-time' | 'delayed' | 'upcoming' | 'completed';
  passengers: number;
};

type AlertType = {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  timestamp: string;
};

type Notification = {
  id: string;
  type: 'maintenance' | 'success' | 'warning' | 'info' | 'emergency';
  message: string;
  time: string;
  read: boolean;
};

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

const mockAlerts: AlertType[] = [
  { id: '1', message: 'Bus B-005 maintenance due tomorrow', type: 'warning', timestamp: '2 hours ago' },
  { id: '2', message: 'Driver Ahmed Khan completed 50 trips today', type: 'success', timestamp: '4 hours ago' },
  { id: '3', message: 'Route R-003 delayed by 15 minutes', type: 'error', timestamp: '1 hour ago' },
  { id: '4', message: 'Monthly revenue target achieved', type: 'success', timestamp: '1 day ago' },
];

const DashboardScreen = () => {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [announceModalVisible, setAnnounceModalVisible] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');

  const [stats, setStats] = useState({
    totalBuses: 0,
    activeBuses: 0,
    activeDrivers: 0,
    todayRevenue: 0,
    todayTrips: 0,
    onTimePerformance: 0,
  });

  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', type: 'maintenance', message: 'Bus B-005 maintenance due tomorrow', time: '2 hours ago', read: false },
    { id: '2', type: 'success', message: 'Driver Ahmed Khan completed 50 trips', time: '4 hours ago', read: false },
    { id: '3', type: 'warning', message: 'Route R-003 delayed by 15 minutes', time: '1 hour ago', read: true },
    { id: '4', type: 'info', message: 'Monthly revenue target achieved', time: '1 day ago', read: true },
    { id: '5', type: 'emergency', message: 'Bus B-001 needs immediate attention', time: '30 mins ago', read: false },
  ]);

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

  // QUICK ACTIONS FUNCTIONS
  const handleQuickAction = (action: string) => {
    switch(action) {
      case 'Add Bus':
        navigation.navigate('Fleet', {
            screen: 'FleetList',
            params: {
              openAddBus: true
            }
          })
        break;

      case 'Add Driver':
        navigation.navigate('Drivers', {
            screen: 'DriverList',
            params: { openAddDriver: true }
          })
        break;

      case 'Schedule Trip':
        navigation.navigate('Operations', {
          screen: 'ScheduleTripScreen',
          params: { mode: 'add' }
        });
        break;

      case 'Send Announcement':
        setAnnounceModalVisible(true);
        break;

      case 'Generate Report':
        navigation.navigate('ReportsProfile');
        break;

      default:
        Alert.alert('Coming Soon', 'This feature will be available soon');
    }
  };

  // NOTIFICATIONS FUNCTIONS
  const handleNotificationPress = (notificationId: string) => {
    setNotifications(notifications.map(notif =>
      notif.id === notificationId ? { ...notif, read: true } : notif
    ));

    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      Alert.alert(
        'Notification',
        notification.message,
        [
          { text: 'OK', style: 'default' },
          { text: 'View Details', onPress: () => handleNotificationAction(notification.type, notification.message) }
        ]
      );
    }
  };

  const handleNotificationAction = (type: string, message: string) => {
    switch(type) {
      case 'maintenance':
        Alert.alert('Maintenance', 'Redirecting to Fleet Management...');
        break;
      case 'warning':
        Alert.alert('Delay Alert', 'Redirecting to Operations...');
        break;
      case 'emergency':
        Alert.alert('EMERGENCY', 'Calling driver immediately...');
        break;
      default:
        Alert.alert('Notification', message);
    }
  };

  const handleDismissAlert = (notificationId: string) => {
    setNotifications(notifications.filter(n => n.id !== notificationId));
    Alert.alert('Dismissed', 'Alert removed from list');
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
    Alert.alert('Success', 'All notifications marked as read');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // ANNOUNCEMENT FUNCTION
  const handleSendAnnouncement = () => {
    if (!announcementText.trim()) {
      Alert.alert('Error', 'Please enter announcement text');
      return;
    }

    Alert.alert(
      'Confirm Announcement',
      `Send this announcement to all drivers?\n\n"${announcementText}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            Alert.alert('Success', 'Announcement sent to all drivers');
            setAnnouncementText('');
            setAnnounceModalVisible(false);
          }
        }
      ]
    );
  };

  // VIEW ALL TRIPS FUNCTION
  const handleViewAllTrips = () => {
    navigation.navigate('Operations', {
      initial: false,
      screen: 'Schedule'
    });
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

  const handleAlertAction = (alertType: string, alertMessage: string) => {
    switch(alertType) {
      case 'warning':
        Alert.alert(
          'Maintenance Required',
          'What would you like to do?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Schedule Maintenance', onPress: () => {
              Alert.alert('Scheduled', 'Maintenance scheduled for tomorrow.');
            }},
            { text: 'Contact Mechanic', onPress: () => {
              Alert.alert('Contact', 'Calling mechanic...');
            }}
          ]
        );
        break;

      case 'error':
        Alert.alert(
          'Emergency Action',
          'Immediate attention required!',
          [
            { text: 'Call Driver', onPress: () => {
              Alert.alert('Calling', 'Calling driver...');
            }},
            { text: 'Send Replacement', onPress: () => {
              Alert.alert('Replacement', 'Replacement bus dispatched.');
            }},
            { text: 'Notify Passengers', onPress: () => {
              Alert.alert('Notification', 'Passengers notified about delay.');
            }}
          ]
        );
        break;

      case 'success':
        Alert.alert(
          'Success Action',
          'Great job!',
          [
            { text: 'Send Bonus', onPress: () => {
              Alert.alert('Bonus', 'Bonus sent to driver.');
            }},
            { text: 'Share Achievement', onPress: () => {
              Alert.alert('Shared', 'Achievement shared with team.');
            }}
          ]
        );
        break;

      default:
        Alert.alert('Info', alertMessage);
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
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => setShowNotifications(!showNotifications)}
          >
            <Text style={styles.notificationIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Notifications Dropdown Modal */}
        {showNotifications && (
          <View style={styles.notificationsDropdown}>
            <View style={styles.notificationsHeader}>
              <Text style={styles.notificationsTitle}>Notifications</Text>
              <TouchableOpacity onPress={markAllAsRead}>
                <Text style={styles.markAllReadText}>Mark all read</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.notificationsList}>
              {notifications.map(notification => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationItem,
                    !notification.read && styles.unreadNotification
                  ]}
                  onPress={() => handleNotificationPress(notification.id)}
                >
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationMessage}>{notification.message}</Text>
                    <Text style={styles.notificationTime}>{notification.time}</Text>
                  </View>
                  {!notification.read && <View style={styles.unreadDot} />}
                  <TouchableOpacity
                    style={styles.dismissButton}
                    onPress={() => handleDismissAlert(notification.id)}
                  >
                    <Text style={styles.dismissText}>×</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.viewAllNotifications}
              onPress={() => {
                setShowNotifications(false);
                navigation.navigate('Dashboard', {
                  screen: 'Notifications'
                });
              }}
            >
              <Text style={styles.viewAllText}>View All Notifications →</Text>
            </TouchableOpacity>

          </View>
        )}

        {/* Quick Stats */}
        <Text style={styles.sectionTitle}>📊 Business Overview</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={[styles.statIcon, { color: '#4A90E2' }]}>🚌</Text>
            <Text style={styles.statValue}>{stats.totalBuses}</Text>
            <Text style={styles.statLabel}>Total Buses</Text>
            <Text style={styles.statSubLabel}>{stats.activeBuses} active</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statIcon, { color: '#4CAF50' }]}>👤</Text>
            <Text style={styles.statValue}>{stats.activeDrivers}</Text>
            <Text style={styles.statLabel}>Active Drivers</Text>
            <Text style={styles.statSubLabel}>Online/On-duty</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statIcon, { color: '#FF9800' }]}>💰</Text>
            <Text style={styles.statValue}>₹{stats.todayRevenue.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Today's Revenue</Text>
            <Text style={styles.statSubLabel}>+12% from yesterday</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statIcon, { color: '#9C27B0' }]}>📊</Text>
            <Text style={styles.statValue}>{stats.onTimePerformance}%</Text>
            <Text style={styles.statLabel}>On-time</Text>
            <Text style={styles.statSubLabel}>Performance</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4A90E2' }]}
            onPress={() => handleQuickAction('Add Bus')}
          >
            <Text style={styles.actionIcon}>🚌</Text>
            <Text style={styles.actionText}>Add Bus</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => handleQuickAction('Add Driver')}
          >
            <Text style={styles.actionIcon}>👤</Text>
            <Text style={styles.actionText}>Add Driver</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
            onPress={() => handleQuickAction('Schedule Trip')}
          >
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionText}>Schedule Trip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#9C27B0' }]}
            onPress={() => handleQuickAction('Send Announcement')}
          >
            <Text style={styles.actionIcon}>📢</Text>
            <Text style={styles.actionText}>Announce</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#607D8B' }]}
            onPress={() => handleQuickAction('Generate Report')}
          >
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionText}>Report</Text>
          </TouchableOpacity>
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
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={handleViewAllTrips}
          >
            <Text style={styles.viewAllText}>View All Trips →</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Alerts */}
        <Text style={styles.sectionTitle}>🔔 Recent Alerts</Text>
        <View style={styles.alertsContainer}>
          {mockAlerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={styles.alertCard}
              onPress={() => handleAlertAction(alert.type, alert.message)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.alertIcon,
                alert.type === 'success' && styles.successIcon,
                alert.type === 'warning' && styles.warningIcon,
                alert.type === 'error' && styles.errorIcon,
                alert.type === 'info' && styles.infoIcon,
              ]}>
                {alert.type === 'success' ? '✅' :
                 alert.type === 'warning' ? '⚠️' :
                 alert.type === 'error' ? '❌' : 'ℹ️'}
              </Text>
              <View style={styles.alertContent}>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={styles.alertTimestamp}>{alert.timestamp}</Text>
              </View>
              <TouchableOpacity
                style={styles.alertDismiss}
                onPress={() => Alert.alert('Dismiss', 'This alert will be removed')}
              >
                <Text style={styles.alertDismissText}>×</Text>
              </TouchableOpacity>
            </TouchableOpacity>
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

      {/* Announcement Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={announceModalVisible}
        onRequestClose={() => {
          setAnnouncementText('');
          setAnnounceModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Send Announcement</Text>
            <Text style={styles.modalSubtitle}>Message will be sent to all drivers</Text>

            <TextInput
              style={styles.announcementInput}
              placeholder="Type your announcement here..."
              placeholderTextColor="#999"
              value={announcementText}
              onChangeText={setAnnouncementText}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setAnnouncementText('');
                  setAnnounceModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.sendButton]}
                onPress={handleSendAnnouncement}
              >
                <Text style={styles.sendButtonText}>Send Announcement</Text>
              </TouchableOpacity>
            </View>
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
  notificationsDropdown: {
    position: 'absolute',
    top: 70,
    right: 16,
    width: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    maxHeight: 400,
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  notificationsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A237E',
  },
  markAllReadText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  notificationsList: {
    maxHeight: 300,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  unreadNotification: {
    backgroundColor: '#F0F7FF',
  },
  notificationContent: {
    flex: 1,
    marginRight: 12,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
  dismissText: {
    fontSize: 20,
    color: '#999999',
    fontWeight: 'bold',
  },
  viewAllNotifications: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  viewAllText: {
    color: '#4A90E2',
    fontWeight: '600',
    fontSize: 14,
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
    width: '18%',
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
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 10,
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
  alertsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
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
  successIcon: {
    color: '#4CAF50',
  },
  warningIcon: {
    color: '#FF9800',
  },
  errorIcon: {
    color: '#F44336',
  },
  infoIcon: {
    color: '#2196F3',
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
  alertDismiss: {
    padding: 4,
    marginLeft: 8,
  },
  alertDismissText: {
    fontSize: 20,
    color: '#999999',
    fontWeight: '300',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
  },
  announcementInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333333',
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    marginLeft: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default DashboardScreen;
// screens/transporter/DashboardScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { StackNavigationProp } from '@react-navigation/stack';

// Types
import {
  Bus,
  Driver,
  Trip,
  Notification,
  Alert as AlertType,
  DashboardStats
} from '../../types/transporter.types';
import { TransporterStackParamList } from '../../navigation/TransporterNavigator';

// Components
import { StatCard } from '../../components/transporter/StatCard';
import { TripCard } from '../../components/transporter/TripCard';
import { NotificationDropdown } from '../../components/transporter/NotificationDropdown';

// Constants
import { COLORS, SIZES, FONTS, SHADOWS } from '../../constants/theme';

type DashboardScreenNavigationProp = StackNavigationProp<TransporterStackParamList, 'Dashboard'>;

// Quick Actions Data
const QUICK_ACTIONS = [
  { id: 'addBus', icon: '🚌', label: 'Add Bus', color: COLORS.secondary, action: 'Add Bus' },
  { id: 'addDriver', icon: '👤', label: 'Add Driver', color: COLORS.success, action: 'Add Driver' },
  { id: 'schedule', icon: '📅', label: 'Schedule', color: COLORS.warning, action: 'Schedule Trip' },
  { id: 'announce', icon: '📢', label: 'Announce', color: COLORS.purple, action: 'Send Announcement' },
  { id: 'report', icon: '📊', label: 'Report', color: COLORS.grey, action: 'Generate Report' },
];

const DashboardScreen = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [announceModalVisible, setAnnounceModalVisible] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [transporterName, setTransporterName] = useState('');

  // Data states
  const [stats, setStats] = useState<DashboardStats>({
    totalBuses: 0,
    activeBuses: 0,
    maintenanceBuses: 0,
    inactiveBuses: 0,
    totalDrivers: 0,
    activeDrivers: 0,
    onlineDrivers: 0,
    offlineDrivers: 0,
    todayRevenue: 0,
    todayTrips: 0,
    completedTrips: 0,
    delayedTrips: 0,
    upcomingTrips: 0,
    onTimePerformance: 0,
    averageRating: 0,
  });

  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [liveStats, setLiveStats] = useState({
    activeTrips: 0,
    delayedTrips: 0,
    upcomingTrips: 0,
    todayRevenue: 0,
  });

  const user = auth().currentUser;

  // Helper functions (memoized)
  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString('en-PK', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return `PKR ${amount.toLocaleString('en-PK')}`;
  }, []);

  const getTimeAgo = useCallback((date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour ago`;
    return `${diffDays} day ago`;
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'active':
      case 'on-time':
        return '🟢';
      case 'maintenance':
      case 'delayed':
        return '🟡';
      case 'inactive':
      case 'completed':
        return '🔵';
      case 'upcoming':
        return '⚪';
      default:
        return '⚫';
    }
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'active':
      case 'on-time':
        return COLORS.success;
      case 'maintenance':
      case 'delayed':
        return COLORS.warning;
      case 'inactive':
      case 'completed':
        return COLORS.info;
      case 'upcoming':
        return COLORS.purple;
      default:
        return COLORS.textLight;
    }
  }, []);

  // Fetch transporter name
  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            const data = doc.data();
            setTransporterName(data?.fullName || data?.name || 'Transporter');
          }
        },
        (error) => {
          console.error('Error fetching user data:', error);
        }
      );

    return () => unsubscribe();
  }, [user]);

  // Setup all listeners
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const unsubscribers = [
      setupBusesListener(),
      setupDriversListener(),
      setupTripsListener(),
      setupNotificationsListener(),
      setupAlertsListener(),
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [user]);

  // Listener functions
  const setupBusesListener = () => {
    if (!user) return () => {};

    return firestore()
      .collection('buses')
      .where('transporterId', '==', user.uid)
      .onSnapshot(
        (snapshot) => {
          const buses = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Bus[];

          setStats(prev => ({
            ...prev,
            totalBuses: buses.length,
            activeBuses: buses.filter(b => b.status === 'active').length,
            maintenanceBuses: buses.filter(b => b.status === 'maintenance').length,
            inactiveBuses: buses.filter(b => b.status === 'inactive').length,
          }));
        },
        (error) => console.error('Buses listener error:', error)
      );
  };

  const setupDriversListener = () => {
    if (!user) return () => {};

    return firestore()
      .collection('drivers')
      .where('transporterId', '==', user.uid)
      .onSnapshot(
        (snapshot) => {
          const drivers = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Driver[];

          const avgRating = drivers.length > 0
            ? drivers.reduce((sum, d) => sum + (d.rating || 0), 0) / drivers.length
            : 0;

          setStats(prev => ({
            ...prev,
            totalDrivers: drivers.length,
            activeDrivers: drivers.filter(d => d.status === 'on-duty').length,
            onlineDrivers: drivers.filter(d => d.status === 'online').length,
            offlineDrivers: drivers.filter(d => d.status === 'offline').length,
            averageRating: Math.round(avgRating * 10) / 10,
          }));
        },
        (error) => console.error('Drivers listener error:', error)
      );
  };

  const setupTripsListener = () => {
    if (!user) return () => {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return firestore()
      .collection('trips')
      .where('transporterId', '==', user.uid)
      .where('date', '>=', today)
      .where('date', '<', tomorrow)
      .orderBy('date', 'asc')
      .onSnapshot(
        (snapshot) => {
          const trips = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Trip[];

          // Sort trips for display
          const sortedTrips = [...trips].sort((a, b) => {
            if (a.status === 'upcoming' && b.status !== 'upcoming') return -1;
            if (a.status !== 'upcoming' && b.status === 'upcoming') return 1;
            const timeA = a.time?.toDate?.() || new Date();
            const timeB = b.time?.toDate?.() || new Date();
            return timeA.getTime() - timeB.getTime();
          });

          setRecentTrips(sortedTrips.slice(0, 5));

          // Calculate stats
          const todayTrips = trips.length;
          const completedTrips = trips.filter(t => t.status === 'completed').length;
          const delayedTrips = trips.filter(t => t.status === 'delayed').length;
          const upcomingTrips = trips.filter(t => t.status === 'upcoming').length;
          const onTimeTrips = trips.filter(t => t.status === 'on-time').length;
          const todayRevenue = trips.reduce((sum, t) => sum + (t.revenue || 0), 0);
          const activeTrips = trips.filter(t =>
            t.status === 'on-time' || t.status === 'delayed'
          ).length;

          setStats(prev => ({
            ...prev,
            todayTrips,
            completedTrips,
            delayedTrips,
            upcomingTrips,
            todayRevenue,
            onTimePerformance: todayTrips > 0
              ? Math.round(((onTimeTrips + completedTrips) / todayTrips) * 100)
              : 0,
          }));

          setLiveStats({
            activeTrips,
            delayedTrips,
            upcomingTrips,
            todayRevenue,
          });

          setLoading(false);
        },
        (error) => {
          console.error('Trips listener error:', error);
          setLoading(false);
        }
      );
  };

  const setupNotificationsListener = () => {
    if (!user) return () => {};

    return firestore()
      .collection('notifications')
      .where('transporterId', '==', user.uid)
      .orderBy('time', 'desc')
      .limit(20)
      .onSnapshot(
        (snapshot) => {
          const notifs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Notification[];
          setNotifications(notifs);
        },
        (error) => console.error('Notifications listener error:', error)
      );
  };

  const setupAlertsListener = () => {
    if (!user) return () => {};

    return firestore()
      .collection('alerts')
      .where('transporterId', '==', user.uid)
      .where('acknowledged', '==', false)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .onSnapshot(
        (snapshot) => {
          const alertsList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as AlertType[];
          setAlerts(alertsList);
        },
        (error) => console.error('Alerts listener error:', error)
      );
  };

  // Manual refresh (re-fetch)
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Listeners automatically update, just add small delay for UX
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Quick Actions
  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'Add Bus':
        navigation.navigate('Fleet', { screen: 'AddBus' });
        break;
      case 'Add Driver':
        navigation.navigate('Drivers', { screen: 'AddDriver' });
        break;
      case 'Schedule Trip':
        navigation.navigate('Operations', { screen: 'ScheduleTrip' });
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
  }, [navigation]);

  // Send Announcement
  const handleSendAnnouncement = useCallback(async () => {
    if (!announcementText.trim()) {
      Alert.alert('Error', 'Please enter announcement text');
      return;
    }

    if (!user) return;

    try {
      const driversSnapshot = await firestore()
        .collection('drivers')
        .where('transporterId', '==', user.uid)
        .get();

      const batch = firestore().batch();
      const timestamp = firestore.FieldValue.serverTimestamp();

      driversSnapshot.docs.forEach((driverDoc) => {
        const notificationRef = firestore().collection('notifications').doc();
        batch.set(notificationRef, {
          driverId: driverDoc.id,
          transporterId: user.uid,
          type: 'info',
          title: 'New Announcement',
          message: announcementText,
          time: timestamp,
          read: false,
          actionRequired: false,
        });
      });

      const announcementRef = firestore().collection('announcements').doc();
      batch.set(announcementRef, {
        transporterId: user.uid,
        message: announcementText,
        sentTo: driversSnapshot.size,
        time: timestamp,
      });

      await batch.commit();

      Alert.alert('Success', `Announcement sent to ${driversSnapshot.size} drivers`);
      setAnnouncementText('');
      setAnnounceModalVisible(false);
    } catch (error) {
      console.error('Error sending announcement:', error);
      Alert.alert('Error', 'Failed to send announcement. Please try again.');
    }
  }, [user, announcementText]);

  // Notification handlers
  const handleNotificationPress = useCallback(async (notification: Notification) => {
    if (!notification.read) {
      try {
        await firestore()
          .collection('notifications')
          .doc(notification.id)
          .update({ read: true });

        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Handle navigation based on type
    switch (notification.type) {
      case 'maintenance':
        if (notification.busId) {
          navigation.navigate('Fleet', {
            screen: 'BusDetails',
            params: { busId: notification.busId },
          });
        }
        break;
      case 'emergency':
        Alert.alert('Emergency Alert', notification.message, [
          { text: 'Call Driver', onPress: () => Alert.alert('Calling', 'Driver notified') },
          { text: 'View Details', onPress: () => console.log('View details') },
        ]);
        break;
      default:
        Alert.alert(notification.title, notification.message);
    }
  }, [navigation]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const batch = firestore().batch();
      notifications
        .filter(n => !n.read)
        .forEach(notification => {
          const ref = firestore().collection('notifications').doc(notification.id);
          batch.update(ref, { read: true });
        });

      await batch.commit();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [user, notifications]);

  const handleDismissNotification = useCallback(async (notificationId: string) => {
    try {
      await firestore()
        .collection('notifications')
        .doc(notificationId)
        .delete();

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  }, []);

  // Alert handlers
  const handleAlertPress = useCallback(async (alert: AlertType) => {
    try {
      await firestore()
        .collection('alerts')
        .doc(alert.id)
        .update({ acknowledged: true });

      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }

    // Handle alert action
    switch (alert.type) {
      case 'warning':
        Alert.alert('Maintenance Required', alert.message, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Schedule Maintenance',
            onPress: () => navigation.navigate('Fleet', { screen: 'Maintenance' }),
          },
        ]);
        break;
      case 'error':
        Alert.alert('Emergency Action Required', alert.message, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Replacement',
            onPress: () => Alert.alert('Replacement', 'Replacement bus dispatched'),
          },
        ]);
        break;
      default:
        Alert.alert('Info', alert.message);
    }
  }, [navigation]);

  // Render functions for FlatList
  const renderHeader = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.companyName}>ZUGO Transport</Text>
          <Text style={styles.companySubtitle}>{transporterName}</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => setShowNotifications(true)}
        >
          <Text style={styles.notificationIcon}>🔔</Text>
          {notifications.filter(n => !n.read).length > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {notifications.filter(n => !n.read).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <Text style={styles.sectionTitle}>📊 Business Overview</Text>
      <View style={styles.statsContainer}>
        <StatCard
          icon="🚌"
          value={stats.totalBuses}
          label="Total Buses"
          subLabel={`${stats.activeBuses} active • ${stats.maintenanceBuses} maintenance`}
          color={COLORS.secondary}
        />
        <StatCard
          icon="👤"
          value={stats.activeDrivers}
          label="On Duty"
          subLabel={`${stats.onlineDrivers} online • ${stats.totalDrivers} total`}
          color={COLORS.success}
        />
        <StatCard
          icon="💰"
          value={formatCurrency(stats.todayRevenue).replace('PKR ', '')}
          label="Today's Revenue"
          subLabel={`${stats.todayTrips} trips today`}
          color={COLORS.warning}
        />
        <StatCard
          icon="⭐"
          value={`${stats.onTimePerformance}%`}
          label="On-time"
          subLabel={`${stats.averageRating} avg rating`}
          color={COLORS.purple}
        />
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
      <View style={styles.actionsContainer}>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.actionButton, { backgroundColor: action.color }]}
            onPress={() => handleQuickAction(action.action)}
          >
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Today's Trips Title */}
      <Text style={styles.sectionTitle}>📅 Today's Operations</Text>
    </>
  );

  const renderTripItem = ({ item }: { item: Trip }) => (
    <TripCard
      trip={item}
      onPress={() => navigation.navigate('Operations', {
        screen: 'TripDetails',
        params: { tripId: item.id }
      })}
      formatTime={formatTime}
      formatCurrency={formatCurrency}
      getStatusColor={getStatusColor}
      getStatusIcon={getStatusIcon}
    />
  );

  const renderFooter = () => (
    <>
      {/* View All Trips Button */}
      <TouchableOpacity
        style={styles.viewAllButton}
        onPress={() => navigation.navigate('Operations', { screen: 'TripsList' })}
      >
        <Text style={styles.viewAllText}>View All Trips →</Text>
      </TouchableOpacity>

      {/* Alerts */}
      {alerts.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🔔 Active Alerts</Text>
          <View style={styles.alertsContainer}>
            {alerts.map((alert) => {
              const alertTime = alert.timestamp?.toDate
                ? alert.timestamp.toDate()
                : new Date(alert.timestamp);

              return (
                <TouchableOpacity
                  key={alert.id}
                  style={[styles.alertCard, SHADOWS.small]}
                  onPress={() => handleAlertPress(alert)}
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
                    <Text style={styles.alertTime}>{getTimeAgo(alertTime)}</Text>
                  </View>
                  <Text style={styles.alertAction}>Tap to handle →</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* Live Stats */}
      <Text style={styles.sectionTitle}>📈 Live Statistics</Text>
      <View style={styles.liveStatsContainer}>
        <View style={[styles.liveStat, SHADOWS.small]}>
          <Text style={styles.liveStatValue}>{liveStats.activeTrips}</Text>
          <Text style={styles.liveStatLabel}>Active Trips</Text>
        </View>
        <View style={[styles.liveStat, SHADOWS.small]}>
          <Text style={styles.liveStatValue}>{liveStats.delayedTrips}</Text>
          <Text style={styles.liveStatLabel}>Delayed</Text>
        </View>
        <View style={[styles.liveStat, SHADOWS.small]}>
          <Text style={styles.liveStatValue}>{liveStats.upcomingTrips}</Text>
          <Text style={styles.liveStatLabel}>Upcoming</Text>
        </View>
        <View style={[styles.liveStat, SHADOWS.small]}>
          <Text style={styles.liveStatValue}>
            {formatCurrency(liveStats.todayRevenue).replace('PKR ', '')}
          </Text>
          <Text style={styles.liveStatLabel}>Revenue</Text>
        </View>
      </View>
    </>
  );

  const renderEmptyTrips = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No trips scheduled for today</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={recentTrips}
        renderItem={renderTripItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyTrips}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      {/* Notifications Dropdown */}
      <NotificationDropdown
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        unreadCount={notifications.filter(n => !n.read).length}
        onNotificationPress={handleNotificationPress}
        onDismiss={handleDismissNotification}
        onMarkAllRead={markAllAsRead}
        onViewAll={() => {
          setShowNotifications(false);
          navigation.navigate('Notifications');
        }}
        getTimeAgo={getTimeAgo}
      />

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
          <View style={[styles.modalContainer, SHADOWS.large]}>
            <Text style={styles.modalTitle}>Send Announcement</Text>
            <Text style={styles.modalSubtitle}>
              Message will be sent to all drivers
            </Text>

            <TextInput
              style={styles.announcementInput}
              placeholder="Type your announcement here..."
              placeholderTextColor={COLORS.textLighter}
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
                <Text style={styles.sendButtonText}>Send to All Drivers</Text>
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
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingBottom: SIZES.xxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SIZES.sm,
    fontSize: FONTS.medium,
    color: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.lg,
    backgroundColor: COLORS.primary,
  },
  companyName: {
    fontSize: FONTS.xlarge,
    fontWeight: '700',
    color: COLORS.white,
  },
  companySubtitle: {
    fontSize: FONTS.regular,
    color: COLORS.greyLight,
    marginTop: 2,
  },
  notificationButton: {
    position: 'relative',
    padding: SIZES.xs,
  },
  notificationIcon: {
    fontSize: 24,
    color: COLORS.white,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: FONTS.large,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: SIZES.xl,
    marginBottom: SIZES.md,
    marginLeft: SIZES.md,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    marginBottom: SIZES.xs,
  },
  actionButton: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: SIZES.md,
    marginBottom: SIZES.xs,
  },
  viewAllText: {
    color: COLORS.secondary,
    fontWeight: '600',
    fontSize: FONTS.regular,
  },
  emptyContainer: {
    padding: SIZES.xxxl,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    marginHorizontal: SIZES.md,
  },
  emptyText: {
    color: COLORS.textLighter,
    fontSize: FONTS.regular,
  },
  alertsContainer: {
    paddingHorizontal: SIZES.md,
    marginBottom: SIZES.md,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.sm,
    marginBottom: SIZES.xs,
  },
  alertIcon: {
    fontSize: 20,
    marginRight: SIZES.sm,
  },
  successIcon: {
    color: COLORS.success,
  },
  warningIcon: {
    color: COLORS.warning,
  },
  errorIcon: {
    color: COLORS.danger,
  },
  infoIcon: {
    color: COLORS.info,
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    fontSize: FONTS.regular,
    color: COLORS.text,
    marginBottom: 2,
  },
  alertTime: {
    fontSize: 11,
    color: COLORS.textLighter,
  },
  alertAction: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '600',
    marginLeft: SIZES.xs,
  },
  liveStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    marginBottom: SIZES.xxxl,
  },
  liveStat: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.sm,
    width: '23%',
    alignItems: 'center',
  },
  liveStatValue: {
    fontSize: FONTS.large,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  liveStatLabel: {
    fontSize: 10,
    color: COLORS.textLight,
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
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.lg,
  },
  modalTitle: {
    fontSize: FONTS.xlarge,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: FONTS.regular,
    color: COLORS.textLight,
    marginBottom: SIZES.lg,
  },
  announcementInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    padding: SIZES.sm,
    fontSize: FONTS.medium,
    color: COLORS.text,
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: SIZES.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.xs,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.greyLight,
    marginRight: SIZES.xs,
  },
  sendButton: {
    backgroundColor: COLORS.success,
    marginLeft: SIZES.xs,
  },
  cancelButtonText: {
    fontSize: FONTS.medium,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  sendButtonText: {
    fontSize: FONTS.medium,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default DashboardScreen;
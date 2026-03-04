import React, { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// Types
type Bus = {
  id: string;
  number: string;
  registration: string;
  status: 'active' | 'maintenance' | 'inactive';
  driver?: string;
  driverId?: string;
  lastMaintenance: string;
  nextMaintenance: string;
  capacity: number;
};

type Driver = {
  id: string;
  name: string;
  contact: string;
  status: 'on-duty' | 'online' | 'offline';
  busAssigned?: string;
  busId?: string;
  rating: number;
  totalTrips: number;
};

type Trip = {
  id: string;
  time: string;
  route: string;
  routeId: string;
  bus: string;
  busId: string;
  driver: string;
  driverId: string;
  status: 'on-time' | 'delayed' | 'upcoming' | 'completed';
  passengers: number;
  revenue: number;
  departureTime: string;
  arrivalTime: string;
};

type AlertType = {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  timestamp: any;
  acknowledged: boolean;
};

type Notification = {
  id: string;
  type: 'maintenance' | 'success' | 'warning' | 'info' | 'emergency';
  message: string;
  time: string;
  read: boolean;
  createdAt: any;
  actionable: boolean;
  actionData?: any;
};

const DashboardScreen = () => {
  const navigation = useNavigation();
  const user = auth().currentUser;
  const transporterId = user?.uid;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [announceModalVisible, setAnnounceModalVisible] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [transporterName, setTransporterName] = useState('');

  // Data states
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Stats state
  const [stats, setStats] = useState({
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
    onTimePerformance: 0,
    completedTrips: 0,
    delayedTrips: 0,
    upcomingTrips: 0,
    averageRating: 0,
  });

  // Live stats
  const [liveStats, setLiveStats] = useState({
    activeTrips: 0,
    delayedTrips: 0,
    upcomingTrips: 0,
    todayRevenue: 0,
  });

  // Fetch all data from Firebase
  useEffect(() => {
    if (!transporterId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Get transporter name
        const userDoc = await firestore().collection('users').doc(transporterId).get();
        if (userDoc.exists) {
          setTransporterName(userDoc.data()?.fullName || userDoc.data()?.companyName || 'Transporter');
        }

        // Set up listeners
        const unsubscribers = [
          setupBusesListener(),
          setupDriversListener(),
          setupTripsListener(),
          setupAlertsListener(),
          setupNotificationsListener(),
        ];

        // Cleanup on unmount
        return () => {
          unsubscribers.forEach(unsubscribe => unsubscribe());
        };

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        Alert.alert('Error', 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [transporterId]);

  // Setup listeners
  const setupBusesListener = () => {
    return firestore()
      .collection('buses')
      .where('transporterId', '==', transporterId)
      .onSnapshot(
        (snapshot) => {
          const busesList: Bus[] = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            busesList.push({
              id: doc.id,
              number: data.busNumber || data.number || '',
              registration: data.registration || '',
              status: data.status || 'inactive',
              driver: data.driverName || data.driver,
              driverId: data.driverId,
              lastMaintenance: data.lastMaintenance?.toDate?.()?.toLocaleDateString() || data.lastMaintenance || 'N/A',
              nextMaintenance: data.nextMaintenance?.toDate?.()?.toLocaleDateString() || data.nextMaintenance || 'N/A',
              capacity: data.capacity || 40,
            });
          });

          setBuses(busesList);

          // Update stats
          setStats(prev => ({
            ...prev,
            totalBuses: busesList.length,
            activeBuses: busesList.filter(b => b.status === 'active').length,
            maintenanceBuses: busesList.filter(b => b.status === 'maintenance').length,
            inactiveBuses: busesList.filter(b => b.status === 'inactive').length,
          }));
        },
        (error) => console.error('Buses listener error:', error)
      );
  };

  const setupDriversListener = () => {
    return firestore()
      .collection('drivers')
      .where('transporterId', '==', transporterId)
      .onSnapshot(
        (snapshot) => {
          const driversList: Driver[] = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            driversList.push({
              id: doc.id,
              name: data.fullName || data.name || '',
              contact: data.contactNumber || data.phone || '',
              status: data.status || 'offline',
              busAssigned: data.busNumber,
              busId: data.busId,
              rating: data.rating || 0,
              totalTrips: data.totalRides || 0,
            });
          });

          setDrivers(driversList);

          // Calculate average rating
          const avgRating = driversList.length > 0
            ? driversList.reduce((sum, d) => sum + d.rating, 0) / driversList.length
            : 0;

          setStats(prev => ({
            ...prev,
            totalDrivers: driversList.length,
            activeDrivers: driversList.filter(d => d.status === 'on-duty').length,
            onlineDrivers: driversList.filter(d => d.status === 'online').length,
            offlineDrivers: driversList.filter(d => d.status === 'offline').length,
            averageRating: Math.round(avgRating * 10) / 10,
          }));
        },
        (error) => console.error('Drivers listener error:', error)
      );
  };

  const setupTripsListener = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return firestore()
      .collection('trips')
      .where('transporterId', '==', transporterId)
      .where('date', '>=', today.toISOString().split('T')[0])
      .where('date', '<', tomorrow.toISOString().split('T')[0])
      .onSnapshot(
        (snapshot) => {
          const tripsList: Trip[] = [];
          let totalRevenue = 0;

          snapshot.forEach(doc => {
            const data = doc.data();
            const trip: Trip = {
              id: doc.id,
              time: data.departureTime || '',
              route: data.routeName || '',
              routeId: data.routeId || '',
              bus: data.busNumber || '',
              busId: data.busId || '',
              driver: data.driverName || '',
              driverId: data.driverId || '',
              status: mapTripStatus(data.status),
              passengers: data.bookedSeats || 0,
              revenue: data.revenue || 0,
              departureTime: data.departureTime || '',
              arrivalTime: data.arrivalTime || '',
            };
            tripsList.push(trip);
            totalRevenue += trip.revenue;
          });

          setTrips(tripsList);

          // Calculate stats
          const onTimeTrips = tripsList.filter(t => t.status === 'on-time').length;
          const delayedTrips = tripsList.filter(t => t.status === 'delayed').length;
          const completedTrips = tripsList.filter(t => t.status === 'completed').length;
          const upcomingTrips = tripsList.filter(t => t.status === 'upcoming').length;

          setStats(prev => ({
            ...prev,
            todayTrips: tripsList.length,
            todayRevenue: totalRevenue,
            onTimePerformance: tripsList.length > 0 ? Math.round((onTimeTrips / tripsList.length) * 100) : 0,
            completedTrips: completedTrips,
            delayedTrips: delayedTrips,
            upcomingTrips: upcomingTrips,
          }));

          setLiveStats({
            activeTrips: tripsList.filter(t => t.status === 'on-time' || t.status === 'delayed').length,
            delayedTrips: delayedTrips,
            upcomingTrips: upcomingTrips,
            todayRevenue: totalRevenue,
          });
        },
        (error) => console.error('Trips listener error:', error)
      );
  };

  const setupAlertsListener = () => {
    return firestore()
      .collection('alerts')
      .where('transporterId', '==', transporterId)
      .where('acknowledged', '==', false)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .onSnapshot(
        (snapshot) => {
          const alertsList: AlertType[] = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            alertsList.push({
              id: doc.id,
              message: data.message || '',
              type: data.type || 'info',
              timestamp: data.timestamp,
              acknowledged: data.acknowledged || false,
            });
          });
          setAlerts(alertsList);
        },
        (error) => console.error('Alerts listener error:', error)
      );
  };

  const setupNotificationsListener = () => {
    return firestore()
      .collection('notifications')
      .where('transporterId', '==', transporterId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .onSnapshot(
        (snapshot) => {
          const notifsList: Notification[] = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate?.() || new Date();
            const timeAgo = getTimeAgo(createdAt);

            notifsList.push({
              id: doc.id,
              type: data.type || 'info',
              message: data.message || '',
              time: timeAgo,
              read: data.read || false,
              createdAt: data.createdAt,
              actionable: data.actionable || false,
              actionData: data.actionData,
            });
          });
          setNotifications(notifsList);
        },
        (error) => console.error('Notifications listener error:', error)
      );
  };

  // Helper functions
  const mapTripStatus = (status: string): Trip['status'] => {
    switch (status) {
      case 'in-progress': return 'on-time';
      case 'delayed': return 'delayed';
      case 'scheduled': return 'upcoming';
      case 'completed': return 'completed';
      default: return 'upcoming';
    }
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour ago`;
    if (diffDays === 1) return 'yesterday';
    return `${diffDays} days ago`;
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

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Quick Actions
  const handleQuickAction = (action: string) => {
    switch(action) {
      case 'Add Bus':
        navigation.navigate('Fleet', {
          screen: 'AddBus'
        });
        break;

      case 'Add Driver':
        navigation.navigate('Drivers', {
          screen: 'AddDriver'
        });
        break;

      case 'Schedule Trip':
        navigation.navigate('Operations', {
          screen: 'ScheduleTrip'
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

  // Notification handlers
  const handleNotificationPress = async (notificationId: string) => {
    try {
      await firestore().collection('notifications').doc(notificationId).update({
        read: true
      });

      const notification = notifications.find(n => n.id === notificationId);
      if (notification?.actionable) {
        handleNotificationAction(notification);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationAction = (notification: Notification) => {
    switch(notification.type) {
      case 'maintenance':
        if (notification.actionData?.busId) {
          navigation.navigate('Fleet', {
            screen: 'BusDetails',
            params: { busId: notification.actionData.busId }
          });
        } else {
          navigation.navigate('Fleet');
        }
        break;

      case 'warning':
        navigation.navigate('Operations');
        break;

      case 'emergency':
        Alert.alert(
          '🚨 EMERGENCY',
          notification.message,
          [
            { text: 'Call Driver', onPress: () => Alert.alert('Calling', 'Connecting to driver...') },
            { text: 'View Details', onPress: () => navigation.navigate('Emergency') }
          ]
        );
        break;

      default:
        Alert.alert(notification.type, notification.message);
    }
  };

  const handleDismissAlert = async (notificationId: string) => {
    try {
      await firestore().collection('notifications').doc(notificationId).delete();
      Alert.alert('Dismissed', 'Alert removed');
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = firestore().batch();
      notifications
        .filter(n => !n.read)
        .forEach(notification => {
          const ref = firestore().collection('notifications').doc(notification.id);
          batch.update(ref, { read: true });
        });
      await batch.commit();
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Announcement handler
  const handleSendAnnouncement = async () => {
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
          onPress: async () => {
            try {
              // Get all drivers
              const driversSnapshot = await firestore()
                .collection('drivers')
                .where('transporterId', '==', transporterId)
                .get();

              // Create notifications for all drivers
              const batch = firestore().batch();
              driversSnapshot.docs.forEach(driverDoc => {
                const notifRef = firestore().collection('notifications').doc();
                batch.set(notifRef, {
                  driverId: driverDoc.id,
                  transporterId: transporterId,
                  type: 'info',
                  title: 'Announcement',
                  message: announcementText,
                  createdAt: firestore.FieldValue.serverTimestamp(),
                  read: false,
                  actionable: false,
                });
              });

              // Save announcement record
              const announceRef = firestore().collection('announcements').doc();
              batch.set(announceRef, {
                transporterId: transporterId,
                message: announcementText,
                sentTo: driversSnapshot.size,
                createdAt: firestore.FieldValue.serverTimestamp(),
              });

              await batch.commit();

              Alert.alert('Success', `Announcement sent to ${driversSnapshot.size} drivers`);
              setAnnouncementText('');
              setAnnounceModalVisible(false);
            } catch (error) {
              console.error('Error sending announcement:', error);
              Alert.alert('Error', 'Failed to send announcement');
            }
          }
        }
      ]
    );
  };

  // Alert handler
  const handleAlertAction = async (alert: AlertType) => {
    try {
      await firestore().collection('alerts').doc(alert.id).update({
        acknowledged: true
      });

      switch(alert.type) {
        case 'warning':
          Alert.alert(
            '⚠️ Maintenance Required',
            alert.message,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Schedule Maintenance', onPress: () => navigation.navigate('Fleet') },
            ]
          );
          break;

        case 'error':
          Alert.alert(
            '❌ Emergency',
            alert.message,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'View Details', onPress: () => navigation.navigate('Emergency') },
            ]
          );
          break;

        default:
          Alert.alert('Info', alert.message);
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  // View all trips
  const handleViewAllTrips = () => {
    navigation.navigate('Operations', {
      screen: 'Schedule'
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A237E" />
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.companyName}>ZUGO Transport</Text>
            <Text style={styles.companySubtitle}>{transporterName}</Text>
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
              {notifications.length > 0 ? (
                notifications.map(notification => (
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
                ))
              ) : (
                <View style={styles.emptyNotifications}>
                  <Text style={styles.emptyNotificationsText}>No notifications</Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.viewAllNotifications}
              onPress={() => {
                setShowNotifications(false);
                navigation.navigate('Notifications');
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
            <Text style={styles.statSubLabel}>{stats.onlineDrivers} online</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statIcon, { color: '#FF9800' }]}>💰</Text>
            <Text style={styles.statValue}>PKR {stats.todayRevenue.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Today's Revenue</Text>
            <Text style={styles.statSubLabel}>{stats.todayTrips} trips</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statIcon, { color: '#9C27B0' }]}>📊</Text>
            <Text style={styles.statValue}>{stats.onTimePerformance}%</Text>
            <Text style={styles.statLabel}>On-time</Text>
            <Text style={styles.statSubLabel}>{stats.averageRating} ★ rating</Text>
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
            <Text style={styles.actionText}>Schedule</Text>
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
          {trips.slice(0, 3).map((trip) => (
            <View key={trip.id} style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <Text style={styles.tripTime}>{trip.departureTime}</Text>
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
          {trips.length === 0 && (
            <View style={styles.emptyTrips}>
              <Text style={styles.emptyTripsText}>No trips scheduled for today</Text>
            </View>
          )}
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
          {alerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={styles.alertCard}
              onPress={() => handleAlertAction(alert)}
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
                <Text style={styles.alertTimestamp}>
                  {alert.timestamp?.toDate?.()?.toLocaleString() || 'Just now'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          {alerts.length === 0 && (
            <View style={styles.emptyAlerts}>
              <Text style={styles.emptyAlertsText}>No active alerts</Text>
            </View>
          )}
        </View>

        {/* Live Stats */}
        <Text style={styles.sectionTitle}>📈 Live Statistics</Text>
        <View style={styles.liveStatsContainer}>
          <View style={styles.liveStat}>
            <Text style={styles.liveStatValue}>{liveStats.activeTrips}</Text>
            <Text style={styles.liveStatLabel}>Active Trips</Text>
          </View>
          <View style={styles.liveStat}>
            <Text style={styles.liveStatValue}>{liveStats.delayedTrips}</Text>
            <Text style={styles.liveStatLabel}>Delayed</Text>
          </View>
          <View style={styles.liveStat}>
            <Text style={styles.liveStatValue}>{liveStats.upcomingTrips}</Text>
            <Text style={styles.liveStatLabel}>Upcoming</Text>
          </View>
          <View style={styles.liveStat}>
            <Text style={styles.liveStatValue}>PKR {liveStats.todayRevenue}</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#1A237E',
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
  emptyNotifications: {
    padding: 20,
    alignItems: 'center',
  },
  emptyNotificationsText: {
    fontSize: 14,
    color: '#999999',
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
  emptyTrips: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
  },
  emptyTripsText: {
    fontSize: 14,
    color: '#999999',
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
  emptyAlerts: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyAlertsText: {
    fontSize: 14,
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
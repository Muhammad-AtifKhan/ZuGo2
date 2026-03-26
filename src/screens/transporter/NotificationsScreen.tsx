// src/screens/transporter/NotificationsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Types
import { Notification, NotificationType, NotificationStats } from '../../types/notifications.types';

// Constants
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    critical: 0,
  });

  const user = auth().currentUser;

  // 🔥 REAL-TIME NOTIFICATIONS LISTENER
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const unsubscribe = firestore()
      .collection('notifications')
      .where('transporterId', '==', user.uid)
      .where('target', '==', 'transporter')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot(
        (snapshot) => {
          const notifList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            time: doc.data().createdAt, // Use createdAt as time
          })) as Notification[];

          setNotifications(notifList);

          // Calculate stats
          const total = notifList.length;
          const unread = notifList.filter(n => !n.read).length;
          const critical = notifList.filter(n =>
            n.type === 'emergency' || n.type === 'warning' || n.type === 'error'
          ).length;

          setStats({ total, unread, critical });
          setLoading(false);
          setRefreshing(false);
        },
        (error) => {
          console.error('Error fetching notifications:', error);
          Alert.alert('Error', 'Failed to load notifications');
          setLoading(false);
          setRefreshing(false);
        }
      );

    return () => unsubscribe();
  }, [user]);

  // Manual refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Listener will auto-update
  }, []);

  // Mark notifications as read when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Optional: You can mark all as read when user views the screen
      // markAllAsRead();
    }, [])
  );

  // ========== NOTIFICATION FUNCTIONS ==========
  const getNotificationIcon = (type: NotificationType): string => {
    switch(type) {
      case 'maintenance': return '🔧';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'emergency': return '🚨';
      case 'payment': return '💰';
      case 'driver': return '👤';
      case 'trip': return '🚌';
      case 'booking': return '🎫';
      case 'info': return 'ℹ️';
      default: return '🔔';
    }
  };

  const getNotificationColor = (type: NotificationType): string => {
    switch(type) {
      case 'maintenance': return COLORS.warning;
      case 'success': return COLORS.success;
      case 'warning': return COLORS.warning;
      case 'error': return COLORS.danger;
      case 'emergency': return COLORS.danger;
      case 'payment': return COLORS.success;
      case 'driver': return COLORS.info;
      case 'trip': return COLORS.secondary;
      case 'booking': return COLORS.purple;
      case 'info': return COLORS.info;
      default: return COLORS.textLight;
    }
  };

  const formatTime = (timestamp: any): string => {
    if (!timestamp) return 'Unknown';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-PK');
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read in Firebase
    if (!notification.read) {
      try {
        await firestore()
          .collection('notifications')
          .doc(notification.id)
          .update({
            read: true,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });

        // Update local state
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );

        setStats(prev => ({
          ...prev,
          unread: prev.unread - 1,
        }));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on action
    switch(notification.action) {
      case 'fleet':
        if (notification.actionId) {
          navigation.navigate('Fleet', {
            screen: 'BusDetails',
            params: { busId: notification.actionId }
          });
        } else {
          navigation.navigate('Fleet');
        }
        break;

      case 'drivers':
        if (notification.actionId) {
          navigation.navigate('Drivers', {
            screen: 'DriverDetails',
            params: { driverId: notification.actionId }
          });
        } else {
          navigation.navigate('Drivers');
        }
        break;

      case 'operations':
      case 'trip':
        if (notification.actionId) {
          navigation.navigate('Operations', {
            screen: 'TripDetails',
            params: { tripId: notification.actionId }
          });
        } else {
          navigation.navigate('Operations');
        }
        break;

      case 'reports':
        navigation.navigate('ReportsProfile', { screen: 'Reports' });
        break;

      case 'emergency':
        Alert.alert(
          '🚨 Emergency Alert',
          notification.message,
          [
            { text: 'Call Driver', onPress: () => handleEmergencyCall(notification) },
            { text: 'View Details', onPress: () => handleEmergencyDetails(notification) },
            { text: 'Dismiss', style: 'cancel' },
          ]
        );
        break;

      case 'booking':
        if (notification.actionId) {
          navigation.navigate('Operations', {
            screen: 'BookingDetails',
            params: { bookingId: notification.actionId }
          });
        }
        break;

      default:
        Alert.alert(notification.title, notification.message);
    }
  };

  const handleEmergencyCall = (notification: Notification) => {
    // In a real app, you would integrate with phone calling
    Alert.alert('Calling', 'Emergency contact will be called');
  };

  const handleEmergencyDetails = (notification: Notification) => {
    // Navigate to emergency details screen
    Alert.alert('Emergency Details', 'Viewing emergency details...');
  };

  const handleDismiss = async (id: string) => {
    Alert.alert(
      'Dismiss Notification',
      'Are you sure you want to dismiss this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from Firebase
              await firestore()
                .collection('notifications')
                .doc(id)
                .delete();

              // Update local state
              const notification = notifications.find(n => n.id === id);
              setNotifications(prev => prev.filter(n => n.id !== id));

              if (notification && !notification.read) {
                setStats(prev => ({
                  ...prev,
                  total: prev.total - 1,
                  unread: prev.unread - 1,
                }));
              } else {
                setStats(prev => ({
                  ...prev,
                  total: prev.total - 1,
                }));
              }
            } catch (error) {
              console.error('Error dismissing notification:', error);
              Alert.alert('Error', 'Failed to dismiss notification');
            }
          }
        }
      ]
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const unreadNotifs = notifications.filter(n => !n.read);
    if (unreadNotifs.length === 0) {
      Alert.alert('Info', 'No unread notifications');
      return;
    }

    Alert.alert(
      'Mark All as Read',
      `Mark ${unreadNotifs.length} notification(s) as read?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All Read',
          onPress: async () => {
            try {
              const batch = firestore().batch();

              unreadNotifs.forEach(notification => {
                const ref = firestore().collection('notifications').doc(notification.id);
                batch.update(ref, {
                  read: true,
                  updatedAt: firestore.FieldValue.serverTimestamp(),
                });
              });

              await batch.commit();

              // Update local state
              setNotifications(prev =>
                prev.map(n => ({ ...n, read: true }))
              );

              setStats(prev => ({
                ...prev,
                unread: 0,
              }));

              Alert.alert('Success', 'All notifications marked as read');
            } catch (error) {
              console.error('Error marking all as read:', error);
              Alert.alert('Error', 'Failed to mark notifications as read');
            }
          }
        }
      ]
    );
  };

  const clearAllNotifications = () => {
    if (notifications.length === 0) {
      Alert.alert('Info', 'No notifications to clear');
      return;
    }

    Alert.alert(
      'Clear All',
      `Are you sure you want to clear all ${notifications.length} notifications?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const batch = firestore().batch();

              notifications.forEach(notification => {
                const ref = firestore().collection('notifications').doc(notification.id);
                batch.delete(ref);
              });

              await batch.commit();

              // Clear local state
              setNotifications([]);
              setStats({ total: 0, unread: 0, critical: 0 });

              Alert.alert('Success', 'All notifications cleared');
            } catch (error) {
              console.error('Error clearing notifications:', error);
              Alert.alert('Error', 'Failed to clear notifications');
            }
          }
        }
      ]
    );
  };

  const filterByType = (type: string) => {
    // This would navigate to filtered view
    Alert.alert('Filter', `Showing ${type} notifications`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.headerActions}>
          {stats.unread > 0 && (
            <TouchableOpacity onPress={markAllAsRead}>
              <Text style={styles.markReadText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => filterByType('all')}
        >
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={() => filterByType('unread')}
        >
          <Text style={[styles.statValue, { color: COLORS.danger }]}>{stats.unread}</Text>
          <Text style={styles.statLabel}>Unread</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={() => filterByType('critical')}
        >
          <Text style={[styles.statValue, { color: COLORS.warning }]}>{stats.critical}</Text>
          <Text style={styles.statLabel}>Critical</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, styles.clearAllCard]}
          onPress={clearAllNotifications}
        >
          <Text style={[styles.statValue, { color: COLORS.danger }]}>🗑️</Text>
          <Text style={[styles.statLabel, { color: COLORS.danger }]}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>You're all caught up!</Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                SHADOWS.small,
                !notification.read && styles.unreadCard
              ]}
              onPress={() => handleNotificationPress(notification)}
              activeOpacity={0.7}
            >
              <View style={styles.notificationHeader}>
                <View style={styles.notificationIconContainer}>
                  <Text style={[
                    styles.notificationIcon,
                    { color: getNotificationColor(notification.type) }
                  ]}>
                    {getNotificationIcon(notification.type)}
                  </Text>
                </View>
                <View style={styles.notificationInfo}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationTime}>
                    {formatTime(notification.time)}
                  </Text>
                </View>
                {!notification.read && <View style={styles.unreadDot} />}
                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={() => handleDismiss(notification.id)}
                >
                  <Text style={styles.dismissText}>×</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.notificationMessage}>{notification.message}</Text>
              <View style={styles.notificationFooter}>
                <Text style={styles.actionText}>
                  {notification.action === 'emergency'
                    ? '🚨 Emergency - Tap to handle'
                    : 'Tap to view details →'}
                </Text>
                {notification.actionId && (
                  <Text style={styles.actionId}>ID: {notification.actionId.substring(0, 8)}...</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SIZES.sm,
    fontSize: 16,
    color: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.lg,
    backgroundColor: COLORS.primary,
  },
  backButton: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerActions: {
    minWidth: 70,
    alignItems: 'flex-end',
  },
  markReadText: {
    color: COLORS.secondary,
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: SIZES.xs,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  clearAllCard: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: SIZES.md,
    paddingTop: SIZES.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SIZES.lg,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SIZES.xs,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  notificationCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
  },
  unreadCard: {
    backgroundColor: COLORS.infoLight,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  notificationIconContainer: {
    marginRight: SIZES.sm,
  },
  notificationIcon: {
    fontSize: 24,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
    marginRight: SIZES.sm,
  },
  dismissButton: {
    padding: 4,
  },
  dismissText: {
    fontSize: 24,
    color: COLORS.textLighter,
    fontWeight: '300',
  },
  notificationMessage: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: SIZES.sm,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.sm,
  },
  actionText: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  actionId: {
    fontSize: 10,
    color: COLORS.textLighter,
  },
});

export default NotificationsScreen;
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

interface NotificationsScreenProps {
  navigation: DrawerNavigationProp<RootDrawerParamList, 'Notifications'>;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  timestamp: any;
  type: 'trip' | 'payment' | 'system' | 'emergency' | 'maintenance' | 'reminder';
  read: boolean;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  actionType?: string;
  actionId?: string;
  data?: any;
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ navigation }) => {
  const user = auth().currentUser;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Fetch notifications from Firebase
  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestore()
      .collection('notifications')
      .where('driverId', '==', user.uid)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .onSnapshot(
        (snapshot) => {
          const notifs: Notification[] = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            const timestamp = data.timestamp?.toDate?.() || new Date();

            notifs.push({
              id: doc.id,
              title: data.title || 'Notification',
              message: data.message || '',
              time: getTimeAgo(timestamp),
              timestamp: data.timestamp,
              type: data.type || 'system',
              read: data.read || false,
              priority: data.priority || 'medium',
              actionable: data.actionable || false,
              actionType: data.actionType,
              actionId: data.actionId,
              data: data.data,
            });
          });

          setNotifications(notifs);
          setLoading(false);
          setRefreshing(false);
        },
        (error) => {
          console.error('Error fetching notifications:', error);
          setLoading(false);
          setRefreshing(false);
        }
      );

    return () => unsubscribe();
  }, [user]);

  // Get time ago string
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      await firestore().collection('notifications').doc(id).update({
        read: true,
        readAt: firestore.FieldValue.serverTimestamp(),
      });

      // Update local state
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id ? { ...notification, read: true } : notification
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const batch = firestore().batch();
      const unreadNotifs = notifications.filter(n => !n.read);

      unreadNotifs.forEach(notification => {
        const ref = firestore().collection('notifications').doc(notification.id);
        batch.update(ref, {
          read: true,
          readAt: firestore.FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();

      // Update local state
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );

      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  };

  // Clear all notifications
  const clearAll = async () => {
    if (!user) return;

    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications? This cannot be undone.',
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
              setNotifications([]);
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

  // Handle notification press
  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Handle navigation based on action type
    if (notification.actionable && notification.actionType) {
      switch (notification.actionType) {
        case 'view_trip':
          if (notification.actionId) {
            navigation.navigate('Route', { tripId: notification.actionId });
          }
          break;
        case 'view_earnings':
          navigation.navigate('Earnings');
          break;
        case 'view_schedule':
          navigation.navigate('Schedule');
          break;
        case 'view_boarding':
          if (notification.actionId) {
            navigation.navigate('Boarding', { tripId: notification.actionId });
          }
          break;
        case 'emergency':
          navigation.navigate('Emergency');
          break;
        default:
          // Show details in alert
          Alert.alert(
            notification.title,
            `${notification.message}\n\nTap to view more details.`,
            [{ text: 'OK' }]
          );
      }
    } else {
      // Just show details
      Alert.alert(
        notification.title,
        notification.message,
        [{ text: 'OK' }]
      );
    }
  };

  // Handle action button press
  const handleActionPress = async (notification: Notification, action: string) => {
    switch (action) {
      case 'accept':
        // Handle accept action (e.g., accept shift swap request)
        Alert.alert('Accept', 'Action accepted');
        break;
      case 'decline':
        // Handle decline action
        Alert.alert('Decline', 'Action declined');
        break;
      case 'snooze':
        // Handle snooze
        await markAsRead(notification.id);
        break;
      default:
        // Navigate based on action type
        if (notification.actionType) {
          switch (notification.actionType) {
            case 'view_trip':
              if (notification.actionId) {
                navigation.navigate('Route', { tripId: notification.actionId });
              }
              break;
            case 'view_earnings':
              navigation.navigate('Earnings');
              break;
            case 'view_schedule':
              navigation.navigate('Schedule');
              break;
          }
        }
    }
  };

  // Get notification icon based on type
  const getTypeIcon = (type: Notification['type'], priority: Notification['priority']) => {
    // Priority indicators
    if (priority === 'high') {
      return '🔴';
    }

    switch (type) {
      case 'trip': return '🚌';
      case 'payment': return '💰';
      case 'system': return '⚙️';
      case 'emergency': return '🚨';
      case 'maintenance': return '🔧';
      case 'reminder': return '⏰';
      default: return '📢';
    }
  };

  // Get notification color based on type and priority
  const getNotificationColor = (type: Notification['type'], priority: Notification['priority']) => {
    if (priority === 'high') return '#F44336';

    switch (type) {
      case 'trip': return '#2196F3';
      case 'payment': return '#4CAF50';
      case 'system': return '#9C27B0';
      case 'emergency': return '#F44336';
      case 'maintenance': return '#FF9800';
      case 'reminder': return '#607D8B';
      default: return '#666666';
    }
  };

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Data will auto-refresh via Firebase listeners
  }, []);

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🔔 NOTIFICATIONS</Text>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </Text>
        </View>

        {notifications.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptyText}>
            You're all caught up! Check back later for updates.
          </Text>
        </View>
      ) : (
        <>
          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={markAllAsRead}>
              <Text style={styles.actionButtonText}>Mark All as Read</Text>
            </TouchableOpacity>

            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>Filter: </Text>
              <TouchableOpacity
                style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
                onPress={() => setFilter('all')}
              >
                <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
                  All ({notifications.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filter === 'unread' && styles.filterButtonActive]}
                onPress={() => setFilter('unread')}
              >
                <Text style={[styles.filterButtonText, filter === 'unread' && styles.filterButtonTextActive]}>
                  Unread ({unreadCount})
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {filteredNotifications.map(notification => {
              const iconColor = getNotificationColor(notification.type, notification.priority);
              const icon = getTypeIcon(notification.type, notification.priority);

              return (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    !notification.read && styles.unreadCard
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                >
                  <View style={styles.notificationHeader}>
                    <View style={[styles.typeIndicator, { backgroundColor: iconColor + '20' }]}>
                      <Text style={styles.typeEmoji}>{icon}</Text>
                    </View>

                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationTitle}>
                        {notification.title}
                        {!notification.read && (
                          <Text style={styles.unreadDot}> •</Text>
                        )}
                      </Text>
                      <Text style={styles.notificationTime}>{notification.time}</Text>
                    </View>

                    {notification.priority === 'high' && (
                      <View style={styles.priorityBadge}>
                        <Text style={styles.priorityBadgeText}>URGENT</Text>
                      </View>
                    )}

                    {!notification.read && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>NEW</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.notificationMessage}>{notification.message}</Text>

                  {/* Action buttons for actionable notifications */}
                  {notification.actionable && (
                    <View style={styles.notificationActions}>
                      {notification.actionType === 'shift_swap' && (
                        <>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.acceptButton]}
                            onPress={() => handleActionPress(notification, 'accept')}
                          >
                            <Text style={styles.acceptButtonText}>✓ Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.declineButton]}
                            onPress={() => handleActionPress(notification, 'decline')}
                          >
                            <Text style={styles.declineButtonText}>✕ Decline</Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {notification.actionType === 'view_trip' && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.viewButton]}
                          onPress={() => handleActionPress(notification, 'view')}
                        >
                          <Text style={styles.viewButtonText}>View Trip Details</Text>
                        </TouchableOpacity>
                      )}

                      {notification.actionType === 'view_earnings' && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.viewButton]}
                          onPress={() => handleActionPress(notification, 'view')}
                        >
                          <Text style={styles.viewButtonText}>View Earnings</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[styles.actionButton, styles.snoozeButton]}
                        onPress={() => handleActionPress(notification, 'snooze')}
                      >
                        <Text style={styles.snoozeButtonText}>Snooze</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Simple view details for non-actionable */}
                  {!notification.actionable && (
                    <View style={styles.simpleAction}>
                      <TouchableOpacity
                        style={styles.viewDetailsButton}
                        onPress={() => handleNotificationPress(notification)}
                      >
                        <Text style={styles.viewDetailsText}>View Details →</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* Notification Types Info */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>NOTIFICATION TYPES</Text>
        <View style={styles.typesGrid}>
          <View style={styles.typeInfo}>
            <Text style={styles.typeInfoEmoji}>🚌</Text>
            <Text style={styles.typeInfoText}>Trip</Text>
          </View>
          <View style={styles.typeInfo}>
            <Text style={styles.typeInfoEmoji}>💰</Text>
            <Text style={styles.typeInfoText}>Payment</Text>
          </View>
          <View style={styles.typeInfo}>
            <Text style={styles.typeInfoEmoji}>⚙️</Text>
            <Text style={styles.typeInfoText}>System</Text>
          </View>
          <View style={styles.typeInfo}>
            <Text style={styles.typeInfoEmoji}>🚨</Text>
            <Text style={styles.typeInfoText}>Emergency</Text>
          </View>
          <View style={styles.typeInfo}>
            <Text style={styles.typeInfoEmoji}>🔧</Text>
            <Text style={styles.typeInfoText}>Maintenance</Text>
          </View>
          <View style={styles.typeInfo}>
            <Text style={styles.typeInfoEmoji}>⏰</Text>
            <Text style={styles.typeInfoText}>Reminder</Text>
          </View>
        </View>
      </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  clearButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  actionButton: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    marginLeft: 4,
  },
  filterButtonActive: {
    backgroundColor: '#4A90E2',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666666',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typeEmoji: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 2,
  },
  unreadDot: {
    color: '#4A90E2',
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  priorityBadge: {
    backgroundColor: '#F44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  priorityBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  unreadBadge: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 12,
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  declineButtonText: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  viewButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  snoozeButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#666666',
    paddingHorizontal: 16,
  },
  snoozeButtonText: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '600',
  },
  simpleAction: {
    alignItems: 'flex-end',
  },
  viewDetailsButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  viewDetailsText: {
    color: '#4A90E2',
    fontSize: 12,
    fontWeight: '500',
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 12,
    textAlign: 'center',
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 8,
  },
  typeInfo: {
    alignItems: 'center',
    width: '16%',
  },
  typeInfoEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  typeInfoText: {
    fontSize: 10,
    color: '#666666',
  },
});

export default NotificationsScreen;
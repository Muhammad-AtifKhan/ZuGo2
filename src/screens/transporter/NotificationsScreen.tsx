import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';

const NotificationsScreen = ({ navigation }: any) => {
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      type: 'maintenance',
      title: 'Maintenance Due',
      message: 'Bus B-005 maintenance due tomorrow',
      time: '2 hours ago',
      read: false,
      action: 'fleet'
    },
    {
      id: '2',
      type: 'success',
      title: 'Driver Achievement',
      message: 'Driver Ahmed Khan completed 50 trips today',
      time: '4 hours ago',
      read: false,
      action: 'drivers'
    },
    {
      id: '3',
      type: 'warning',
      title: 'Route Delay',
      message: 'Route R-003 delayed by 15 minutes',
      time: '1 hour ago',
      read: true,
      action: 'operations'
    },
    {
      id: '4',
      type: 'info',
      title: 'Target Achieved',
      message: 'Monthly revenue target achieved',
      time: '1 day ago',
      read: true,
      action: 'reports'
    },
    {
      id: '5',
      type: 'emergency',
      title: 'Emergency',
      message: 'Bus B-001 needs immediate attention',
      time: '30 mins ago',
      read: false,
      action: 'emergency'
    },
    {
      id: '6',
      type: 'payment',
      title: 'Payment Received',
      message: 'Payment of ₹25,000 received for trip #TR-456',
      time: '2 days ago',
      read: true,
      action: 'reports'
    },
    {
      id: '7',
      type: 'driver',
      title: 'Driver Check-in',
      message: 'Driver Ali Ahmed started duty',
      time: '3 days ago',
      read: true,
      action: 'drivers'
    },
    {
      id: '8',
      type: 'maintenance',
      title: 'Maintenance Complete',
      message: 'Bus B-002 maintenance completed successfully',
      time: '1 week ago',
      read: true,
      action: 'fleet'
    },
  ]);

  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'maintenance': return '🔧';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'emergency': return '🚨';
      case 'payment': return '💰';
      case 'driver': return '👤';
      default: return 'ℹ️';
    }
  };

  const getNotificationColor = (type: string) => {
    switch(type) {
      case 'maintenance': return '#FF9800';
      case 'success': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'error': return '#F44336';
      case 'emergency': return '#F44336';
      case 'payment': return '#4CAF50';
      case 'driver': return '#2196F3';
      default: return '#666666';
    }
  };

  const handleNotificationPress = (notification: any) => {
    // Mark as read
    setNotifications(notifications.map(n =>
      n.id === notification.id ? { ...n, read: true } : n
    ));

    // Navigate based on action
    switch(notification.action) {
      case 'fleet':
        navigation.navigate('Fleet');
        break;
      case 'drivers':
        navigation.navigate('Drivers');
        break;
      case 'operations':
        navigation.navigate('Operations');
        break;
      case 'reports':
        navigation.navigate('ReportsProfile');
        break;
      case 'emergency':
        Alert.alert('Emergency', 'Taking emergency action...');
        break;
      default:
        Alert.alert(notification.title, notification.message);
    }
  };

  const handleDismiss = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    Alert.alert('Success', 'All notifications marked as read');
  };

  const clearAllNotifications = () => {
    Alert.alert(
      'Clear All',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => setNotifications([])
        }
      ]
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead}>
              <Text style={styles.markReadText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{notifications.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#F44336' }]}>{unreadCount}</Text>
          <Text style={styles.statLabel}>Unread</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {notifications.filter(n => n.type === 'emergency' || n.type === 'warning').length}
          </Text>
          <Text style={styles.statLabel}>Critical</Text>
        </View>
        <TouchableOpacity
          style={[styles.statCard, styles.clearAllCard]}
          onPress={clearAllNotifications}
        >
          <Text style={[styles.statValue, { color: '#F44336' }]}>🗑️</Text>
          <Text style={[styles.statLabel, { color: '#F44336' }]}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
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
                  <Text style={styles.notificationTime}>{notification.time}</Text>
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
                <Text style={styles.actionText}>Tap to view details →</Text>
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
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#1A237E',
  },
  backButton: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerActions: {
    width: 40,
  },
  markReadText: {
    color: '#4A90E2',
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
  },
  clearAllCard: {
    borderLeftWidth: 1,
    borderLeftColor: '#E0E0E0',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadCard: {
    backgroundColor: '#F0F7FF',
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notificationIconContainer: {
    marginRight: 12,
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
    color: '#1A237E',
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666666',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
    marginRight: 12,
  },
  dismissButton: {
    padding: 4,
  },
  dismissText: {
    fontSize: 24,
    color: '#999999',
    fontWeight: '300',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
    marginBottom: 12,
  },
  notificationFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  actionText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
  },
});

export default NotificationsScreen;
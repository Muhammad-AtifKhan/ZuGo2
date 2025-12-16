import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'trip' | 'payment' | 'system' | 'emergency';
  read: boolean;
}

const NotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', title: 'Duty Reminder', message: 'Your duty starts in 30 minutes', time: '10 min ago', type: 'trip', read: false },
    { id: '2', title: 'Route Changed', message: 'Route RT-005 has been modified', time: '1 hour ago', type: 'trip', read: false },
    { id: '3', title: 'Payment Received', message: 'Payment of $143.00 has been credited', time: '2 hours ago', type: 'payment', read: true },
    { id: '4', title: 'New Schedule', message: 'New schedule for tomorrow available', time: '3 hours ago', type: 'system', read: true },
    { id: '5', title: 'Vehicle Maintenance', message: 'Vehicle B-001 maintenance due', time: '1 day ago', type: 'system', read: true },
    { id: '6', title: 'Weather Alert', message: 'Heavy rain expected in your route', time: '2 days ago', type: 'emergency', read: true },
    { id: '7', title: 'System Update', message: 'App updated to version 1.2.0', time: '3 days ago', type: 'system', read: true },
    { id: '8', title: 'Training Reminder', message: 'Safety training session tomorrow', time: '4 days ago', type: 'system', read: true },
  ]);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const getTypeEmoji = (type: Notification['type']) => {
    switch (type) {
      case 'trip': return '🚌';
      case 'payment': return '💰';
      case 'system': return '⚙️';
      case 'emergency': return '🚨';
      default: return '📢';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

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
              <TouchableOpacity style={styles.filterButton}>
                <Text style={styles.filterButtonText}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterButton}>
                <Text style={styles.filterButtonText}>Unread</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {notifications.map(notification => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationCard,
                  !notification.read && styles.unreadCard
                ]}
                onPress={() => markAsRead(notification.id)}
              >
                <View style={styles.notificationHeader}>
                  <View style={styles.typeIndicator}>
                    <Text style={styles.typeEmoji}>
                      {getTypeEmoji(notification.type)}
                    </Text>
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

                  {!notification.read && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>NEW</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.notificationMessage}>{notification.message}</Text>

                <View style={styles.notificationActions}>
                  <TouchableOpacity style={styles.notificationAction}>
                    <Text style={styles.notificationActionText}>View Details</Text>
                  </TouchableOpacity>

                  {!notification.read && (
                    <TouchableOpacity
                      style={styles.notificationAction}
                      onPress={() => markAsRead(notification.id)}
                    >
                      <Text style={styles.notificationActionText}>Mark as Read</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* Notification Types Info */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>NOTIFICATION TYPES</Text>
        <View style={styles.typesGrid}>
          <View style={styles.typeInfo}>
            <Text style={styles.typeInfoEmoji}>🚌</Text>
            <Text style={styles.typeInfoText}>Trip Updates</Text>
          </View>
          <View style={styles.typeInfo}>
            <Text style={styles.typeInfoEmoji}>💰</Text>
            <Text style={styles.typeInfoText}>Payments</Text>
          </View>
          <View style={styles.typeInfo}>
            <Text style={styles.typeInfoEmoji}>⚙️</Text>
            <Text style={styles.typeInfoText}>System</Text>
          </View>
          <View style={styles.typeInfo}>
            <Text style={styles.typeInfoEmoji}>🚨</Text>
            <Text style={styles.typeInfoText}>Emergency</Text>
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
  filterButtonText: {
    fontSize: 12,
    color: '#666666',
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
    marginRight: 12,
  },
  typeEmoji: {
    fontSize: 24,
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
    gap: 12,
  },
  notificationAction: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  notificationActionText: {
    fontSize: 12,
    color: '#4A90E2',
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
    justifyContent: 'space-around',
  },
  typeInfo: {
    alignItems: 'center',
  },
  typeInfoEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  typeInfoText: {
    fontSize: 12,
    color: '#666666',
  },
});

export default NotificationsScreen;
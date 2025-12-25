import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PassengerStackParamList } from '../../navigation/PassengerNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';

type AlertsScreenNavigationProp = StackNavigationProp<PassengerStackParamList, 'Alerts'>;
type AlertsScreenRouteProp = RouteProp<PassengerStackParamList, 'Alerts'>;

const AlertsScreen = () => {
  const navigation = useNavigation<AlertsScreenNavigationProp>();
  const route = useRoute<AlertsScreenRouteProp>();
  const { tripId, busNumber } = route.params;

  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState([
    {
      id: '1',
      type: 'delay',
      title: 'Traffic Delay',
      message: 'Heavy traffic on University Road. Expected delay of 10-15 minutes.',
      time: '2 minutes ago',
      severity: 'high',
      read: false,
      busNumber: 'B-001',
    },
    {
      id: '2',
      type: 'boarding',
      title: 'Boarding Update',
      message: 'Boarding completed at City Center stop. 25 passengers onboard.',
      time: '10 minutes ago',
      severity: 'medium',
      read: true,
      busNumber: 'B-001',
    },
    {
      id: '3',
      type: 'route',
      title: 'Route Change',
      message: 'Route diverted due to road construction. Alternate route being taken.',
      time: '25 minutes ago',
      severity: 'medium',
      read: true,
      busNumber: 'B-001',
    },
    {
      id: '4',
      type: 'schedule',
      title: 'Schedule Update',
      message: 'Next stop arrival time adjusted. Arriving in 8 minutes.',
      time: '30 minutes ago',
      severity: 'low',
      read: true,
      busNumber: 'B-001',
    },
    {
      id: '5',
      type: 'safety',
      title: 'Safety Reminder',
      message: 'Please keep your seatbelt fastened while the bus is in motion.',
      time: '1 hour ago',
      severity: 'low',
      read: true,
      busNumber: 'B-001',
    },
    {
      id: '6',
      type: 'weather',
      title: 'Weather Alert',
      message: 'Light rain expected along the route. Drive safely.',
      time: '2 hours ago',
      severity: 'medium',
      read: true,
      busNumber: 'B-001',
    },
  ]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Alert.alert('Refreshed', 'Alerts updated');
    }, 1500);
  };

  const handleMarkAsRead = (alertId: string) => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert =>
        alert.id === alertId ? { ...alert, read: true } : alert
      )
    );
  };

  const handleMarkAllAsRead = () => {
    Alert.alert(
      'Mark All as Read',
      'Mark all alerts as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All',
          onPress: () => {
            setAlerts(prevAlerts =>
              prevAlerts.map(alert => ({ ...alert, read: true }))
            );
            Alert.alert('Success', 'All alerts marked as read');
          },
        },
      ]
    );
  };

  const handleDeleteAlert = (alertId: string) => {
    Alert.alert(
      'Delete Alert',
      'Are you sure you want to delete this alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== alertId));
            Alert.alert('Deleted', 'Alert deleted successfully');
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (alerts.length === 0) {
      Alert.alert('No Alerts', 'There are no alerts to clear');
      return;
    }

    Alert.alert(
      'Clear All Alerts',
      'Are you sure you want to clear all alerts?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            setAlerts([]);
            Alert.alert('Cleared', 'All alerts cleared');
          },
        },
      ]
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return '#F44336';
      case 'medium':
        return '#FF9800';
      case 'low':
        return '#2196F3';
      default:
        return '#666';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'notifications';
      default:
        return 'info';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'delay':
        return 'schedule';
      case 'boarding':
        return 'people';
      case 'route':
        return 'route';
      case 'schedule':
        return 'access-time';
      case 'safety':
        return 'security';
      case 'weather':
        return 'cloud';
      default:
        return 'info';
    }
  };

  const unreadCount = alerts.filter(alert => !alert.read).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4A90E2']}
            tintColor="#4A90E2"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#1A237E" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>ALERTS & UPDATES</Text>
            <Text style={styles.subtitle}>Bus {busNumber}</Text>
          </View>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Icon name="notifications" size={24} color="#4A90E2" />
            <Text style={styles.statNumber}>{alerts.length}</Text>
            <Text style={styles.statLabel}>Total Alerts</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="warning" size={24} color="#FF9800" />
            <Text style={styles.statNumber}>
              {alerts.filter(a => a.severity === 'high').length}
            </Text>
            <Text style={styles.statLabel}>High Priority</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="check-circle" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>
              {alerts.filter(a => a.read).length}
            </Text>
            <Text style={styles.statLabel}>Read</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.markAllButton]}
            onPress={handleMarkAllAsRead}
          >
            <Icon name="check-circle" size={20} color="#4CAF50" />
            <Text style={styles.actionButtonText}>Mark All Read</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.clearButton]}
            onPress={handleClearAll}
          >
            <Icon name="delete-sweep" size={20} color="#F44336" />
            <Text style={styles.actionButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        {/* Alerts List */}
        {alerts.length > 0 ? (
          <View style={styles.alertsList}>
            {alerts.map((alert, index) => (
              <View
                key={alert.id}
                style={[
                  styles.alertCard,
                  !alert.read && styles.alertUnread,
                  index === alerts.length - 1 && styles.lastAlert,
                ]}
              >
                <View style={styles.alertHeader}>
                  <View style={styles.alertType}>
                    <Icon
                      name={getAlertTypeIcon(alert.type)}
                      size={20}
                      color={getSeverityColor(alert.severity)}
                    />
                    <Text style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(alert.severity) + '20' }
                    ]}>
                      <Icon
                        name={getSeverityIcon(alert.severity)}
                        size={12}
                        color={getSeverityColor(alert.severity)}
                      />
                      <Text style={[
                        styles.severityText,
                        { color: getSeverityColor(alert.severity) }
                      ]}>
                        {' '}{alert.severity.toUpperCase()}
                      </Text>
                    </Text>
                  </View>

                  <View style={styles.alertActions}>
                    {!alert.read && (
                      <TouchableOpacity
                        style={styles.smallButton}
                        onPress={() => handleMarkAsRead(alert.id)}
                      >
                        <Icon name="check" size={16} color="#4CAF50" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.smallButton}
                      onPress={() => handleDeleteAlert(alert.id)}
                    >
                      <Icon name="delete" size={16} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertMessage}>{alert.message}</Text>

                <View style={styles.alertFooter}>
                  <View style={styles.footerItem}>
                    <Icon name="directions-bus" size={14} color="#666" />
                    <Text style={styles.footerText}>{alert.busNumber}</Text>
                  </View>
                  <View style={styles.footerItem}>
                    <Icon name="access-time" size={14} color="#666" />
                    <Text style={styles.footerText}>{alert.time}</Text>
                  </View>
                  {!alert.read && (
                    <View style={styles.unreadDot} />
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Icon name="notifications-off" size={80} color="#DDD" />
            <Text style={styles.emptyTitle}>No Alerts</Text>
            <Text style={styles.emptyText}>
              You're all caught up! No alerts at the moment.
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
            >
              <Icon name="refresh" size={20} color="#4A90E2" />
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Alert Types Legend */}
        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>ALERT TYPES</Text>
          <View style={styles.legendGrid}>
            <View style={styles.legendItem}>
              <Icon name="warning" size={16} color="#F44336" />
              <Text style={styles.legendText}>High Priority</Text>
            </View>
            <View style={styles.legendItem}>
              <Icon name="info" size={16} color="#FF9800" />
              <Text style={styles.legendText}>Medium Priority</Text>
            </View>
            <View style={styles.legendItem}>
              <Icon name="notifications" size={16} color="#2196F3" />
              <Text style={styles.legendText}>Low Priority</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.unreadLegendDot} />
              <Text style={styles.legendText}>Unread</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  unreadBadge: {
    backgroundColor: '#F44336',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  markAllButton: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  clearButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  alertsList: {
    marginBottom: 20,
  },
  alertCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
    backgroundColor: '#F0F8FF',
  },
  lastAlert: {
    marginBottom: 0,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  alertActions: {
    flexDirection: 'row',
  },
  smallButton: {
    padding: 4,
    marginLeft: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  alertMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  alertFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  refreshText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
    marginLeft: 8,
  },
  legendContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 12,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  unreadLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4A90E2',
  },
});

export default AlertsScreen;
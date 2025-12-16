import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute } from '@react-navigation/native';

const BusHistoryScreen = () => {
  const route = useRoute<any>();
  const { busId = 'B-001' } = route.params || {};

  const activities = [
    { date: '15 Mar 2024', events: [
      { time: '10:15 AM', action: 'Trip TR-45 started', type: 'trip' },
      { time: '09:30 AM', action: 'Driver Ali Ahmed assigned', type: 'assignment' },
      { time: '08:00 AM', action: 'Trip TR-44 completed', type: 'trip' },
    ]},
    { date: '14 Mar 2024', events: [
      { time: 'All Day', action: 'Total trips: 3', type: 'summary' },
      { time: 'All Day', action: 'Revenue: $450', type: 'revenue' },
      { time: 'All Day', action: 'Passengers: 120', type: 'summary' },
    ]},
    { date: '13 Mar 2024', events: [
      { time: 'Maintenance', action: 'Oil change completed', type: 'maintenance' },
      { time: 'Cost', action: '$150', type: 'cost' },
    ]},
    { date: '10 Mar 2024', events: [
      { time: 'Driver Change', action: 'Usman → Ali', type: 'assignment' },
    ]},
  ];

  const maintenanceHistory = [
    { date: '10 Mar 2024', service: 'Oil change', cost: '$150' },
    { date: '01 Mar 2024', service: 'Tire replacement', cost: '$300' },
    { date: '15 Feb 2024', service: 'Brake repair', cost: '$200' },
    { date: '01 Feb 2024', service: 'Engine tune-up', cost: '$400' },
  ];

  const performanceMetrics = {
    totalTrips: 150,
    totalRevenue: 22500,
    avgDailyRevenue: 150,
    maintenanceCost: 1200,
    fuelEfficiency: '8.5 km/l',
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BUS HISTORY: {busId}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 ACTIVITY TIMELINE</Text>

        {activities.map((day, dayIndex) => (
          <View key={dayIndex} style={styles.dayCard}>
            <Text style={styles.dayDate}>{day.date}</Text>
            {day.events.map((event, eventIndex) => (
              <View key={eventIndex} style={styles.eventRow}>
                <View style={[styles.eventIcon,
                  event.type === 'trip' ? styles.tripIcon :
                  event.type === 'maintenance' ? styles.maintenanceIcon :
                  event.type === 'revenue' ? styles.revenueIcon :
                  styles.assignmentIcon
                ]}>
                  <Text style={styles.eventIconText}>
                    {event.type === 'trip' ? '🚌' :
                     event.type === 'maintenance' ? '🔧' :
                     event.type === 'revenue' ? '💰' : '👤'}
                  </Text>
                </View>
                <View style={styles.eventDetails}>
                  <Text style={styles.eventTime}>{event.time}</Text>
                  <Text style={styles.eventAction}>{event.action}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 PERFORMANCE METRICS</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{performanceMetrics.totalTrips}</Text>
            <Text style={styles.metricLabel}>Total Trips</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>${performanceMetrics.totalRevenue.toLocaleString()}</Text>
            <Text style={styles.metricLabel}>Total Revenue</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>${performanceMetrics.avgDailyRevenue}</Text>
            <Text style={styles.metricLabel}>Avg Daily Revenue</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>${performanceMetrics.maintenanceCost}</Text>
            <Text style={styles.metricLabel}>Maintenance Cost</Text>
          </View>
          <View style={[styles.metricCard, styles.fullWidth]}>
            <Text style={styles.metricValue}>{performanceMetrics.fuelEfficiency}</Text>
            <Text style={styles.metricLabel}>Fuel Efficiency</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔧 MAINTENANCE HISTORY</Text>
        <View style={styles.maintenanceList}>
          {maintenanceHistory.map((item, index) => (
            <View key={index} style={styles.maintenanceItem}>
              <View style={styles.maintenanceDate}>
                <Text style={styles.maintenanceDateText}>{item.date}</Text>
              </View>
              <View style={styles.maintenanceDetails}>
                <Text style={styles.maintenanceService}>{item.service}</Text>
                <Text style={styles.maintenanceCost}>{item.cost}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>EXPORT HISTORY</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
          <Text style={styles.actionButtonText}>BACK</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#1A237E',
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 16,
  },
  dayCard: {
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
  dayDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tripIcon: {
    backgroundColor: '#4CAF50',
  },
  maintenanceIcon: {
    backgroundColor: '#FF9800',
  },
  revenueIcon: {
    backgroundColor: '#9C27B0',
  },
  assignmentIcon: {
    backgroundColor: '#2196F3',
  },
  eventIconText: {
    fontSize: 18,
  },
  eventDetails: {
    flex: 1,
  },
  eventTime: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  eventAction: {
    fontSize: 16,
    color: '#333333',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  fullWidth: {
    width: '100%',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  maintenanceList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  maintenanceItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  maintenanceDate: {
    width: 80,
    marginRight: 16,
  },
  maintenanceDateText: {
    fontSize: 14,
    color: '#666666',
  },
  maintenanceDetails: {
    flex: 1,
  },
  maintenanceService: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 4,
  },
  maintenanceCost: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  secondaryButton: {
    backgroundColor: '#666666',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default BusHistoryScreen;
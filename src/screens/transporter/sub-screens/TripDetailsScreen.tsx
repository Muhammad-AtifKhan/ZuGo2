import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const TripDetailsScreen = () => {
  const route = useRoute<any>();
  const { tripId = 'TR-45' } = route.params || {};

  const stops = [
    { id: '1', name: 'Main Terminal', time: '08:00 AM', status: 'scheduled' },
    { id: '2', name: 'City Center', time: '08:30 AM', status: 'reached' },
    { id: '3', name: 'University', time: '09:00 AM', status: 'reached' },
    { id: '4', name: 'Hospital', time: '09:30 AM', status: 'current' },
    { id: '5', name: 'Airport', time: '10:00 AM', status: 'upcoming' },
  ];

  const passengerStats = {
    total: 40,
    boarded: 32,
    pending: 8,
    cancelled: 0,
  };

  const liveUpdates = {
    lastUpdate: '09:28 AM',
    speed: '45 km/h',
    nextStopETA: '09:45 AM',
    delay: '+5 minutes',
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TRIP DETAILS: {tripId}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BASIC INFO:</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Trip ID</Text>
            <Text style={styles.infoValue}>{tripId}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Bus</Text>
            <Text style={styles.infoValue}>B-001 (Toyota Coaster)</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Driver</Text>
            <Text style={styles.infoValue}>Ali Ahmed</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Route</Text>
            <Text style={styles.infoValue}>Downtown Express (RT-005)</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Status</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>🟢 ON ROUTE</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TIMELINE:</Text>
        <View style={styles.timeline}>
          {[0, 20, 40, 60, 80, 100].map((percent, index) => (
            <View key={index} style={[styles.timelineDot, { left: `${percent}%` }]}>
              {index === 3 ? (
                <View style={styles.currentDot}>
                  <Text style={styles.dotText}>●</Text>
                </View>
              ) : index < 3 ? (
                <View style={styles.completedDot}>
                  <Text style={styles.dotText}>✓</Text>
                </View>
              ) : (
                <View style={styles.upcomingDot}>
                  <Text style={styles.dotText}>○</Text>
                </View>
              )}
            </View>
          ))}
          <View style={styles.timelineBar}>
            <View style={[styles.progressBar, { width: '60%' }]} />
          </View>
          <View style={styles.timelineLabels}>
            <Text style={styles.timelineLabel}>08:00 AM</Text>
            <Text style={styles.timelineLabel}>09:30 AM</Text>
            <Text style={styles.timelineLabel}>10:30 AM</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PASSENGER MANIFEST:</Text>
        <View style={styles.passengerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{passengerStats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.positive]}>{passengerStats.boarded}</Text>
            <Text style={styles.statLabel}>Boarded</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.warning]}>{passengerStats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.negative]}>{passengerStats.cancelled}</Text>
            <Text style={styles.statLabel}>Cancelled</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>STOPS PROGRESS:</Text>
        {stops.map((stop, index) => (
          <View key={stop.id} style={styles.stopItem}>
            <View style={styles.stopNumber}>
              <Text style={styles.stopNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.stopDetails}>
              <Text style={styles.stopName}>{stop.name}</Text>
              <Text style={styles.stopTime}>{stop.time}</Text>
            </View>
            <View style={styles.stopStatus}>
              {stop.status === 'reached' ? (
                <Text style={styles.reachedText}>✓</Text>
              ) : stop.status === 'current' ? (
                <Text style={styles.currentText}>●</Text>
              ) : (
                <Text style={styles.upcomingText}>○</Text>
              )}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>LIVE UPDATES:</Text>
        <View style={styles.liveUpdates}>
          <View style={styles.updateItem}>
            <Text style={styles.updateLabel}>Last update</Text>
            <Text style={styles.updateValue}>{liveUpdates.lastUpdate}</Text>
          </View>
          <View style={styles.updateItem}>
            <Text style={styles.updateLabel}>Speed</Text>
            <Text style={styles.updateValue}>{liveUpdates.speed}</Text>
          </View>
          <View style={styles.updateItem}>
            <Text style={styles.updateLabel}>Next stop ETA</Text>
            <Text style={styles.updateValue}>{liveUpdates.nextStopETA}</Text>
          </View>
          <View style={styles.updateItem}>
            <Text style={styles.updateLabel}>Delay</Text>
            <Text style={[styles.updateValue, styles.delayText]}>{liveUpdates.delay}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionButton, styles.primaryButton]}>
          <Text style={styles.actionButtonText}>LIVE TRACKING</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>CONTACT DRIVER</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>UPDATE STATUS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.dangerButton]}>
          <Text style={styles.actionButtonText}>CANCEL TRIP</Text>
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
  infoGrid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666666',
  },
  infoValue: {
    fontSize: 16,
    color: '#1A237E',
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  timeline: {
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginTop: 30,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  timelineDot: {
    position: 'absolute',
    top: 24,
    transform: [{ translateX: -8 }],
  },
  currentDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upcomingDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotText: {
    fontSize: 10,
    color: '#FFFFFF',
  },
  timelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timelineLabel: {
    fontSize: 12,
    color: '#666666',
  },
  passengerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 4,
  },
  positive: {
    color: '#4CAF50',
  },
  warning: {
    color: '#FF9800',
  },
  negative: {
    color: '#F44336',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stopNumberText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  stopDetails: {
    flex: 1,
  },
  stopName: {
    fontSize: 16,
    color: '#1A237E',
    fontWeight: '600',
  },
  stopTime: {
    fontSize: 14,
    color: '#666666',
  },
  stopStatus: {
    width: 32,
    alignItems: 'center',
  },
  reachedText: {
    fontSize: 20,
    color: '#4CAF50',
  },
  currentText: {
    fontSize: 20,
    color: '#4A90E2',
  },
  upcomingText: {
    fontSize: 20,
    color: '#E0E0E0',
  },
  liveUpdates: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  updateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  updateLabel: {
    fontSize: 14,
    color: '#666666',
  },
  updateValue: {
    fontSize: 14,
    color: '#1A237E',
    fontWeight: '600',
  },
  delayText: {
    color: '#FF9800',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default TripDetailsScreen;
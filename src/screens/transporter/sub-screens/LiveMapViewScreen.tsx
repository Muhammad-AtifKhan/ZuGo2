import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const LiveMapViewScreen = () => {
  const buses = [
    { id: '1', number: 'B-001', driver: 'Ali Ahmed', status: 'On Route', progress: 45 },
    { id: '2', number: 'B-003', driver: 'Sara Khan', status: 'Boarding', progress: 30 },
    { id: '3', number: 'B-005', driver: 'Usman Ali', status: 'Scheduled', progress: 0 },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>LIVE MAP - ALL BUSES</Text>
        <Text style={styles.subtitle}>ACTIVE BUSES: 12</Text>
      </View>

      {/* Simplified Map View */}
      <View style={styles.mapContainer}>
        <View style={styles.map}>
          {/* Simplified map representation */}
          <View style={styles.routeLine}>
            <View style={styles.stop}>
              <Text style={styles.stopText}>S1</Text>
            </View>
            <View style={styles.line} />
            <View style={[styles.stop, styles.activeStop]}>
              <Text style={styles.stopText}>S2</Text>
            </View>
            <View style={styles.line} />
            <View style={styles.stop}>
              <View style={styles.busIndicator}>
                <Text style={styles.busText}>B-001</Text>
              </View>
              <Text style={styles.stopText}>S3</Text>
            </View>
            <View style={styles.line} />
            <View style={styles.stop}>
              <View style={[styles.busIndicator, styles.boardingBus]}>
                <Text style={styles.busText}>B-003</Text>
              </View>
              <Text style={styles.stopText}>S4</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendIcon, styles.busIcon]} />
          <Text style={styles.legendText}>Bus with driver</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendIcon, styles.stopIcon]} />
          <Text style={styles.legendText}>Stop</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendIcon, styles.onRouteIcon]} />
          <Text style={styles.legendText}>On Route</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendIcon, styles.boardingIcon]} />
          <Text style={styles.legendText}>Boarding</Text>
        </View>
      </View>

      <ScrollView style={styles.busList}>
        <Text style={styles.listTitle}>BUS LIST:</Text>
        {buses.map((bus) => (
          <TouchableOpacity key={bus.id} style={styles.busCard}>
            <View style={styles.busInfo}>
              <Text style={styles.busNumber}>{bus.number}</Text>
              <Text style={styles.busDriver}>{bus.driver}</Text>
            </View>
            <View style={styles.busStatus}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: bus.status === 'On Route' ? '#4CAF50' :
                               bus.status === 'Boarding' ? '#FF9800' : '#4A90E2' }
              ]}>
                <Text style={styles.statusText}>{bus.status}</Text>
              </View>
              <Text style={styles.progressText}>{bus.progress}% complete</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>ZOOM IN</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>REFRESH</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>FILTER BUSES</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>EXPORT VIEW</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 16,
    backgroundColor: '#1A237E',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9FA8DA',
  },
  mapContainer: {
    padding: 16,
  },
  map: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stop: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  activeStop: {
    backgroundColor: '#4CAF50',
  },
  stopText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  line: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
  },
  busIndicator: {
    position: 'absolute',
    top: -25,
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  boardingBus: {
    backgroundColor: '#4A90E2',
  },
  busText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  busIcon: {
    backgroundColor: '#FF9800',
  },
  stopIcon: {
    backgroundColor: '#E0E0E0',
  },
  onRouteIcon: {
    backgroundColor: '#4CAF50',
  },
  boardingIcon: {
    backgroundColor: '#4A90E2',
  },
  legendText: {
    fontSize: 12,
    color: '#666666',
  },
  busList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
  },
  busCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  busInfo: {
    flex: 1,
  },
  busNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  busDriver: {
    fontSize: 12,
    color: '#666666',
  },
  busStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  progressText: {
    fontSize: 12,
    color: '#666666',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    width: '24%',
    marginBottom: 8,
    alignItems: 'center',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default LiveMapViewScreen;
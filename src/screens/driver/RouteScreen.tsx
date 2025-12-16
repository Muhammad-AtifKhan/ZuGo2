import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Stop {
  id: string;
  number: number;
  name: string;
  scheduledTime: string;
  actualTime?: string;
  status: 'COMPLETED' | 'CURRENT' | 'UPCOMING';
  passengerCount: number;
}

const RouteScreen: React.FC = () => {
  const [currentStopIndex, setCurrentStopIndex] = useState(2); // Stop 3 is current

  // Mock route data
  const routeData = {
    routeName: 'City Express',
    routeCode: 'RT-001',
    busNumber: 'B-001',
    tripId: 'TR-2024-015',
    totalStops: 12,
    completedStops: 2,
    distanceCovered: 24,
    totalDistance: 60,
    timeElapsed: '1:15',
    totalTime: '3:00',
    nextStopETA: '08:45 AM',
  };

  // Mock stops data
  const [stops, setStops] = useState<Stop[]>([
    { id: '1', number: 1, name: 'Main Terminal', scheduledTime: '07:00', actualTime: '07:02', status: 'COMPLETED', passengerCount: 12 },
    { id: '2', number: 2, name: 'City Mall', scheduledTime: '07:25', actualTime: '07:28', status: 'COMPLETED', passengerCount: 8 },
    { id: '3', number: 3, name: 'University', scheduledTime: '07:45', actualTime: '07:47', status: 'CURRENT', passengerCount: 15 },
    { id: '4', number: 4, name: 'Hospital', scheduledTime: '08:15', status: 'UPCOMING', passengerCount: 5 },
    { id: '5', number: 5, name: 'Airport', scheduledTime: '08:45', status: 'UPCOMING', passengerCount: 7 },
    { id: '6', number: 6, name: 'Industrial Area', scheduledTime: '09:15', status: 'UPCOMING', passengerCount: 3 },
  ]);

  const currentStop = stops[currentStopIndex];

  const handleMarkReached = () => {
    const updatedStops = [...stops];
    updatedStops[currentStopIndex] = {
      ...updatedStops[currentStopIndex],
      status: 'COMPLETED',
      actualTime: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).slice(0, 5),
    };

    if (currentStopIndex < stops.length - 1) {
      updatedStops[currentStopIndex + 1].status = 'CURRENT';
      setCurrentStopIndex(prev => prev + 1);
    }

    setStops(updatedStops);

    Alert.alert(
      'Stop Reached',
      `You have reached ${currentStop.name}. ${currentStop.passengerCount} passengers to board.`,
      [{ text: 'OK' }]
    );
  };

  const handlePrevStop = () => {
    if (currentStopIndex > 0) {
      setCurrentStopIndex(prev => prev - 1);
    }
  };

  const handleNextStop = () => {
    if (currentStopIndex < stops.length - 1) {
      setCurrentStopIndex(prev => prev + 1);
    }
  };

  const handleSOS = () => {
    Alert.alert(
      '🚨 EMERGENCY ALERT',
      'Are you sure you want to send an SOS alert? Your location will be shared with emergency contacts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'SEND SOS',
          style: 'destructive',
          onPress: () => {
            Alert.alert('SOS Sent', 'Emergency services have been notified. Help is on the way.');
          }
        }
      ]
    );
  };

  const renderStopItem = (stop: Stop) => {
    let statusIndicator = '○';
    let statusColor = '#666666';
    let statusText = 'Upcoming';

    switch (stop.status) {
      case 'COMPLETED':
        statusIndicator = '✓';
        statusColor = '#4CAF50';
        statusText = `Reached at ${stop.actualTime}`;
        break;
      case 'CURRENT':
        statusIndicator = '→';
        statusColor = '#2196F3';
        statusText = 'Current Stop';
        break;
      case 'UPCOMING':
        statusIndicator = '○';
        statusColor = '#666666';
        statusText = `Scheduled: ${stop.scheduledTime}`;
        break;
    }

    return (
      <View key={stop.id} style={styles.stopItem}>
        <View style={styles.stopNumberContainer}>
          <View style={[styles.stopNumberCircle, { borderColor: statusColor }]}>
            <Text style={[styles.stopNumber, { color: statusColor }]}>{stop.number}</Text>
          </View>
          {stop.number < stops.length && (
            <View style={[styles.verticalLine, { backgroundColor: statusColor }]} />
          )}
        </View>

        <View style={styles.stopInfo}>
          <Text style={styles.stopName}>
            {stop.status === 'CURRENT' && '📍 '}{stop.name}
          </Text>
          <Text style={[styles.stopStatus, { color: statusColor }]}>
            {statusIndicator} {statusText}
          </Text>
          <Text style={styles.passengerInfo}>
            👥 {stop.passengerCount} passengers
          </Text>
        </View>
      </View>
    );
  };

  const calculateProgress = () => {
    return (routeData.distanceCovered / routeData.totalDistance) * 100;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1A237E" barStyle="light-content" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.routeTitle}>{routeData.routeName}</Text>
          <Text style={styles.routeSubtitle}>
            {routeData.routeCode} • Bus: {routeData.busNumber}
          </Text>
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.currentTime}>
            {new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Simple Map Representation */}
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapTitle}>📍 Route Map</Text>
            <Text style={styles.mapSubtitle}>City Express Route</Text>

            {/* Simple map visualization */}
            <View style={styles.simpleMap}>
              {/* Route line */}
              <View style={styles.routeLine} />

              {/* Stops */}
              {stops.map((stop, index) => (
                <View
                  key={stop.id}
                  style={[
                    styles.mapStop,
                    {
                      left: `${(index / (stops.length - 1)) * 80}%`,
                      backgroundColor: stop.status === 'CURRENT' ? '#2196F3' :
                                     stop.status === 'COMPLETED' ? '#4CAF50' : '#E0E0E0'
                    }
                  ]}
                >
                  <Text style={styles.mapStopNumber}>{stop.number}</Text>
                </View>
              ))}

              {/* Driver position */}
              <View style={[styles.driverPosition, { left: `${(currentStopIndex / (stops.length - 1)) * 80}%` }]}>
                <Text style={styles.driverEmoji}>🚌</Text>
              </View>
            </View>

            {/* Map legend */}
            <View style={styles.mapLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#2196F3' }]} />
                <Text style={styles.legendText}>Current Stop</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.legendText}>Completed</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#E0E0E0' }]} />
                <Text style={styles.legendText}>Upcoming</Text>
              </View>
            </View>
          </View>

          {/* SOS Button (Always visible) */}
          <TouchableOpacity style={styles.sosButton} onPress={handleSOS}>
            <Text style={styles.sosButtonText}>🆘 SOS</Text>
          </TouchableOpacity>
        </View>

        {/* Current Stop Section */}
        <View style={styles.currentStopSection}>
          <Text style={styles.sectionTitle}>📍 CURRENT STOP</Text>

          <View style={styles.currentStopCard}>
            <View style={styles.stopHeader}>
              <Text style={styles.stopNumberLarge}>#{currentStop.number}</Text>
              <Text style={styles.stopNameLarge}>{currentStop.name}</Text>
            </View>

            <View style={styles.stopTiming}>
              <View style={styles.timingItem}>
                <Text style={styles.timingLabel}>Scheduled</Text>
                <Text style={styles.timingValue}>{currentStop.scheduledTime}</Text>
              </View>
              <View style={styles.timingDivider} />
              <View style={styles.timingItem}>
                <Text style={styles.timingLabel}>Actual</Text>
                <Text style={styles.timingValue}>
                  {currentStop.actualTime || '--:--'}
                </Text>
              </View>
            </View>

            <Text style={styles.passengerAlert}>
              👥 {currentStop.passengerCount} passengers waiting to board
            </Text>

            {/* Control Buttons */}
            <View style={styles.controlButtons}>
              <TouchableOpacity
                style={[styles.controlButton, styles.prevButton]}
                onPress={handlePrevStop}
                disabled={currentStopIndex === 0}
              >
                <Text style={styles.controlButtonText}>← PREV STOP</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, styles.reachedButton]}
                onPress={handleMarkReached}
              >
                <Text style={styles.reachedButtonText}>✓ MARK REACHED</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, styles.nextButton]}
                onPress={handleNextStop}
                disabled={currentStopIndex === stops.length - 1}
              >
                <Text style={styles.controlButtonText}>NEXT STOP →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* All Stops List */}
        <View style={styles.stopsSection}>
          <Text style={styles.sectionTitle}>🗺️ ALL STOPS ({stops.length})</Text>
          <View style={styles.stopsList}>
            {stops.map(renderStopItem)}
          </View>
        </View>

        {/* Trip Progress */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>📊 TRIP PROGRESS</Text>

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.tripId}>Trip ID: {routeData.tripId}</Text>
              <Text style={styles.progressPercentage}>
                {Math.round(calculateProgress())}%
              </Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${calculateProgress()}%` }
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>Start</Text>
                <Text style={styles.progressLabel}>End</Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{routeData.distanceCovered} km</Text>
                <Text style={styles.statLabel}>Distance Covered</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{routeData.timeElapsed}</Text>
                <Text style={styles.statLabel}>Time Elapsed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{routeData.nextStopETA}</Text>
                <Text style={styles.statLabel}>Next Stop ETA</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  topBar: {
    backgroundColor: '#1A237E',
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  routeSubtitle: {
    fontSize: 14,
    color: '#E3F2FD',
    marginTop: 2,
  },
  timeContainer: {
    alignItems: 'flex-end',
  },
  currentTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  mapContainer: {
    position: 'relative',
    margin: 16,
  },
  mapPlaceholder: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  mapSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  simpleMap: {
    height: 120,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    marginBottom: 16,
    position: 'relative',
  },
  routeLine: {
    position: 'absolute',
    top: 60,
    left: '10%',
    right: '10%',
    height: 3,
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },
  mapStop: {
    position: 'absolute',
    top: 50,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  mapStopNumber: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  driverPosition: {
    position: 'absolute',
    top: 30,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverEmoji: {
    fontSize: 30,
  },
  mapLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666666',
  },
  sosButton: {
    position: 'absolute',
    bottom: -20,
    right: 20,
    backgroundColor: '#F44336',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sosButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  currentStopSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
  },
  currentStopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stopNumberLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginRight: 12,
  },
  stopNameLarge: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A237E',
    flex: 1,
  },
  stopTiming: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  timingItem: {
    flex: 1,
    alignItems: 'center',
  },
  timingLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  timingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  timingDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  passengerAlert: {
    fontSize: 14,
    color: '#FF9800',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    textAlign: 'center',
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reachedButton: {
    backgroundColor: '#4CAF50',
  },
  nextButton: {
    backgroundColor: '#4A90E2',
  },
  controlButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  reachedButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stopsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  stopsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stopItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stopNumberContainer: {
    width: 40,
    alignItems: 'center',
  },
  stopNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stopNumber: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  verticalLine: {
    width: 2,
    flex: 1,
  },
  stopInfo: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 4,
  },
  stopStatus: {
    fontSize: 13,
    marginBottom: 4,
  },
  passengerInfo: {
    fontSize: 12,
    color: '#666666',
  },
  progressSection: {
    marginHorizontal: 16,
    marginBottom: 32,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tripId: {
    fontSize: 14,
    color: '#666666',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  progressBarContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 12,
    color: '#666666',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
});

export default RouteScreen;
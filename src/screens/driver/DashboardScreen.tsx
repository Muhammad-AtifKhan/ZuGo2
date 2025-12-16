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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';

type DashboardScreenProps = {
  navigation: StackNavigationProp<any>;
};

interface Duty {
  id: string;
  busNumber: string;
  busModel: string;
  routeName: string;
  timeSlot: string;
  passengers: string;
  status: 'UPCOMING' | 'READY' | 'ACTIVE' | 'COMPLETED';
  startTime: string;
  endTime: string;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const [driverStatus, setDriverStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [currentDate] = useState(new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));
  const [currentTime] = useState(new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }));

  // Mock duties data
  const [duties, setDuties] = useState<Duty[]>([
    {
      id: '1',
      busNumber: 'B-001',
      busModel: 'Hino 200',
      routeName: 'City Express',
      timeSlot: '8:00 AM - 12:00 PM',
      passengers: '35/40',
      status: 'ACTIVE',
      startTime: '08:00',
      endTime: '12:00'
    },
    {
      id: '2',
      busNumber: 'B-002',
      busModel: 'Toyota Coaster',
      routeName: 'University Shuttle',
      timeSlot: '1:00 PM - 4:00 PM',
      passengers: '28/35',
      status: 'UPCOMING',
      startTime: '13:00',
      endTime: '16:00'
    },
    {
      id: '3',
      busNumber: 'B-001',
      busModel: 'Hino 200',
      routeName: 'Night Service',
      timeSlot: '6:00 PM - 10:00 PM',
      passengers: '20/40',
      status: 'UPCOMING',
      startTime: '18:00',
      endTime: '22:00'
    }
  ]);

  const handleStartDuty = (dutyId: string) => {
    const duty = duties.find(d => d.id === dutyId);
    if (duty) {
      if (duty.status === 'ACTIVE') {
        Alert.alert(
          'Duty Already Active',
          `You are already on duty for ${duty.routeName}.`,
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        'Start Duty',
        `Start duty for ${duty.busNumber} - ${duty.routeName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Duty',
            onPress: () => {
              // Navigate to vehicle check first
              navigation.navigate('VehicleCheck', { dutyId });
            }
          }
        ]
      );
    }
  };

  const handleViewDetails = (dutyId: string) => {
    const duty = duties.find(d => d.id === dutyId);
    if (duty) {
      Alert.alert(
        'Duty Details',
        `Bus: ${duty.busNumber}\n` +
        `Model: ${duty.busModel}\n` +
        `Route: ${duty.routeName}\n` +
        `Time: ${duty.timeSlot}\n` +
        `Passengers: ${duty.passengers}\n` +
        `Status: ${duty.status}`,
        [{ text: 'OK' }]
      );
    }
  };

  const getStatusColor = (status: Duty['status']) => {
    switch (status) {
      case 'ACTIVE': return '#4CAF50';
      case 'UPCOMING': return '#2196F3';
      case 'READY': return '#FF9800';
      case 'COMPLETED': return '#9E9E9E';
      default: return '#666666';
    }
  };

  const getStatusEmoji = (status: Duty['status']) => {
    switch (status) {
      case 'ACTIVE': return '🚌';
      case 'UPCOMING': return '⏰';
      case 'READY': return '✅';
      case 'COMPLETED': return '🏁';
      default: return '🔘';
    }
  };

  const renderDutyCard = (duty: Duty) => {
    return (
      <View key={duty.id} style={styles.dutyCard}>
        <View style={styles.dutyHeader}>
          <View style={styles.busInfo}>
            <Text style={styles.busNumber}>{duty.busNumber}</Text>
            <Text style={styles.busModel}>{duty.busModel}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(duty.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(duty.status) }]}>
              {getStatusEmoji(duty.status)} {duty.status}
            </Text>
          </View>
        </View>

        <View style={styles.dutyDetails}>
          <Text style={styles.routeName}>📍 {duty.routeName}</Text>
          <Text style={styles.timeSlot}>🕒 {duty.timeSlot}</Text>
          <Text style={styles.passengerCount}>👥 Passengers: {duty.passengers}</Text>
        </View>

        <View style={styles.dutyActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.startButton,
              duty.status === 'ACTIVE' && styles.disabledButton
            ]}
            onPress={() => handleStartDuty(duty.id)}
            disabled={duty.status === 'ACTIVE'}
          >
            <Text style={[
              styles.actionButtonText,
              duty.status === 'ACTIVE' && styles.disabledButtonText
            ]}>
              {duty.status === 'ACTIVE' ? 'ON DUTY' : 'START DUTY'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => handleViewDetails(duty.id)}
          >
            <Text style={styles.viewButtonText}>VIEW DETAILS</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const quickActions = [
    { id: 1, title: 'Start Next Duty', emoji: '🚀', action: () => {
        const nextDuty = duties.find(d => d.status === 'UPCOMING' || d.status === 'READY');
        if (nextDuty) handleStartDuty(nextDuty.id);
      }},
    { id: 2, title: 'End Current Duty', emoji: '🛑', action: () => {
        const activeDuty = duties.find(d => d.status === 'ACTIVE');
        if (activeDuty) {
          Alert.alert(
            'End Duty',
            `End duty for ${activeDuty.routeName}?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'End Duty',
                onPress: () => {
                  setDuties(prev => prev.map(d =>
                    d.id === activeDuty.id ? { ...d, status: 'COMPLETED' } : d
                  ));
                  Alert.alert('Duty Ended', 'Duty has been marked as completed.');
                }
              }
            ]
          );
        } else {
          Alert.alert('No Active Duty', 'You are not currently on any active duty.');
        }
      }},
    { id: 3, title: 'Report Delay', emoji: '⏳', action: () => Alert.alert('Report Delay', 'Feature coming soon!') },
    { id: 4, title: 'Check Vehicle', emoji: '🔧', action: () => navigation.navigate('VehicleCheck') },
    { id: 5, title: 'View All Duties', emoji: '📋', action: () => Alert.alert('All Duties', 'Feature coming soon!') },
    { id: 6, title: 'Contact Dispatcher', emoji: '📞', action: () => Alert.alert('Contact', 'Calling dispatcher...') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.welcomeText}>Welcome, Driver Ali! 👋</Text>
          <View style={styles.statusRow}>
            <View style={[
              styles.driverStatusBadge,
              { backgroundColor: driverStatus === 'ACTIVE' ? '#4CAF50' : '#FF9800' }
            ]}>
              <Text style={styles.driverStatusText}>
                {driverStatus === 'ACTIVE' ? '✅ ACTIVE' : '⏸️ INACTIVE'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setDriverStatus(prev => prev === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}>
              <Text style={styles.toggleStatusText}>Tap to toggle</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.timeContainer}>
          <Text style={styles.dateText}>{currentDate}</Text>
          <Text style={styles.timeText}>{currentTime}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Today's Duties Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📋 TODAY'S DUTIES ({duties.length})</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {duties.map(renderDutyCard)}
        </View>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ QUICK ACTIONS</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map(action => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionCard}
                onPress={action.action}
              >
                <Text style={styles.quickActionEmoji}>{action.emoji}</Text>
                <Text style={styles.quickActionText}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Upcoming Duties Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📅 UPCOMING DUTIES (Next 3 Days)</Text>
          </View>

          <View style={styles.upcomingCard}>
            <View style={styles.upcomingDay}>
              <Text style={styles.upcomingDayTitle}>Tomorrow</Text>
              <Text style={styles.upcomingDuty}>B-003 • Airport Express • 9:00 AM - 1:00 PM</Text>
            </View>

            <View style={styles.upcomingDay}>
              <Text style={styles.upcomingDayTitle}>Day After</Text>
              <Text style={styles.upcomingDuty}>B-001 • City Express • 8:00 AM - 12:00 PM</Text>
              <Text style={styles.upcomingDuty}>B-002 • University Shuttle • 1:00 PM - 4:00 PM</Text>
            </View>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Trips This Week</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>$1,250</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>4.8</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
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
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  driverStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  driverStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  toggleStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    opacity: 0.8,
    textDecorationLine: 'underline',
  },
  timeContainer: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  timeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  seeAllText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
  },
  dutyCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  dutyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  busInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  busNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  busModel: {
    fontSize: 14,
    color: '#666666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dutyDetails: {
    marginBottom: 16,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 4,
  },
  timeSlot: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  passengerCount: {
    fontSize: 14,
    color: '#666666',
  },
  dutyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4A90E2',
  },
  viewButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  viewButtonText: {
    color: '#4A90E2',
    fontWeight: '600',
    fontSize: 14,
  },
  disabledButtonText: {
    color: '#9E9E9E',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionCard: {
    width: '31%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A237E',
    textAlign: 'center',
  },
  upcomingCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  upcomingDay: {
    marginBottom: 16,
  },
  upcomingDayTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 8,
  },
  upcomingDuty: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 4,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
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

export default DashboardScreen;
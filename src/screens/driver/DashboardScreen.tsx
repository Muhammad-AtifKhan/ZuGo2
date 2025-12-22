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
import { DrawerNavigationProp } from '@react-navigation/drawer'; // یہ تبدیل کریں

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

type DashboardScreenProps = {
  navigation: DrawerNavigationProp<RootDrawerParamList, 'Main'>; // یہ تبدیل کریں
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

  // More duties for "See All" view
  const [allDuties, setAllDuties] = useState<Duty[]>([
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
    },
    {
      id: '4',
      busNumber: 'B-003',
      busModel: 'Toyota Hiace',
      routeName: 'Airport Express',
      timeSlot: '9:00 AM - 1:00 PM',
      passengers: '15/20',
      status: 'COMPLETED',
      startTime: '09:00',
      endTime: '13:00'
    },
    {
      id: '5',
      busNumber: 'B-004',
      busModel: 'Suzuki Bus',
      routeName: 'Downtown Loop',
      timeSlot: '3:00 PM - 6:00 PM',
      passengers: '30/35',
      status: 'COMPLETED',
      startTime: '15:00',
      endTime: '18:00'
    },
    {
      id: '6',
      busNumber: 'B-001',
      busModel: 'Hino 200',
      routeName: 'Industrial Zone',
      timeSlot: '7:00 AM - 10:00 AM',
      passengers: '25/40',
      status: 'READY',
      startTime: '07:00',
      endTime: '10:00'
    }
  ]);

  const [showAllDuties, setShowAllDuties] = useState(false);

  const handleStartDuty = (dutyId: string) => {
    const duty = allDuties.find(d => d.id === dutyId);
    if (duty) {
      if (duty.status === 'ACTIVE') {
        // If duty is already active, navigate to Route screen
        Alert.alert(
          'Duty Already Active',
          `You are already on duty for ${duty.routeName}. Navigating to route...`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to Route tab
                navigation.navigate('Route');
              }
            }
          ]
        );
        return;
      }

      Alert.alert(
        'Start Duty',
        `Start duty for ${duty.busNumber} - ${duty.routeName}?\n\nTime: ${duty.timeSlot}\nPassengers: ${duty.passengers}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Duty',
            onPress: () => {
              // Navigate to VehicleCheck screen
              navigation.navigate('VehicleCheck', {
                dutyId,
                dutyDetails: {
                  busNumber: duty.busNumber,
                  routeName: duty.routeName,
                  timeSlot: duty.timeSlot
                }
              });

              // Update duty status to ACTIVE
              const updatedDuties = allDuties.map(d =>
                d.id === dutyId ? { ...d, status: 'ACTIVE' as const } : d
              );
              setAllDuties(updatedDuties);
              setDuties(updatedDuties.slice(0, 3));
            }
          }
        ]
      );
    }
  };

  const handleViewDetails = (dutyId: string) => {
    const duty = allDuties.find(d => d.id === dutyId);
    if (duty) {
      Alert.alert(
        'Duty Details',
        `🚌 Bus: ${duty.busNumber}\n` +
        `📱 Model: ${duty.busModel}\n` +
        `📍 Route: ${duty.routeName}\n` +
        `🕒 Time: ${duty.timeSlot}\n` +
        `👥 Passengers: ${duty.passengers}\n` +
        `📊 Status: ${duty.status}\n` +
        `⏰ Start: ${duty.startTime}\n` +
        `🛑 End: ${duty.endTime}`,
        [
          { text: 'Close', style: 'cancel' },
          {
            text: 'Start This Duty',
            onPress: () => handleStartDuty(dutyId)
          }
        ]
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
              duty.status === 'ACTIVE' ? styles.activeButton : styles.startButton,
              (duty.status === 'COMPLETED' || duty.status === 'READY') && styles.disabledButton
            ]}
            onPress={() => {
              if (duty.status === 'ACTIVE') {
                // Navigate to Route screen if duty is active
                navigation.navigate('Route');
              } else {
                handleStartDuty(duty.id);
              }
            }}
            disabled={duty.status === 'COMPLETED' || duty.status === 'READY'}
          >
            <Text style={[
              styles.actionButtonText,
              duty.status === 'ACTIVE' && styles.activeButtonText,
              (duty.status === 'COMPLETED' || duty.status === 'READY') && styles.disabledButtonText
            ]}>
              {duty.status === 'ACTIVE' ? 'GO TO ROUTE' :
               duty.status === 'COMPLETED' ? 'COMPLETED' :
               duty.status === 'READY' ? 'READY' : 'START DUTY'}
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
    {
      id: 1,
      title: 'Start Next Duty',
      emoji: '🚀',
      action: () => {
        const nextDuty = allDuties.find(d => d.status === 'UPCOMING' || d.status === 'READY');
        if (nextDuty) {
          handleStartDuty(nextDuty.id);
        } else {
          Alert.alert(
            'No Upcoming Duties',
            'There are no upcoming duties to start. Check your schedule for future duties.',
            [{ text: 'OK' }]
          );
        }
      }
    },
    {
      id: 2,
      title: 'End Current Duty',
      emoji: '🛑',
      action: () => {
        const activeDuty = allDuties.find(d => d.status === 'ACTIVE');
        if (activeDuty) {
          Alert.alert(
            'End Duty',
            `Are you sure you want to end duty for ${activeDuty.routeName}?\n\nThis will:\n• Stop location tracking\n• Calculate trip summary\n• Return to dashboard`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'End Duty',
                onPress: () => {
                  const updatedDuties = allDuties.map(d =>
                    d.id === activeDuty.id ? { ...d, status: 'COMPLETED' } : d
                  );
                  setAllDuties(updatedDuties);
                  setDuties(updatedDuties.slice(0, 3));

                  // Show trip summary
                  Alert.alert(
                    'Duty Completed Successfully!',
                    `🚌 Bus: ${activeDuty.busNumber}\n` +
                    `📍 Route: ${activeDuty.routeName}\n` +
                    `🕒 Duration: ${activeDuty.timeSlot}\n` +
                    `👥 Passengers: ${activeDuty.passengers}\n` +
                    `💰 Estimated Earnings: $${(Math.random() * 100 + 50).toFixed(2)}\n\n` +
                    `Trip summary has been saved to your records.`,
                    [
                      {
                        text: 'View Earnings',
                        onPress: () => navigation.navigate('Earnings')
                      },
                      { text: 'OK' }
                    ]
                  );
                }
              }
            ]
          );
        } else {
          Alert.alert('No Active Duty', 'You are not currently on any active duty.');
        }
      }
    },
    {
      id: 3,
      title: 'Report Delay',
      emoji: '⏳',
      action: () => {
        Alert.alert(
          'Report Delay',
          'Select delay reason:',
          [
            {
              text: 'Traffic Congestion',
              onPress: () => {
                Alert.alert(
                  'Delay Reported',
                  'Traffic congestion delay has been reported to passengers and dispatcher.',
                  [{ text: 'OK' }]
                );
              }
            },
            {
              text: 'Mechanical Issue',
              onPress: () => {
                Alert.alert(
                  'Delay Reported',
                  'Mechanical issue delay has been reported. Maintenance team has been notified.',
                  [{ text: 'OK' }]
                );
              }
            },
            {
              text: 'Weather Conditions',
              onPress: () => {
                Alert.alert(
                  'Delay Reported',
                  'Weather conditions delay has been reported to all passengers.',
                  [{ text: 'OK' }]
                );
              }
            },
            {
              text: 'Other Reason',
              onPress: () => {
                Alert.prompt(
                  'Report Delay',
                  'Enter delay reason:',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Submit',
                      onPress: (reason) => {
                        if (reason) {
                          Alert.alert(
                            'Delay Reported',
                            `Delay reason "${reason}" has been reported successfully.`,
                            [{ text: 'OK' }]
                          );
                        }
                      }
                    }
                  ]
                );
              }
            },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    },
    {
      id: 4,
      title: 'Check Vehicle',
      emoji: '🔧',
      action: () => {
        navigation.navigate('VehicleCheck');
      }
    },
    {
      id: 5,
      title: 'View All Duties',
      emoji: '📋',
      action: () => {
        setShowAllDuties(true);
        Alert.alert(
          'All Duties',
          'Showing all duties for today.',
          [{ text: 'OK' }]
        );
      }
    },
    {
      id: 6,
      title: 'Contact Dispatcher',
      emoji: '📞',
      action: () => {
        Alert.alert(
          'Contact Dispatcher',
          'Choose contact method:',
          [
            {
              text: 'Call Dispatcher',
              onPress: () => {
                Alert.alert(
                  'Calling Dispatcher',
                  'Connecting to dispatcher...',
                  [{ text: 'OK' }]
                );
              }
            },
            {
              text: 'Send Message',
              onPress: () => {
                Alert.prompt(
                  'Message Dispatcher',
                  'Enter your message:',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Send',
                      onPress: (message) => {
                        if (message) {
                          Alert.alert(
                            'Message Sent',
                            'Your message has been sent to the dispatcher.',
                            [{ text: 'OK' }]
                          );
                        }
                      }
                    }
                  ]
                );
              }
            },
            {
              text: 'Emergency Contact',
              onPress: () => navigation.navigate('Emergency')
            },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    },
  ];

  const displayDuties = showAllDuties ? allDuties : duties;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            style={styles.menuButton}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
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
              <TouchableOpacity onPress={() => {
                setDriverStatus(prev => prev === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
                Alert.alert(
                  'Status Changed',
                  `Driver status changed to ${driverStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}`,
                  [{ text: 'OK' }]
                );
              }}>
                <Text style={styles.toggleStatusText}>Tap to toggle</Text>
              </TouchableOpacity>
            </View>
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
            <Text style={styles.sectionTitle}>
              📋 {showAllDuties ? 'ALL DUTIES' : 'TODAY\'S DUTIES'} ({displayDuties.length})
            </Text>
            <TouchableOpacity onPress={() => {
              if (showAllDuties) {
                setShowAllDuties(false);
              } else {
                setShowAllDuties(true);
              }
            }}>
              <Text style={styles.seeAllText}>
                {showAllDuties ? 'SHOW LESS' : 'SEE ALL'}
              </Text>
            </TouchableOpacity>
          </View>

          {displayDuties.map(renderDutyCard)}

          {showAllDuties && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowAllDuties(false)}
            >
              <Text style={styles.backButtonText}>⬅ BACK TO TODAY'S DUTIES</Text>
            </TouchableOpacity>
          )}
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
            <TouchableOpacity onPress={() => navigation.navigate('Schedule')}>
              <Text style={styles.seeAllText}>View Schedule</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.upcomingCard}>
            <View style={styles.upcomingDay}>
              <Text style={styles.upcomingDayTitle}>Tomorrow</Text>
              <Text style={styles.upcomingDuty}>B-003 • Airport Express • 9:00 AM - 1:00 PM</Text>
              <TouchableOpacity
                style={styles.scheduleButton}
                onPress={() => Alert.alert('Schedule', 'Feature coming soon!')}
              >
                <Text style={styles.scheduleButtonText}>VIEW DETAILS</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.upcomingDay}>
              <Text style={styles.upcomingDayTitle}>Day After</Text>
              <Text style={styles.upcomingDuty}>B-001 • City Express • 8:00 AM - 12:00 PM</Text>
              <Text style={styles.upcomingDuty}>B-002 • University Shuttle • 1:00 PM - 4:00 PM</Text>
              <TouchableOpacity
                style={styles.scheduleButton}
                onPress={() => navigation.navigate('Schedule')}
              >
                <Text style={styles.scheduleButtonText}>VIEW SCHEDULE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Earnings')}
          >
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Trips This Week</Text>
            <Text style={styles.statSubtext}>Tap to view</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Earnings')}
          >
            <Text style={styles.statValue}>$1,250</Text>
            <Text style={styles.statLabel}>Earnings</Text>
            <Text style={styles.statSubtext}>This week</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => Alert.alert('Ratings', 'View your passenger ratings and feedback.')}
          >
            <Text style={styles.statValue}>4.8</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
            <Text style={styles.statSubtext}>120 reviews</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Navigation */}
        <View style={styles.quickNavSection}>
          <Text style={styles.sectionTitle}>🚗 QUICK NAVIGATION</Text>
          <View style={styles.quickNavGrid}>
            <TouchableOpacity
              style={styles.quickNavItem}
              onPress={() => navigation.navigate('Boarding')}
            >
              <Text style={styles.quickNavEmoji}>👥</Text>
              <Text style={styles.quickNavText}>Passenger Boarding</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickNavItem}
              onPress={() => navigation.navigate('Route')}
            >
              <Text style={styles.quickNavEmoji}>🗺️</Text>
              <Text style={styles.quickNavText}>Route Navigation</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickNavItem}
              onPress={() => navigation.navigate('Emergency')}
            >
              <Text style={styles.quickNavEmoji}>🆘</Text>
              <Text style={styles.quickNavText}>Emergency</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickNavItem}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.quickNavEmoji}>👤</Text>
              <Text style={styles.quickNavText}>My Profile</Text>
            </TouchableOpacity>
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
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 24,
    color: '#FFFFFF',
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
  activeButton: {
    backgroundColor: '#4CAF50',
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
  activeButtonText: {
    color: '#FFFFFF',
  },
  viewButtonText: {
    color: '#4A90E2',
    fontWeight: '600',
    fontSize: 14,
  },
  disabledButtonText: {
    color: '#9E9E9E',
  },
  backButton: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  backButtonText: {
    color: '#4A90E2',
    fontWeight: '600',
    fontSize: 14,
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
  scheduleButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  scheduleButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
  statSubtext: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  quickNavSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickNavGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickNavItem: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  quickNavEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickNavText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A237E',
    textAlign: 'center',
  },
});

export default DashboardScreen;
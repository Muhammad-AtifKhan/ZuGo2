import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl,
} from 'react-native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// ❌ YE LINE DELETE KARO - import { useAuth } from '../../context/AuthContext';

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
  navigation: DrawerNavigationProp<RootDrawerParamList, 'Main'>;
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
  busId: string;
  routeId: string;
  driverId: string;
  date: string;
  bookedSeats: number;
  totalSeats: number;
}

interface DriverStats {
  totalTrips: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  onlineHours: number;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  // ✅ DIRECT FIREBASE AUTH - useAuth ki jagah
  const user = auth().currentUser;

  const [driverStatus, setDriverStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [currentDate] = useState(new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }));

  // Firebase states
  const [duties, setDuties] = useState<Duty[]>([]);
  const [allDuties, setAllDuties] = useState<Duty[]>([]);
  const [showAllDuties, setShowAllDuties] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverStats, setDriverStats] = useState<DriverStats>({
    totalTrips: 0,
    totalEarnings: 0,
    averageRating: 0,
    totalReviews: 0,
    onlineHours: 0,
  });
  const [driverName, setDriverName] = useState('');

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }));
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Fetch driver data
  useEffect(() => {
    if (!user) return;

    const fetchDriverData = async () => {
      try {
        setLoading(true);

        // Get driver details from users collection
        const userDoc = await firestore().collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          setDriverName(userDoc.data()?.fullName || 'Driver');
        }

        // Get driver profile from drivers collection
        const driverDoc = await firestore().collection('drivers').doc(user.uid).get();
        if (driverDoc.exists) {
          const driverData = driverDoc.data();
          setDriverStatus(driverData?.status === 'on-duty' ? 'ACTIVE' : 'INACTIVE');

          // Set driver stats
          setDriverStats({
            totalTrips: driverData?.totalRides || 0,
            totalEarnings: driverData?.totalEarnings || 0,
            averageRating: driverData?.rating || 0,
            totalReviews: driverData?.totalRatings || 0,
            onlineHours: driverData?.onlineHours || 0,
          });
        }

        // Listen to today's trips
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        const unsubscribeTrips = firestore()
          .collection('trips')
          .where('driverId', '==', user.uid)
          .where('date', '==', today)
          .orderBy('departureTime', 'asc')
          .onSnapshot(
            (snapshot) => {
              const tripsData: Duty[] = [];
              snapshot.forEach(doc => {
                const data = doc.data();
                tripsData.push({
                  id: doc.id,
                  busNumber: data.busNumber || 'N/A',
                  busModel: data.busModel || 'Standard Bus',
                  routeName: data.routeName || 'Unknown Route',
                  timeSlot: `${data.departureTime} - ${data.arrivalTime}`,
                  passengers: `${data.bookedSeats || 0}/${data.totalSeats || 0}`,
                  status: mapTripStatus(data.status),
                  startTime: data.departureTime || '00:00',
                  endTime: data.arrivalTime || '00:00',
                  busId: data.busId || '',
                  routeId: data.routeId || '',
                  driverId: data.driverId || '',
                  date: data.date || today,
                  bookedSeats: data.bookedSeats || 0,
                  totalSeats: data.totalSeats || 0,
                });
              });

              setAllDuties(tripsData);
              setDuties(tripsData.slice(0, 3)); // First 3 for today's view
              setLoading(false);
              setRefreshing(false);
            },
            (error) => {
              console.error('Error fetching trips:', error);
              Alert.alert('Error', 'Failed to load trips data');
              setLoading(false);
              setRefreshing(false);
            }
          );

        return () => unsubscribeTrips();
      } catch (error) {
        console.error('Error fetching driver data:', error);
        Alert.alert('Error', 'Failed to load driver data');
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchDriverData();
  }, [user]);

  // Map trip status from Firebase to local status
  const mapTripStatus = (firebaseStatus: string): Duty['status'] => {
    switch (firebaseStatus) {
      case 'scheduled':
        return 'UPCOMING';
      case 'ready':
        return 'READY';
      case 'in-progress':
        return 'ACTIVE';
      case 'completed':
        return 'COMPLETED';
      default:
        return 'UPCOMING';
    }
  };

  // Map local status to Firebase status
  const mapToFirebaseStatus = (localStatus: Duty['status']): string => {
    switch (localStatus) {
      case 'UPCOMING':
        return 'scheduled';
      case 'READY':
        return 'ready';
      case 'ACTIVE':
        return 'in-progress';
      case 'COMPLETED':
        return 'completed';
      default:
        return 'scheduled';
    }
  };

  // Toggle driver status
  const toggleDriverStatus = async () => {
    if (!user) return;

    const newStatus = driverStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const firebaseStatus = newStatus === 'ACTIVE' ? 'on-duty' : 'offline';

    try {
      await firestore().collection('drivers').doc(user.uid).update({
        status: firebaseStatus,
        lastStatusUpdate: firestore.FieldValue.serverTimestamp(),
      });

      setDriverStatus(newStatus);

      Alert.alert(
        'Status Updated',
        `You are now ${newStatus === 'ACTIVE' ? 'ACTIVE (Ready for duties)' : 'INACTIVE (Offline)'}`,
        [{ text: 'OK' }]
      );

      // If becoming active, check for any active duty
      if (newStatus === 'ACTIVE') {
        const activeDuty = allDuties.find(d => d.status === 'ACTIVE');
        if (activeDuty) {
          Alert.alert(
            'Active Duty Found',
            `You have an active duty for ${activeDuty.routeName}. Would you like to continue?`,
            [
              { text: 'Later', style: 'cancel' },
              {
                text: 'Go to Route',
                onPress: () => navigation.navigate('Route', { tripId: activeDuty.id })
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  // Handle start duty
  const handleStartDuty = async (dutyId: string) => {
    const duty = allDuties.find(d => d.id === dutyId);
    if (!duty || !user) return;

    try {
      if (duty.status === 'ACTIVE') {
        // Navigate to Route screen if already active
        navigation.navigate('Route', { tripId: duty.id });
        return;
      }

      Alert.alert(
        'Start Duty',
        `Start duty for ${duty.busNumber} - ${duty.routeName}?\n\nTime: ${duty.timeSlot}\nPassengers: ${duty.passengers}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Duty',
            onPress: async () => {
              try {
                // Update trip status in Firebase
                await firestore().collection('trips').doc(duty.id).update({
                  status: 'in-progress',
                  actualStartTime: firestore.FieldValue.serverTimestamp(),
                });

                // Update bus status
                await firestore().collection('buses').doc(duty.busId).update({
                  status: 'active',
                  currentTripId: duty.id,
                });

                // Update driver status
                await firestore().collection('drivers').doc(user.uid).update({
                  status: 'on-duty',
                  currentTripId: duty.id,
                });

                // Navigate to VehicleCheck screen
                navigation.navigate('VehicleCheck', {
                  dutyId: duty.id,
                  dutyDetails: {
                    busNumber: duty.busNumber,
                    routeName: duty.routeName,
                    timeSlot: duty.timeSlot
                  }
                });

              } catch (error) {
                console.error('Error starting duty:', error);
                Alert.alert('Error', 'Failed to start duty');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleStartDuty:', error);
      Alert.alert('Error', 'Failed to process duty start');
    }
  };

  // Handle end duty
  const handleEndDuty = async () => {
    if (!user) return;

    const activeDuty = allDuties.find(d => d.status === 'ACTIVE');
    if (!activeDuty) {
      Alert.alert('No Active Duty', 'You are not currently on any active duty.');
      return;
    }

    Alert.alert(
      'End Duty',
      `Are you sure you want to end duty for ${activeDuty.routeName}?\n\nThis will:\n• Stop location tracking\n• Calculate trip summary\n• Return to dashboard`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Duty',
          onPress: async () => {
            try {
              // Calculate earnings (mock for now)
              const estimatedEarnings = Math.floor(Math.random() * 100 + 50);

              // Update trip status
              await firestore().collection('trips').doc(activeDuty.id).update({
                status: 'completed',
                actualEndTime: firestore.FieldValue.serverTimestamp(),
                earnings: estimatedEarnings,
              });

              // Update bus status
              await firestore().collection('buses').doc(activeDuty.busId).update({
                status: 'available',
                currentTripId: null,
              });

              // Update driver stats
              await firestore().collection('drivers').doc(user.uid).update({
                status: 'online',
                currentTripId: null,
                totalRides: firestore.FieldValue.increment(1),
                totalEarnings: firestore.FieldValue.increment(estimatedEarnings),
              });

              // Show trip summary
              Alert.alert(
                'Duty Completed Successfully!',
                `🚌 Bus: ${activeDuty.busNumber}\n` +
                `📍 Route: ${activeDuty.routeName}\n` +
                `🕒 Duration: ${activeDuty.timeSlot}\n` +
                `👥 Passengers: ${activeDuty.passengers}\n` +
                `💰 Earnings: $${estimatedEarnings}\n\n` +
                `Trip summary has been saved to your records.`,
                [
                  {
                    text: 'View Earnings',
                    onPress: () => navigation.navigate('Earnings')
                  },
                  { text: 'OK' }
                ]
              );

            } catch (error) {
              console.error('Error ending duty:', error);
              Alert.alert('Error', 'Failed to end duty');
            }
          }
        }
      ]
    );
  };

  // Handle report delay
  const handleReportDelay = () => {
    Alert.alert(
      'Report Delay',
      'Select delay reason:',
      [
        {
          text: 'Traffic Congestion',
          onPress: async () => {
            if (user) {
              try {
                await firestore().collection('delays').add({
                  driverId: user.uid,
                  reason: 'Traffic Congestion',
                  timestamp: firestore.FieldValue.serverTimestamp(),
                  status: 'reported',
                });
                Alert.alert('Success', 'Delay reported to passengers and dispatcher.');
              } catch (error) {
                Alert.alert('Error', 'Failed to report delay');
              }
            }
          }
        },
        {
          text: 'Mechanical Issue',
          onPress: async () => {
            if (user) {
              try {
                await firestore().collection('delays').add({
                  driverId: user.uid,
                  reason: 'Mechanical Issue',
                  timestamp: firestore.FieldValue.serverTimestamp(),
                  status: 'reported',
                });
                Alert.alert('Success', 'Maintenance team has been notified.');
              } catch (error) {
                Alert.alert('Error', 'Failed to report issue');
              }
            }
          }
        },
        {
          text: 'Weather Conditions',
          onPress: async () => {
            if (user) {
              try {
                await firestore().collection('delays').add({
                  driverId: user.uid,
                  reason: 'Weather Conditions',
                  timestamp: firestore.FieldValue.serverTimestamp(),
                  status: 'reported',
                });
                Alert.alert('Success', 'Weather delay reported to passengers.');
              } catch (error) {
                Alert.alert('Error', 'Failed to report delay');
              }
            }
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
                  onPress: async (reason) => {
                    if (reason && user) {
                      try {
                        await firestore().collection('delays').add({
                          driverId: user.uid,
                          reason: reason,
                          timestamp: firestore.FieldValue.serverTimestamp(),
                          status: 'reported',
                        });
                        Alert.alert('Success', 'Delay reported successfully.');
                      } catch (error) {
                        Alert.alert('Error', 'Failed to report delay');
                      }
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
  };

  // Handle contact dispatcher
  const handleContactDispatcher = () => {
    Alert.alert(
      'Contact Dispatcher',
      'Choose contact method:',
      [
        {
          text: 'Call Dispatcher',
          onPress: () => {
            Alert.alert('Calling', 'Connecting to dispatcher...');
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
                  onPress: async (message) => {
                    if (message && user) {
                      try {
                        await firestore().collection('messages').add({
                          driverId: user.uid,
                          message: message,
                          timestamp: firestore.FieldValue.serverTimestamp(),
                          read: false,
                          type: 'driver-to-dispatcher',
                        });
                        Alert.alert('Sent', 'Your message has been sent.');
                      } catch (error) {
                        Alert.alert('Error', 'Failed to send message');
                      }
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
  };

  // Quick actions with Firebase integration
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
      action: handleEndDuty
    },
    {
      id: 3,
      title: 'Report Delay',
      emoji: '⏳',
      action: handleReportDelay
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
      }
    },
    {
      id: 6,
      title: 'Contact Dispatcher',
      emoji: '📞',
      action: handleContactDispatcher
    },
  ];

  // Get status color
  const getStatusColor = (status: Duty['status']) => {
    switch (status) {
      case 'ACTIVE': return '#4CAF50';
      case 'UPCOMING': return '#2196F3';
      case 'READY': return '#FF9800';
      case 'COMPLETED': return '#9E9E9E';
      default: return '#666666';
    }
  };

  // Get status emoji
  const getStatusEmoji = (status: Duty['status']) => {
    switch (status) {
      case 'ACTIVE': return '🚌';
      case 'UPCOMING': return '⏰';
      case 'READY': return '✅';
      case 'COMPLETED': return '🏁';
      default: return '🔘';
    }
  };

  // Render duty card
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
                navigation.navigate('Route', { tripId: duty.id });
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
            onPress={() => {
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
                    text: duty.status === 'ACTIVE' ? 'Go to Route' : 'Start This Duty',
                    onPress: () => {
                      if (duty.status === 'ACTIVE') {
                        navigation.navigate('Route', { tripId: duty.id });
                      } else {
                        handleStartDuty(duty.id);
                      }
                    }
                  }
                ]
              );
            }}
          >
            <Text style={styles.viewButtonText}>VIEW DETAILS</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Data will auto-refresh via Firebase listeners
  }, []);

  // Display duties based on showAllDuties
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
            <Text style={styles.welcomeText}>Welcome, {driverName || 'Driver'}! 👋</Text>
            <View style={styles.statusRow}>
              <View style={[
                styles.driverStatusBadge,
                { backgroundColor: driverStatus === 'ACTIVE' ? '#4CAF50' : '#FF9800' }
              ]}>
                <Text style={styles.driverStatusText}>
                  {driverStatus === 'ACTIVE' ? '✅ ACTIVE' : '⏸️ INACTIVE'}
                </Text>
              </View>
              <TouchableOpacity onPress={toggleDriverStatus}>
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

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Today's Duties Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              📋 {showAllDuties ? 'ALL DUTIES' : 'TODAY\'S DUTIES'} ({displayDuties.length})
            </Text>
            <TouchableOpacity onPress={() => setShowAllDuties(!showAllDuties)}>
              <Text style={styles.seeAllText}>
                {showAllDuties ? 'SHOW LESS' : 'SEE ALL'}
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading duties...</Text>
            </View>
          ) : displayDuties.length > 0 ? (
            displayDuties.map(renderDutyCard)
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={styles.emptyTitle}>No Duties Today</Text>
              <Text style={styles.emptyText}>
                You have no scheduled duties for today. Check your schedule for future duties.
              </Text>
            </View>
          )}

          {showAllDuties && displayDuties.length > 0 && (
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
            <Text style={styles.sectionTitle}>📅 UPCOMING DUTIES</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Schedule')}>
              <Text style={styles.seeAllText}>View Schedule</Text>
            </TouchableOpacity>
          </View>

          {allDuties.filter(d => d.status === 'UPCOMING' || d.status === 'READY').length > 0 ? (
            allDuties
              .filter(d => d.status === 'UPCOMING' || d.status === 'READY')
              .slice(0, 3)
              .map(duty => (
                <View key={duty.id} style={styles.upcomingItem}>
                  <View style={styles.upcomingItemLeft}>
                    <Text style={styles.upcomingItemTime}>{duty.startTime}</Text>
                    <Text style={styles.upcomingItemRoute}>{duty.routeName}</Text>
                    <Text style={styles.upcomingItemBus}>{duty.busNumber}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.upcomingItemButton}
                    onPress={() => handleStartDuty(duty.id)}
                  >
                    <Text style={styles.upcomingItemButtonText}>START</Text>
                  </TouchableOpacity>
                </View>
              ))
          ) : (
            <View style={styles.noUpcomingContainer}>
              <Text style={styles.noUpcomingText}>No upcoming duties scheduled</Text>
            </View>
          )}
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Earnings')}
          >
            <Text style={styles.statValue}>{driverStats.totalTrips}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Earnings')}
          >
            <Text style={styles.statValue}>${driverStats.totalEarnings}</Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => Alert.alert('Rating', `Average rating: ${driverStats.averageRating} from ${driverStats.totalReviews} reviews`)}
          >
            <Text style={styles.statValue}>{driverStats.averageRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
            <Text style={styles.statSubtext}>({driverStats.totalReviews})</Text>
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
              <Text style={styles.quickNavText}>Boarding</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickNavItem}
              onPress={() => {
                const activeDuty = allDuties.find(d => d.status === 'ACTIVE');
                if (activeDuty) {
                  navigation.navigate('Route', { tripId: activeDuty.id });
                } else {
                  Alert.alert('No Active Duty', 'Start a duty first to access route navigation.');
                }
              }}
            >
              <Text style={styles.quickNavEmoji}>🗺️</Text>
              <Text style={styles.quickNavText}>Route</Text>
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
              <Text style={styles.quickNavText}>Profile</Text>
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
    fontSize: 18,
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
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
  upcomingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  upcomingItemLeft: {
    flex: 1,
  },
  upcomingItemTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  upcomingItemRoute: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  upcomingItemBus: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  upcomingItemButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  upcomingItemButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  noUpcomingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noUpcomingText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
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
    marginTop: 12,
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
    fontSize: 14,
    fontWeight: '500',
    color: '#1A237E',
  },
});

export default DashboardScreen;
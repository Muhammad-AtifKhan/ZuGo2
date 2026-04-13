// src/screens/transporter/FleetScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { StackNavigationProp } from '@react-navigation/stack';
import { TransporterStackParamList } from '../../navigation/TransporterNavigator';

// Types
import { Bus, BusStatus } from '../../types/fleet.types';

// Constants
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { BUS_STATUS, BUS_STATUS_CONFIG, getBusStatusConfig } from '../../constants/status';

type FleetScreenNavigationProp = StackNavigationProp<TransporterStackParamList, 'Fleet'>;

// Maintenance Schedule Modal Component
const MaintenanceScheduleModal = ({
  visible,
  onClose,
  onSchedule,
  busNumber
}: {
  visible: boolean;
  onClose: () => void;
  onSchedule: (days: number) => void;
  busNumber: string;
}) => {
  const [days, setDays] = useState('7');

  const handleSchedule = () => {
    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of days');
      return;
    }
    onSchedule(daysNum);
    setDays('7');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>📅 Schedule Maintenance</Text>
          <Text style={styles.modalSubtitle}>
            Bus: {busNumber}
          </Text>
          <Text style={styles.modalLabel}>
            Enter number of days from now:
          </Text>
          <TextInput
            style={styles.modalInput}
            value={days}
            onChangeText={setDays}
            keyboardType="numeric"
            placeholder="e.g., 7"
            autoFocus
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={onClose}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalScheduleButton]}
              onPress={handleSchedule}
            >
              <Text style={styles.modalScheduleText}>Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const FleetScreen = () => {
  const navigation = useNavigation<FleetScreenNavigationProp>();
  const route = useRoute();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<BusStatus | 'all'>('all');
  const [transporterName, setTransporterName] = useState('');

  // Maintenance modal state
  const [maintenanceModal, setMaintenanceModal] = useState({
    visible: false,
    bus: null as Bus | null,
  });

  // Use ref to prevent memory leaks
  const listenersRef = useRef<(() => void)[]>([]);

  const user = auth().currentUser;

  // Safe date comparison function
  const isDateExpired = (dateStr?: string | null): boolean => {
    if (!dateStr) return false;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return false;
      return date < new Date();
    } catch (error) {
      return false;
    }
  };

  // Check if date is within 30 days (for expiry warnings)
  const isExpiringSoon = (dateStr?: string | null): boolean => {
    if (!dateStr) return false;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return false;
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      return date > today && date <= thirtyDaysFromNow;
    } catch (error) {
      return false;
    }
  };

  // ✅ Check if bus is on active trip - using status field (no isActive flag)
  const checkBusOnTrip = async (busId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // ✅ Use status instead of isActive flag
      const activeTripsSnapshot = await firestore()
        .collection('trips')
        .where('busId', '==', busId)
        .where('status', 'in', ['in_progress', 'scheduled'])
        .limit(1)
        .get();

      return !activeTripsSnapshot.empty;
    } catch (error) {
      console.error('Error checking bus trip status:', error);
      return false;
    }
  };

  // Open AddBusScreen automatically
  useEffect(() => {
    const params = route.params as any;
    if (params?.openAddBus) {
      handleAddBus();
      navigation.setParams({ openAddBus: false });
    }
  }, [route.params, navigation]);

  // Fetch transporter name
  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            setTransporterName(doc.data()?.fullName || 'Transporter');
          }
        },
        (error) => console.error('Error fetching user:', error)
      );

    listenersRef.current.push(unsubscribe);
    return () => {
      listenersRef.current.forEach(unsub => unsub());
      listenersRef.current = [];
    };
  }, [user]);

  // 🔥 REAL-TIME BUSES LISTENER
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const unsubscribe = firestore()
      .collection('buses')
      .where('transporterId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snapshot) => {
          const busesList = snapshot.docs.map(doc => {
            const data = doc.data();

            // ✅ Map old status to new if needed (for backward compatibility)
            let mappedStatus = data.status;
            if (data.status === 'active') {
              mappedStatus = BUS_STATUS.AVAILABLE;
            }

            return {
              id: doc.id,
              ...data,
              status: mappedStatus,
            } as Bus;
          });

          setBuses(busesList);
          setLoading(false);
          setRefreshing(false);

          // Check for expiring documents
          busesList.forEach(bus => {
            if (isExpiringSoon(bus.insuranceExpiry)) {
              console.log(`⚠️ Insurance expiring soon for bus ${bus.busNumber}`);
            }
            if (isExpiringSoon(bus.fitnessExpiry)) {
              console.log(`⚠️ Fitness expiring soon for bus ${bus.busNumber}`);
            }
          });
        },
        (error) => {
          console.error('Error fetching buses:', error);

          if (error.message?.includes('index')) {
            Alert.alert(
              'Database Index Required',
              'Please create the required index in Firebase Console:\n\n' +
              'Collection: buses\n' +
              'Fields: transporterId (Ascending), createdAt (Descending)',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert('Error', 'Failed to load buses. Please try again.');
          }
          setLoading(false);
          setRefreshing(false);
        }
      );

    listenersRef.current.push(unsubscribe);
    return () => {
      listenersRef.current.forEach(unsub => unsub());
      listenersRef.current = [];
    };
  }, [user]);

  // Manual refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // ✅ Stats calculation with new statuses
  const stats = useMemo(() => ({
    total: buses.length,
    available: buses.filter(b => b.status === BUS_STATUS.AVAILABLE).length,
    onTrip: buses.filter(b => b.status === BUS_STATUS.ON_TRIP).length,
    maintenance: buses.filter(b => b.status === BUS_STATUS.MAINTENANCE).length,
    inactive: buses.filter(b => b.status === BUS_STATUS.INACTIVE).length,
    expiringSoon: buses.filter(b =>
      isExpiringSoon(b.insuranceExpiry) || isExpiringSoon(b.fitnessExpiry)
    ).length,
  }), [buses]);

  // Filtered buses
  const filteredBuses = useMemo(() => {
    if (filter === 'all') return buses;
    return buses.filter(bus => bus.status === filter);
  }, [buses, filter]);

  // Add Bus button handler
  const handleAddBus = () => {
    if (!user) return;
    navigation.navigate('AddBusScreen', {
      mode: 'add',
      transporterId: user?.uid,
    });
  };

  // Bus press handler
  const handleBusPress = (bus: Bus) => {
    if (!user) return;
    navigation.navigate('AddBusScreen', {
      mode: 'edit',
      bus: bus,
    });
  };

  // Details button
  const handleViewDetails = (bus: Bus) => {
    if (!user) return;

    const formatDate = (dateStr: string) => {
      if (!dateStr) return 'N/A';
      return dateStr;
    };

    const insuranceExpired = isDateExpired(bus.insuranceExpiry);
    const fitnessExpired = isDateExpired(bus.fitnessExpiry);
    const insuranceExpiring = isExpiringSoon(bus.insuranceExpiry);
    const fitnessExpiring = isExpiringSoon(bus.fitnessExpiry);

    let warningMessage = '';
    if (insuranceExpired || fitnessExpired) {
      warningMessage = '\n\n⚠️ WARNING:\n';
      if (insuranceExpired) warningMessage += '• Insurance has EXPIRED!\n';
      if (fitnessExpired) warningMessage += '• Fitness certificate has EXPIRED!\n';
    } else if (insuranceExpiring || fitnessExpiring) {
      warningMessage = '\n\n⚠️ REMINDER:\n';
      if (insuranceExpiring) warningMessage += '• Insurance expiring soon\n';
      if (fitnessExpiring) warningMessage += '• Fitness certificate expiring soon\n';
    }

    const statusConfig = getBusStatusConfig(bus.status);

    Alert.alert(
      '🚌 Bus Details',
      `Bus Number: ${bus.busNumber}\n` +
      `Registration: ${bus.registrationNumber}\n` +
      `Make/Model: ${bus.make || 'N/A'} ${bus.model || 'N/A'}\n` +
      `Year: ${bus.year || 'N/A'}\n` +
      `Capacity: ${bus.capacity} seats\n` +
      `Fuel Type: ${bus.fuelType || 'N/A'}\n` +
      `Bus Type: ${bus.busType || 'Standard'}\n` +
      `Status: ${statusConfig.icon} ${statusConfig.label}\n` +
      `Driver: ${bus.driverName || 'Not assigned'}\n` +
      `Insurance Expiry: ${formatDate(bus.insuranceExpiry)} ${insuranceExpired ? '❌ EXPIRED' : insuranceExpiring ? '⚠️ SOON' : ''}\n` +
      `Fitness Expiry: ${formatDate(bus.fitnessExpiry)} ${fitnessExpired ? '❌ EXPIRED' : fitnessExpiring ? '⚠️ SOON' : ''}` +
      warningMessage,
      [
        { text: 'OK', style: 'default' },
        { text: 'Edit Details', onPress: () => handleBusPress(bus) },
      ]
    );
  };

  // Maintenance button with trip validation
  const handleMaintenance = async (bus: Bus) => {
    if (!user) return;

    // Check if bus is on trip
    const isOnTrip = await checkBusOnTrip(bus.id);
    if (isOnTrip) {
      Alert.alert(
        '⛔ Cannot Schedule Maintenance',
        `Bus ${bus.busNumber} is currently on an active trip.\n\nPlease wait for the trip to complete before scheduling maintenance.`
      );
      return;
    }

    Alert.alert(
      '🔧 Maintenance Options',
      `Select maintenance action for ${bus.busNumber}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Schedule Maintenance',
          onPress: () => setMaintenanceModal({ visible: true, bus })
        },
        {
          text: 'Log Maintenance Done',
          onPress: () => logMaintenanceDone(bus)
        },
        {
          text: 'View Maintenance History',
          onPress: () => viewMaintenanceHistory(bus.id)
        }
      ]
    );
  };

  const scheduleMaintenance = async (days: number) => {
    if (!user || !maintenanceModal.bus) return;

    const bus = maintenanceModal.bus;

    try {
      const batch = firestore().batch();

      // Update bus status to maintenance
      batch.update(firestore().collection('buses').doc(bus.id), {
        status: BUS_STATUS.MAINTENANCE,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      // Create maintenance record
      const maintenanceRef = firestore().collection('maintenance').doc();
      batch.set(maintenanceRef, {
        busId: bus.id,
        busNumber: bus.busNumber,
        date: firestore.FieldValue.serverTimestamp(),
        type: 'routine',
        description: `Scheduled maintenance for ${days} days from now`,
        transporterId: user.uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // If bus has a driver, unassign them automatically
      if (bus.driverId) {
        batch.update(firestore().collection('drivers').doc(bus.driverId), {
          busAssignedId: null,
          busNumber: null,
          vehicleAssigned: '',
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();

      Alert.alert(
        '✅ Scheduled',
        `Maintenance scheduled for ${days} days from now\nBus status changed to MAINTENANCE\nDriver has been automatically unassigned.`
      );
    } catch (error) {
      console.error('Error scheduling maintenance:', error);
      Alert.alert('Error', 'Failed to schedule maintenance');
    }
  };

  const logMaintenanceDone = async (bus: Bus) => {
    if (!user) return;

    Alert.alert(
      '✅ Log Maintenance',
      'Confirm maintenance completion?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await firestore()
                .collection('buses')
                .doc(bus.id)
                .update({
                  status: BUS_STATUS.AVAILABLE,
                  updatedAt: firestore.FieldValue.serverTimestamp(),
                });

              await firestore()
                .collection('maintenance')
                .add({
                  busId: bus.id,
                  busNumber: bus.busNumber,
                  date: firestore.FieldValue.serverTimestamp(),
                  type: 'routine',
                  description: 'Regular maintenance completed',
                  transporterId: user.uid,
                  createdAt: firestore.FieldValue.serverTimestamp(),
                });

              Alert.alert(
                '✅ Maintenance Completed',
                'Bus is now AVAILABLE and ready for service.'
              );
            } catch (error) {
              console.error('Error logging maintenance:', error);
              Alert.alert('Error', 'Failed to log maintenance');
            }
          }
        }
      ]
    );
  };

  const viewMaintenanceHistory = async (busId: string) => {
    if (!user) return;

    try {
      const snapshot = await firestore()
        .collection('maintenance')
        .where('busId', '==', busId)
        .orderBy('date', 'desc')
        .limit(5)
        .get();

      if (snapshot.empty) {
        Alert.alert('📋 Maintenance History', 'No maintenance records found.');
        return;
      }

      let historyText = 'Recent Maintenance:\n\n';
      snapshot.docs.forEach((doc, index) => {
        const record = doc.data();
        const date = record.date?.toDate?.().toLocaleDateString('en-PK') || 'N/A';
        historyText += `${index + 1}. ${date}: ${record.description}\n`;
      });

      Alert.alert('📋 Maintenance History', historyText);
    } catch (error) {
      console.error('Error fetching maintenance history:', error);
      Alert.alert('Error', 'Failed to load maintenance history');
    }
  };

  // ✅ Activate/Deactivate button with trip validation
  const handleChangeStatus = async (bus: Bus) => {
    if (!user) return;

    if (bus.status === BUS_STATUS.AVAILABLE) {
      // Check if bus is on trip before deactivating
      const isOnTrip = await checkBusOnTrip(bus.id);
      if (isOnTrip) {
        Alert.alert(
          '⛔ Cannot Deactivate',
          `Bus ${bus.busNumber} is currently on an active trip.\n\nPlease wait for the trip to complete before deactivating.`
        );
        return;
      }

      Alert.alert(
        '⏸️ Deactivate Bus',
        `Are you sure you want to deactivate ${bus.busNumber}?\n\nDriver will be automatically unassigned.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Deactivate',
            style: 'destructive',
            onPress: async () => {
              try {
                const batch = firestore().batch();

                // Deactivate bus
                batch.update(firestore().collection('buses').doc(bus.id), {
                  status: BUS_STATUS.INACTIVE,
                  updatedAt: firestore.FieldValue.serverTimestamp(),
                });

                // Automatically unassign driver
                if (bus.driverId) {
                  batch.update(firestore().collection('drivers').doc(bus.driverId), {
                    busAssignedId: null,
                    busNumber: null,
                    vehicleAssigned: '',
                    updatedAt: firestore.FieldValue.serverTimestamp(),
                  });
                }

                await batch.commit();
                Alert.alert('✅ Deactivated', `${bus.busNumber} has been deactivated and driver unassigned.`);
              } catch (error) {
                console.error('Error deactivating bus:', error);
                Alert.alert('Error', 'Failed to deactivate bus');
              }
            }
          }
        ]
      );
    } else if (bus.status === BUS_STATUS.INACTIVE || bus.status === BUS_STATUS.MAINTENANCE) {
      const actionText = bus.status === BUS_STATUS.INACTIVE ? 'Activate' : 'Return to Service';

      Alert.alert(
        `▶️ ${actionText}`,
        `${actionText} ${bus.busNumber}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: actionText,
            onPress: async () => {
              try {
                await firestore()
                  .collection('buses')
                  .doc(bus.id)
                  .update({
                    status: BUS_STATUS.AVAILABLE,
                    updatedAt: firestore.FieldValue.serverTimestamp(),
                  });

                Alert.alert('✅ Success', `${bus.busNumber} is now AVAILABLE`);
              } catch (error) {
                console.error('Error activating bus:', error);
                Alert.alert('Error', 'Failed to activate bus');
              }
            }
          }
        ]
      );
    }
  };

  // ✅ Get status display using centralized config
  const getStatusDisplay = (status: string) => {
    return getBusStatusConfig(status);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return dateStr;
  };

  // Render bus item
  const renderBusItem = useCallback(({ item: bus }: { item: Bus }) => {
    const insuranceExpired = isDateExpired(bus.insuranceExpiry);
    const fitnessExpired = isDateExpired(bus.fitnessExpiry);
    const insuranceExpiring = isExpiringSoon(bus.insuranceExpiry);
    const fitnessExpiring = isExpiringSoon(bus.fitnessExpiry);
    const hasWarning = insuranceExpired || fitnessExpired || insuranceExpiring || fitnessExpiring;

    const statusConfig = getStatusDisplay(bus.status);
    const isAvailable = bus.status === BUS_STATUS.AVAILABLE;

    return (
      <View key={bus.id} style={[styles.busCard, SHADOWS.medium]}>
        <TouchableOpacity
          style={styles.busInfoSection}
          onPress={() => handleBusPress(bus)}
          activeOpacity={0.7}
        >
          <View style={styles.busHeader}>
            <View style={styles.busInfo}>
              <View style={styles.busTitleRow}>
                <Text style={styles.busNumber}>{bus.busNumber}</Text>
                {hasWarning && (
                  <Text style={styles.warningIcon}>⚠️</Text>
                )}
              </View>
              <Text style={styles.busRegistration}>{bus.registrationNumber}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
              <Text style={styles.statusText}>
                {statusConfig.icon} {statusConfig.label}
              </Text>
            </View>
          </View>

          <View style={styles.busDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Capacity:</Text>
              <Text style={styles.detailValue}>{bus.capacity} seats</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Driver:</Text>
              <Text style={styles.detailValue}>{bus.driverName || 'Not assigned'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Insurance:</Text>
              <Text style={[
                styles.detailValue,
                insuranceExpired ? styles.expiredText :
                insuranceExpiring ? styles.expiringSoonText : null
              ]}>
                {formatDate(bus.insuranceExpiry)}
                {insuranceExpired && ' ❌'}
                {insuranceExpiring && ' ⚠️'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Fitness:</Text>
              <Text style={[
                styles.detailValue,
                fitnessExpired ? styles.expiredText :
                fitnessExpiring ? styles.expiringSoonText : null
              ]}>
                {formatDate(bus.fitnessExpiry)}
                {fitnessExpired && ' ❌'}
                {fitnessExpiring && ' ⚠️'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleViewDetails(bus)}
          >
            <Text style={styles.actionButtonText}>📋 Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleMaintenance(bus)}
          >
            <Text style={styles.actionButtonText}>🔧 Maintain</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              isAvailable ? styles.deactivateButton : styles.activateButton
            ]}
            onPress={() => handleChangeStatus(bus)}
          >
            <Text style={[
              styles.actionButtonText,
              isAvailable ? styles.deactivateText : styles.activateText
            ]}>
              {isAvailable ? '⏸️' : '▶️'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, []);

  // ✅ Filter options with new statuses
  const filterOptions: { id: BusStatus | 'all'; label: string; icon: string; color: string; count: number }[] = [
    { id: 'all', label: 'All', icon: '🚌', color: COLORS.primary, count: stats.total },
    { id: BUS_STATUS.AVAILABLE, label: 'Available', icon: '🟢', color: '#4CAF50', count: stats.available },
    { id: BUS_STATUS.ON_TRIP, label: 'On Trip', icon: '🚌', color: '#2196F3', count: stats.onTrip },
    { id: BUS_STATUS.MAINTENANCE, label: 'Maintenance', icon: '🔧', color: '#FF9800', count: stats.maintenance },
    { id: BUS_STATUS.INACTIVE, label: 'Inactive', icon: '🔴', color: '#F44336', count: stats.inactive },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading fleet data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Maintenance Schedule Modal */}
      <MaintenanceScheduleModal
        visible={maintenanceModal.visible}
        onClose={() => setMaintenanceModal({ visible: false, bus: null })}
        onSchedule={scheduleMaintenance}
        busNumber={maintenanceModal.bus?.busNumber || ''}
      />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🚌 Fleet Management</Text>
          <Text style={styles.subtitle}>{transporterName}</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddBus}
        >
          <Text style={styles.addButtonText}>+ Add Bus</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.statCard,
                { backgroundColor: `${option.color}15` },
                filter === option.id && styles.statCardActive
              ]}
              onPress={() => setFilter(option.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.statIcon}>{option.icon}</Text>
              <Text style={[styles.statValue, { color: option.color }]}>{option.count}</Text>
              <Text style={styles.statLabel}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bus List */}
      {filteredBuses.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Text style={styles.emptyIcon}>🚌</Text>
          <Text style={styles.emptyTitle}>No Buses Found</Text>
          <Text style={styles.emptyText}>
            {filter === 'all'
              ? 'Add your first bus to get started'
              : `No ${filter} buses available`}
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={handleAddBus}
          >
            <Text style={styles.emptyButtonText}>Add Bus</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredBuses}
          keyExtractor={(item) => item.id}
          renderItem={renderBusItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SIZES.sm,
    fontSize: 16,
    color: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.lg,
    backgroundColor: COLORS.primary,
    zIndex: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.greyLight,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.xs,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statCard: {
    minWidth: 85,
    borderRadius: SIZES.md,
    padding: SIZES.sm,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 75,
  },
  statCardActive: {
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    paddingBottom: 30,
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: SIZES.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: SIZES.lg,
  },
  emptyButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.xs,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  busCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    marginBottom: SIZES.sm,
  },
  busInfoSection: {
    padding: SIZES.md,
  },
  busHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  busInfo: {
    flex: 1,
  },
  busTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  busNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginRight: SIZES.xs,
  },
  warningIcon: {
    fontSize: 16,
  },
  busRegistration: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: 20,
    marginLeft: SIZES.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  busDetails: {
    marginBottom: SIZES.xs,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.xs,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  expiredText: {
    color: COLORS.danger,
    fontWeight: '700',
  },
  expiringSoonText: {
    color: COLORS.warning,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.sm,
    marginTop: SIZES.xs,
    paddingHorizontal: SIZES.md,
    paddingBottom: SIZES.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SIZES.xs,
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: SIZES.xs,
    backgroundColor: COLORS.greyLight,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  deactivateButton: {
    backgroundColor: '#FFEBEE',
  },
  activateButton: {
    backgroundColor: '#E8F5E9',
  },
  deactivateText: {
    color: COLORS.danger,
  },
  activateText: {
    color: COLORS.success,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.lg,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SIZES.sm,
  },
  modalSubtitle: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  modalLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SIZES.xs,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    padding: SIZES.sm,
    fontSize: 16,
    marginBottom: SIZES.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.xs,
    marginLeft: SIZES.sm,
  },
  modalCancelButton: {
    backgroundColor: COLORS.greyLight,
  },
  modalScheduleButton: {
    backgroundColor: COLORS.primary,
  },
  modalCancelText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  modalScheduleText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default FleetScreen;
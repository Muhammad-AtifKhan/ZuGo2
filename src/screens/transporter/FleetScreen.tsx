// src/screens/transporter/FleetScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

  const user = auth().currentUser;

  // 🔥 IMPORTANT: useEffect for opening AddBusScreen automatically
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

    return () => unsubscribe();
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
          const busesList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Bus[];

          setBuses(busesList);
          setLoading(false);
          setRefreshing(false);
        },
        (error) => {
          console.error('Error fetching buses:', error);

          if (error.message?.includes('index')) {
            Alert.alert(
              'Database Index Required',
              'Please create the required index in Firebase Console:\n\n' +
              'Collection: buses\n' +
              'Fields: transporterId (Ascending), createdAt (Descending)',
              [
                { text: 'OK' },
                {
                  text: 'Open Console',
                  onPress: () => {
                    // Linking.openURL('https://console.firebase.google.com');
                  }
                }
              ]
            );
          } else {
            Alert.alert('Error', 'Failed to load buses. Please try again.');
          }
          setLoading(false);
          setRefreshing(false);
        }
      );

    return () => unsubscribe();
  }, [user]);

  // Manual refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
  }, []);

  // Stats calculation
  const stats = useMemo(() => ({
    total: buses.length,
    active: buses.filter(b => b.status === 'active').length,
    maintenance: buses.filter(b => b.status === 'maintenance').length,
    inactive: buses.filter(b => b.status === 'inactive').length,
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

    Alert.alert(
      '🚌 Bus Details',
      `Bus Number: ${bus.busNumber}\n` +
      `Registration: ${bus.registrationNumber}\n` +
      `Make/Model: ${bus.make || 'N/A'} ${bus.model || 'N/A'}\n` +
      `Year: ${bus.year || 'N/A'}\n` +
      `Capacity: ${bus.capacity} seats\n` +
      `Fuel Type: ${bus.fuelType || 'N/A'}\n` +
      `Status: ${bus.status.toUpperCase()}\n` +
      `Driver: ${bus.driverName || 'Not assigned'}\n` +
      `Insurance Expiry: ${formatDate(bus.insuranceExpiry)}\n` +
      `Fitness Expiry: ${formatDate(bus.fitnessExpiry)}`,
      [
        { text: 'OK', style: 'default' },
        { text: 'Edit Details', onPress: () => handleBusPress(bus) },
      ]
    );
  };

  // Maintenance button
  const handleMaintenance = (bus: Bus) => {
    if (!user) return;

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
      await firestore()
        .collection('buses')
        .doc(bus.id)
        .update({
          status: 'maintenance',
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      await firestore()
        .collection('maintenance')
        .add({
          busId: bus.id,
          busNumber: bus.busNumber,
          date: firestore.FieldValue.serverTimestamp(),
          type: 'routine',
          description: `Scheduled maintenance for ${days} days from now`,
          transporterId: user.uid,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      Alert.alert(
        '✅ Scheduled',
        `Maintenance scheduled for ${days} days from now\nBus status changed to MAINTENANCE`
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
                  status: 'active',
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
                'Bus is now ACTIVE and ready for service.'
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

  // Activate/Deactivate button
  const handleChangeStatus = (bus: Bus) => {
    if (!user) return;

    if (bus.status === 'active') {
      Alert.alert(
        '⏸️ Deactivate Bus',
        `Are you sure you want to deactivate ${bus.busNumber}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Deactivate',
            style: 'destructive',
            onPress: async () => {
              try {
                await firestore()
                  .collection('buses')
                  .doc(bus.id)
                  .update({
                    status: 'inactive',
                    driverId: null,
                    driverName: null,
                    updatedAt: firestore.FieldValue.serverTimestamp(),
                  });

                if (bus.driverId) {
                  await firestore()
                    .collection('drivers')
                    .doc(bus.driverId)
                    .update({
                      busAssignedId: null,
                      busNumber: null,
                      updatedAt: firestore.FieldValue.serverTimestamp(),
                    });
                }

                Alert.alert('✅ Deactivated', `${bus.busNumber} has been deactivated`);
              } catch (error) {
                console.error('Error deactivating bus:', error);
                Alert.alert('Error', 'Failed to deactivate bus');
              }
            }
          }
        ]
      );
    } else {
      Alert.alert(
        '▶️ Activate Bus',
        `Activate ${bus.busNumber} back to service?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Activate',
            onPress: async () => {
              try {
                await firestore()
                  .collection('buses')
                  .doc(bus.id)
                  .update({
                    status: 'active',
                    updatedAt: firestore.FieldValue.serverTimestamp(),
                  });

                Alert.alert('✅ Activated', `${bus.busNumber} is now active`);
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

  // Assign Driver function (FIXED)
  const handleAssignDriver = async (bus: Bus) => {
    if (!user) return;

    try {
      const driversSnapshot = await firestore()
        .collection('drivers')
        .where('transporterId', '==', user.uid)
        .where('status', 'in', ['online', 'on-duty'])
        .get();

      if (driversSnapshot.empty) {
        Alert.alert('No Drivers', 'No available drivers found.');
        return;
      }

      const drivers = driversSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().fullName,
        status: doc.data().status,
        currentBusId: doc.data().busAssignedId,
      }));

      const alertOptions = drivers.map(driver => ({
        text: `${driver.name} (${driver.status})${driver.currentBusId ? ' - Currently Assigned' : ''}`,
        onPress: async () => {
          try {
            // Remove from previous bus if assigned
            if (driver.currentBusId) {
              await firestore()
                .collection('buses')
                .doc(driver.currentBusId)
                .update({
                  driverId: null,
                  driverName: null,
                  updatedAt: firestore.FieldValue.serverTimestamp(),
                });
            }

            // Assign to new bus
            await firestore()
              .collection('buses')
              .doc(bus.id)
              .update({
                driverId: driver.id,
                driverName: driver.name,
                updatedAt: firestore.FieldValue.serverTimestamp(),
              });

            // Update driver record
            await firestore()
              .collection('drivers')
              .doc(driver.id)
              .update({
                busAssignedId: bus.id,
                busNumber: bus.busNumber,
                updatedAt: firestore.FieldValue.serverTimestamp(),
              });

            Alert.alert('✅ Driver Assigned', `${driver.name} assigned to ${bus.busNumber}`);
          } catch (error) {
            console.error('Error assigning driver:', error);
            Alert.alert('Error', 'Failed to assign driver');
          }
        }
      }));

      Alert.alert(
        '👤 Assign Driver',
        `Select driver for ${bus.busNumber}:`,
        [
          ...alertOptions,
          { text: 'Cancel', style: 'cancel' },
          ...(bus.driverId ? [{
            text: 'Unassign Current Driver',
            onPress: async () => {
              try {
                await firestore()
                  .collection('buses')
                  .doc(bus.id)
                  .update({
                    driverId: null,
                    driverName: null,
                    updatedAt: firestore.FieldValue.serverTimestamp(),
                  });

                await firestore()
                  .collection('drivers')
                  .doc(bus.driverId!)
                  .update({
                    busAssignedId: null,
                    busNumber: null,
                    updatedAt: firestore.FieldValue.serverTimestamp(),
                  });

                Alert.alert('✅ Driver Unassigned', 'Driver removed from bus');
              } catch (error) {
                console.error('Error unassigning driver:', error);
                Alert.alert('Error', 'Failed to unassign driver');
              }
            },
            style: 'destructive'
          }] : [])
        ]
      );
    } catch (error) {
      console.error('Error fetching drivers:', error);
      Alert.alert('Error', 'Failed to load drivers');
    }
  };

  // Status color helper
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return COLORS.success;
      case 'maintenance': return COLORS.warning;
      case 'inactive': return COLORS.danger;
      default: return COLORS.textLight;
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'active': return '🟢';
      case 'maintenance': return '🟡';
      case 'inactive': return '🔴';
      default: return '⚫';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return dateStr;
  };

  // Render bus item
  const renderBusItem = ({ item: bus }: { item: Bus }) => (
    <View key={bus.id} style={[styles.busCard, SHADOWS.medium]}>
      <TouchableOpacity
        style={styles.busInfoSection}
        onPress={() => handleBusPress(bus)}
        activeOpacity={0.7}
      >
        <View style={styles.busHeader}>
          <View style={styles.busInfo}>
            <Text style={styles.busNumber}>{bus.busNumber}</Text>
            <Text style={styles.busRegistration}>{bus.registrationNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(bus.status) }]}>
            <Text style={styles.statusText}>
              {getStatusIcon(bus.status)} {bus.status.toUpperCase()}
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
              bus.insuranceExpiry && new Date(bus.insuranceExpiry) < new Date() ? styles.overdueText : null
            ]}>
              {formatDate(bus.insuranceExpiry)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Fitness:</Text>
            <Text style={[
              styles.detailValue,
              bus.fitnessExpiry && new Date(bus.fitnessExpiry) < new Date() ? styles.overdueText : null
            ]}>
              {formatDate(bus.fitnessExpiry)}
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
          onPress={() => handleAssignDriver(bus)}
        >
          <Text style={styles.actionButtonText}>👤 Driver</Text>
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
            bus.status === 'active' ? styles.deactivateButton : styles.activateButton
          ]}
          onPress={() => handleChangeStatus(bus)}
        >
          <Text style={[
            styles.actionButtonText,
            bus.status === 'active' ? styles.deactivateText : styles.activateText
          ]}>
            {bus.status === 'active' ? '⏸️' : '▶️'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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

      {/* Stats */}
      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={[styles.statCard, SHADOWS.small, filter === 'all' && styles.statCardActive]}
          onPress={() => setFilter('all')}
          activeOpacity={0.7}
        >
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: '#E8F5E8' }, SHADOWS.small, filter === 'active' && styles.statCardActive]}
          onPress={() => setFilter('active')}
          activeOpacity={0.7}
        >
          <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: '#FFF3E0' }, SHADOWS.small, filter === 'maintenance' && styles.statCardActive]}
          onPress={() => setFilter('maintenance')}
          activeOpacity={0.7}
        >
          <Text style={[styles.statValue, { color: COLORS.warning }]}>{stats.maintenance}</Text>
          <Text style={styles.statLabel}>Maintenance</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: '#FFEBEE' }, SHADOWS.small, filter === 'inactive' && styles.statCardActive]}
          onPress={() => setFilter('inactive')}
          activeOpacity={0.7}
        >
          <Text style={[styles.statValue, { color: COLORS.danger }]}>{stats.inactive}</Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 5,
    maxHeight: 100,
  },
  statCard: {
    flex: 1,
    borderRadius: SIZES.md,
    padding: SIZES.sm,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
  },
  statCardActive: {
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
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
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  busInfo: {
    flex: 1,
  },
  busNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  busRegistration: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: 20,
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
  overdueText: {
    color: COLORS.danger,
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
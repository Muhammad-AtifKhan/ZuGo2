// src/screens/transporter/DriversScreen.tsx - IMPROVED VERSION
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { StackNavigationProp } from '@react-navigation/stack';
import { TransporterStackParamList } from '../../navigation/TransporterNavigator';

// Types
import { Driver, DriverStatus } from '../../types/driver.types';

// Constants
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

type DriversScreenNavigationProp = StackNavigationProp<TransporterStackParamList, 'Drivers'>;

// ✅ FIX: Consistent driver status type
type DisplayStatus = 'online' | 'on_trip' | 'offline' | 'on_leave' | 'suspended';

// Enhanced bus type with driver info
type AvailableBus = {
  id: string;
  busNumber: string;
  driverId: string | null;
  driverName: string | null;
};

const DriversScreen = () => {
  const navigation = useNavigation<DriversScreenNavigationProp>();
  const route = useRoute();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<DisplayStatus | 'all' | 'assigned' | 'unassigned'>('all');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [availableBuses, setAvailableBuses] = useState<AvailableBus[]>([]);
  const [transporterName, setTransporterName] = useState('');

  const user = auth().currentUser;

  // Helper function to get initials
  const getInitials = useCallback((name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }, []);

  // ✅ FIX: Map Firebase status to display status
  const getDisplayStatus = useCallback((status: string): DisplayStatus => {
    switch(status) {
      case 'active':
      case 'on-duty':
        return 'on_trip';
      case 'online':
        return 'online';
      case 'inactive':
      case 'offline':
        return 'offline';
      case 'on_leave':
        return 'on_leave';
      case 'suspended':
        return 'suspended';
      default:
        return 'offline';
    }
  }, []);

  // ✅ FIX: Map display status back to Firebase status
  const getFirebaseStatus = useCallback((displayStatus: DisplayStatus): string => {
    switch(displayStatus) {
      case 'on_trip':
        return 'active';
      case 'online':
        return 'online';
      case 'offline':
        return 'inactive';
      case 'on_leave':
        return 'on_leave';
      case 'suspended':
        return 'suspended';
      default:
        return 'inactive';
    }
  }, []);

  // 🔥 IMPORTANT: useEffect for opening AddDriverScreen automatically
  useFocusEffect(
    useCallback(() => {
      const params = route.params as any;
      if (params?.openAddDriver) {
        handleAddDriver();
        navigation.setParams({ openAddDriver: false });
      }
    }, [route.params])
  );

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

  // 🔥 REAL-TIME DRIVERS LISTENER
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Note: Create index in Firebase Console:
    // Collection: drivers
    // Fields: transporterId (Ascending), createdAt (Descending)
    const unsubscribe = firestore()
      .collection('drivers')
      .where('transporterId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snapshot) => {
          const driversList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Driver[];

          setDrivers(driversList);
          setLoading(false);
          setRefreshing(false);
        },
        (error) => {
          console.error('Error fetching drivers:', error);

          if (error.message?.includes('index')) {
            Alert.alert(
              'Database Index Required',
              'Please create the required index in Firebase Console:\n\n' +
              'Collection: drivers\n' +
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
            Alert.alert('Error', 'Failed to load drivers. Please try again.');
          }
          setLoading(false);
          setRefreshing(false);
        }
      );

    return () => unsubscribe();
  }, [user]);

  // 🔥 FETCH AVAILABLE BUSES with driver info
  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestore()
      .collection('buses')
      .where('transporterId', '==', user.uid)
      .where('status', '==', 'active')
      .onSnapshot(
        (snapshot) => {
          const busesList = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              busNumber: data.busNumber,
              driverId: data.driverId || null,
              driverName: data.driverName || null,
            };
          });
          setAvailableBuses(busesList);
        },
        (error) => console.error('Error fetching buses:', error)
      );

    return () => unsubscribe();
  }, [user]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = drivers.length;
    const onTrip = drivers.filter(d => d.status === 'active').length;
    const online = drivers.filter(d => d.status === 'online').length;
    const offline = drivers.filter(d => d.status === 'inactive').length;
    const onLeave = drivers.filter(d => d.status === 'on_leave').length;
    const suspended = drivers.filter(d => d.status === 'suspended').length;
    const assigned = drivers.filter(d => d.busAssignedId).length;
    const unassigned = drivers.filter(d => !d.busAssignedId).length;
    const avgRating = drivers.length > 0
      ? drivers.reduce((sum, d) => sum + (d.rating || 0), 0) / drivers.length
      : 0;

    return { total, onTrip, online, offline, onLeave, suspended, assigned, unassigned, avgRating };
  }, [drivers]);

  // Filter drivers
  const filteredDrivers = useMemo(() => {
    if (filter === 'all') return drivers;
    if (filter === 'assigned') return drivers.filter(d => d.busAssignedId);
    if (filter === 'unassigned') return drivers.filter(d => !d.busAssignedId);

    const firebaseStatus = getFirebaseStatus(filter);
    return drivers.filter(d => d.status === firebaseStatus);
  }, [drivers, filter, getFirebaseStatus]);

  // Manual refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Listeners will auto-update
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Add Driver handler
  const handleAddDriver = () => {
    navigation.navigate('AddDriverScreen', {
      mode: 'add',
      transporterId: user?.uid,
    });
  };

  // Edit Driver handler
  const handleEditDriver = (driver: Driver) => {
    navigation.navigate('AddDriverScreen', {
      mode: 'edit',
      driver: driver,
    });
  };

  // 👤 View Profile handler
  const handleViewProfile = (driver: Driver) => {
    setSelectedDriver(driver);
    setProfileModalVisible(true);
  };

  // 🔧 Assign Bus handler - Optimized
  const handleAssignBus = async (driverId: string, busId: string, busNumber: string) => {
    if (!user) return;

    try {
      // ✅ Direct document access (faster than query)
      const busDoc = await firestore().collection('buses').doc(busId).get();
      const busData = busDoc.data();

      // Check if bus is already assigned to someone else
      if (busData?.driverId && busData.driverId !== driverId) {
        Alert.alert(
          'Bus Already Assigned',
          `Bus ${busNumber} is currently assigned to ${busData.driverName || 'another driver'}. Do you want to reassign it?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reassign',
              onPress: async () => performBusAssignment(driverId, busId, busNumber, busData.driverId)
            }
          ]
        );
      } else {
        await performBusAssignment(driverId, busId, busNumber);
      }
    } catch (error) {
      console.error('Error checking bus status:', error);
      Alert.alert('Error', 'Failed to check bus assignment status');
    }
  };

  const performBusAssignment = async (driverId: string, busId: string, busNumber: string, previousDriverId?: string) => {
    try {
      const batch = firestore().batch();
      const driverData = drivers.find(d => d.id === driverId);

      // 1. Unassign previous driver if exists
      if (previousDriverId) {
        const prevDriverRef = firestore().collection('drivers').doc(previousDriverId);
        batch.update(prevDriverRef, {
          busAssignedId: null,
          vehicleAssigned: '',
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      // 2. Update new driver with bus assignment (only store ID, not number)
      const newDriverRef = firestore().collection('drivers').doc(driverId);
      batch.update(newDriverRef, {
        busAssignedId: busId,
        vehicleAssigned: busNumber, // Keep for backward compatibility
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      // 3. Update bus with new driver assignment
      const busRef = firestore().collection('buses').doc(busId);
      batch.update(busRef, {
        driverId: driverId,
        driverName: driverData?.fullName,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();

      setAssignModalVisible(false);
      Alert.alert('✅ Success', `Bus ${busNumber} assigned to ${driverData?.fullName || 'driver'}`);
    } catch (error) {
      console.error('Error assigning bus:', error);
      Alert.alert('Error', 'Failed to complete bus assignment');
    }
  };

  // Unassign Bus handler - Optimized with direct document reference
  const handleUnassignBus = async (driverId: string, busAssignedId?: string) => {
    if (!user || !busAssignedId) return;

    try {
      const batch = firestore().batch();

      // Update driver - remove bus assignment
      const driverRef = firestore().collection('drivers').doc(driverId);
      batch.update(driverRef, {
        busAssignedId: null,
        vehicleAssigned: '',
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      // Update bus - remove driver assignment (direct document access)
      const busRef = firestore().collection('buses').doc(busAssignedId);
      batch.update(busRef, {
        driverId: null,
        driverName: null,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();

      Alert.alert('Success', 'Bus unassigned from driver');
    } catch (error) {
      console.error('Error unassigning bus:', error);
      Alert.alert('Error', 'Failed to unassign bus');
    }
  };

  // 🔄 Change Status handler
  const handleChangeStatus = async (driverId: string, currentStatus: string, newDisplayStatus: DisplayStatus) => {
    if (!user) return;

    // ✅ Requirement: Prevent manual status change if driver is on-trip
    if (currentStatus === 'active') {
      Alert.alert(
        'Action Restricted',
        'This driver is currently ON-TRIP (on an active trip). Their status will automatically change when the trip ends.'
      );
      return;
    }

    const newFirebaseStatus = getFirebaseStatus(newDisplayStatus);

    try {
      await firestore()
        .collection('drivers')
        .doc(driverId)
        .update({
          status: newFirebaseStatus,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      Alert.alert('Status Updated', `Driver status changed to ${newDisplayStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  // Get next status based on current
  const getNextStatus = useCallback((currentStatus: string): { next: DisplayStatus; label: string; disabled: boolean } => {
    switch(currentStatus) {
      case 'active':
        return { next: 'offline', label: 'On Trip (Locked)', disabled: true };
      case 'online':
        return { next: 'on_trip', label: 'Start Trip', disabled: false };
      case 'inactive':
      case 'offline':
        return { next: 'online', label: 'Go Online', disabled: false };
      case 'on_leave':
        return { next: 'online', label: 'Return from Leave', disabled: false };
      case 'suspended':
        return { next: 'offline', label: 'Suspended (Locked)', disabled: true };
      default:
        return { next: 'online', label: 'Go Online', disabled: false };
    }
  }, []);

  // ✅ FIX: Delete driver with cleanup
  const handleDeleteDriver = async (driver: Driver) => {
    if (!user) return;

    Alert.alert(
      'Delete Driver',
      `Are you sure you want to delete ${driver.fullName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const batch = firestore().batch();

              // If driver has a bus assigned, unassign it first
              if (driver.busAssignedId) {
                const busRef = firestore().collection('buses').doc(driver.busAssignedId);
                batch.update(busRef, {
                  driverId: null,
                  driverName: null,
                  updatedAt: firestore.FieldValue.serverTimestamp(),
                });
              }

              // Delete driver document
              const driverRef = firestore().collection('drivers').doc(driver.id);
              batch.delete(driverRef);

              // Also delete from users collection if exists
              const userRef = firestore().collection('users').doc(driver.id);
              batch.delete(userRef);

              await batch.commit();

              Alert.alert('Success', 'Driver deleted successfully');
            } catch (error) {
              console.error('Error deleting driver:', error);
              Alert.alert('Error', 'Failed to delete driver');
            }
          }
        }
      ]
    );
  };

  // Helper functions
  const getStatusColor = useCallback((status: DisplayStatus) => {
    switch(status) {
      case 'on_trip':
        return COLORS.success;
      case 'online':
        return COLORS.info;
      case 'offline':
        return COLORS.grey;
      case 'on_leave':
        return COLORS.warning;
      case 'suspended':
        return COLORS.danger;
      default:
        return COLORS.textLight;
    }
  }, []);

  const getStatusIcon = useCallback((status: DisplayStatus) => {
    switch(status) {
      case 'on_trip':
        return '🟢';
      case 'online':
        return '🔵';
      case 'offline':
        return '⚫';
      case 'on_leave':
        return '🟡';
      case 'suspended':
        return '🔴';
      default:
        return '⚪';
    }
  }, []);

  const getDisplayStatusText = useCallback((status: DisplayStatus) => {
    return status.replace('_', ' ').toUpperCase();
  }, []);

  const renderStars = useCallback((rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Text key={star} style={styles.star}>
            {star <= (rating || 0) ? '⭐' : '☆'}
          </Text>
        ))}
      </View>
    );
  }, []);

  // ✅ FIX: Render driver item with useCallback for FlatList
  const renderDriverItem = useCallback(({ item: driver }: { item: Driver }) => {
    const displayStatus = getDisplayStatus(driver.status);
    const nextStatus = getNextStatus(driver.status);

    return (
      <View style={[styles.driverCard, SHADOWS.medium]}>
        {/* Driver Info Section - Clickable for edit */}
        <TouchableOpacity
          style={styles.driverInfoSection}
          onPress={() => handleEditDriver(driver)}
          activeOpacity={0.7}
        >
          <View style={styles.driverHeader}>
            <View style={styles.driverAvatar}>
              <Text style={styles.avatarText}>
                {getInitials(driver.fullName)}
              </Text>
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{driver.fullName}</Text>
              <Text style={styles.driverContact}>{driver.contactNumber}</Text>
              {renderStars(driver.rating || 0)}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(displayStatus) }]}>
              <Text style={styles.statusText}>
                {getStatusIcon(displayStatus)} {getDisplayStatusText(displayStatus)}
              </Text>
            </View>
          </View>

          <View style={styles.driverDetails}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>CNIC:</Text>
                <Text style={styles.detailValue}>{driver.cnic}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>License:</Text>
                <Text style={styles.detailValue}>{driver.licenseNumber}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Bus Assigned:</Text>
                <Text style={[
                  styles.detailValue,
                  driver.busAssignedId ? styles.assigned : styles.unassigned
                ]}>
                  {driver.vehicleAssigned || 'Not Assigned'}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Rides:</Text>
                <Text style={styles.detailValue}>{driver.totalRides || 0}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (driver.status === 'active') {
                Alert.alert('Action Restricted', 'Cannot assign or change bus while driver is on an active trip.');
                return;
              }
              setSelectedDriver(driver);
              setAssignModalVisible(true);
            }}
          >
            <Text style={styles.actionButtonText}>
              {driver.busAssignedId ? '🔄 Change Bus' : '🚌 Assign Bus'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleViewProfile(driver)}
          >
            <Text style={styles.actionButtonText}>👤 Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              displayStatus === 'on_trip' ? styles.deactivateButton : styles.activateButton,
              nextStatus.disabled && { opacity: 0.5 }
            ]}
            onPress={() => {
              if (nextStatus.disabled) {
                handleChangeStatus(driver.id, driver.status, nextStatus.next);
              } else {
                handleChangeStatus(driver.id, driver.status, nextStatus.next);
              }
            }}
          >
            <Text style={[
              styles.actionButtonText,
              displayStatus === 'on_trip' ? styles.deactivateText : styles.activateText
            ]}>
              {nextStatus.label}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Unassign Button if bus assigned */}
        {driver.busAssignedId && (
          <TouchableOpacity
            style={styles.unassignButton}
            onPress={() => {
              if (driver.status === 'active') {
                Alert.alert('Action Restricted', 'Cannot unassign bus while driver is on an active trip.');
                return;
              }
              handleUnassignBus(driver.id, driver.busAssignedId);
            }}
          >
            <Text style={styles.unassignButtonText}>❌ Unassign Bus</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [getInitials, getDisplayStatus, getStatusColor, getStatusIcon, getDisplayStatusText, getNextStatus, renderStars]);

  // Profile Modal
  const renderProfileModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={profileModalVisible}
      onRequestClose={() => setProfileModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.profileModalContainer}>
          {selectedDriver && (
            <>
              {/* Profile Header */}
              <View style={styles.profileHeader}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>
                    {getInitials(selectedDriver.fullName)}
                  </Text>
                </View>
                <View style={styles.profileHeaderInfo}>
                  <Text style={styles.profileName}>{selectedDriver.fullName}</Text>
                  <Text style={styles.profileContact}>{selectedDriver.contactNumber}</Text>
                  <View style={styles.profileStatus}>
                    <View style={[
                      styles.statusIndicator,
                      { backgroundColor: getStatusColor(getDisplayStatus(selectedDriver.status)) }
                    ]} />
                    <Text style={styles.profileStatusText}>
                      {getDisplayStatusText(getDisplayStatus(selectedDriver.status))}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Rating */}
              <View style={styles.profileSection}>
                <Text style={styles.profileSectionTitle}>⭐ Rating</Text>
                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingValue}>{selectedDriver.rating || 0}/5</Text>
                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Text key={star} style={styles.profileStar}>
                        {star <= (selectedDriver.rating || 0) ? '⭐' : '☆'}
                      </Text>
                    ))}
                  </View>
                </View>
              </View>

              {/* Personal Information */}
              <View style={styles.profileSection}>
                <Text style={styles.profileSectionTitle}>👤 Personal Information</Text>
                <View style={styles.profileDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email:</Text>
                    <Text style={styles.detailValue}>{selectedDriver.email}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>CNIC:</Text>
                    <Text style={styles.detailValue}>{selectedDriver.cnic}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Address:</Text>
                    <Text style={styles.detailValue}>{selectedDriver.address}</Text>
                  </View>
                </View>
              </View>

              {/* Professional Information */}
              <View style={styles.profileSection}>
                <Text style={styles.profileSectionTitle}>💼 Professional Details</Text>
                <View style={styles.profileDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>License Number:</Text>
                    <Text style={styles.detailValue}>{selectedDriver.licenseNumber}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>License Expiry:</Text>
                    <Text style={styles.detailValue}>{selectedDriver.licenseExpiry}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Joining Date:</Text>
                    <Text style={styles.detailValue}>{selectedDriver.joiningDate}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Monthly Salary:</Text>
                    <Text style={styles.detailValue}>PKR {selectedDriver.salary}</Text>
                  </View>
                </View>
              </View>

              {/* Assignment Information */}
              <View style={styles.profileSection}>
                <Text style={styles.profileSectionTitle}>🚌 Assignment Details</Text>
                <View style={styles.profileDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bus Assigned:</Text>
                    <Text style={[
                      styles.detailValue,
                      selectedDriver.busAssignedId ? styles.assigned : styles.unassigned
                    ]}>
                      {selectedDriver.vehicleAssigned || 'Not Assigned'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total Rides:</Text>
                    <Text style={styles.detailValue}>{selectedDriver.totalRides || 0}</Text>
                  </View>
                </View>
              </View>

              {/* Emergency Contact */}
              <View style={styles.profileSection}>
                <Text style={styles.profileSectionTitle}>🆘 Emergency Contact</Text>
                <View style={styles.profileDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone Number:</Text>
                    <Text style={styles.detailValue}>{selectedDriver.emergencyContact}</Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.profileActions}>
                <TouchableOpacity
                  style={[styles.profileActionButton, styles.editButton]}
                  onPress={() => {
                    setProfileModalVisible(false);
                    handleEditDriver(selectedDriver);
                  }}
                >
                  <Text style={styles.editButtonText}>✏️ Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.profileActionButton, styles.closeButton]}
                  onPress={() => setProfileModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading drivers...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>👤 Driver Management</Text>
          <Text style={styles.subtitle}>{transporterName}</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddDriver}
        >
          <Text style={styles.addButtonText}>+ Add Driver</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.statCard, SHADOWS.small, filter === 'all' && styles.statCardActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#E8F5E8' }, SHADOWS.small, filter === 'on_trip' && styles.statCardActive]}
            onPress={() => setFilter('on_trip')}
          >
            <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.onTrip}</Text>
            <Text style={styles.statLabel}>On Trip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#E3F2FD' }, SHADOWS.small, filter === 'online' && styles.statCardActive]}
            onPress={() => setFilter('online')}
          >
            <Text style={[styles.statValue, { color: COLORS.info }]}>{stats.online}</Text>
            <Text style={styles.statLabel}>Online</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#FFF3E0' }, SHADOWS.small, filter === 'assigned' && styles.statCardActive]}
            onPress={() => setFilter('assigned')}
          >
            <Text style={[styles.statValue, { color: COLORS.warning }]}>{stats.assigned}</Text>
            <Text style={styles.statLabel}>Assigned</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#FFEBEE' }, SHADOWS.small, filter === 'offline' && styles.statCardActive]}
            onPress={() => setFilter('offline')}
          >
            <Text style={[styles.statValue, { color: COLORS.danger }]}>{stats.offline}</Text>
            <Text style={styles.statLabel}>Offline</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'on_trip' && styles.filterButtonActive]}
            onPress={() => setFilter('on_trip')}
          >
            <Text style={[styles.filterText, filter === 'on_trip' && styles.filterTextActive]}>On Trip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'online' && styles.filterButtonActive]}
            onPress={() => setFilter('online')}
          >
            <Text style={[styles.filterText, filter === 'online' && styles.filterTextActive]}>Online</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'offline' && styles.filterButtonActive]}
            onPress={() => setFilter('offline')}
          >
            <Text style={[styles.filterText, filter === 'offline' && styles.filterTextActive]}>Offline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'on_leave' && styles.filterButtonActive]}
            onPress={() => setFilter('on_leave')}
          >
            <Text style={[styles.filterText, filter === 'on_leave' && styles.filterTextActive]}>On Leave</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'assigned' && styles.filterButtonActive]}
            onPress={() => setFilter('assigned')}
          >
            <Text style={[styles.filterText, filter === 'assigned' && styles.filterTextActive]}>Assigned</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'unassigned' && styles.filterButtonActive]}
            onPress={() => setFilter('unassigned')}
          >
            <Text style={[styles.filterText, filter === 'unassigned' && styles.filterTextActive]}>Unassigned</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Driver List - FlatList for better performance */}
      {filteredDrivers.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Text style={styles.emptyIcon}>👤</Text>
          <Text style={styles.emptyTitle}>No Drivers Found</Text>
          <Text style={styles.emptyText}>
            {filter === 'all'
              ? 'Add your first driver to get started'
              : `No ${filter.replace('_', ' ')} drivers available`}
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={handleAddDriver}
          >
            <Text style={styles.emptyButtonText}>Add Driver</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredDrivers}
          keyExtractor={(item) => item.id}
          renderItem={renderDriverItem}
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

      {/* Assign Bus Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={assignModalVisible}
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Assign Bus to {selectedDriver?.fullName}
            </Text>

            <Text style={styles.modalSubtitle}>
              Select a bus to assign:
            </Text>

            <FlatList
              data={availableBuses}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.busOption,
                    selectedDriver?.busAssignedId === item.id && styles.busOptionSelected
                  ]}
                  onPress={() => {
                    if (selectedDriver) {
                      handleAssignBus(selectedDriver.id, item.id, item.busNumber);
                    }
                  }}
                >
                  <Text style={[
                    styles.busOptionText,
                    selectedDriver?.busAssignedId === item.id && styles.busOptionTextSelected
                  ]}>
                    🚌 {item.busNumber}
                  </Text>
                  <Text style={styles.busOptionStatus}>
                    {item.driverId
                      ? `Currently assigned to ${item.driverName}`
                      : 'Available'}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.noBusesContainer}>
                  <Text style={styles.noBusesText}>No active buses available</Text>
                  <TouchableOpacity
                    style={styles.addBusButton}
                    onPress={() => {
                      setAssignModalVisible(false);
                      // @ts-ignore - navigation param type issue
                      navigation.navigate('AddBusScreen', { mode: 'add' });
                    }}
                  >
                    <Text style={styles.addBusButtonText}>+ Add New Bus</Text>
                  </TouchableOpacity>
                </View>
              }
              contentContainerStyle={styles.busList}
            />

            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setAssignModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Profile Modal */}
      {renderProfileModal()}
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
    backgroundColor: COLORS.success,
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SIZES.sm,
  },
  statCard: {
    minWidth: 80,
    borderRadius: SIZES.xs,
    padding: SIZES.xs,
    marginHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    backgroundColor: COLORS.greyLight,
  },
  statCardActive: {
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  filterContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: SIZES.xs,
  },
  filterButton: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: 16,
    backgroundColor: COLORS.greyLight,
    marginHorizontal: 4,
  },
  filterButtonActive: {
    backgroundColor: COLORS.secondary,
  },
  filterText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.white,
  },
  listContent: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
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
  driverCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    marginBottom: SIZES.sm,
  },
  driverInfoSection: {
    padding: SIZES.md,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.sm,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  driverContact: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 12,
    marginRight: 2,
  },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.white,
  },
  driverDetails: {
    marginTop: SIZES.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  assigned: {
    color: COLORS.success,
    fontWeight: '600',
  },
  unassigned: {
    color: COLORS.danger,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.sm,
    paddingHorizontal: SIZES.md,
    paddingBottom: SIZES.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SIZES.xs,
    alignItems: 'center',
    marginHorizontal: 2,
    borderRadius: SIZES.xs,
    backgroundColor: COLORS.greyLight,
  },
  actionButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
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
  unassignButton: {
    backgroundColor: '#FFEBEE',
    paddingVertical: SIZES.xs,
    alignItems: 'center',
    marginHorizontal: SIZES.md,
    marginBottom: SIZES.md,
    borderRadius: SIZES.xs,
    padding: SIZES.xs,
  },
  unassignButtonText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileModalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  profileAvatarText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
  },
  profileHeaderInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  profileContact: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  profileStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  profileStatusText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  profileSection: {
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  profileSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SIZES.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.warning,
    marginRight: SIZES.sm,
  },
  profileStar: {
    fontSize: 18,
    marginRight: 2,
  },
  profileDetails: {
    marginLeft: SIZES.xs,
  },
  profileActions: {
    padding: SIZES.lg,
    flexDirection: 'row',
  },
  profileActionButton: {
    flex: 1,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.xs,
    alignItems: 'center',
    marginHorizontal: SIZES.xs,
  },
  editButton: {
    backgroundColor: COLORS.secondary,
  },
  closeButton: {
    backgroundColor: COLORS.greyLight,
  },
  editButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  closeButtonText: {
    color: COLORS.textLight,
    fontWeight: '600',
    fontSize: 14,
  },
  // Assign Bus Modal
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.lg,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SIZES.md,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: SIZES.md,
    textAlign: 'center',
  },
  busList: {
    maxHeight: 300,
    marginBottom: SIZES.md,
  },
  busOption: {
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    marginBottom: SIZES.xs,
  },
  busOptionSelected: {
    backgroundColor: COLORS.infoLight,
    borderColor: COLORS.secondary,
  },
  busOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  busOptionTextSelected: {
    color: COLORS.primary,
  },
  busOptionStatus: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  noBusesContainer: {
    alignItems: 'center',
    padding: SIZES.lg,
  },
  noBusesText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: SIZES.md,
  },
  addBusButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.xs,
  },
  addBusButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  modalButton: {
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.xs,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.greyLight,
  },
  cancelButtonText: {
    color: COLORS.textLight,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default DriversScreen;
// src/screens/transporter/DriversScreen.tsx
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

const DriversScreen = () => {
  const navigation = useNavigation<DriversScreenNavigationProp>();
  const route = useRoute();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<DriverStatus | 'all' | 'assigned' | 'unassigned'>('all');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [availableBuses, setAvailableBuses] = useState<{id: string, busNumber: string}[]>([]);
  const [transporterName, setTransporterName] = useState('');

  const user = auth().currentUser;

  // Helper function to get initials
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Helper function to map Firebase status to display status
  const getDisplayStatus = (status: string): DriverStatus => {
    switch(status) {
      case 'active': return 'on-duty';
      case 'inactive': return 'offline';
      default: return status as DriverStatus;
    }
  };

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
          Alert.alert('Error', 'Failed to load drivers. Please try again.');
          setLoading(false);
          setRefreshing(false);
        }
      );

    return () => unsubscribe();
  }, [user]);

  // 🔥 FETCH AVAILABLE BUSES for assignment
  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestore()
      .collection('buses')
      .where('transporterId', '==', user.uid)
      .where('status', '==', 'active')
      .onSnapshot(
        (snapshot) => {
          const busesList = snapshot.docs.map(doc => ({
            id: doc.id,
            busNumber: doc.data().busNumber,
          }));
          setAvailableBuses(busesList);
        },
        (error) => console.error('Error fetching buses:', error)
      );

    return () => unsubscribe();
  }, [user]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = drivers.length;
    const onDuty = drivers.filter(d => d.status === 'active').length;
    const online = drivers.filter(d => d.status === 'online').length;
    const offline = drivers.filter(d => d.status === 'inactive' || d.status === 'offline').length;
    const assigned = drivers.filter(d => d.vehicleAssigned).length;
    const unassigned = drivers.filter(d => !d.vehicleAssigned).length;
    const avgRating = drivers.length > 0
      ? drivers.reduce((sum, d) => sum + (d.rating || 0), 0) / drivers.length
      : 0;

    return { total, onDuty, online, offline, assigned, unassigned, avgRating };
  }, [drivers]);

  // Filter drivers
  const filteredDrivers = useMemo(() => {
    if (filter === 'all') return drivers;
    if (filter === 'assigned') return drivers.filter(d => d.vehicleAssigned);
    if (filter === 'unassigned') return drivers.filter(d => !d.vehicleAssigned);
    if (filter === 'on-duty') return drivers.filter(d => d.status === 'active');
    if (filter === 'offline') return drivers.filter(d => d.status === 'inactive' || d.status === 'offline');
    return drivers.filter(d => d.status === filter);
  }, [drivers, filter]);

  // Manual refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Listeners will auto-update
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

  // 🔧 Assign Bus handler
  const handleAssignBus = async (driverId: string, busId: string, busNumber: string) => {
    if (!user) return;

    try {
      // Update driver with bus assignment
      await firestore()
        .collection('drivers')
        .doc(driverId)
        .update({
          vehicleAssigned: busNumber,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      // Update bus with driver assignment
      await firestore()
        .collection('buses')
        .doc(busId)
        .update({
          driverId: driverId,
          driverName: drivers.find(d => d.id === driverId)?.fullName,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      setAssignModalVisible(false);
      Alert.alert('Success', `Bus ${busNumber} assigned to driver`);
    } catch (error) {
      console.error('Error assigning bus:', error);
      Alert.alert('Error', 'Failed to assign bus');
    }
  };

  // Unassign Bus handler
  const handleUnassignBus = async (driverId: string, busNumber?: string) => {
    if (!user || !busNumber) return;

    try {
      // Find bus ID from bus number
      const busSnapshot = await firestore()
        .collection('buses')
        .where('transporterId', '==', user.uid)
        .where('busNumber', '==', busNumber)
        .get();

      // Update driver - remove bus assignment
      await firestore()
        .collection('drivers')
        .doc(driverId)
        .update({
          vehicleAssigned: '',
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      // Update bus - remove driver assignment if found
      if (!busSnapshot.empty) {
        const busDoc = busSnapshot.docs[0];
        await firestore()
          .collection('buses')
          .doc(busDoc.id)
          .update({
            driverId: null,
            driverName: null,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
      }

      Alert.alert('Success', 'Bus unassigned from driver');
    } catch (error) {
      console.error('Error unassigning bus:', error);
      Alert.alert('Error', 'Failed to unassign bus');
    }
  };

  // 🔄 Change Status handler
  const handleChangeStatus = async (driverId: string, newStatus: string) => {
    if (!user) return;

    let firebaseStatus = newStatus;
    if (newStatus === 'on-duty') firebaseStatus = 'active';
    if (newStatus === 'offline') firebaseStatus = 'inactive';

    try {
      await firestore()
        .collection('drivers')
        .doc(driverId)
        .update({
          status: firebaseStatus,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      Alert.alert('Status Updated', `Driver status changed to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  // Get next status based on current
  const getNextStatus = (currentStatus: string): { next: string; label: string } => {
    switch(currentStatus) {
      case 'active':
        return { next: 'inactive', label: 'Go Offline' };
      case 'online':
        return { next: 'active', label: 'Go On Duty' };
      case 'inactive':
      case 'offline':
        return { next: 'online', label: 'Go Online' };
      default:
        return { next: 'online', label: 'Go Online' };
    }
  };

  // Helper functions
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active':
      case 'on-duty':
        return COLORS.success;
      case 'online':
        return COLORS.info;
      case 'inactive':
      case 'offline':
        return COLORS.grey;
      default:
        return COLORS.textLight;
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'active':
      case 'on-duty':
        return '🟢';
      case 'online':
        return '🔵';
      case 'inactive':
      case 'offline':
        return '⚫';
      default:
        return '⚪';
    }
  };

  const getDisplayStatusText = (status: string) => {
    switch(status) {
      case 'active': return 'ON DUTY';
      case 'inactive': return 'OFFLINE';
      default: return status.toUpperCase();
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={styles.star}>
          {i <= rating ? '⭐' : '☆'}
        </Text>
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

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
                      { backgroundColor: getStatusColor(selectedDriver.status) }
                    ]} />
                    <Text style={styles.profileStatusText}>
                      {getDisplayStatusText(selectedDriver.status)}
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
                    <Text style={styles.detailLabel}>Date of Birth:</Text>
                    <Text style={styles.detailValue}>{selectedDriver.dob || 'N/A'}</Text>
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
                      selectedDriver.vehicleAssigned ? styles.assigned : styles.unassigned
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
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={[styles.statCard, SHADOWS.small, filter === 'all' && styles.statCardActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#E8F5E8' }, SHADOWS.small, filter === 'on-duty' && styles.statCardActive]}
            onPress={() => setFilter('on-duty')}
          >
            <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.onDuty}</Text>
            <Text style={styles.statLabel}>On Duty</Text>
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
        </View>
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
            style={[styles.filterButton, filter === 'on-duty' && styles.filterButtonActive]}
            onPress={() => setFilter('on-duty')}
          >
            <Text style={[styles.filterText, filter === 'on-duty' && styles.filterTextActive]}>On Duty</Text>
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

      {/* Driver List */}
      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredDrivers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={styles.emptyTitle}>No Drivers Found</Text>
            <Text style={styles.emptyText}>
              {filter === 'all'
                ? 'Add your first driver to get started'
                : `No ${filter} drivers available`}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleAddDriver}
            >
              <Text style={styles.emptyButtonText}>Add Driver</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredDrivers.map((driver) => {
            const displayStatus = getDisplayStatus(driver.status);
            const nextStatus = getNextStatus(driver.status);

            return (
              <View key={driver.id} style={[styles.driverCard, SHADOWS.medium]}>
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
                        {getStatusIcon(displayStatus)} {getDisplayStatusText(driver.status)}
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
                          driver.vehicleAssigned ? styles.assigned : styles.unassigned
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
                      setSelectedDriver(driver);
                      setAssignModalVisible(true);
                    }}
                  >
                    <Text style={styles.actionButtonText}>
                      {driver.vehicleAssigned ? '🔄 Change Bus' : '🚌 Assign Bus'}
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
                      displayStatus === 'on-duty' ? styles.deactivateButton : styles.activateButton
                    ]}
                    onPress={() => handleChangeStatus(driver.id, nextStatus.next)}
                  >
                    <Text style={[
                      styles.actionButtonText,
                      displayStatus === 'on-duty' ? styles.deactivateText : styles.activateText
                    ]}>
                      {nextStatus.label}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Unassign Button if bus assigned */}
                {driver.vehicleAssigned && (
                  <TouchableOpacity
                    style={styles.unassignButton}
                    onPress={() => handleUnassignBus(driver.id, driver.vehicleAssigned)}
                  >
                    <Text style={styles.unassignButtonText}>❌ Unassign Bus</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

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

            <ScrollView style={styles.busList}>
              {availableBuses.length === 0 ? (
                <View style={styles.noBusesContainer}>
                  <Text style={styles.noBusesText}>No active buses available</Text>
                  <TouchableOpacity
                    style={styles.addBusButton}
                    onPress={() => {
                      setAssignModalVisible(false);
                      navigation.navigate('AddBusScreen', { mode: 'add' });
                    }}
                  >
                    <Text style={styles.addBusButtonText}>+ Add New Bus</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                availableBuses.map((bus) => (
                  <TouchableOpacity
                    key={bus.id}
                    style={[
                      styles.busOption,
                      selectedDriver?.vehicleAssigned === bus.busNumber && styles.busOptionSelected
                    ]}
                    onPress={() => handleAssignBus(selectedDriver?.id, bus.id, bus.busNumber)}
                  >
                    <Text style={[
                      styles.busOptionText,
                      selectedDriver?.vehicleAssigned === bus.busNumber && styles.busOptionTextSelected
                    ]}>
                      🚌 {bus.busNumber}
                    </Text>
                    <Text style={styles.busOptionStatus}>
                      {selectedDriver?.vehicleAssigned === bus.busNumber
                        ? 'Currently Assigned'
                        : 'Click to Assign'}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

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
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: SIZES.xs,
    padding: SIZES.xs,
    marginHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
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
  listContainer: {
    flex: 1,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
  },
  emptyContainer: {
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
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
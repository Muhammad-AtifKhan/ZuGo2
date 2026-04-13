// src/screens/transporter/DriversScreen.tsx - FIXED
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
import { DRIVER_STATUS, DRIVER_STATUS_CONFIG, getDriverStatusConfig } from '../../constants/status';

type DriversScreenNavigationProp = StackNavigationProp<TransporterStackParamList, 'Drivers'>;

const DriversScreen = () => {
  const navigation = useNavigation<DriversScreenNavigationProp>();
  const route = useRoute();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<DriverStatus | 'all' | 'assigned' | 'unassigned'>('all');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [transporterName, setTransporterName] = useState('');

  const user = auth().currentUser;

  // Helper function to get initials
  const getInitials = useCallback((name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }, []);

  // ✅ FIXED: Get display config for a driver (no migration needed for new statuses)
  const getDriverDisplayConfig = useCallback((status: string) => {
    // ✅ Direct mapping - no migration needed since data already has correct status
    // But keep fallback for any legacy data
    let normalizedStatus = status;

    // Handle legacy statuses if they still exist
    if (status === 'active' || status === 'online') {
      normalizedStatus = DRIVER_STATUS.AVAILABLE;
    } else if (status === 'on-duty') {
      normalizedStatus = DRIVER_STATUS.ON_TRIP;
    } else if (status === 'inactive' || status === 'offline') {
      normalizedStatus = DRIVER_STATUS.OFFLINE;
    }

    return getDriverStatusConfig(normalizedStatus);
  }, []);

  // Open AddDriverScreen automatically
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

  // REAL-TIME DRIVERS LISTENER
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const unsubscribe = firestore()
      .collection('drivers')
      .where('transporterId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snapshot) => {
          const driversList = snapshot.docs.map(doc => {
            const data = doc.data();

            // ✅ FIXED: Don't migrate - use status as-is (already "available")
            // Only handle legacy statuses if found
            let status = data.status;
            if (status === 'active' || status === 'online') {
              status = DRIVER_STATUS.AVAILABLE;
            } else if (status === 'on-duty') {
              status = DRIVER_STATUS.ON_TRIP;
            } else if (status === 'inactive' || status === 'offline') {
              status = DRIVER_STATUS.OFFLINE;
            }

            return {
              id: doc.id,
              ...data,
              status: status,
            } as Driver;
          });

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
              [{ text: 'OK' }]
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

  // ✅ Stats calculation with new statuses
  const stats = useMemo(() => {
    const total = drivers.length;
    const available = drivers.filter(d => d.status === DRIVER_STATUS.AVAILABLE).length;
    const onTrip = drivers.filter(d => d.status === DRIVER_STATUS.ON_TRIP).length;
    const offline = drivers.filter(d => d.status === DRIVER_STATUS.OFFLINE).length;
    const onLeave = drivers.filter(d => d.status === DRIVER_STATUS.ON_LEAVE).length;
    const suspended = drivers.filter(d => d.status === DRIVER_STATUS.SUSPENDED).length;
    const assigned = drivers.filter(d => d.busAssignedId || d.vehicleAssigned).length;
    const unassigned = drivers.filter(d => !d.busAssignedId && !d.vehicleAssigned).length;

    return { total, available, onTrip, offline, onLeave, suspended, assigned, unassigned };
  }, [drivers]);

  // Filter drivers
  const filteredDrivers = useMemo(() => {
    if (filter === 'all') return drivers;
    if (filter === 'assigned') return drivers.filter(d => d.busAssignedId || d.vehicleAssigned);
    if (filter === 'unassigned') return drivers.filter(d => !d.busAssignedId && !d.vehicleAssigned);
    return drivers.filter(d => d.status === filter);
  }, [drivers, filter]);

  // Manual refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
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

  // View Profile handler
  const handleViewProfile = (driver: Driver) => {
    setSelectedDriver(driver);
    setProfileModalVisible(true);
  };

  // Delete driver with cleanup
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

  // ✅ Filter options with new statuses
  const filterOptions: { id: DriverStatus | 'all' | 'assigned' | 'unassigned'; label: string; count: number; color: string }[] = [
    { id: 'all', label: 'All', count: stats.total, color: COLORS.primary },
    { id: DRIVER_STATUS.AVAILABLE, label: 'Available', count: stats.available, color: '#2196F3' },
    { id: DRIVER_STATUS.ON_TRIP, label: 'On Trip', count: stats.onTrip, color: '#4CAF50' },
    { id: DRIVER_STATUS.OFFLINE, label: 'Offline', count: stats.offline, color: '#9E9E9E' },
    { id: DRIVER_STATUS.ON_LEAVE, label: 'On Leave', count: stats.onLeave, color: '#FF9800' },
    { id: DRIVER_STATUS.SUSPENDED, label: 'Suspended', count: stats.suspended, color: '#F44336' },
    { id: 'assigned', label: 'Assigned', count: stats.assigned, color: '#9C27B0' },
    { id: 'unassigned', label: 'Unassigned', count: stats.unassigned, color: '#607D8B' },
  ];

  // ✅ FIXED: Render driver item - REMOVED Bus Assigned row
  const renderDriverItem = useCallback(({ item: driver }: { item: Driver }) => {
    const statusConfig = getDriverDisplayConfig(driver.status);

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
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
              <Text style={styles.statusText}>
                {statusConfig.icon} {statusConfig.label}
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

            {/* ✅ REMOVED: Bus Assigned row */}
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Rides:</Text>
                <Text style={styles.detailValue}>{driver.totalRides || 0}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Rating:</Text>
                <Text style={styles.detailValue}>
                  {driver.rating ? `${driver.rating} ★` : 'No ratings'}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Action Buttons - Only Profile and Delete */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.profileButton]}
            onPress={() => handleViewProfile(driver)}
          >
            <Text style={styles.actionButtonText}>👤 Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteDriver(driver)}
          >
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>🗑️ Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [getInitials, getDriverDisplayConfig]);

  // Profile Modal
  const renderProfileModal = () => {
    if (!selectedDriver) return null;

    const statusConfig = getDriverDisplayConfig(selectedDriver.status);

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={profileModalVisible}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.profileModalContainer}>
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
                      { backgroundColor: statusConfig.color }
                    ]} />
                    <Text style={styles.profileStatusText}>
                      {statusConfig.icon} {statusConfig.label}
                    </Text>
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
                    <Text style={styles.detailValue}>{selectedDriver.address || 'N/A'}</Text>
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
                    <Text style={styles.detailValue}>{selectedDriver.licenseExpiry || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Joining Date:</Text>
                    <Text style={styles.detailValue}>{selectedDriver.joiningDate || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Monthly Salary:</Text>
                    <Text style={styles.detailValue}>PKR {selectedDriver.salary || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Experience:</Text>
                    <Text style={styles.detailValue}>{selectedDriver.experienceYears || 0} years</Text>
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
                      (selectedDriver.busAssignedId || selectedDriver.vehicleAssigned) ? styles.assigned : styles.unassigned
                    ]}>
                      {selectedDriver.vehicleAssigned || 'Not Assigned'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total Rides:</Text>
                    <Text style={styles.detailValue}>{selectedDriver.totalRides || 0}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Rating:</Text>
                    <Text style={styles.detailValue}>
                      {selectedDriver.rating ? `${selectedDriver.rating} ★` : 'No ratings'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Emergency Contact */}
              <View style={styles.profileSection}>
                <Text style={styles.profileSectionTitle}>🆘 Emergency Contact</Text>
                <View style={styles.profileDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone Number:</Text>
                    <Text style={styles.detailValue}>{selectedDriver.emergencyContact || 'N/A'}</Text>
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
          </ScrollView>
        </View>
      </Modal>
    );
  };

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
              <Text style={[styles.statValue, { color: option.color }]}>{option.count}</Text>
              <Text style={styles.statLabel}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Filter Pills */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.filterButton,
                filter === option.id && styles.filterButtonActive
              ]}
              onPress={() => setFilter(option.id)}
            >
              <Text style={[
                styles.filterText,
                filter === option.id && styles.filterTextActive
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Driver List */}
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
              : `No ${filter} drivers available`}
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

      {/* Profile Modal */}
      {renderProfileModal()}
    </SafeAreaView>
  );
};

// Styles remain the same as before
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: SIZES.sm, fontSize: 16, color: COLORS.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SIZES.md, paddingVertical: SIZES.lg, backgroundColor: COLORS.primary },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.white },
  subtitle: { fontSize: 14, color: COLORS.greyLight, marginTop: 2 },
  addButton: { backgroundColor: COLORS.success, paddingHorizontal: SIZES.lg, paddingVertical: SIZES.sm, borderRadius: SIZES.xs },
  addButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  statsContainer: { backgroundColor: COLORS.white, paddingVertical: SIZES.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statCard: { minWidth: 80, borderRadius: SIZES.md, padding: SIZES.sm, marginHorizontal: 4, alignItems: 'center', justifyContent: 'center', minHeight: 65 },
  statCardActive: { borderWidth: 2, borderColor: COLORS.secondary },
  statValue: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 11, color: COLORS.textLight, textAlign: 'center' },
  filterContainer: { backgroundColor: COLORS.white, paddingVertical: SIZES.xs, paddingHorizontal: SIZES.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterButton: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs, borderRadius: 16, backgroundColor: COLORS.greyLight, marginHorizontal: 4 },
  filterButtonActive: { backgroundColor: COLORS.secondary },
  filterText: { fontSize: 12, color: COLORS.textLight, fontWeight: '500' },
  filterTextActive: { color: COLORS.white },
  listContent: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, paddingBottom: 30 },
  emptyContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 60, marginBottom: SIZES.md },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginBottom: SIZES.xs },
  emptyText: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginBottom: SIZES.lg },
  emptyButton: { backgroundColor: COLORS.secondary, paddingHorizontal: SIZES.xl, paddingVertical: SIZES.md, borderRadius: SIZES.xs },
  emptyButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 16 },
  driverCard: { backgroundColor: COLORS.white, borderRadius: SIZES.md, marginBottom: SIZES.sm },
  driverInfoSection: { padding: SIZES.md },
  driverHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SIZES.sm },
  driverAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center', marginRight: SIZES.sm },
  avatarText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
  driverContact: { fontSize: 12, color: COLORS.textLight, marginBottom: 4 },
  statusBadge: { paddingHorizontal: SIZES.sm, paddingVertical: SIZES.xs, borderRadius: 16 },
  statusText: { fontSize: 10, fontWeight: '600', color: COLORS.white },
  driverDetails: { marginTop: SIZES.xs },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 11, color: COLORS.textLight, marginBottom: 2 },
  detailValue: { fontSize: 12, color: COLORS.text, fontWeight: '500' },
  assigned: { color: COLORS.success, fontWeight: '600' },
  unassigned: { color: COLORS.danger, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SIZES.sm, paddingHorizontal: SIZES.md, paddingBottom: SIZES.md },
  actionButton: { flex: 1, paddingVertical: SIZES.sm, alignItems: 'center', marginHorizontal: 4, borderRadius: SIZES.xs },
  profileButton: { backgroundColor: '#E3F2FD' },
  deleteButton: { backgroundColor: '#FFEBEE' },
  actionButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.primary, textAlign: 'center' },
  deleteButtonText: { color: COLORS.danger },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  profileModalContainer: { backgroundColor: COLORS.white, borderRadius: SIZES.md, width: '90%', maxWidth: 400, maxHeight: '85%' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', padding: SIZES.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  profileAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center', marginRight: SIZES.md },
  profileAvatarText: { color: COLORS.white, fontSize: 20, fontWeight: '700' },
  profileHeaderInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
  profileContact: { fontSize: 14, color: COLORS.textLight, marginBottom: 4 },
  profileStatus: { flexDirection: 'row', alignItems: 'center' },
  statusIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  profileStatusText: { fontSize: 12, color: COLORS.textLight, fontWeight: '600' },
  profileSection: { padding: SIZES.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  profileSectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: SIZES.sm },
  profileDetails: { marginLeft: SIZES.xs },
  profileActions: { padding: SIZES.lg, flexDirection: 'row' },
  profileActionButton: { flex: 1, paddingVertical: SIZES.sm, borderRadius: SIZES.xs, alignItems: 'center', marginHorizontal: SIZES.xs },
  editButton: { backgroundColor: COLORS.secondary },
  closeButton: { backgroundColor: COLORS.greyLight },
  editButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  closeButtonText: { color: COLORS.textLight, fontWeight: '600', fontSize: 14 },
});

export default DriversScreen;
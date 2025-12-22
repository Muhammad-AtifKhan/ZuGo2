import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

// Mock data for drivers
const mockDrivers = [
  {
    id: '1',
    name: 'Ali Ahmed',
    contact: '+92 300 1234567',
    cnic: '42301-1234567-8',
    license: 'LHR-123456',
    licenseExpiry: '2025-06-15',
    status: 'on-duty',
    busAssigned: 'B-001',
    rating: 4.5,
    tripsCompleted: 120,
    joiningDate: '2023-01-15',
    salary: 45000,
    emergencyContact: '+92 300 9876543',
    address: 'House 123, Street 5, Lahore',
    email: 'ali.ahmed@email.com',
    dob: '1990-05-15',
  },
  {
    id: '2',
    name: 'Ahmed Khan',
    contact: '+92 300 7654321',
    cnic: '42301-7654321-9',
    license: 'LHR-987654',
    licenseExpiry: '2024-12-30',
    status: 'online',
    busAssigned: 'B-003',
    rating: 4.2,
    tripsCompleted: 95,
    joiningDate: '2023-03-20',
    salary: 42000,
    emergencyContact: '+92 300 1122334',
    address: 'Flat 45, Model Town, Lahore',
    email: 'ahmed.khan@email.com',
    dob: '1988-11-22',
  },
  {
    id: '3',
    name: 'Sara Ali',
    contact: '+92 300 9876543',
    cnic: '42301-9876543-2',
    license: 'LHR-456789',
    licenseExpiry: '2025-03-10',
    status: 'offline',
    busAssigned: null,
    rating: 4.8,
    tripsCompleted: 150,
    joiningDate: '2022-11-10',
    salary: 48000,
    emergencyContact: '+92 300 4455667',
    address: 'House 78, Gulberg, Lahore',
    email: 'sara.ali@email.com',
    dob: '1992-03-08',
  },
];

// Available buses for assignment
const availableBuses = ['B-001', 'B-002', 'B-003', 'B-004', 'B-005', 'B-006', 'B-007', 'B-008'];

const DriversScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const [drivers, setDrivers] = useState(mockDrivers);
  const [filter, setFilter] = useState('all'); // all, on-duty, online, offline, assigned, unassigned
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // 🔥 Add Driver handler
  const handleAddDriver = () => {
    navigation.navigate('AddDriverScreen', {
      mode: 'add',
      onSave: (driverData: any) => {
        const newDriverObj = {
          id: (drivers.length + 1).toString(),
          name: driverData.name,
          contact: driverData.contact,
          email: driverData.email || '',
          cnic: driverData.cnic,
          license: driverData.license,
          licenseExpiry: driverData.licenseExpiry || '2024-12-31',
          status: 'offline',
          busAssigned: null,
          rating: 0,
          tripsCompleted: 0,
          joiningDate: new Date().toISOString().split('T')[0],
          salary: parseInt(driverData.salary) || 40000,
          emergencyContact: driverData.emergencyContact || '',
          address: driverData.address || '',
          dob: driverData.dob || '',
        };

        setDrivers([...drivers, newDriverObj]);
        Alert.alert('Success', 'Driver added successfully');
      }
    });
  };

  // 👤 View Profile handler
  const handleViewProfile = (driver: any) => {
    setSelectedDriver(driver);
    setProfileModalVisible(true);
  };

  // 📋 Profile Modal
  const renderProfileModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={profileModalVisible}
      onRequestClose={() => setProfileModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.profileModalContainer}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {selectedDriver?.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.profileHeaderInfo}>
              <Text style={styles.profileName}>{selectedDriver?.name}</Text>
              <Text style={styles.profileContact}>{selectedDriver?.contact}</Text>
              <View style={styles.profileStatus}>
                <View style={[
                  styles.statusIndicator,
                  { backgroundColor: getStatusColor(selectedDriver?.status) }
                ]} />
                <Text style={styles.profileStatusText}>
                  {selectedDriver?.status.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Rating */}
          <View style={styles.profileSection}>
            <Text style={styles.profileSectionTitle}>⭐ Rating</Text>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingValue}>{selectedDriver?.rating}/5</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Text key={star} style={styles.profileStar}>
                    {star <= (selectedDriver?.rating || 0) ? '⭐' : '☆'}
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
                <Text style={styles.detailValue}>{selectedDriver?.email}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>CNIC:</Text>
                <Text style={styles.detailValue}>{selectedDriver?.cnic}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date of Birth:</Text>
                <Text style={styles.detailValue}>{selectedDriver?.dob}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Address:</Text>
                <Text style={styles.detailValue}>{selectedDriver?.address}</Text>
              </View>
            </View>
          </View>

          {/* Professional Information */}
          <View style={styles.profileSection}>
            <Text style={styles.profileSectionTitle}>💼 Professional Details</Text>
            <View style={styles.profileDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>License Number:</Text>
                <Text style={styles.detailValue}>{selectedDriver?.license}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>License Expiry:</Text>
                <Text style={styles.detailValue}>{selectedDriver?.licenseExpiry}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Joining Date:</Text>
                <Text style={styles.detailValue}>{selectedDriver?.joiningDate}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Monthly Salary:</Text>
                <Text style={styles.detailValue}>₹{selectedDriver?.salary?.toLocaleString()}</Text>
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
                  selectedDriver?.busAssigned ? styles.assigned : styles.unassigned
                ]}>
                  {selectedDriver?.busAssigned || 'Not Assigned'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Trips Completed:</Text>
                <Text style={styles.detailValue}>{selectedDriver?.tripsCompleted}</Text>
              </View>
            </View>
          </View>

          {/* Emergency Contact */}
          <View style={styles.profileSection}>
            <Text style={styles.profileSectionTitle}>🆘 Emergency Contact</Text>
            <View style={styles.profileDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Contact Person:</Text>
                <Text style={styles.detailValue}>Emergency Contact</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone Number:</Text>
                <Text style={styles.detailValue}>{selectedDriver?.emergencyContact}</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.profileActions}>
            <TouchableOpacity
              style={[styles.profileActionButton, styles.editButton]}
              onPress={() => {
                setProfileModalVisible(false);
                navigation.navigate('AddDriverScreen', {
                  mode: 'edit',
                  driver: selectedDriver,
                  onSave: (updatedDriverData: any) => {
                    setDrivers(drivers.map(d =>
                      d.id === selectedDriver.id ? { ...d, ...updatedDriverData } : d
                    ));
                    Alert.alert('Success', 'Driver updated successfully');
                  }
                });
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
        </ScrollView>
      </View>
    </Modal>
  );

  // 🔧 Assign Bus handler
  const handleAssignBus = (driverId: string, busNumber: string) => {
    setDrivers(drivers.map(driver =>
      driver.id === driverId ? { ...driver, busAssigned: busNumber } : driver
    ));
    setAssignModalVisible(false);
    Alert.alert('Success', `Bus ${busNumber} assigned to driver`);
  };

  // 🔄 Change Status handler
  const handleChangeStatus = (driverId: string, newStatus: string) => {
    setDrivers(drivers.map(driver =>
      driver.id === driverId ? { ...driver, status: newStatus } : driver
    ));
    Alert.alert('Status Updated', `Driver status changed to ${newStatus}`);
  };

  // 📊 Stats calculation
  const stats = {
    total: drivers.length,
    onDuty: drivers.filter(d => d.status === 'on-duty').length,
    online: drivers.filter(d => d.status === 'online').length,
    offline: drivers.filter(d => d.status === 'offline').length,
    assigned: drivers.filter(d => d.busAssigned !== null).length,
    unassigned: drivers.filter(d => d.busAssigned === null).length,
  };

  // Filter drivers based on status
  const filteredDrivers = drivers.filter(driver => {
    if (filter === 'all') return true;
    if (filter === 'assigned') return driver.busAssigned !== null;
    if (filter === 'unassigned') return driver.busAssigned === null;
    return driver.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'on-duty': return '#4CAF50';
      case 'online': return '#2196F3';
      case 'offline': return '#9E9E9E';
      default: return '#666666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'on-duty': return '🟢';
      case 'online': return '🔵';
      case 'offline': return '⚫';
      default: return '⚪';
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>👤 Driver Management</Text>
          <Text style={styles.subtitle}>Manage drivers and assignments</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddDriver}
        >
          <Text style={styles.addButtonText}>+ Add Driver</Text>
        </TouchableOpacity>
      </View>

      {/* Stats - COMPACT VERSION */}
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={[styles.statCard, filter === 'all' && styles.statCardActive]}
            onPress={() => setFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#E8F5E8' }, filter === 'on-duty' && styles.statCardActive]}
            onPress={() => setFilter('on-duty')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.onDuty}</Text>
            <Text style={styles.statLabel}>On Duty</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#E3F2FD' }, filter === 'online' && styles.statCardActive]}
            onPress={() => setFilter('online')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statValue, { color: '#2196F3' }]}>{stats.online}</Text>
            <Text style={styles.statLabel}>Online</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#FFF3E0' }, filter === 'assigned' && styles.statCardActive]}
            onPress={() => setFilter('assigned')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statValue, { color: '#FF9800' }]}>{stats.assigned}</Text>
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
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {filteredDrivers.map((driver) => (
          <View key={driver.id} style={styles.driverCard}>
            {/* Driver Info Section - Clickable for edit */}
            <TouchableOpacity
              style={styles.driverInfoSection}
              onPress={() => navigation.navigate('AddDriverScreen', {
                mode: 'edit',
                driver: driver,
                onSave: (updatedDriverData: any) => {
                  setDrivers(drivers.map(d =>
                    d.id === driver.id ? { ...d, ...updatedDriverData } : d
                  ));
                  Alert.alert('Success', 'Driver updated successfully');
                }
              })}
              activeOpacity={0.7}
            >
              <View style={styles.driverHeader}>
                <View style={styles.driverAvatar}>
                  <Text style={styles.avatarText}>
                    {driver.name.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{driver.name}</Text>
                  <Text style={styles.driverContact}>{driver.contact}</Text>
                  {renderStars(driver.rating)}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(driver.status) }]}>
                  <Text style={styles.statusText}>
                    {getStatusIcon(driver.status)} {driver.status.toUpperCase()}
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
                    <Text style={styles.detailValue}>{driver.license}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Bus Assigned:</Text>
                    <Text style={[
                      styles.detailValue,
                      driver.busAssigned ? styles.assigned : styles.unassigned
                    ]}>
                      {driver.busAssigned || 'Not Assigned'}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Trips:</Text>
                    <Text style={styles.detailValue}>{driver.tripsCompleted}</Text>
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
                  {driver.busAssigned ? '🔄 Change Bus' : '🚌 Assign Bus'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleViewProfile(driver)}
              >
                <Text style={styles.actionButtonText}>👤 Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  const newStatus = driver.status === 'on-duty' ? 'offline' :
                                  driver.status === 'online' ? 'on-duty' : 'online';
                  handleChangeStatus(driver.id, newStatus);
                }}
              >
                <Text style={styles.actionButtonText}>
                  {driver.status === 'on-duty' ? '⏸️ Off Duty' :
                   driver.status === 'online' ? '🟢 Go On Duty' : '🔵 Go Online'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
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
              Assign Bus to {selectedDriver?.name}
            </Text>

            <Text style={styles.modalSubtitle}>
              Select a bus to assign:
            </Text>

            <ScrollView style={styles.busList}>
              {availableBuses.map((busNumber) => (
                <TouchableOpacity
                  key={busNumber}
                  style={[
                    styles.busOption,
                    selectedDriver?.busAssigned === busNumber && styles.busOptionSelected
                  ]}
                  onPress={() => handleAssignBus(selectedDriver?.id, busNumber)}
                >
                  <Text style={[
                    styles.busOptionText,
                    selectedDriver?.busAssigned === busNumber && styles.busOptionTextSelected
                  ]}>
                    🚌 {busNumber}
                  </Text>
                  <Text style={styles.busOptionStatus}>
                    {selectedDriver?.busAssigned === busNumber ? 'Currently Assigned' : 'Click to Assign'}
                  </Text>
                </TouchableOpacity>
              ))}
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
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#1A237E',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#E0E0E0',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  // 🆕 COMPACT STATS SECTION
  statsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statCardActive: {
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    marginHorizontal: 6,
  },
  filterButtonActive: {
    backgroundColor: '#4A90E2',
  },
  filterText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverInfoSection: {
    padding: 16,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 4,
  },
  driverContact: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 13,
    marginRight: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  driverDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#666666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '500',
  },
  assigned: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  unassigned: {
    color: '#F44336',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1A237E',
    textAlign: 'center',
  },
  // 🔥 PROFILE MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  profileHeaderInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 4,
  },
  profileContact: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
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
    color: '#666666',
    fontWeight: '600',
  },
  profileSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  profileSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF9800',
    marginRight: 12,
  },
  profileStar: {
    fontSize: 18,
    marginRight: 2,
  },
  profileDetails: {
    marginLeft: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  profileActions: {
    padding: 20,
    flexDirection: 'row',
  },
  profileActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  editButton: {
    backgroundColor: '#4A90E2',
  },
  closeButton: {
    backgroundColor: '#F0F0F0',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  closeButtonText: {
    color: '#666666',
    fontWeight: '600',
    fontSize: 14,
  },
  // Assign Bus Modal
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
    textAlign: 'center',
  },
  busList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  busOption: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 8,
  },
  busOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
  },
  busOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  busOptionTextSelected: {
    color: '#1A237E',
  },
  busOptionStatus: {
    fontSize: 12,
    color: '#666666',
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    color: '#666666',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default DriversScreen;
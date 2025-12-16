import React, { useState } from 'react';
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
  Image,
} from 'react-native';

// Mock data for drivers
const mockDrivers = [
  {
    id: '1',
    name: 'Ali Ahmed',
    contact: '+92 300 1234567',
    cnic: '42301-1234567-8',
    license: 'LHR-123456',
    status: 'on-duty',
    busAssigned: 'B-001',
    rating: 4.5,
    tripsCompleted: 120,
    joiningDate: '2023-01-15',
    salary: 45000,
  },
  {
    id: '2',
    name: 'Ahmed Khan',
    contact: '+92 300 7654321',
    cnic: '42301-7654321-9',
    license: 'LHR-987654',
    status: 'online',
    busAssigned: 'B-003',
    rating: 4.2,
    tripsCompleted: 95,
    joiningDate: '2023-03-20',
    salary: 42000,
  },
  {
    id: '3',
    name: 'Sara Ali',
    contact: '+92 300 9876543',
    cnic: '42301-9876543-2',
    license: 'LHR-456789',
    status: 'offline',
    busAssigned: null,
    rating: 4.8,
    tripsCompleted: 150,
    joiningDate: '2022-11-10',
    salary: 48000,
  },
  {
    id: '4',
    name: 'Usman Khan',
    contact: '+92 300 4567890',
    cnic: '42301-4567890-1',
    license: 'LHR-654321',
    status: 'on-duty',
    busAssigned: 'B-005',
    rating: 4.0,
    tripsCompleted: 80,
    joiningDate: '2023-05-05',
    salary: 40000,
  },
  {
    id: '5',
    name: 'Bilal Raza',
    contact: '+92 300 1122334',
    cnic: '42301-1122334-5',
    license: 'LHR-789123',
    status: 'online',
    busAssigned: 'B-006',
    rating: 4.7,
    tripsCompleted: 200,
    joiningDate: '2022-08-15',
    salary: 50000,
  },
  {
    id: '6',
    name: 'Zainab Malik',
    contact: '+92 300 9988776',
    cnic: '42301-9988776-6',
    license: 'LHR-321654',
    status: 'offline',
    busAssigned: null,
    rating: 4.3,
    tripsCompleted: 110,
    joiningDate: '2023-02-28',
    salary: 43000,
  },
];

// Available buses for assignment
const availableBuses = ['B-001', 'B-002', 'B-003', 'B-004', 'B-005', 'B-006', 'B-007', 'B-008'];

const DriversScreen = () => {
  const [drivers, setDrivers] = useState(mockDrivers);
  const [filter, setFilter] = useState('all'); // all, on-duty, online, offline
  const [modalVisible, setModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [newDriver, setNewDriver] = useState({
    name: '',
    contact: '',
    cnic: '',
    license: '',
    salary: '',
  });

  // Filter drivers based on status
  const filteredDrivers = drivers.filter(driver => {
    if (filter === 'all') return true;
    return driver.status === filter;
  });

  // Calculate stats
  const stats = {
    total: drivers.length,
    onDuty: drivers.filter(d => d.status === 'on-duty').length,
    online: drivers.filter(d => d.status === 'online').length,
    offline: drivers.filter(d => d.status === 'offline').length,
    assigned: drivers.filter(d => d.busAssigned !== null).length,
    unassigned: drivers.filter(d => d.busAssigned === null).length,
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'on-duty': return '#4CAF50'; // Green
      case 'online': return '#2196F3';  // Blue
      case 'offline': return '#9E9E9E'; // Grey
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

  const handleAddDriver = () => {
    if (!newDriver.name || !newDriver.contact || !newDriver.cnic || !newDriver.license) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    const newDriverObj = {
      id: (drivers.length + 1).toString(),
      name: newDriver.name,
      contact: newDriver.contact,
      cnic: newDriver.cnic,
      license: newDriver.license,
      status: 'offline',
      busAssigned: null,
      rating: 0,
      tripsCompleted: 0,
      joiningDate: new Date().toISOString().split('T')[0],
      salary: parseInt(newDriver.salary) || 40000,
    };

    setDrivers([...drivers, newDriverObj]);
    setNewDriver({ name: '', contact: '', cnic: '', license: '', salary: '' });
    setModalVisible(false);
    Alert.alert('Success', 'Driver added successfully');
  };

  const handleAssignBus = (driverId: string, busNumber: string) => {
    setDrivers(drivers.map(driver =>
      driver.id === driverId ? { ...driver, busAssigned: busNumber } : driver
    ));
    setAssignModalVisible(false);
    Alert.alert('Success', `Bus ${busNumber} assigned to driver`);
  };

  const handleChangeStatus = (driverId: string, newStatus: string) => {
    setDrivers(drivers.map(driver =>
      driver.id === driverId ? { ...driver, status: newStatus } : driver
    ));
    Alert.alert('Status Updated', `Driver status changed to ${newStatus}`);
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
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Add Driver</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Drivers</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#E8F5E8' }]}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.onDuty}</Text>
            <Text style={styles.statLabel}>On Duty</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
            <Text style={[styles.statValue, { color: '#2196F3' }]}>{stats.online}</Text>
            <Text style={styles.statLabel}>Online</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F5F5F5' }]}>
            <Text style={[styles.statValue, { color: '#9E9E9E' }]}>{stats.offline}</Text>
            <Text style={styles.statLabel}>Offline</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
            <Text style={[styles.statValue, { color: '#FF9800' }]}>{stats.assigned}</Text>
            <Text style={styles.statLabel}>Assigned</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FFEBEE' }]}>
            <Text style={[styles.statValue, { color: '#F44336' }]}>{stats.unassigned}</Text>
            <Text style={styles.statLabel}>Unassigned</Text>
          </View>
        </View>
      </ScrollView>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All Drivers</Text>
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
            style={[styles.filterButton]}
            onPress={() => setFilter('assigned')}
          >
            <Text style={styles.filterText}>Assigned ({stats.assigned})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton]}
            onPress={() => setFilter('unassigned')}
          >
            <Text style={styles.filterText}>Unassigned ({stats.unassigned})</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Driver List */}
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {filteredDrivers.map((driver) => (
          <View key={driver.id} style={styles.driverCard}>
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

              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Joined:</Text>
                  <Text style={styles.detailValue}>{driver.joiningDate}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Salary:</Text>
                  <Text style={styles.detailValue}>₹{driver.salary.toLocaleString()}</Text>
                </View>
              </View>
            </View>

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
                onPress={() => Alert.alert('Driver Profile', `View profile of ${driver.name}`)}
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

      {/* Add Driver Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add New Driver</Text>

            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={newDriver.name}
              onChangeText={(text) => setNewDriver({...newDriver, name: text})}
            />

            <TextInput
              style={styles.input}
              placeholder="Contact Number"
              value={newDriver.contact}
              onChangeText={(text) => setNewDriver({...newDriver, contact: text})}
              keyboardType="phone-pad"
            />

            <TextInput
              style={styles.input}
              placeholder="CNIC Number"
              value={newDriver.cnic}
              onChangeText={(text) => setNewDriver({...newDriver, cnic: text})}
            />

            <TextInput
              style={styles.input}
              placeholder="License Number"
              value={newDriver.license}
              onChangeText={(text) => setNewDriver({...newDriver, license: text})}
            />

            <TextInput
              style={styles.input}
              placeholder="Monthly Salary"
              value={newDriver.salary}
              onChangeText={(text) => setNewDriver({...newDriver, salary: text})}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddDriver}
              >
                <Text style={styles.saveButtonText}>Add Driver</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  statsScroll: {
    marginTop: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
  },
  filterContainer: {
    marginTop: 16,
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  filterText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 4,
  },
  driverContact: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 14,
    marginRight: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  driverDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
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
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A237E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    marginBottom: 20,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  cancelButtonText: {
    color: '#666666',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
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
});

export default DriversScreen;
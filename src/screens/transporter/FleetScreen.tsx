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
} from 'react-native';

// Mock data
const mockBuses = [
  { id: '1', number: 'B-001', registration: 'ABC-123', capacity: 40, status: 'active', driver: 'Ali Ahmed', lastMaintenance: '2024-01-10', nextMaintenance: '2024-02-10' },
  { id: '2', number: 'B-002', registration: 'XYZ-789', capacity: 35, status: 'maintenance', driver: null, lastMaintenance: '2024-01-05', nextMaintenance: '2024-01-25' },
  { id: '3', number: 'B-003', registration: 'DEF-456', capacity: 45, status: 'active', driver: 'Ahmed Khan', lastMaintenance: '2024-01-12', nextMaintenance: '2024-02-12' },
  { id: '4', number: 'B-004', registration: 'GHI-789', capacity: 30, status: 'inactive', driver: null, lastMaintenance: '2023-12-20', nextMaintenance: '2024-01-20' },
  { id: '5', number: 'B-005', registration: 'JKL-012', capacity: 50, status: 'active', driver: 'Sara Ali', lastMaintenance: '2024-01-08', nextMaintenance: '2024-02-08' },
  { id: '6', number: 'B-006', registration: 'MNO-345', capacity: 40, status: 'active', driver: 'Usman Khan', lastMaintenance: '2024-01-15', nextMaintenance: '2024-02-15' },
];

const FleetScreen = () => {
  const [buses, setBuses] = useState(mockBuses);
  const [filter, setFilter] = useState('all'); // all, active, maintenance, inactive
  const [modalVisible, setModalVisible] = useState(false);
  const [newBus, setNewBus] = useState({
    number: '',
    registration: '',
    capacity: '',
  });

  const filteredBuses = buses.filter(bus => {
    if (filter === 'all') return true;
    return bus.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return '#4CAF50';
      case 'maintenance': return '#FF9800';
      case 'inactive': return '#F44336';
      default: return '#666666';
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

  const handleAddBus = () => {
    if (!newBus.number || !newBus.registration || !newBus.capacity) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    const newBusObj = {
      id: (buses.length + 1).toString(),
      number: newBus.number,
      registration: newBus.registration,
      capacity: parseInt(newBus.capacity),
      status: 'active',
      driver: null,
      lastMaintenance: new Date().toISOString().split('T')[0],
      nextMaintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };

    setBuses([...buses, newBusObj]);
    setNewBus({ number: '', registration: '', capacity: '' });
    setModalVisible(false);
    Alert.alert('Success', 'Bus added successfully');
  };

  const handleChangeStatus = (busId: string, newStatus: string) => {
    setBuses(buses.map(bus =>
      bus.id === busId ? { ...bus, status: newStatus } : bus
    ));
    Alert.alert('Status Updated', `Bus status changed to ${newStatus}`);
  };

  const stats = {
    total: buses.length,
    active: buses.filter(b => b.status === 'active').length,
    maintenance: buses.filter(b => b.status === 'maintenance').length,
    inactive: buses.filter(b => b.status === 'inactive').length,
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🚌 Fleet Management</Text>
          <Text style={styles.subtitle}>Manage your bus fleet</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Add Bus</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Buses</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#E8F5E8' }]}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
            <Text style={[styles.statValue, { color: '#FF9800' }]}>{stats.maintenance}</Text>
            <Text style={styles.statLabel}>Maintenance</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FFEBEE' }]}>
            <Text style={[styles.statValue, { color: '#F44336' }]}>{stats.inactive}</Text>
            <Text style={styles.statLabel}>Inactive</Text>
          </View>
        </View>
      </ScrollView>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'maintenance' && styles.filterButtonActive]}
          onPress={() => setFilter('maintenance')}
        >
          <Text style={[styles.filterText, filter === 'maintenance' && styles.filterTextActive]}>Maintenance</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'inactive' && styles.filterButtonActive]}
          onPress={() => setFilter('inactive')}
        >
          <Text style={[styles.filterText, filter === 'inactive' && styles.filterTextActive]}>Inactive</Text>
        </TouchableOpacity>
      </View>

      {/* Bus List */}
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {filteredBuses.map((bus) => (
          <View key={bus.id} style={styles.busCard}>
            <View style={styles.busHeader}>
              <View style={styles.busInfo}>
                <Text style={styles.busNumber}>{bus.number}</Text>
                <Text style={styles.busRegistration}>{bus.registration}</Text>
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
                <Text style={styles.detailValue}>{bus.driver || 'Not assigned'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Next Maintenance:</Text>
                <Text style={styles.detailValue}>{bus.nextMaintenance}</Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => Alert.alert('Bus Details', `View details of ${bus.number}`)}
              >
                <Text style={styles.actionButtonText}>📋 Details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => Alert.alert('Maintenance', `Schedule maintenance for ${bus.number}`)}
              >
                <Text style={styles.actionButtonText}>🔧 Maintain</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  const newStatus = bus.status === 'active' ? 'maintenance' : 'active';
                  handleChangeStatus(bus.id, newStatus);
                }}
              >
                <Text style={styles.actionButtonText}>
                  {bus.status === 'active' ? '⏸️ Deactivate' : '▶️ Activate'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add Bus Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add New Bus</Text>

            <TextInput
              style={styles.input}
              placeholder="Bus Number (e.g., B-001)"
              value={newBus.number}
              onChangeText={(text) => setNewBus({...newBus, number: text})}
            />

            <TextInput
              style={styles.input}
              placeholder="Registration Number"
              value={newBus.registration}
              onChangeText={(text) => setNewBus({...newBus, registration: text})}
            />

            <TextInput
              style={styles.input}
              placeholder="Seating Capacity"
              value={newBus.capacity}
              onChangeText={(text) => setNewBus({...newBus, capacity: text})}
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
                onPress={handleAddBus}
              >
                <Text style={styles.saveButtonText}>Add Bus</Text>
              </TouchableOpacity>
            </View>
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
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
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
  busCard: {
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
  busHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  busInfo: {
    flex: 1,
  },
  busNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 4,
  },
  busRegistration: {
    fontSize: 14,
    color: '#666666',
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
  busDetails: {
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 20,
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
});

export default FleetScreen;
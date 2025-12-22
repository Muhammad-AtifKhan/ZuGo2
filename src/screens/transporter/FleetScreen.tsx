import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

// Mock data
const mockBuses = [
  { id: '1', number: 'B-001', registration: 'ABC-123', capacity: 40, status: 'active', driver: 'Ali Ahmed', lastMaintenance: '2024-01-10', nextMaintenance: '2024-02-10' },
  { id: '2', number: 'B-002', registration: 'XYZ-789', capacity: 35, status: 'maintenance', driver: null, lastMaintenance: '2024-01-05', nextMaintenance: '2024-01-25' },
  { id: '3', number: 'B-003', registration: 'DEF-456', capacity: 45, status: 'active', driver: 'Ahmed Khan', lastMaintenance: '2024-01-12', nextMaintenance: '2024-02-12' },
  { id: '4', number: 'B-004', registration: 'GHI-789', capacity: 30, status: 'inactive', driver: null, lastMaintenance: '2023-12-20', nextMaintenance: '2024-01-20' },
  { id: '5', number: 'B-005', registration: 'JKL-012', capacity: 50, status: 'active', driver: 'Sara Ali', lastMaintenance: '2024-01-08', nextMaintenance: '2024-02-08' },
  { id: '6', number: 'B-006', registration: 'MNO-345', capacity: 40, status: 'active', driver: 'Usman Khan', lastMaintenance: '2024-01-15', nextMaintenance: '2024-02-15' },
  { id: '7', number: 'B-007', registration: 'PQR-678', capacity: 38, status: 'active', driver: 'Bilal Raza', lastMaintenance: '2024-01-18', nextMaintenance: '2024-02-18' },
  { id: '8', number: 'B-008', registration: 'STU-901', capacity: 42, status: 'maintenance', driver: null, lastMaintenance: '2024-01-03', nextMaintenance: '2024-01-30' },
];

const FleetScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const [buses, setBuses] = useState(mockBuses);
  const [filter, setFilter] = useState('all'); // all, active, maintenance, inactive

  // 🔥 IMPORTANT: useEffect for opening AddBusScreen automatically
  useEffect(() => {
    if (route.params?.openAddBus) {
      handleAddBus();
      // IMPORTANT: param clear karo
      navigation.setParams({ openAddBus: false });
    }
  }, [route.params?.openAddBus]);

  // Add Bus button handler - Now navigates to AddBusScreen
  const handleAddBus = () => {
    navigation.navigate('AddBusScreen', {
      mode: 'add',
      onSave: (busData: any) => {
        // Callback function for when bus is saved in AddBusScreen
        const newBusObj = {
          id: (buses.length + 1).toString(),
          number: busData.number,
          registration: busData.registration,
          capacity: parseInt(busData.capacity),
          status: 'active',
          driver: null,
          lastMaintenance: new Date().toISOString().split('T')[0],
          nextMaintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        };

        setBuses([...buses, newBusObj]);
        Alert.alert('Success', 'Bus added successfully');
      }
    });
  };

  // Bus detail handler - Navigates to AddBusScreen in edit mode
  const handleBusPress = (bus: any) => {
    navigation.navigate('AddBusScreen', {
      mode: 'edit',
      bus: bus,
      onSave: (updatedBusData: any) => {
        // Update bus in local state
        setBuses(buses.map(b =>
          b.id === bus.id ? { ...b, ...updatedBusData } : b
        ));
        Alert.alert('Success', 'Bus updated successfully');
      }
    });
  };

  // 📋 DETAILS BUTTON FUNCTIONALITY
  const handleViewDetails = (bus: any) => {
    Alert.alert(
      '🚌 Bus Details',
      `Bus Number: ${bus.number}\n` +
      `Registration: ${bus.registration}\n` +
      `Capacity: ${bus.capacity} seats\n` +
      `Status: ${bus.status.toUpperCase()}\n` +
      `Driver: ${bus.driver || 'Not assigned'}\n` +
      `Last Maintenance: ${bus.lastMaintenance}\n` +
      `Next Maintenance: ${bus.nextMaintenance}`,
      [
        { text: 'OK', style: 'default' },
        { text: 'Edit Details', onPress: () => handleBusPress(bus) },
        { text: 'Assign Driver', onPress: () => handleAssignDriver(bus) }
      ]
    );
  };

  // 🔧 MAINTENANCE BUTTON FUNCTIONALITY
  const handleMaintenance = (bus: any) => {
    Alert.alert(
      '🔧 Maintenance Options',
      `Select maintenance action for ${bus.number}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Schedule Maintenance',
          onPress: () => scheduleMaintenance(bus.id)
        },
        {
          text: 'Log Maintenance Done',
          onPress: () => logMaintenanceDone(bus.id)
        },
        {
          text: 'View Maintenance History',
          onPress: () => viewMaintenanceHistory(bus.id)
        }
      ]
    );
  };

  const scheduleMaintenance = (busId: string) => {
    Alert.prompt(
      '📅 Schedule Maintenance',
      'Enter number of days from now:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Schedule',
          onPress: (days) => {
            if (days && !isNaN(parseInt(days))) {
              const daysNum = parseInt(days);
              const nextDate = new Date(Date.now() + daysNum * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

              setBuses(buses.map(bus =>
                bus.id === busId ? {
                  ...bus,
                  status: 'maintenance',
                  nextMaintenance: nextDate
                } : bus
              ));

              Alert.alert(
                '✅ Scheduled',
                `Maintenance scheduled for ${days} days from now\nNext maintenance: ${nextDate}`
              );
            }
          }
        }
      ],
      'plain-text',
      '7'
    );
  };

  const logMaintenanceDone = (busId: string) => {
    setBuses(buses.map(bus =>
      bus.id === busId ? {
        ...bus,
        status: 'active',
        lastMaintenance: new Date().toISOString().split('T')[0],
        nextMaintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      } : bus
    ));

    Alert.alert(
      '✅ Maintenance Completed',
      'Maintenance logged successfully!\nBus status changed to ACTIVE\nNext maintenance scheduled for 30 days from now.'
    );
  };

  const viewMaintenanceHistory = (busId: string) => {
    const bus = buses.find(b => b.id === busId);
    if (bus) {
      Alert.alert(
        '📋 Maintenance History',
        `Bus: ${bus.number}\n` +
        `Last Maintenance: ${bus.lastMaintenance}\n` +
        `Next Maintenance: ${bus.nextMaintenance}\n\n` +
        'Recent Maintenance History:\n' +
        '• 2024-01-10: Oil change, tire rotation\n' +
        '• 2023-12-15: Brake system check\n' +
        '• 2023-11-20: Engine service\n' +
        '• 2023-10-25: General inspection'
      );
    }
  };

  // ▶️ ACTIVATE/DEACTIVATE BUTTON FUNCTIONALITY
  const handleChangeStatus = (busId: string, currentStatus: string) => {
    const bus = buses.find(b => b.id === busId);
    if (!bus) return;

    if (currentStatus === 'active') {
      // Deactivate karna hai
      Alert.alert(
        '⏸️ Deactivate Bus',
        `Are you sure you want to deactivate ${bus.number}?\n\n` +
        'This will:\n' +
        '• Remove from active service\n' +
        '• Unassign driver (if any)\n' +
        '• Mark as inactive in system',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Deactivate',
            style: 'destructive',
            onPress: () => {
              setBuses(buses.map(b =>
                b.id === busId ? {
                  ...b,
                  status: 'inactive',
                  driver: null
                } : b
              ));
              Alert.alert('✅ Deactivated', `${bus.number} has been deactivated`);
            }
          }
        ]
      );
    } else {
      // Activate karna hai
      Alert.alert(
        '▶️ Activate Bus',
        `Activate ${bus.number} back to service?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Activate',
            onPress: () => {
              setBuses(buses.map(b =>
                b.id === busId ? {
                  ...b,
                  status: 'active'
                } : b
              ));
              Alert.alert('✅ Activated', `${bus.number} is now active and available for service`);
            }
          }
        ]
      );
    }
  };

  // 👤 ASSIGN DRIVER FUNCTION
  const handleAssignDriver = (bus: any) => {
    const availableDrivers = ['Ali Ahmed', 'Ahmed Khan', 'Sara Ali', 'Usman Khan', 'Bilal Raza'];

    Alert.alert(
      '👤 Assign Driver',
      `Assign driver to ${bus.number}:`,
      [
        ...availableDrivers.map(driver => ({
          text: driver,
          onPress: () => {
            setBuses(buses.map(b =>
              b.id === bus.id ? { ...b, driver: driver } : b
            ));
            Alert.alert('✅ Driver Assigned', `${driver} assigned to ${bus.number}`);
          }
        })),
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unassign Driver',
          onPress: () => {
            setBuses(buses.map(b =>
              b.id === bus.id ? { ...b, driver: null } : b
            ));
            Alert.alert('✅ Driver Unassigned', 'Driver removed from bus');
          },
          style: 'destructive'
        }
      ]
    );
  };

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

  const stats = {
    total: buses.length,
    active: buses.filter(b => b.status === 'active').length,
    maintenance: buses.filter(b => b.status === 'maintenance').length,
    inactive: buses.filter(b => b.status === 'inactive').length,
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - Fixed */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🚌 Fleet Management</Text>
          <Text style={styles.subtitle}>Manage your bus fleet</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddBus}
        >
          <Text style={styles.addButtonText}>+ Add Bus</Text>
        </TouchableOpacity>
      </View>

      {/* Stats - Fixed Height */}
      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={[styles.statCard, filter === 'all' && styles.statCardActive]}
          onPress={() => setFilter('all')}
          activeOpacity={0.7}
        >
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: '#E8F5E8' }, filter === 'active' && styles.statCardActive]}
          onPress={() => setFilter('active')}
          activeOpacity={0.7}
        >
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: '#FFF3E0' }, filter === 'maintenance' && styles.statCardActive]}
          onPress={() => setFilter('maintenance')}
          activeOpacity={0.7}
        >
          <Text style={[styles.statValue, { color: '#FF9800' }]}>{stats.maintenance}</Text>
          <Text style={styles.statLabel}>Maintenance</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: '#FFEBEE' }, filter === 'inactive' && styles.statCardActive]}
          onPress={() => setFilter('inactive')}
          activeOpacity={0.7}
        >
          <Text style={[styles.statValue, { color: '#F44336' }]}>{stats.inactive}</Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </TouchableOpacity>
      </View>

      {/* Bus List - Scrollable */}
      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {filteredBuses.map((bus) => (
          <View key={bus.id} style={styles.busCard}>
            <TouchableOpacity
              style={styles.busInfoSection}
              onPress={() => handleBusPress(bus)}
              activeOpacity={0.7}
            >
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
                style={styles.actionButton}
                onPress={() => handleChangeStatus(bus.id, bus.status)}
              >
                <Text style={styles.actionButtonText}>
                  {bus.status === 'active' ? '⏸️ Deactivate' : '▶️ Activate'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
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
    zIndex: 10,
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    zIndex: 5,
    maxHeight: 100,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: 70,
  },
  statCardActive: {
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 30,
  },
  busCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  busInfoSection: {
    padding: 16,
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
    marginBottom: 8,
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
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
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
});

export default FleetScreen;
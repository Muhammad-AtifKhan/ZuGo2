import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Initial mock data for routes
const initialMockRoutes = [
  { id: '1', code: 'RT-001', name: 'Downtown Express', distance: '15km', duration: '45min', stops: 10, fare: 50 },
  { id: '2', code: 'RT-002', name: 'University Shuttle', distance: '12km', duration: '35min', stops: 8, fare: 40 },
  { id: '3', code: 'RT-003', name: 'Mall Route', distance: '20km', duration: '60min', stops: 15, fare: 60 },
  { id: '4', code: 'RT-004', name: 'Airport Express', distance: '25km', duration: '50min', stops: 5, fare: 100 },
  { id: '5', code: 'RT-005', name: 'Industrial Zone', distance: '18km', duration: '55min', stops: 12, fare: 55 },
];

// Mock data for buses
const mockBuses = ['B-001', 'B-002', 'B-003', 'B-004', 'B-005', 'B-006'];

// Mock data for drivers
const mockDrivers = ['Ali Ahmed', 'Ahmed Khan', 'Sara Ali', 'Usman Khan', 'Bilal Raza'];

// Mock data for scheduled trips
const mockTrips = [
  {
    id: '1',
    routeCode: 'RT-001',
    routeName: 'Downtown Express',
    bus: 'B-001',
    driver: 'Ali Ahmed',
    departureTime: '08:00',
    arrivalTime: '08:45',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    status: 'active',
    passengers: 32,
    revenue: 1600,
  },
  {
    id: '2',
    routeCode: 'RT-002',
    routeName: 'University Shuttle',
    bus: 'B-003',
    driver: 'Ahmed Khan',
    departureTime: '09:30',
    arrivalTime: '10:05',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    status: 'delayed',
    passengers: 28,
    revenue: 1120,
  },
  {
    id: '3',
    routeCode: 'RT-004',
    routeName: 'Airport Express',
    bus: 'B-005',
    driver: 'Sara Ali',
    departureTime: '11:00',
    arrivalTime: '11:50',
    days: ['Daily'],
    status: 'active',
    passengers: 40,
    revenue: 4000,
  },
  {
    id: '4',
    routeCode: 'RT-003',
    routeName: 'Mall Route',
    bus: 'B-002',
    driver: 'Usman Khan',
    departureTime: '14:00',
    arrivalTime: '15:00',
    days: ['Sat', 'Sun'],
    status: 'completed',
    passengers: 35,
    revenue: 2100,
  },
  {
    id: '5',
    routeCode: 'RT-001',
    routeName: 'Downtown Express',
    bus: 'B-006',
    driver: 'Bilal Raza',
    departureTime: '16:00',
    arrivalTime: '16:45',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    status: 'upcoming',
    passengers: 0,
    revenue: 0,
  },
  {
    id: '6',
    routeCode: 'RT-005',
    routeName: 'Industrial Zone',
    bus: 'B-004',
    driver: 'Ali Ahmed',
    departureTime: '18:00',
    arrivalTime: '18:55',
    days: ['Mon', 'Wed', 'Fri'],
    status: 'cancelled',
    passengers: 0,
    revenue: 0,
  },
];

// Days of week
const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const OperationsScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('schedule'); // schedule, routes, today
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [newTrip, setNewTrip] = useState({
    route: '',
    bus: '',
    driver: '',
    departureTime: '',
    days: [] as string[],
  });
  const [newRoute, setNewRoute] = useState({
    code: '',
    name: '',
    distance: '',
    duration: '',
    stops: '',
    fare: '',
  });
  // 🔧 FIX: Changed from 'routes' to 'routeList' to avoid conflict with React Navigation prop
  const [routeList, setRouteList] = useState(initialMockRoutes);
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

  // Schedule Trip button handler - Navigates to ScheduleTripScreen
  const handleScheduleTrip = () => {
    navigation.navigate('ScheduleTripScreen', {
      mode: 'add',
      onSave: (tripData: any) => {
        Alert.alert('Success', 'Trip scheduled successfully');
      }
    });
  };

  // Create New Route button handler - Opens modal
  const handleCreateRoute = () => {
    setRouteModalVisible(true);
  };

  // Add New Route function
  const handleAddRoute = () => {
    if (!newRoute.code || !newRoute.name || !newRoute.distance || !newRoute.duration || !newRoute.stops || !newRoute.fare) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    // Check if route code already exists
    // 🔧 FIX: Changed from routes to routeList
    const routeExists = routeList.some(route => route.code === newRoute.code.toUpperCase());
    if (routeExists) {
      Alert.alert('Error', `Route code ${newRoute.code.toUpperCase()} already exists`);
      return;
    }

    const newRouteObj = {
      id: (routeList.length + 1).toString(),
      code: newRoute.code.toUpperCase(),
      name: newRoute.name,
      distance: newRoute.distance,
      duration: newRoute.duration,
      stops: parseInt(newRoute.stops) || 0,
      fare: parseInt(newRoute.fare) || 0,
    };

    // 🔧 FIX: Changed from routes to routeList
    const updatedRoutes = [...routeList, newRouteObj];
    setRouteList(updatedRoutes);

    Alert.alert(
      'Success',
      `Route ${newRoute.code.toUpperCase()} added successfully!\n\nWould you like to schedule a trip with this route?`,
      [
        {
          text: 'Later',
          onPress: () => {
            setRouteModalVisible(false);
            setNewRoute({ code: '', name: '', distance: '', duration: '', stops: '', fare: '' });
          }
        },
        {
          text: 'Schedule Now',
          onPress: () => {
            setRouteModalVisible(false);
            setNewRoute({ code: '', name: '', distance: '', duration: '', stops: '', fare: '' });
            // Pre-select this route in schedule modal
            setNewTrip({...newTrip, route: newRouteObj.code});
            setScheduleModalVisible(true);
          }
        }
      ]
    );
  };

  // Edit Trip handler - Navigates to ScheduleTripScreen in edit mode
  const handleEditTrip = (trip: any) => {
    navigation.navigate('ScheduleTripScreen', {
      mode: 'edit',
      trip: trip,
      onSave: (updatedTripData: any) => {
        Alert.alert('Success', 'Trip updated successfully');
      }
    });
  };

  // Track Trip handler
  const handleTrackTrip = (trip: any) => {
    Alert.alert(
      'Track Trip',
      `Track ${trip.bus} on ${trip.routeName}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Live Tracking', onPress: () => {
          Alert.alert('Live Tracking', `Tracking ${trip.bus}...`);
        }}
      ]
    );
  };

  // Cancel Trip handler
  const handleCancelTrip = (trip: any) => {
    Alert.alert(
      'Cancel Trip',
      `Are you sure you want to cancel ${trip.routeCode}?`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: () => {
          Alert.alert('Cancelled', `Trip ${trip.routeCode} has been cancelled`);
        }}
      ]
    );
  };

  // Use Route handler - Navigates to ScheduleTripScreen with route pre-selected
  const handleUseRoute = (route: any) => {
    navigation.navigate('ScheduleTripScreen', {
      mode: 'add',
      preSelectedRoute: route.code,
      onSave: (tripData: any) => {
        Alert.alert('Success', 'Trip scheduled successfully');
      }
    });
  };

  // View Trip Details handler
  const handleViewTripDetails = (trip: any) => {
    Alert.alert(
      'Trip Details',
      `Details for ${trip.routeCode}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Full Details', onPress: () => {
          Alert.alert('Coming Soon', 'Trip details screen coming soon');
        }}
      ]
    );
  };

  // Filter trips based on status
  const todayTrips = mockTrips.filter(trip =>
    trip.days.includes('Daily') ||
    trip.days.includes(new Date().toLocaleDateString('en-US', { weekday: 'short' }))
  );

  // Calculate stats
  const stats = {
    activeTrips: mockTrips.filter(t => t.status === 'active').length,
    todayTrips: todayTrips.length,
    completedTrips: mockTrips.filter(t => t.status === 'completed').length,
    delayedTrips: mockTrips.filter(t => t.status === 'delayed').length,
    totalRevenue: mockTrips.reduce((sum, trip) => sum + trip.revenue, 0),
    totalPassengers: mockTrips.reduce((sum, trip) => sum + trip.passengers, 0),
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return '#4CAF50';
      case 'upcoming': return '#2196F3';
      case 'delayed': return '#FF9800';
      case 'completed': return '#9C27B0';
      case 'cancelled': return '#F44336';
      default: return '#666666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'active': return '🟢';
      case 'upcoming': return '🔵';
      case 'delayed': return '🟡';
      case 'completed': return '🟣';
      case 'cancelled': return '🔴';
      default: return '⚫';
    }
  };

  // Local function for scheduling trip (modal fallback)
  const handleScheduleTripLocal = () => {
    if (!newTrip.route || !newTrip.bus || !newTrip.driver || !newTrip.departureTime || newTrip.days.length === 0) {
      Alert.alert('Error', 'Please fill all fields and select at least one day');
      return;
    }

    Alert.alert('Success', 'Trip scheduled successfully');
    setNewTrip({ route: '', bus: '', driver: '', departureTime: '', days: [] });
    setScheduleModalVisible(false);
    setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  };

  const toggleDaySelection = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  // Render Trip Card
  const renderTripCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.tripCard}
      onPress={() => handleViewTripDetails(item)}
      activeOpacity={0.7}
    >
      <View style={styles.tripHeader}>
        <View>
          <Text style={styles.tripRoute}>{item.routeName}</Text>
          <Text style={styles.tripCode}>{item.routeCode}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>
            {getStatusIcon(item.status)} {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.tripDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>🚌 Bus:</Text>
          <Text style={styles.detailValue}>{item.bus}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>👤 Driver:</Text>
          <Text style={styles.detailValue}>{item.driver}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>⏰ Time:</Text>
          <Text style={styles.detailValue}>{item.departureTime} - {item.arrivalTime}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📅 Days:</Text>
          <Text style={styles.detailValue}>{item.days.join(', ')}</Text>
        </View>
      </View>

      <View style={styles.tripFooter}>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Passengers</Text>
          <Text style={styles.footerValue}>{item.passengers}</Text>
        </View>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Revenue</Text>
          <Text style={styles.footerValue}>₹{item.revenue}</Text>
        </View>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Status</Text>
          <Text style={[styles.footerValue, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.tripActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation(); // Prevent parent onPress from firing
            handleEditTrip(item);
          }}
        >
          <Text style={styles.actionButtonText}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation(); // Prevent parent onPress from firing
            handleCancelTrip(item);
          }}
        >
          <Text style={styles.actionButtonText}>❌ Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation(); // Prevent parent onPress from firing
            handleTrackTrip(item);
          }}
        >
          <Text style={styles.actionButtonText}>📍 Track</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Render Route Card
  const renderRouteCard = ({ item }: { item: any }) => (
    <View style={styles.routeCard}>
      <View style={styles.routeHeader}>
        <Text style={styles.routeCode}>{item.code}</Text>
        <Text style={styles.routeFare}>₹{item.fare}</Text>
      </View>
      <Text style={styles.routeName}>{item.name}</Text>
      <View style={styles.routeDetails}>
        <View style={styles.routeDetail}>
          <Text style={styles.routeDetailIcon}>📏</Text>
          <Text style={styles.routeDetailText}>{item.distance}</Text>
        </View>
        <View style={styles.routeDetail}>
          <Text style={styles.routeDetailIcon}>⏱️</Text>
          <Text style={styles.routeDetailText}>{item.duration}</Text>
        </View>
        <View style={styles.routeDetail}>
          <Text style={styles.routeDetailIcon}>📍</Text>
          <Text style={styles.routeDetailText}>{item.stops} stops</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.useRouteButton}
        onPress={() => handleUseRoute(item)}
      >
        <Text style={styles.useRouteButtonText}>Use This Route</Text>
      </TouchableOpacity>
    </View>
  );

  // Render Empty State
  const renderEmptyState = () => (
    <TouchableOpacity
      style={styles.emptyState}
      onPress={handleScheduleTrip}
      activeOpacity={0.7}
    >
      <Text style={styles.emptyStateIcon}>📅</Text>
      <Text style={styles.emptyStateText}>No trips scheduled for today</Text>
      <Text style={styles.emptyStateButtonText}>Schedule a Trip</Text>
    </TouchableOpacity>
  );

  // Render Stats Header
  const renderStatsHeader = () => (
    <View style={styles.statsContainer}>
      <TouchableOpacity
        style={styles.statCard}
        onPress={() => setActiveTab('schedule')}
        activeOpacity={0.7}
      >
        <Text style={styles.statValue}>{stats.activeTrips}</Text>
        <Text style={styles.statLabel}>Active Trips</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.statCard}
        onPress={() => setActiveTab('today')}
        activeOpacity={0.7}
      >
        <Text style={styles.statValue}>{stats.todayTrips}</Text>
        <Text style={styles.statLabel}>Today's Trips</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.statCard}
        onPress={() => Alert.alert('Passengers', `Total: ${stats.totalPassengers} passengers`)}
        activeOpacity={0.7}
      >
        <Text style={styles.statValue}>{stats.totalPassengers}</Text>
        <Text style={styles.statLabel}>Total Passengers</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.statCard}
        onPress={() => Alert.alert('Revenue', `Total: ₹${stats.totalRevenue.toLocaleString()}`)}
        activeOpacity={0.7}
      >
        <Text style={styles.statValue}>₹{stats.totalRevenue.toLocaleString()}</Text>
        <Text style={styles.statLabel}>Total Revenue</Text>
      </TouchableOpacity>
    </View>
  );

  // Render Route Modal
  const renderRouteModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={routeModalVisible}
      onRequestClose={() => setRouteModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Add New Route</Text>

          <TextInput
            style={styles.input}
            placeholder="Route Code (e.g., RT-001)"
            value={newRoute.code}
            onChangeText={(text) => setNewRoute({...newRoute, code: text})}
            autoCapitalize="characters"
          />

          <TextInput
            style={styles.input}
            placeholder="Route Name (e.g., Downtown Express)"
            value={newRoute.name}
            onChangeText={(text) => setNewRoute({...newRoute, name: text})}
          />

          <View style={styles.rowInputs}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Distance (e.g., 15km)"
              value={newRoute.distance}
              onChangeText={(text) => setNewRoute({...newRoute, distance: text})}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Duration (e.g., 45min)"
              value={newRoute.duration}
              onChangeText={(text) => setNewRoute({...newRoute, duration: text})}
            />
          </View>

          <View style={styles.rowInputs}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Number of Stops"
              value={newRoute.stops}
              onChangeText={(text) => setNewRoute({...newRoute, stops: text})}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Fare (₹)"
              value={newRoute.fare}
              onChangeText={(text) => setNewRoute({...newRoute, fare: text})}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setRouteModalVisible(false);
                setNewRoute({ code: '', name: '', distance: '', duration: '', stops: '', fare: '' });
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleAddRoute}
            >
              <Text style={styles.saveButtonText}>Add Route</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>📅 Operations</Text>
          <Text style={styles.subtitle}>Manage routes and schedules</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleScheduleTrip}
          >
            <Text style={styles.headerButtonText}>➕ Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleCreateRoute}
          >
            <Text style={styles.headerButtonText}>🛣️ New Route</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      {renderStatsHeader()}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'schedule' && styles.tabActive]}
          onPress={() => setActiveTab('schedule')}
        >
          <Text style={[styles.tabText, activeTab === 'schedule' && styles.tabTextActive]}>
            📅 Schedule
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'routes' && styles.tabActive]}
          onPress={() => setActiveTab('routes')}
        >
          <Text style={[styles.tabText, activeTab === 'routes' && styles.tabTextActive]}>
            🛣️ Routes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'today' && styles.tabActive]}
          onPress={() => setActiveTab('today')}
        >
          <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>
            🎯 Today
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on active tab */}
      {activeTab === 'schedule' && (
        <FlatList
          data={mockTrips}
          renderItem={renderTripCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={styles.sectionTitle}>Scheduled Trips</Text>}
        />
      )}

      {activeTab === 'routes' && (
        <FlatList
          // 🔧 FIX: Changed from routes to routeList
          data={routeList}
          renderItem={renderRouteCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={styles.sectionTitle}>Available Routes</Text>}
        />
      )}

      {activeTab === 'today' && (
        <FlatList
          data={todayTrips}
          renderItem={renderTripCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={styles.sectionTitle}>Today's Schedule</Text>}
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {/* Add Route Modal */}
      {renderRouteModal()}

      {/* Old Schedule Trip Modal (Fallback if navigation fails) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={scheduleModalVisible}
        onRequestClose={() => setScheduleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Schedule New Trip</Text>

            {/* Route Selection */}
            <Text style={styles.modalLabel}>Select Route</Text>
            <View style={styles.pickerContainer}>
              {/* 🔧 FIX: Changed from routes to routeList */}
              {routeList.map(route => (
                <TouchableOpacity
                  key={route.id}
                  style={[
                    styles.pickerOption,
                    newTrip.route === route.code && styles.pickerOptionSelected
                  ]}
                  onPress={() => setNewTrip({...newTrip, route: route.code})}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    newTrip.route === route.code && styles.pickerOptionTextSelected
                  ]}>
                    {route.code}
                  </Text>
                  <Text style={styles.pickerOptionSubtext}>{route.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Bus Selection */}
            <Text style={styles.modalLabel}>Select Bus</Text>
            <View style={styles.pickerContainer}>
              {mockBuses.map(bus => (
                <TouchableOpacity
                  key={bus}
                  style={[
                    styles.pickerOption,
                    newTrip.bus === bus && styles.pickerOptionSelected
                  ]}
                  onPress={() => setNewTrip({...newTrip, bus: bus})}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    newTrip.bus === bus && styles.pickerOptionTextSelected
                  ]}>
                    🚌 {bus}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Driver Selection */}
            <Text style={styles.modalLabel}>Select Driver</Text>
            <View style={styles.pickerContainer}>
              {mockDrivers.map(driver => (
                <TouchableOpacity
                  key={driver}
                  style={[
                    styles.pickerOption,
                    newTrip.driver === driver && styles.pickerOptionSelected
                  ]}
                  onPress={() => setNewTrip({...newTrip, driver: driver})}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    newTrip.driver === driver && styles.pickerOptionTextSelected
                  ]}>
                    👤 {driver}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Time Selection */}
            <Text style={styles.modalLabel}>Departure Time</Text>
            <TextInput
              style={styles.input}
              placeholder="HH:MM (e.g., 08:00)"
              value={newTrip.departureTime}
              onChangeText={(text) => setNewTrip({...newTrip, departureTime: text})}
            />

            {/* Days Selection */}
            <Text style={styles.modalLabel}>Select Days</Text>
            <View style={styles.daysContainer}>
              {daysOfWeek.map(day => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayButton,
                    selectedDays.includes(day) && styles.dayButtonSelected
                  ]}
                  onPress={() => toggleDaySelection(day)}
                >
                  <Text style={[
                    styles.dayButtonText,
                    selectedDays.includes(day) && styles.dayButtonTextSelected
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={() => setSelectedDays(daysOfWeek)}
            >
              <Text style={styles.selectAllText}>Select All Days</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setScheduleModalVisible(false);
                  setNewTrip({ route: '', bus: '', driver: '', departureTime: '', days: [] });
                  setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleScheduleTripLocal}
              >
                <Text style={styles.saveButtonText}>Schedule Trip</Text>
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
  headerButtons: {
    flexDirection: 'row',
    marginTop: 16,
  },
  headerButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 12,
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 1,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#4A90E2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 16,
    marginTop: 8,
  },
  tripCard: {
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
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tripRoute: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A237E',
  },
  tripCode: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
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
  tripDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
    flex: 1,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginBottom: 12,
  },
  footerItem: {
    alignItems: 'center',
    flex: 1,
  },
  footerLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  footerValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A237E',
  },
  tripActions: {
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
  routeCard: {
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
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A237E',
  },
  routeFare: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  routeName: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 12,
  },
  routeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  routeDetail: {
    alignItems: 'center',
    flex: 1,
  },
  routeDetailIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  routeDetailText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  useRouteButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  useRouteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyStateButtonText: {
    color: '#4A90E2',
    fontWeight: '600',
    fontSize: 14,
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
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    marginTop: 16,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  pickerOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 100,
  },
  pickerOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  pickerOptionTextSelected: {
    color: '#1A237E',
  },
  pickerOptionSubtext: {
    fontSize: 12,
    color: '#666666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayButton: {
    width: '14%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 8,
  },
  dayButtonSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  dayButtonTextSelected: {
    color: '#FFFFFF',
  },
  selectAllButton: {
    alignItems: 'center',
    marginBottom: 24,
  },
  selectAllText: {
    color: '#4A90E2',
    fontWeight: '600',
    fontSize: 14,
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

export default OperationsScreen;
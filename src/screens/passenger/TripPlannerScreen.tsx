// src/screens/passenger/TripPlannerScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Share,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PassengerStackParamList } from '../../navigation/PassengerNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TripPlannerScreenNavigationProp = StackNavigationProp<PassengerStackParamList>;

interface City {
  id: string;
  name: string;
  code: string;
  province: string;
}

interface TripLeg {
  id: string;
  fromCity: string;
  toCity: string;
  fromCode: string;
  toCode: string;
  date: string;
  distance: string;
  duration: string;
  notes: string;
  order: number;
}

interface SavedTrip {
  id: string;
  name: string;
  legs: TripLeg[];
  totalDistance: string;
  totalDuration: string;
  totalStops: number;
  createdAt: string;
}

// Pakistan Cities with road transport focus
const PAKISTAN_CITIES: City[] = [
  { id: '1', name: 'Karachi', code: 'KHI', province: 'Sindh' },
  { id: '2', name: 'Lahore', code: 'LHE', province: 'Punjab' },
  { id: '3', name: 'Islamabad', code: 'ISB', province: 'Islamabad' },
  { id: '4', name: 'Rawalpindi', code: 'RWP', province: 'Punjab' },
  { id: '5', name: 'Peshawar', code: 'PEW', province: 'KPK' },
  { id: '6', name: 'Quetta', code: 'UET', province: 'Balochistan' },
  { id: '7', name: 'Multan', code: 'MUX', province: 'Punjab' },
  { id: '8', name: 'Faisalabad', code: 'LYP', province: 'Punjab' },
  { id: '9', name: 'Sialkot', code: 'SKT', province: 'Punjab' },
  { id: '10', name: 'Gujranwala', code: 'GRW', province: 'Punjab' },
  { id: '11', name: 'Hyderabad', code: 'HDD', province: 'Sindh' },
  { id: '12', name: 'Sukkur', code: 'SKZ', province: 'Sindh' },
  { id: '13', name: 'Abbottabad', code: 'ABT', province: 'KPK' },
  { id: '14', name: 'Murree', code: 'MUR', province: 'Punjab' },
  { id: '15', name: 'Gilgit', code: 'GIL', province: 'Gilgit-Baltistan' },
  { id: '16', name: 'Skardu', code: 'SKD', province: 'Gilgit-Baltistan' },
  { id: '17', name: 'Hunza', code: 'HNZ', province: 'Gilgit-Baltistan' },
  { id: '18', name: 'Swat', code: 'SWT', province: 'KPK' },
  { id: '19', name: 'Naran', code: 'NRN', province: 'KPK' },
  { id: '20', name: 'Kaghan', code: 'KGN', province: 'KPK' },
  { id: '21', name: 'Bahawalpur', code: 'BHV', province: 'Punjab' },
  { id: '22', name: 'Sargodha', code: 'SGD', province: 'Punjab' },
  { id: '23', name: 'Rahim Yar Khan', code: 'RYK', province: 'Punjab' },
  { id: '24', name: 'Dera Ghazi Khan', code: 'DGK', province: 'Punjab' },
  { id: '25', name: 'Mingora', code: 'MNG', province: 'KPK' },
  { id: '26', name: 'Mardan', code: 'MRD', province: 'KPK' },
  { id: '27', name: 'Kohat', code: 'KHT', province: 'KPK' },
  { id: '28', name: 'Chitral', code: 'CHT', province: 'KPK' },
  { id: '29', name: 'Khuzdar', code: 'KZD', province: 'Balochistan' },
  { id: '30', name: 'Turbat', code: 'TRB', province: 'Balochistan' },
];

// Predefined road distances between major cities (in km)
const getRoadDistance = (from: string, to: string): number => {
  const distances: Record<string, Record<string, number>> = {
    'Karachi': { 'Lahore': 1200, 'Islamabad': 1450, 'Rawalpindi': 1450, 'Hyderabad': 160, 'Sukkur': 480, 'Multan': 850 },
    'Lahore': { 'Karachi': 1200, 'Islamabad': 380, 'Rawalpindi': 380, 'Faisalabad': 130, 'Multan': 330, 'Sialkot': 120 },
    'Islamabad': { 'Lahore': 380, 'Rawalpindi': 15, 'Peshawar': 180, 'Abbottabad': 60, 'Murree': 50, 'Swat': 250 },
    'Rawalpindi': { 'Islamabad': 15, 'Lahore': 380, 'Peshawar': 180, 'Abbottabad': 60 },
    'Peshawar': { 'Islamabad': 180, 'Rawalpindi': 180, 'Swat': 150, 'Mardan': 60 },
    'Multan': { 'Lahore': 330, 'Karachi': 850, 'Faisalabad': 200, 'Bahawalpur': 100 },
    'Faisalabad': { 'Lahore': 130, 'Multan': 200, 'Islamabad': 290 },
    'Hyderabad': { 'Karachi': 160, 'Sukkur': 320 },
    'Sukkur': { 'Karachi': 480, 'Hyderabad': 320, 'Multan': 450 },
    'Quetta': { 'Karachi': 680, 'Multan': 700, 'Sukkur': 430 },
    'Gilgit': { 'Islamabad': 520, 'Skardu': 230, 'Hunza': 100 },
    'Skardu': { 'Gilgit': 230, 'Islamabad': 750 },
    'Hunza': { 'Gilgit': 100, 'Islamabad': 620 },
    'Swat': { 'Peshawar': 150, 'Islamabad': 250, 'Abbottabad': 180 },
    'Abbottabad': { 'Islamabad': 60, 'Rawalpindi': 60, 'Swat': 180 },
    'Murree': { 'Islamabad': 50, 'Rawalpindi': 50 },
  };

  return distances[from]?.[to] || distances[to]?.[from] || 350;
};

// Get estimated duration from distance (avg 60 km/h)
const getDurationFromDistance = (distance: number): string => {
  const hours = Math.floor(distance / 60);
  const minutes = Math.round((distance % 60) * (60 / 60));
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${hours}h ${minutes}m`;
};

const TripPlannerScreen = () => {
  const navigation = useNavigation<TripPlannerScreenNavigationProp>();

  const [tripName, setTripName] = useState('');
  const [legs, setLegs] = useState<TripLeg[]>([]);
  const [showAddLegModal, setShowAddLegModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [citySelectionType, setCitySelectionType] = useState<'from' | 'to'>('from');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingLeg, setEditingLeg] = useState<TripLeg | null>(null);
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [showSavedTrips, setShowSavedTrips] = useState(false);
  const [selectedTripForView, setSelectedTripForView] = useState<SavedTrip | null>(null);

  const [legForm, setLegForm] = useState({
    fromCity: '',
    toCity: '',
    fromCode: '',
    toCode: '',
    date: '',
    distance: '',
    duration: '',
    notes: '',
  });

  useEffect(() => {
    loadSavedTrips();
  }, []);

  const loadSavedTrips = async () => {
    try {
      const saved = await AsyncStorage.getItem('@zugo_trip_plans');
      if (saved) {
        setSavedTrips(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading saved trips:', error);
    }
  };

  const saveTripToStorage = async (trip: SavedTrip) => {
    try {
      const updated = [trip, ...savedTrips].slice(0, 20);
      await AsyncStorage.setItem('@zugo_trip_plans', JSON.stringify(updated));
      setSavedTrips(updated);
    } catch (error) {
      console.error('Error saving trip:', error);
    }
  };

  const calculateDistanceAndDuration = (fromCity: string, toCity: string) => {
    const distance = getRoadDistance(fromCity, toCity);
    const duration = getDurationFromDistance(distance);
    return { distance: `${distance} km`, duration };
  };

  const addLeg = () => {
    if (!legForm.fromCity || !legForm.toCity) {
      Alert.alert('Missing Info', 'Please select both departure and destination cities');
      return;
    }

    if (legForm.fromCity === legForm.toCity) {
      Alert.alert('Invalid Route', 'Departure and destination cannot be the same');
      return;
    }

    const { distance, duration } = calculateDistanceAndDuration(legForm.fromCity, legForm.toCity);

    const newLeg: TripLeg = {
      id: Date.now().toString(),
      fromCity: legForm.fromCity,
      toCity: legForm.toCity,
      fromCode: legForm.fromCode,
      toCode: legForm.toCode,
      date: legForm.date || new Date().toISOString().split('T')[0],
      distance: legForm.distance || distance,
      duration: legForm.duration || duration,
      notes: legForm.notes,
      order: legs.length,
    };

    if (editingLeg) {
      setLegs(legs.map(leg => leg.id === editingLeg.id ? newLeg : leg));
    } else {
      setLegs([...legs, newLeg]);
    }

    resetLegForm();
    setShowAddLegModal(false);
  };

  const resetLegForm = () => {
    setLegForm({
      fromCity: '',
      toCity: '',
      fromCode: '',
      toCode: '',
      date: '',
      distance: '',
      duration: '',
      notes: '',
    });
    setEditingLeg(null);
  };

  const editLeg = (leg: TripLeg) => {
    setEditingLeg(leg);
    setLegForm({
      fromCity: leg.fromCity,
      toCity: leg.toCity,
      fromCode: leg.fromCode,
      toCode: leg.toCode,
      date: leg.date,
      distance: leg.distance,
      duration: leg.duration,
      notes: leg.notes,
    });
    setShowAddLegModal(true);
  };

  const removeLeg = (legId: string) => {
    Alert.alert(
      'Remove Stop',
      'Are you sure you want to remove this stop from your trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updated = legs.filter(leg => leg.id !== legId);
            const reordered = updated.map((leg, index) => ({ ...leg, order: index }));
            setLegs(reordered);
          }
        }
      ]
    );
  };

  const saveCompleteTrip = () => {
    if (!tripName.trim()) {
      Alert.alert('Trip Name Required', 'Please give your trip a name');
      return;
    }

    if (legs.length === 0) {
      Alert.alert('No Stops Added', 'Please add at least one stop to your trip');
      return;
    }

    let totalDistanceKm = 0;
    let totalDurationMinutes = 0;

    legs.forEach(leg => {
      const dist = parseInt(leg.distance);
      if (!isNaN(dist)) totalDistanceKm += dist;

      const durStr = leg.duration;
      const hours = parseInt(durStr.match(/(\d+)h/)?.[1] || '0');
      const minutes = parseInt(durStr.match(/(\d+)m/)?.[1] || '0');
      totalDurationMinutes += (hours * 60) + minutes;
    });

    const totalHours = Math.floor(totalDurationMinutes / 60);
    const totalMins = totalDurationMinutes % 60;
    const durationText = totalHours > 0
      ? `${totalHours}h ${totalMins}m`
      : `${totalMins}m`;

    const distanceText = totalDistanceKm > 1000
      ? `${(totalDistanceKm / 1000).toFixed(1)} km`
      : `${totalDistanceKm} km`;

    const newTrip: SavedTrip = {
      id: Date.now().toString(),
      name: tripName,
      legs: legs,
      totalDistance: distanceText,
      totalDuration: durationText,
      totalStops: legs.length,
      createdAt: new Date().toISOString(),
    };

    saveTripToStorage(newTrip);

    Alert.alert(
      'Trip Saved!',
      `Your trip "${tripName}" has been saved.\n\n📍 ${legs.length} stops\n📏 ${distanceText}\n⏱️ ${durationText}`,
      [
        {
          text: 'OK',
          onPress: () => {
            setTripName('');
            setLegs([]);
          }
        }
      ]
    );
  };

  const shareTrip = async () => {
    if (legs.length === 0) {
      Alert.alert('No Trip to Share', 'Please plan your trip first');
      return;
    }

    let totalDistance = 0;
    legs.forEach(leg => {
      const dist = parseInt(leg.distance);
      if (!isNaN(dist)) totalDistance += dist;
    });

    const distanceText = totalDistance > 1000 ? `${(totalDistance / 1000).toFixed(1)} km` : `${totalDistance} km`;

    let tripText = `🚍 *ROAD TRIP PLAN: ${tripName || 'My Trip'}*\n\n`;
    tripText += `📅 Planned on: ${new Date().toLocaleDateString()}\n`;
    tripText += `📍 Total Stops: ${legs.length}\n`;
    tripText += `📏 Total Distance: ${distanceText}\n\n`;

    tripText += `*DETAILED ITINERARY:*\n\n`;

    legs.forEach((leg, index) => {
      tripText += `${index + 1}. 🚌 ${leg.fromCity} (${leg.fromCode}) → ${leg.toCity} (${leg.toCode})\n`;
      tripText += `   📅 ${leg.date}\n`;
      tripText += `   📏 ${leg.distance}\n`;
      tripText += `   ⏱️ ${leg.duration}\n`;
      if (leg.notes) tripText += `   📝 ${leg.notes}\n`;
      tripText += `\n`;
    });

    tripText += `\n*Summary:*\n`;
    tripText += `• Total Distance: ${distanceText}\n`;
    tripText += `• Total Duration: ~${legs.reduce((acc, leg) => {
      const hours = parseInt(leg.duration.match(/(\d+)h/)?.[1] || '0');
      const mins = parseInt(leg.duration.match(/(\d+)m/)?.[1] || '0');
      return acc + (hours * 60) + mins;
    }, 0)} minutes\n`;
    tripText += `\n📱 Planned with ZUGO Trip Planner`;

    try {
      await Share.share({
        message: tripText,
        title: `Road Trip: ${tripName || 'My Trip'}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share trip');
    }
  };

  const deleteSavedTrip = async (tripId: string) => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this saved trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = savedTrips.filter(t => t.id !== tripId);
            await AsyncStorage.setItem('@zugo_trip_plans', JSON.stringify(updated));
            setSavedTrips(updated);
            if (selectedTripForView?.id === tripId) {
              setSelectedTripForView(null);
            }
            Alert.alert('Deleted', 'Trip deleted successfully');
          }
        }
      ]
    );
  };

  const loadSavedTripToEdit = (trip: SavedTrip) => {
    setTripName(trip.name);
    setLegs(trip.legs);
    setSelectedTripForView(null);
    setShowSavedTrips(false);
    Alert.alert('Trip Loaded', `"${trip.name}" loaded for editing`);
  };

  const selectCity = (city: City) => {
    if (citySelectionType === 'from') {
      setLegForm({
        ...legForm,
        fromCity: city.name,
        fromCode: city.code,
      });
      // Auto-calculate if both cities selected
      if (legForm.toCity) {
        const { distance, duration } = calculateDistanceAndDuration(city.name, legForm.toCity);
        setLegForm(prev => ({ ...prev, distance, duration }));
      }
    } else {
      setLegForm({
        ...legForm,
        toCity: city.name,
        toCode: city.code,
      });
      // Auto-calculate if both cities selected
      if (legForm.fromCity) {
        const { distance, duration } = calculateDistanceAndDuration(legForm.fromCity, city.name);
        setLegForm(prev => ({ ...prev, distance, duration }));
      }
    }
    setShowCityModal(false);
    setSearchQuery('');
  };

  const filteredCities = PAKISTAN_CITIES.filter(city =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    city.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    city.province.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const CitySelectionModal = () => (
    <Modal
      visible={showCityModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCityModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Select {citySelectionType === 'from' ? 'Departure' : 'Destination'} City
            </Text>
            <TouchableOpacity onPress={() => setShowCityModal(false)}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Pakistani cities..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>

          <FlatList
            data={filteredCities}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.cityItem}
                onPress={() => selectCity(item)}
              >
                <View style={styles.cityIconContainer}>
                  <Icon name="location-city" size={20} color="#4A90E2" />
                </View>
                <View style={styles.cityInfo}>
                  <Text style={styles.cityName}>{item.name}</Text>
                  <Text style={styles.cityDetail}>{item.code} • {item.province}</Text>
                </View>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </View>
    </Modal>
  );

  const AddLegModal = () => (
    <Modal
      visible={showAddLegModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        resetLegForm();
        setShowAddLegModal(false);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.addLegModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingLeg ? 'Edit Stop' : 'Add New Stop'}
            </Text>
            <TouchableOpacity onPress={() => {
              resetLegForm();
              setShowAddLegModal(false);
            }}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* From City */}
            <Text style={styles.inputLabel}>Departure City *</Text>
            <TouchableOpacity
              style={styles.citySelector}
              onPress={() => {
                setCitySelectionType('from');
                setShowCityModal(true);
              }}
            >
              <Icon name="location-on" size={20} color="#4A90E2" />
              <Text style={legForm.fromCity ? styles.citySelectedText : styles.cityPlaceholderText}>
                {legForm.fromCity || 'Select departure city'}
              </Text>
              {legForm.fromCode && <Text style={styles.cityCodeBadge}>{legForm.fromCode}</Text>}
              <Icon name="arrow-drop-down" size={24} color="#999" />
            </TouchableOpacity>

            {/* To City */}
            <Text style={styles.inputLabel}>Destination City *</Text>
            <TouchableOpacity
              style={styles.citySelector}
              onPress={() => {
                setCitySelectionType('to');
                setShowCityModal(true);
              }}
            >
              <Icon name="location-on" size={20} color="#FF9800" />
              <Text style={legForm.toCity ? styles.citySelectedText : styles.cityPlaceholderText}>
                {legForm.toCity || 'Select destination city'}
              </Text>
              {legForm.toCode && <Text style={styles.cityCodeBadge}>{legForm.toCode}</Text>}
              <Icon name="arrow-drop-down" size={24} color="#999" />
            </TouchableOpacity>

            {/* Travel Date */}
            <Text style={styles.inputLabel}>Travel Date</Text>
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => {
                Alert.alert('Select Date', 'Choose your travel date', [
                  { text: 'Cancel' },
                  { text: 'Today', onPress: () => setLegForm({...legForm, date: new Date().toISOString().split('T')[0]}) },
                  { text: 'Tomorrow', onPress: () => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setLegForm({...legForm, date: tomorrow.toISOString().split('T')[0]});
                  }},
                  { text: 'Next Week', onPress: () => {
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    setLegForm({...legForm, date: nextWeek.toISOString().split('T')[0]});
                  }},
                ]);
              }}
            >
              <Icon name="calendar-today" size={20} color="#4A90E2" />
              <Text style={legForm.date ? styles.dateSelectedText : styles.datePlaceholderText}>
                {legForm.date || 'Select date'}
              </Text>
            </TouchableOpacity>

            {/* Distance (auto-calculated but can be edited) */}
            <Text style={styles.inputLabel}>Distance</Text>
            <TextInput
              style={styles.input}
              placeholder="Auto-calculated"
              value={legForm.distance}
              onChangeText={(text) => setLegForm({...legForm, distance: text})}
              keyboardType="default"
            />

            {/* Duration (auto-calculated but can be edited) */}
            <Text style={styles.inputLabel}>Duration</Text>
            <TextInput
              style={styles.input}
              placeholder="Auto-calculated"
              value={legForm.duration}
              onChangeText={(text) => setLegForm({...legForm, duration: text})}
              keyboardType="default"
            />

            {/* Notes */}
            <Text style={styles.inputLabel}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add any notes for this stop..."
              value={legForm.notes}
              onChangeText={(text) => setLegForm({...legForm, notes: text})}
              multiline
              numberOfLines={3}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelModalButton]}
              onPress={() => {
                resetLegForm();
                setShowAddLegModal(false);
              }}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.addModalButton]}
              onPress={addLeg}
            >
              <Icon name="check" size={20} color="#FFF" />
              <Text style={styles.addModalButtonText}>
                {editingLeg ? 'Update Stop' : 'Add Stop'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const SavedTripsModal = () => (
    <Modal
      visible={showSavedTrips}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        setShowSavedTrips(false);
        setSelectedTripForView(null);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.savedTripsModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>My Saved Road Trips</Text>
            <TouchableOpacity onPress={() => {
              setShowSavedTrips(false);
              setSelectedTripForView(null);
            }}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {selectedTripForView ? (
            <ScrollView style={styles.modalBody}>
              <View style={styles.savedTripDetail}>
                <Text style={styles.savedTripDetailTitle}>{selectedTripForView.name}</Text>
                <Text style={styles.savedTripDetailDate}>
                  Created: {new Date(selectedTripForView.createdAt).toLocaleDateString()}
                </Text>
                <View style={styles.savedTripStats}>
                  <View style={styles.statItem}>
                    <Icon name="location-on" size={16} color="#666" />
                    <Text style={styles.statText}>{selectedTripForView.totalStops} stops</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Icon name="straighten" size={16} color="#666" />
                    <Text style={styles.statText}>{selectedTripForView.totalDistance}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Icon name="timer" size={16} color="#666" />
                    <Text style={styles.statText}>{selectedTripForView.totalDuration}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {selectedTripForView.legs.map((leg, index) => (
                  <View key={leg.id} style={styles.savedLegCard}>
                    <View style={styles.legNumber}>
                      <Text style={styles.legNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.savedLegContent}>
                      <View style={styles.savedLegHeader}>
                        <Icon name="directions-bus" size={20} color="#4A90E2" />
                        <Text style={styles.savedLegRoute}>
                          {leg.fromCity} → {leg.toCity}
                        </Text>
                      </View>
                      <Text style={styles.savedLegDetail}>📅 {leg.date}</Text>
                      <Text style={styles.savedLegDetail}>📏 {leg.distance}</Text>
                      <Text style={styles.savedLegDetail}>⏱️ {leg.duration}</Text>
                      {leg.notes && <Text style={styles.savedLegNote}>📝 {leg.notes}</Text>}
                    </View>
                  </View>
                ))}

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelModalButton]}
                    onPress={() => setSelectedTripForView(null)}
                  >
                    <Text style={styles.cancelModalButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.editTripButton]}
                    onPress={() => loadSavedTripToEdit(selectedTripForView)}
                  >
                    <Icon name="edit" size={20} color="#FFF" />
                    <Text style={styles.addModalButtonText}>Edit Trip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.deleteTripButton]}
                    onPress={() => deleteSavedTrip(selectedTripForView.id)}
                  >
                    <Icon name="delete" size={20} color="#FFF" />
                    <Text style={styles.addModalButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          ) : (
            <FlatList
              data={savedTrips}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.savedTripItem}
                  onPress={() => setSelectedTripForView(item)}
                >
                  <View style={styles.savedTripIcon}>
                    <Icon name="map" size={24} color="#4A90E2" />
                  </View>
                  <View style={styles.savedTripInfo}>
                    <Text style={styles.savedTripName}>{item.name}</Text>
                    <Text style={styles.savedTripMeta}>
                      {item.totalStops} stops • {item.totalDistance}
                    </Text>
                    <Text style={styles.savedTripDate}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={24} color="#999" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <Icon name="inbox" size={60} color="#CCC" />
                  <Text style={styles.emptyStateText}>No saved trips</Text>
                  <Text style={styles.emptyStateSubtext}>Plan and save your first road trip!</Text>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#1A237E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ROAD TRIP PLANNER</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Icon name="directions-bus" size={50} color="#4A90E2" />
          <Text style={styles.heroTitle}>Plan Your Road Journey</Text>
          <Text style={styles.heroSubtitle}>
            Create multi-city road trips across Pakistan
          </Text>
        </View>

        {/* Trip Name Input */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trip Name</Text>
          <TextInput
            style={styles.tripNameInput}
            placeholder="e.g., Northern Pakistan Road Trip"
            placeholderTextColor="#999"
            value={tripName}
            onChangeText={setTripName}
          />
        </View>

        {/* Trip Legs List */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Your Route</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddLegModal(true)}
            >
              <Icon name="add" size={20} color="#FFF" />
              <Text style={styles.addButtonText}>Add Stop</Text>
            </TouchableOpacity>
          </View>

          {legs.length === 0 ? (
            <View style={styles.emptyLegs}>
              <Icon name="add-location" size={40} color="#CCC" />
              <Text style={styles.emptyLegsText}>No stops added yet</Text>
              <Text style={styles.emptyLegsSubtext}>Tap "Add Stop" to plan your journey</Text>
            </View>
          ) : (
            legs.map((leg, index) => (
              <View key={leg.id} style={styles.legCard}>
                <View style={styles.legNumberCircle}>
                  <Text style={styles.legNumberCircleText}>{index + 1}</Text>
                </View>
                <View style={styles.legContent}>
                  <View style={styles.legHeader}>
                    <Icon name="directions-bus" size={20} color="#4A90E2" />
                    <Text style={styles.legRoute}>
                      {leg.fromCity} → {leg.toCity}
                    </Text>
                  </View>
                  <Text style={styles.legDetail}>📅 {leg.date}</Text>
                  <Text style={styles.legDetail}>📏 {leg.distance}</Text>
                  <Text style={styles.legDetail}>⏱️ {leg.duration}</Text>
                  {leg.notes ? <Text style={styles.legNote}>📝 {leg.notes}</Text> : null}
                </View>
                <View style={styles.legActions}>
                  <TouchableOpacity onPress={() => editLeg(leg)} style={styles.legActionButton}>
                    <Icon name="edit" size={18} color="#4A90E2" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeLeg(leg.id)} style={styles.legActionButton}>
                    <Icon name="delete" size={18} color="#F44336" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Summary Section */}
        {legs.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Trip Summary</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Icon name="location-on" size={20} color="#4A90E2" />
                <Text style={styles.summaryLabel}>Start</Text>
                <Text style={styles.summaryValue}>{legs[0].fromCity}</Text>
              </View>
              <Icon name="arrow-forward" size={20} color="#999" />
              <View style={styles.summaryItem}>
                <Icon name="location-on" size={20} color="#FF9800" />
                <Text style={styles.summaryLabel}>End</Text>
                <Text style={styles.summaryValue}>{legs[legs.length - 1].toCity}</Text>
              </View>
            </View>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>{legs.length}</Text>
                <Text style={styles.summaryStatLabel}>Stops</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>
                  {legs.reduce((acc, leg) => {
                    const dist = parseInt(leg.distance);
                    return acc + (isNaN(dist) ? 0 : dist);
                  }, 0)} km
                </Text>
                <Text style={styles.summaryStatLabel}>Distance</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>
                  {legs.reduce((acc, leg) => {
                    const hours = parseInt(leg.duration.match(/(\d+)h/)?.[1] || '0');
                    const mins = parseInt(leg.duration.match(/(\d+)m/)?.[1] || '0');
                    return acc + (hours * 60) + mins;
                  }, 0)} min
                </Text>
                <Text style={styles.summaryStatLabel}>Duration</Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton]}
            onPress={saveCompleteTrip}
          >
            <Icon name="save" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Save Trip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={shareTrip}
          >
            <Icon name="share" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.myTripsButton]}
            onPress={() => setShowSavedTrips(true)}
          >
            <Icon name="folder" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>My Plans</Text>
          </TouchableOpacity>
        </View>

        {/* Reset Button */}
        {(legs.length > 0 || tripName) && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              Alert.alert(
                'Reset Trip',
                'Are you sure you want to clear your trip plan?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: () => {
                      setTripName('');
                      setLegs([]);
                      Alert.alert('Reset', 'Trip plan cleared');
                    }
                  }
                ]
              );
            }}
          >
            <Icon name="refresh" size={20} color="#F44336" />
            <Text style={styles.resetButtonText}>Reset All</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <AddLegModal />
      <CitySelectionModal />
      <SavedTripsModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A237E' },
  headerRight: { width: 40 },

  heroSection: { alignItems: 'center', marginBottom: 24, padding: 20, backgroundColor: '#FFF', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  heroTitle: { fontSize: 24, fontWeight: 'bold', color: '#1A237E', marginTop: 12 },
  heroSubtitle: { fontSize: 14, color: '#666', marginTop: 4, textAlign: 'center' },

  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#1A237E' },

  tripNameInput: { borderWidth: 1, borderColor: '#E3E8EF', borderRadius: 12, padding: 12, fontSize: 16, color: '#1A1A1A', backgroundColor: '#F8F9FA' },

  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4A90E2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginLeft: 4 },

  emptyLegs: { alignItems: 'center', paddingVertical: 40 },
  emptyLegsText: { fontSize: 16, color: '#999', marginTop: 12, fontWeight: '600' },
  emptyLegsSubtext: { fontSize: 14, color: '#CCC', marginTop: 4 },

  legCard: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, padding: 12, backgroundColor: '#F8F9FA', borderRadius: 12, borderWidth: 1, borderColor: '#E3E8EF' },
  legNumberCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  legNumberCircleText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  legContent: { flex: 1 },
  legHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  legRoute: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginLeft: 8 },
  legDetail: { fontSize: 12, color: '#666', marginBottom: 2 },
  legNote: { fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 4 },
  legActions: { flexDirection: 'row', marginLeft: 8 },
  legActionButton: { padding: 8 },

  summaryCard: { backgroundColor: '#E8F0FE', borderRadius: 16, padding: 20, marginBottom: 16 },
  summaryTitle: { fontSize: 18, fontWeight: '600', color: '#1A237E', marginBottom: 16, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  summaryValue: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginTop: 2 },
  summaryStats: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#BBDEFB' },
  summaryStat: { alignItems: 'center' },
  summaryStatValue: { fontSize: 20, fontWeight: 'bold', color: '#4A90E2' },
  summaryStatLabel: { fontSize: 12, color: '#666', marginTop: 4 },

  actionButtons: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  actionButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  saveButton: { backgroundColor: '#4CAF50' },
  shareButton: { backgroundColor: '#4A90E2' },
  myTripsButton: { backgroundColor: '#9C27B0' },
  resetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginBottom: 30, gap: 8 },
  resetButtonText: { color: '#F44336', fontSize: 16, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, minHeight: '70%', padding: 20 },
  addLegModalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', padding: 20 },
  savedTripsModalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A237E' },
  modalBody: { maxHeight: 500 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  modalButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginHorizontal: 4 },
  cancelModalButton: { backgroundColor: '#F1F3F4' },
  addModalButton: { backgroundColor: '#4A90E2' },
  editTripButton: { backgroundColor: '#4A90E2' },
  deleteTripButton: { backgroundColor: '#F44336' },
  cancelModalButtonText: { color: '#666', fontSize: 16, fontWeight: '600' },
  addModalButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 12, paddingHorizontal: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E3E8EF', height: 50, gap: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#1A1A1A' },

  cityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8 },
  cityIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F8FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cityInfo: { flex: 1 },
  cityName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  cityDetail: { fontSize: 12, color: '#4A90E2', marginTop: 2 },
  separator: { height: 1, backgroundColor: '#F0F0F0' },

  inputLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#E3E8EF', borderRadius: 12, padding: 12, fontSize: 16, color: '#1A1A1A', backgroundColor: '#F8F9FA' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  citySelector: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E3E8EF', borderRadius: 12, padding: 12, backgroundColor: '#F8F9FA', gap: 12 },
  citySelectedText: { flex: 1, fontSize: 16, color: '#1A1A1A' },
  cityPlaceholderText: { flex: 1, fontSize: 16, color: '#999' },
  cityCodeBadge: { backgroundColor: '#4A90E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, color: '#FFF', fontSize: 10, fontWeight: '600' },

  dateSelector: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E3E8EF', borderRadius: 12, padding: 12, backgroundColor: '#F8F9FA', gap: 12 },
  dateSelectedText: { flex: 1, fontSize: 16, color: '#1A1A1A' },
  datePlaceholderText: { flex: 1, fontSize: 16, color: '#999' },

  savedTripItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  savedTripIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0F8FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  savedTripInfo: { flex: 1 },
  savedTripName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  savedTripMeta: { fontSize: 14, color: '#666', marginTop: 2 },
  savedTripDate: { fontSize: 12, color: '#999', marginTop: 2 },

  savedTripDetail: { padding: 8 },
  savedTripDetailTitle: { fontSize: 22, fontWeight: 'bold', color: '#1A237E', marginBottom: 4 },
  savedTripDetailDate: { fontSize: 14, color: '#666', marginBottom: 16 },
  savedTripStats: { flexDirection: 'row', gap: 24, marginBottom: 20 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statText: { fontSize: 14, color: '#666' },
  divider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 16 },
  savedLegCard: { flexDirection: 'row', marginBottom: 16, padding: 12, backgroundColor: '#F8F9FA', borderRadius: 12 },
  legNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  legNumberText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  savedLegContent: { flex: 1 },
  savedLegHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  savedLegRoute: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  savedLegDetail: { fontSize: 12, color: '#666', marginBottom: 2 },
  savedLegNote: { fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 4 },

  emptyState: { alignItems: 'center', padding: 40 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: '#CCC', marginTop: 4 },
});

export default TripPlannerScreen;
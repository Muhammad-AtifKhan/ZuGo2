import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TRIP_STATUS } from '../../constants/status';
import api from '../../services/api';

// Assuming we have these types or we can define them locally
interface City {
  id: string;
  name: string;
  code: string;
  province: string;
  popular: boolean;
}

interface TourLeg {
  id: string;
  tripId: string;
  fromCityId: string;
  toCityId: string;
  fromCityName: string;
  toCityName: string;
  departureDate: string;
  departureTime: string;
  arrivalTime: string;
  operator: string;
  fare: number;
}

interface Tour {
  id: string;
  title: string;
  status: 'scheduled' | 'active' | 'expired';
  totalEstimatedFare: number;
  legs: TourLeg[];
  createdAt: any;
}

const TourPlannerScreen = () => {
  const user = auth().currentUser;
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);

  // New Tour Planning State
  const [isPlanning, setIsPlanning] = useState(false);
  const [tourTitle, setTourTitle] = useState('');
  const [legs, setLegs] = useState<TourLeg[]>([]);

  // Add Leg Modal State
  const [showAddLegModal, setShowAddLegModal] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [fromCity, setFromCity] = useState<City | null>(null);
  const [toCity, setToCity] = useState<City | null>(null);
  const [travelDate, setTravelDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchingTrips, setSearchingTrips] = useState(false);
  const [availableTrips, setAvailableTrips] = useState<any[]>([]);

  // City Selection Modal State
  const [showCityModal, setShowCityModal] = useState(false);
  const [citySelectionType, setCitySelectionType] = useState<'from' | 'to'>('from');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTours = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await api.get('/tours');
      setTours(response.data);
    } catch (error) {
      console.error('Error fetching tours:', error);
      Alert.alert('Error', 'Failed to load your tours.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchTours();
      loadCities();
    }, [fetchTours])
  );

  const loadCities = async () => {
    try {
      const cachedCities = await AsyncStorage.getItem('@zugo_cities_cache');
      if (cachedCities) {
        setCities(JSON.parse(cachedCities));
      } else {
        const response = await api.get('/cities');
        setCities(response.data);
        AsyncStorage.setItem('@zugo_cities_cache', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  const handleSearchTrips = async () => {
    if (!fromCity || !toCity) {
      Alert.alert('Missing Info', 'Please select both from and to cities.');
      return;
    }

    setSearchingTrips(true);
    try {
      const dateString = travelDate.toISOString().split('T')[0];
      
      const response = await api.get(`/trips/search?fromCityId=${fromCity.id}&toCityId=${toCity.id}&date=${dateString}`);
      const tripsData = response.data;
      
      if (!tripsData || tripsData.length === 0) {
        setAvailableTrips([]);
        Alert.alert('No Trips', 'No trips available for this route.');
        setSearchingTrips(false);
        return;
      }
      
      const formattedTrips = tripsData.map((trip: any) => ({
        id: trip.id,
        operator: trip.bus?.transporter?.name || 'ZUGO Transport',
        departureTime: new Date(trip.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        arrivalTime: trip.arrivalTime ? new Date(trip.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        fare: trip.price,
        date: dateString,
        availableSeats: trip.totalSeats, // In a real app, calculate actual available seats
        busType: trip.bus?.busType || 'Standard',
      }));

      setAvailableTrips(formattedTrips);
    } catch (error) {
      console.error('Error searching trips:', error);
      Alert.alert('Error', 'Failed to search for trips.');
    } finally {
      setSearchingTrips(false);
    }
  };

  const handleAddLeg = (trip: any) => {
    const newLeg: TourLeg = {
      id: Date.now().toString(),
      tripId: trip.id,
      fromCityId: fromCity!.id,
      toCityId: toCity!.id,
      fromCityName: fromCity!.name,
      toCityName: toCity!.name,
      departureDate: trip.date,
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
      operator: trip.operator || 'ZUGO Transport',
      fare: trip.fare,
    };

    setLegs([...legs, newLeg]);
    setShowAddLegModal(false);
    
    // Automatically set next 'From' city to this 'To' city
    setFromCity(toCity);
    setToCity(null);
    setAvailableTrips([]);
  };

  const handleSaveTour = async () => {
    if (!user) return;
    if (legs.length === 0) {
      Alert.alert('Error', 'Please add at least one trip to your tour.');
      return;
    }
    if (!tourTitle.trim()) {
      Alert.alert('Error', 'Please give your tour a name.');
      return;
    }

    setLoading(true);
    try {
      const totalFare = legs.reduce((sum, leg) => sum + leg.fare, 0);
      
      await api.post('/tours', {
        name: tourTitle,
        status: 'scheduled',
        // Backend handles creating legs later if we update Tour model, for now just the Tour metadata
        // In a complete app, we'd also send legs to be saved in postgres.
      });

      Alert.alert('Success', 'Tour saved successfully!');
      setIsPlanning(false);
      setTourTitle('');
      setLegs([]);
      fetchTours();
    } catch (error) {
      console.error('Error saving tour:', error);
      Alert.alert('Error', 'Failed to save tour.');
    } finally {
      setLoading(false);
    }
  };

  const deleteTour = async (tourId: string) => {
    Alert.alert('Delete Tour', 'Are you sure you want to delete this tour?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/tours/${tourId}`);
            fetchTours();
          } catch (error) {
            console.error('Error deleting tour:', error);
            Alert.alert('Error', 'Failed to delete tour.');
          }
        }
      }
    ]);
  };

  const renderTourCard = ({ item }: { item: Tour }) => (
    <View style={styles.tourCard}>
      <View style={styles.tourHeader}>
        <Text style={styles.tourTitle}>{item.title}</Text>
        <TouchableOpacity onPress={() => deleteTour(item.id)}>
          <Icon name="delete-outline" size={24} color="#E53935" />
        </TouchableOpacity>
      </View>
      <Text style={styles.tourStatus}>Status: {item.status.toUpperCase()}</Text>
      <Text style={styles.tourFare}>Est. Total: PKR {item.totalEstimatedFare.toLocaleString()}</Text>
      
      <View style={styles.timeline}>
        {item.legs.map((leg, index) => (
          <View key={leg.id} style={styles.legItem}>
            <View style={styles.timelineNodeContainer}>
              <View style={styles.timelineNode} />
              {index < item.legs.length - 1 && <View style={styles.timelineLine} />}
            </View>
            <View style={styles.legContent}>
              <Text style={styles.legCity}>{leg.fromCityName} to {leg.toCityName}</Text>
              <Text style={styles.legDetails}>
                {leg.departureDate} at {leg.departureTime}
              </Text>
              <Text style={styles.legOperator}>{leg.operator} • PKR {leg.fare}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const filteredCities = cities.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>TOUR PLANNER</Text>
        {!isPlanning ? (
          <TouchableOpacity 
            style={styles.newTourBtn} 
            onPress={() => {
              setIsPlanning(true);
              setLegs([]);
              setTourTitle('');
              setFromCity(null);
              setToCity(null);
            }}
          >
            <Icon name="add" size={20} color="#FFF" />
            <Text style={styles.newTourBtnText}>Plan New Tour</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.cancelBtn} 
            onPress={() => setIsPlanning(false)}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {isPlanning ? (
        <ScrollView style={styles.planningContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tour Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Summer Trip to Northern Areas"
              value={tourTitle}
              onChangeText={setTourTitle}
              placeholderTextColor="#999"
            />
          </View>

          <Text style={styles.sectionTitle}>Tour Itinerary</Text>
          
          <View style={styles.timeline}>
            {legs.length === 0 ? (
              <Text style={styles.emptyText}>No trips added yet. Start planning!</Text>
            ) : (
              legs.map((leg, index) => (
                <View key={leg.id} style={styles.legItem}>
                  <View style={styles.timelineNodeContainer}>
                    <View style={styles.timelineNode} />
                    {index < legs.length && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.legContent}>
                    <View style={styles.legContentHeader}>
                      <Text style={styles.legCity}>{leg.fromCityName} to {leg.toCityName}</Text>
                      <TouchableOpacity 
                        onPress={() => setLegs(legs.filter((_, i) => i !== index))}
                      >
                        <Icon name="close" size={20} color="#E53935" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.legDetails}>
                      {leg.departureDate} at {leg.departureTime}
                    </Text>
                    <Text style={styles.legOperator}>Fare: PKR {leg.fare.toLocaleString()}</Text>
                  </View>
                </View>
              ))
            )}
            
            <TouchableOpacity 
              style={styles.addLegBtn}
              onPress={() => {
                setShowAddLegModal(true);
                setAvailableTrips([]);
                // If there's a previous leg, auto-set fromCity to its destination
                if (legs.length > 0) {
                  const lastLeg = legs[legs.length - 1];
                  const city = cities.find(c => c.id === lastLeg.toCityId);
                  if (city) setFromCity(city);
                }
              }}
            >
              <Icon name="add-circle-outline" size={24} color="#4A90E2" />
              <Text style={styles.addLegBtnText}>Add Next Trip</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.saveTourBtn} onPress={handleSaveTour}>
            <Text style={styles.saveTourBtnText}>Save Planned Tour</Text>
          </TouchableOpacity>
          <View style={{height: 100}} />
        </ScrollView>
      ) : (
        loading ? (
          <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
        ) : (
          <FlatList
            data={tours}
            renderItem={renderTourCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="map" size={64} color="#E0E0E0" />
                <Text style={styles.emptyTitle}>No Tours Planned</Text>
                <Text style={styles.emptySubtitle}>Start planning your next adventure by creating a new tour!</Text>
              </View>
            }
          />
        )
      )}

      {/* Add Leg Modal */}
      <Modal visible={showAddLegModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Search Trip</Text>
            <TouchableOpacity onPress={() => setShowAddLegModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.selectionField}
              onPress={() => {
                setCitySelectionType('from');
                setShowCityModal(true);
              }}
            >
              <Icon name="my-location" size={24} color="#4A90E2" />
              <Text style={fromCity ? styles.selectionText : styles.placeholderText}>
                {fromCity ? fromCity.name : 'Select Departure City'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.selectionField}
              onPress={() => {
                setCitySelectionType('to');
                setShowCityModal(true);
              }}
            >
              <Icon name="location-on" size={24} color="#E53935" />
              <Text style={toCity ? styles.selectionText : styles.placeholderText}>
                {toCity ? toCity.name : 'Select Destination City'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.selectionField}
              onPress={() => setShowDatePicker(true)}
            >
              <Icon name="calendar-today" size={24} color="#4A90E2" />
              <Text style={styles.selectionText}>
                {travelDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={travelDate}
                mode="date"
                minimumDate={new Date()}
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) setTravelDate(date);
                }}
              />
            )}

            <TouchableOpacity 
              style={styles.searchBtn}
              onPress={handleSearchTrips}
            >
              {searchingTrips ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.searchBtnText}>Find Available Trips</Text>
              )}
            </TouchableOpacity>

            {availableTrips.length > 0 && (
              <View style={styles.resultsContainer}>
                <Text style={styles.sectionTitle}>Select a Trip for this Leg</Text>
                {availableTrips.map(trip => (
                  <TouchableOpacity 
                    key={trip.id} 
                    style={styles.tripCard}
                    onPress={() => handleAddLeg(trip)}
                  >
                    <View style={styles.tripHeader}>
                      <Text style={styles.tripTime}>{trip.departureTime} - {trip.arrivalTime}</Text>
                      <Text style={styles.tripFare}>PKR {trip.fare}</Text>
                    </View>
                    <Text style={styles.tripBus}>{trip.busType} • {trip.operator}</Text>
                    <Text style={styles.tripSeats}>{trip.availableSeats} Seats Available</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* City Selection Modal */}
      <Modal visible={showCityModal} animationType="slide" transparent={true}>
        <View style={styles.cityModalOverlay}>
          <View style={styles.cityModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City</Text>
              <TouchableOpacity onPress={() => setShowCityModal(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search cities..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            <FlatList
              data={filteredCities}
              keyExtractor={item => item.id}
              renderItem={({item}) => (
                <TouchableOpacity 
                  style={styles.cityItem}
                  onPress={() => {
                    if (citySelectionType === 'from') setFromCity(item);
                    else setToCity(item);
                    setShowCityModal(false);
                    setSearchQuery('');
                  }}
                >
                  <Text style={styles.cityName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1A237E',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  newTourBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  newTourBtnText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelBtnText: {
    color: '#FFF',
    fontWeight: '600',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  tourCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tourHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tourTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  tourStatus: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tourFare: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginBottom: 16,
  },
  planningContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginTop: 8,
  },
  timeline: {
    marginLeft: 8,
    marginBottom: 24,
  },
  legItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineNodeContainer: {
    alignItems: 'center',
    width: 20,
    marginRight: 12,
  },
  timelineNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4A90E2',
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E0E0E0',
    marginTop: 4,
  },
  legContent: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  legContentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legCity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  legDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  legOperator: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
    marginTop: 4,
  },
  addLegBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginLeft: 32,
  },
  addLegBtnText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
    marginLeft: 8,
  },
  saveTourBtn: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveTourBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    padding: 20,
  },
  selectionField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    marginLeft: 12,
    flex: 1,
  },
  searchBtn: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  searchBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsContainer: {
    marginTop: 24,
  },
  tripCard: {
    backgroundColor: '#F5F7FA',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tripTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  tripFare: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  tripBus: {
    fontSize: 14,
    color: '#666',
  },
  tripSeats: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '600',
  },
  cityModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  cityModalContent: {
    backgroundColor: '#FFF',
    height: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  searchInput: {
    backgroundColor: '#F5F7FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
    color: '#333',
  },
  cityItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  cityName: {
    fontSize: 16,
    color: '#333',
  },
});

export default TourPlannerScreen;

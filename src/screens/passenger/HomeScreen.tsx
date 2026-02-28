import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PassengerStackParamList } from '../../navigation/PassengerNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

type HomeScreenNavigationProp = StackNavigationProp<PassengerStackParamList, 'Home'>;

interface City {
  id: string;
  name: string;
  code: string;
  province: string;
  popular: boolean;
  lat?: number;
  lng?: number;
}

interface Route {
  id: string;
  name: string;
  from: string;
  to: string;
  fromCode: string;
  toCode: string;
  frequency: string;
  fare: number;
  busNumber: string;
  departureTime: string;
  arrivalTime: string;
  distance: string;
  duration: string;
  rating: number;
  busType: 'AC' | 'Non-AC' | 'Luxury' | 'Standard';
  operator: string;
}

interface QuickBooking {
  id: string;
  name: string;
  time: string;
  from: string;
  to: string;
  fromCode: string;
  toCode: string;
  routeId: string;
  busNumber: string;
  fare: number;
  icon?: string;
}

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const user = auth().currentUser;

  // State for locations
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [fromCode, setFromCode] = useState('');
  const [toCode, setToCode] = useState('');
  const [fromCityId, setFromCityId] = useState('');
  const [toCityId, setToCityId] = useState('');

  // State for date/time
  const [travelDate, setTravelDate] = useState(new Date());
  const [travelTime, setTravelTime] = useState('');

  // State for modals
  const [showCityModal, setShowCityModal] = useState(false);
  const [citySelectionType, setCitySelectionType] = useState<'from' | 'to'>('from');
  const [cities, setCities] = useState<City[]>([]);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingCities, setLoadingCities] = useState(false);

  // State for routes
  const [popularRoutes, setPopularRoutes] = useState<Route[]>([]);
  const [quickBookings, setQuickBookings] = useState<QuickBooking[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch cities from Firebase
  useEffect(() => {
    fetchCities();
    fetchPopularRoutes();
    fetchQuickBookings();
  }, []);

  const fetchCities = async () => {
    setLoadingCities(true);
    try {
      const snapshot = await firestore()
        .collection('cities')
        .orderBy('name')
        .get();

      const citiesList: City[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        citiesList.push({
          id: doc.id,
          name: data.name,
          code: data.code,
          province: data.province,
          popular: data.popular || false,
          lat: data.lat,
          lng: data.lng,
        });
      });
      setCities(citiesList);
      setFilteredCities(citiesList);
    } catch (error) {
      console.error('Error fetching cities:', error);
      Alert.alert('Error', 'Failed to load cities');
    } finally {
      setLoadingCities(false);
    }
  };

  const fetchPopularRoutes = async () => {
    try {
      const snapshot = await firestore()
        .collection('routes')
        .where('popular', '==', true)
        .orderBy('bookingCount', 'desc')
        .limit(5)
        .get();

      const routes: Route[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        routes.push({
          id: doc.id,
          name: data.name || '',
          from: data.from || '',
          to: data.to || '',
          fromCode: data.fromCode || '',
          toCode: data.toCode || '',
          frequency: data.frequency || 'Every 30 min',
          fare: data.fare || 0,
          busNumber: data.busNumber || '',
          departureTime: data.departureTime || '08:00 AM',
          arrivalTime: data.arrivalTime || '09:30 AM',
          distance: data.distance || '',
          duration: data.duration || '',
          rating: data.rating || 4.5,
          busType: data.busType || 'Standard',
          operator: data.operator || 'ZUGO Transport',
        });
      });
      setPopularRoutes(routes);
    } catch (error) {
      console.error('Error fetching popular routes:', error);
    }
  };

  const fetchQuickBookings = async () => {
    try {
      // Get most booked routes for quick bookings
      const snapshot = await firestore()
        .collection('routes')
        .orderBy('bookingCount', 'desc')
        .limit(3)
        .get();

      const bookings: QuickBooking[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        bookings.push({
          id: doc.id,
          name: `${data.from.split(' ')[0]} → ${data.to.split(' ')[0]}`,
          time: data.departureTime || 'Any Time',
          from: data.from,
          to: data.to,
          fromCode: data.fromCode,
          toCode: data.toCode,
          routeId: doc.id,
          busNumber: data.busNumber || '',
          fare: data.fare || 0,
          icon: 'directions-bus',
        });
      });
      setQuickBookings(bookings);
    } catch (error) {
      console.error('Error fetching quick bookings:', error);
    }
  };

  const handleCitySelect = (city: City) => {
    if (citySelectionType === 'from') {
      setFromLocation(city.name);
      setFromCode(city.code);
      setFromCityId(city.id);
    } else {
      setToLocation(city.name);
      setToCode(city.code);
      setToCityId(city.id);
    }
    setShowCityModal(false);
    setSearchQuery('');
  };

  const handleSearchCities = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredCities(cities);
    } else {
      const filtered = cities.filter(city =>
        city.name.toLowerCase().includes(text.toLowerCase()) ||
        city.code.toLowerCase().includes(text.toLowerCase()) ||
        city.province.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredCities(filtered);
    }
  };

  const handleSwapLocations = () => {
    const tempLocation = fromLocation;
    const tempCode = fromCode;
    const tempId = fromCityId;

    setFromLocation(toLocation);
    setFromCode(toCode);
    setFromCityId(toCityId);

    setToLocation(tempLocation);
    setToCode(tempCode);
    setToCityId(tempId);
  };

  const handleSearch = async () => {
    if (!fromLocation || !toLocation) {
      Alert.alert('Missing Information', 'Please select both locations');
      return;
    }

    if (fromLocation === toLocation) {
      Alert.alert('Invalid Route', 'From and To locations cannot be the same');
      return;
    }

    setLoading(true);

    try {
      // Save search to history if user is logged in
      if (user) {
        await firestore().collection('search_history').add({
          userId: user.uid,
          from: fromLocation,
          to: toLocation,
          fromCode: fromCode,
          toCode: toCode,
          fromCityId: fromCityId,
          toCityId: toCityId,
          date: travelDate.toISOString().split('T')[0],
          timestamp: firestore.FieldValue.serverTimestamp(),
        });
      }

      // Navigate to search results
      navigation.navigate('SearchResults', {
        from: fromLocation,
        to: toLocation,
        fromCode: fromCode,
        toCode: toCode,
        fromCityId: fromCityId,
        toCityId: toCityId,
        date: travelDate.toISOString().split('T')[0],
        time: travelTime || 'Anytime',
      });
    } catch (error) {
      console.error('Error saving search:', error);
      // Still navigate even if saving fails
      navigation.navigate('SearchResults', {
        from: fromLocation,
        to: toLocation,
        fromCode: fromCode,
        toCode: toCode,
        fromCityId: fromCityId,
        toCityId: toCityId,
        date: travelDate.toISOString().split('T')[0],
        time: travelTime || 'Anytime',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickBookingPress = (booking: QuickBooking) => {
    setFromLocation(booking.from);
    setToLocation(booking.to);
    setFromCode(booking.fromCode);
    setToCode(booking.toCode);

    if (booking.time !== 'Any Time') {
      setTravelTime(booking.time);
    }

    navigation.navigate('SearchResults', {
      from: booking.from,
      to: booking.to,
      fromCode: booking.fromCode,
      toCode: booking.toCode,
      date: new Date().toISOString().split('T')[0],
      time: booking.time !== 'Any Time' ? booking.time : 'Anytime',
      routeId: booking.routeId,
      busNumber: booking.busNumber,
      fare: booking.fare.toString(),
      isQuickBooking: true,
    });
  };

  const handlePopularRoutePress = (route: Route) => {
    setFromLocation(route.from);
    setToLocation(route.to);
    setFromCode(route.fromCode);
    setToCode(route.toCode);

    navigation.navigate('SearchResults', {
      from: route.from,
      to: route.to,
      fromCode: route.fromCode,
      toCode: route.toCode,
      date: new Date().toISOString().split('T')[0],
      time: route.departureTime,
      routeId: route.id,
      busNumber: route.busNumber,
      fare: route.fare.toString(),
    });
  };

  const handleCurrentLocation = () => {
    Alert.alert(
      'Use Current Location',
      'This will use your current city as starting point',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use Current City',
          onPress: () => {
            // For now, set to first popular city
            // In real app, use geolocation to detect city
            const defaultCity = cities.find(c => c.popular) || cities[0];
            if (defaultCity) {
              setFromLocation(defaultCity.name);
              setFromCode(defaultCity.code);
              setFromCityId(defaultCity.id);
            }
          }
        }
      ]
    );
  };

  const formatFare = (fare: number) => {
    return `PKR ${fare.toLocaleString()}`;
  };

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
            <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search cities..."
              value={searchQuery}
              onChangeText={handleSearchCities}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="clear" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {loadingCities ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>Loading cities...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={() => (
                <>
                  {filteredCities.some(c => c.popular) && (
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionHeaderText}>Popular Cities</Text>
                    </View>
                  )}
                </>
              )}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.cityItem}
                  onPress={() => handleCitySelect(item)}
                >
                  <View style={styles.cityIconContainer}>
                    <Icon
                      name={item.popular ? "star" : "location-city"}
                      size={20}
                      color={item.popular ? "#FFD700" : "#4A90E2"}
                    />
                  </View>
                  <View style={styles.cityInfo}>
                    <Text style={styles.cityName}>{item.name}</Text>
                    <Text style={styles.cityCode}>{item.code} • {item.province}</Text>
                  </View>
                  {item.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>Popular</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Icon name="location-off" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No cities found</Text>
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
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>BOOK YOUR TRIP</Text>
          <Text style={styles.subtitle}>Find and book your bus in minutes</Text>
        </View>

        {/* Search Section */}
        <View style={styles.searchCard}>
          <Text style={styles.sectionTitle}>SEARCH ROUTES</Text>

          {/* From Location - Dropdown */}
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => {
              setCitySelectionType('from');
              setShowCityModal(true);
            }}
          >
            <Icon name="location-on" size={24} color="#4A90E2" style={styles.inputIcon} />
            <View style={styles.inputContent}>
              <Text style={[styles.inputText, !fromLocation && styles.placeholderText]}>
                {fromLocation || 'Select departure city'}
              </Text>
              {fromCode ? <Text style={styles.cityCode}>{fromCode}</Text> : null}
            </View>
            <Icon name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>

          {/* Swap Button */}
          <TouchableOpacity style={styles.swapButton} onPress={handleSwapLocations}>
            <Icon name="swap-vert" size={24} color="#4A90E2" />
          </TouchableOpacity>

          {/* To Location - Dropdown */}
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => {
              setCitySelectionType('to');
              setShowCityModal(true);
            }}
          >
            <Icon name="location-on" size={24} color="#4A90E2" style={styles.inputIcon} />
            <View style={styles.inputContent}>
              <Text style={[styles.inputText, !toLocation && styles.placeholderText]}>
                {toLocation || 'Select destination city'}
              </Text>
              {toCode ? <Text style={styles.cityCode}>{toCode}</Text> : null}
            </View>
            <Icon name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>

          {/* Current Location Option */}
          <TouchableOpacity style={styles.currentLocationRow} onPress={handleCurrentLocation}>
            <Icon name="my-location" size={20} color="#4A90E2" />
            <Text style={styles.currentLocationText}>Use my current location</Text>
          </TouchableOpacity>

          {/* Date & Time Row */}
          <View style={styles.row}>
            <View style={styles.halfInputContainer}>
              <Icon name="calendar-today" size={20} color="#4A90E2" style={styles.inputIcon} />
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  // In a real app, show date picker
                  Alert.alert('Select Date', 'Date picker coming soon');
                }}
              >
                <Text style={styles.dateText}>
                  {travelDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.halfInputContainer}>
              <Icon name="access-time" size={20} color="#4A90E2" style={styles.inputIcon} />
              <TextInput
                style={styles.halfInput}
                placeholder="Anytime"
                placeholderTextColor="#999"
                value={travelTime}
                onChangeText={setTravelTime}
              />
            </View>
          </View>

          {/* Search Button */}
          <TouchableOpacity
            style={[styles.searchButton, loading && styles.disabledButton]}
            onPress={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Text style={styles.searchButtonText}>SEARCH BUSES</Text>
                <Icon name="search" size={20} color="#FFF" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Bookings */}
        {quickBookings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>QUICK BOOKINGS</Text>
            <View style={styles.quickBookingsContainer}>
              {quickBookings.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.quickBookingCard}
                  onPress={() => handleQuickBookingPress(item)}
                >
                  <View style={styles.quickBookingIcon}>
                    <Icon name="directions-bus" size={24} color="#4A90E2" />
                  </View>
                  <Text style={styles.quickBookingName}>{item.name}</Text>
                  <Text style={styles.quickBookingTime}>{item.time}</Text>
                  <Text style={styles.quickBookingFare}>{formatFare(item.fare)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Popular Routes */}
        {popularRoutes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>POPULAR ROUTES</Text>
            {popularRoutes.map((route) => (
              <TouchableOpacity
                key={route.id}
                style={styles.routeCard}
                onPress={() => handlePopularRoutePress(route)}
              >
                <View style={styles.routeHeader}>
                  <View style={styles.busIconContainer}>
                    <Icon name="directions-bus" size={24} color="#FFF" />
                  </View>
                  <View style={styles.routeTitleContainer}>
                    <Text style={styles.routeName}>{route.name}</Text>
                    <Text style={styles.routeNumber}>Bus {route.busNumber} • {route.busType}</Text>
                  </View>
                </View>

                <View style={styles.routeDetails}>
                  <View style={styles.routeRow}>
                    <Icon name="location-on" size={18} color="#4A90E2" />
                    <View style={styles.locationTextContainer}>
                      <Text style={styles.routeFrom}>From: {route.from} ({route.fromCode})</Text>
                      <Text style={styles.routeTo}>To: {route.to} ({route.toCode})</Text>
                    </View>
                  </View>

                  <View style={styles.routeInfoRow}>
                    <View style={styles.infoItem}>
                      <Icon name="schedule" size={16} color="#666" />
                      <Text style={styles.infoText}>{route.departureTime} - {route.arrivalTime}</Text>
                    </View>

                    <View style={styles.infoItem}>
                      <Icon name="repeat" size={16} color="#666" />
                      <Text style={styles.infoText}>{route.frequency}</Text>
                    </View>
                  </View>

                  <View style={styles.routeInfoRow}>
                    <View style={styles.infoItem}>
                      <Icon name="attach-money" size={16} color="#666" />
                      <Text style={styles.infoText}>Fare: {formatFare(route.fare)}</Text>
                    </View>

                    <View style={styles.infoItem}>
                      <Icon name="star" size={16} color="#FFD700" />
                      <Text style={styles.infoText}>{route.rating.toFixed(1)} ★</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.bookNowButton}
                  onPress={() => handlePopularRoutePress(route)}
                >
                  <Text style={styles.bookNowText}>BOOK NOW</Text>
                  <Icon name="arrow-forward" size={18} color="#FFF" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* City Selection Modal */}
      <CitySelectionModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  searchCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  placeholderText: {
    color: '#999',
  },
  cityCode: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
    marginLeft: 8,
  },
  swapButton: {
    position: 'absolute',
    right: 30,
    top: 90,
    backgroundColor: '#FFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3E8EF',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  currentLocationText: {
    fontSize: 14,
    color: '#4A90E2',
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  halfInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    height: 56,
    marginRight: 12,
  },
  halfInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    height: '100%',
  },
  dateButton: {
    flex: 1,
    justifyContent: 'center',
    height: '100%',
  },
  dateText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  searchButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#B0B0B0',
    shadowColor: '#666',
  },
  searchButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  quickBookingsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickBookingCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3E8EF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickBookingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickBookingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
    textAlign: 'center',
  },
  quickBookingTime: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
    marginBottom: 4,
  },
  quickBookingFare: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  routeCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  busIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  routeTitleContainer: {
    flex: 1,
  },
  routeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  routeNumber: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  routeDetails: {
    marginBottom: 20,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  locationTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  routeFrom: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
    marginBottom: 4,
  },
  routeTo: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  routeInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  bookNowButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookNowText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '70%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    height: 50,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  sectionHeader: {
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  cityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  cityCode: {
    fontSize: 12,
    color: '#666',
  },
  popularBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 10,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
});

export default HomeScreen;
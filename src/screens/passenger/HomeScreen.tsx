// src/screens/passenger/HomeScreen.tsx - STANDARDIZED STATUSES
import React, { useState, useEffect, useCallback } from 'react';
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
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PassengerStackParamList } from '../../navigation/PassengerNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { cleanupExpiredBookings } from '../../utils/bookingCleanup';

// ✅ Import standardized status constants
import { TRIP_STATUS } from '../../constants/status';

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
  fromCityId: string;
  toCityId: string;
  fromCityName: string;
  toCityName: string;
  fromCode: string;
  toCode: string;
  distance: number;
  duration: string;
  baseFare: number;
  operator: string;
  rating: number;
  totalRatings: number;
  busTypes: string[];
}

interface Trip {
  id: string;
  routeId: string;
  busNumber: string;
  departureTime: string;
  arrivalTime: string;
  availableSeats: number;
  fare: number;
  busType: string;
  status?: string; // ✅ Added status field
}

interface QuickBooking {
  id: string;
  name: string;
  time: string;
  fromCityId: string;
  toCityId: string;
  fromCityName: string;
  toCityName: string;
  fromCode: string;
  toCode: string;
  routeId: string;
  fare: number;
  icon?: string;
}

interface RecentSearch {
  id: string;
  fromCityId: string;
  toCityId: string;
  fromCityName: string;
  toCityName: string;
  fromCode: string;
  toCode: string;
  timestamp: number;
}

// Pakistan Cities Data (Hardcoded as backup)
const PAKISTAN_CITIES = [
  { id: 'lhe', name: 'Lahore', code: 'LHE', province: 'Punjab', popular: true },
  { id: 'fsd', name: 'Faisalabad', code: 'FSD', province: 'Punjab', popular: true },
  { id: 'rwp', name: 'Rawalpindi', code: 'RWP', province: 'Punjab', popular: true },
  { id: 'mux', name: 'Multan', code: 'MUX', province: 'Punjab', popular: true },
  { id: 'grw', name: 'Gujranwala', code: 'GRW', province: 'Punjab', popular: false },
  { id: 'skt', name: 'Sialkot', code: 'SKT', province: 'Punjab', popular: false },
  { id: 'bhv', name: 'Bahawalpur', code: 'BHV', province: 'Punjab', popular: false },
  { id: 'sgd', name: 'Sargodha', code: 'SGD', province: 'Punjab', popular: false },
  { id: 'khi', name: 'Karachi', code: 'KHI', province: 'Sindh', popular: true },
  { id: 'hdd', name: 'Hyderabad', code: 'HDD', province: 'Sindh', popular: true },
  { id: 'skz', name: 'Sukkur', code: 'SKZ', province: 'Sindh', popular: false },
  { id: 'pew', name: 'Peshawar', code: 'PEW', province: 'KPK', popular: true },
  { id: 'abt', name: 'Abbottabad', code: 'ABT', province: 'KPK', popular: false },
  { id: 'uet', name: 'Quetta', code: 'UET', province: 'Balochistan', popular: true },
  { id: 'gwd', name: 'Gwadar', code: 'GWD', province: 'Balochistan', popular: false },
  { id: 'isb', name: 'Islamabad', code: 'ISB', province: 'Islamabad', popular: true },
  { id: 'gil', name: 'Gilgit', code: 'GIL', province: 'Gilgit-Baltistan', popular: false },
  { id: 'skd', name: 'Skardu', code: 'SKD', province: 'Gilgit-Baltistan', popular: false },
];

const TIME_SLOTS = [
  { label: 'Anytime', value: '' },
  { label: 'Morning (6AM - 12PM)', value: 'morning' },
  { label: 'Afternoon (12PM - 5PM)', value: 'afternoon' },
  { label: 'Evening (5PM - 9PM)', value: 'evening' },
  { label: 'Night (9PM - 6AM)', value: 'night' },
];

const SkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonHeader}>
      <View style={styles.skeletonIcon} />
      <View style={styles.skeletonTitleContainer}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonSubtitle} />
      </View>
    </View>
    <View style={styles.skeletonContent}>
      <View style={styles.skeletonRow} />
      <View style={styles.skeletonRow} />
    </View>
    <View style={styles.skeletonButton} />
  </View>
);

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const user = auth().currentUser;

  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [fromCode, setFromCode] = useState('');
  const [toCode, setToCode] = useState('');
  const [fromCityId, setFromCityId] = useState('');
  const [toCityId, setToCityId] = useState('');

  const [travelDate, setTravelDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [travelTimeSlot, setTravelTimeSlot] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [showCityModal, setShowCityModal] = useState(false);
  const [citySelectionType, setCitySelectionType] = useState<'from' | 'to'>('from');
  const [cities, setCities] = useState<City[]>([]);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingCities, setLoadingCities] = useState(false);

  const [popularRoutes, setPopularRoutes] = useState<Route[]>([]);
  const [routeTrips, setRouteTrips] = useState<{ [key: string]: Trip[] }>({});
  const [quickBookings, setQuickBookings] = useState<QuickBooking[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(true);

  const CITIES_CACHE_KEY = '@zugo_cities_cache';

  const loadCitiesFromCache = useCallback(async () => {
    try {
      const cachedCities = await AsyncStorage.getItem(CITIES_CACHE_KEY);
      if (cachedCities) {
        const parsedCities = JSON.parse(cachedCities);
        setCities(parsedCities);
        setFilteredCities(parsedCities);
        console.log('📦 Loaded cities from cache');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading cities from cache:', error);
      return false;
    }
  }, []);

  const fetchCities = useCallback(async () => {
    setLoadingCities(true);
    try {
      const snapshot = await firestore()
        .collection('cities')
        .orderBy('name')
        .get();

      if (!snapshot.empty) {
        const citiesList: City[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          citiesList.push({
            id: doc.id,
            name: data.name,
            code: data.code,
            province: data.province,
            popular: data.popular || false,
          });
        });

        setCities(citiesList);
        setFilteredCities(citiesList);
        await AsyncStorage.setItem(CITIES_CACHE_KEY, JSON.stringify(citiesList));
      } else {
        setCities(PAKISTAN_CITIES);
        setFilteredCities(PAKISTAN_CITIES);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCities(PAKISTAN_CITIES);
      setFilteredCities(PAKISTAN_CITIES);
    } finally {
      setLoadingCities(false);
    }
  }, []);

  const fetchPopularRoutes = useCallback(async () => {
    setLoadingRoutes(true);
    try {
      const snapshot = await firestore()
        .collection('routes')
        .where('popular', '==', true)
        .orderBy('bookingCount', 'desc')
        .limit(5)
        .get();

      const routes: Route[] = [];
      const routeIds: string[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        const route: Route = {
          id: doc.id,
          name: data.name || `${data.fromCityName} → ${data.toCityName}`,
          fromCityId: data.fromCityId || '',
          toCityId: data.toCityId || '',
          fromCityName: data.fromCityName || data.from || '',
          toCityName: data.toCityName || data.to || '',
          fromCode: data.fromCode || '',
          toCode: data.toCode || '',
          distance: data.distance || 0,
          duration: data.duration || '2h 30m',
          baseFare: data.baseFare || 0,
          operator: data.operator || 'ZUGO Transport',
          rating: data.rating || 4.5,
          totalRatings: data.totalRatings || 0,
          busTypes: data.busTypes || ['Standard'],
        };
        routes.push(route);
        routeIds.push(doc.id);
      });

      setPopularRoutes(routes);

      const safeRouteIds = routeIds.slice(0, 10);

      if (safeRouteIds.length > 0) {
        const dateString = travelDate.toISOString().split('T')[0];

        // ✅ Updated: Use standardized statuses for filtering available trips
        const tripsSnapshot = await firestore()
          .collection('trips')
          .where('routeId', 'in', safeRouteIds)
          .where('status', 'in', [TRIP_STATUS.SCHEDULED, TRIP_STATUS.IN_PROGRESS])
          .where('date', '==', dateString)
          .orderBy('departureTime')
          .get();

        const tripsByRoute: { [key: string]: Trip[] } = {};
        tripsSnapshot.forEach(doc => {
          const data = doc.data();
          const trip: Trip = {
            id: doc.id,
            routeId: data.routeId,
            busNumber: data.busNumber || '',
            departureTime: data.departureTime || '',
            arrivalTime: data.arrivalTime || '',
            availableSeats: data.availableSeats || 0,
            fare: data.fare || 0,
            busType: data.busType || 'Standard',
            status: data.status, // ✅ Include status
          };

          if (!tripsByRoute[data.routeId]) {
            tripsByRoute[data.routeId] = [];
          }
          tripsByRoute[data.routeId].push(trip);
        });

        setRouteTrips(tripsByRoute);
      }
    } catch (error) {
      console.error('Error fetching popular routes:', error);
      Alert.alert('Error', 'Failed to load popular routes. Please try again.');
    } finally {
      setLoadingRoutes(false);
    }
  }, [travelDate]);

  const fetchQuickBookings = useCallback(async () => {
    try {
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
          name: `${data.fromCityName?.split(' ')[0] || ''} → ${data.toCityName?.split(' ')[0] || ''}`,
          time: 'Any Time',
          fromCityId: data.fromCityId || '',
          toCityId: data.toCityId || '',
          fromCityName: data.fromCityName || data.from || '',
          toCityName: data.toCityName || data.to || '',
          fromCode: data.fromCode || '',
          toCode: data.toCode || '',
          routeId: doc.id,
          fare: data.baseFare || 0,
          icon: 'directions-bus',
        });
      });
      setQuickBookings(bookings);
    } catch (error) {
      console.error('Error fetching quick bookings:', error);
    }
  }, []);

  const loadRecentSearches = useCallback(async () => {
    try {
      const searchesJson = await AsyncStorage.getItem('@zugo_recent_searches');
      if (searchesJson) {
        const searches = JSON.parse(searchesJson);
        setRecentSearches(searches.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  }, []);

  const saveRecentSearch = useCallback(async (
    fromId: string,
    toId: string,
    fromName: string,
    toName: string,
    fromCode: string,
    toCode: string
  ) => {
    try {
      const newSearch: RecentSearch = {
        id: `${fromId}-${toId}-${Date.now()}`,
        fromCityId: fromId,
        toCityId: toId,
        fromCityName: fromName,
        toCityName: toName,
        fromCode,
        toCode,
        timestamp: Date.now(),
      };

      const updatedSearches = [newSearch, ...recentSearches.filter(s =>
        !(s.fromCityId === fromId && s.toCityId === toId)
      )].slice(0, 20);

      await AsyncStorage.setItem('@zugo_recent_searches', JSON.stringify(updatedSearches));
      setRecentSearches(updatedSearches.slice(0, 5));
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  }, [recentSearches]);

  useEffect(() => {
    let isMounted = true;

    const initializeCities = async () => {
      const hasCache = await loadCitiesFromCache();
      if (!hasCache && isMounted) {
        await fetchCities();
      } else if (isMounted) {
        fetchCities();
      }
    };

    initializeCities();
    fetchPopularRoutes();
    fetchQuickBookings();
    loadRecentSearches();

    return () => {
      isMounted = false;
    };
  }, [fetchCities, fetchPopularRoutes, fetchQuickBookings, loadRecentSearches, loadCitiesFromCache]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const cleanupBookings = async () => {
        if (!user || !isActive) return;
        try {
          await cleanupExpiredBookings(user.uid);
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      };

      cleanupBookings();

      return () => {
        isActive = false;
      };
    }, [user])
  );

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        Alert.alert('Invalid Date', 'Please select a future date');
        return;
      }

      setTravelDate(selectedDate);
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

  const getSuggestions = useCallback(() => {
    if (!fromCityId) return [];
    return cities.filter(c => c.id !== fromCityId && c.popular).slice(0, 3);
  }, [fromCityId, cities]);

  const suggestions = getSuggestions();

  const handleSearch = async () => {
    if (!fromLocation || !toLocation) {
      Alert.alert('Missing Information', 'Please select both locations');
      return;
    }

    if (fromCityId === toCityId) {
      Alert.alert('Invalid Route', 'From and To locations cannot be the same');
      return;
    }

    setLoading(true);

    try {
      if (user) {
        const historyRef = firestore().collection('search_history');
        const userHistory = await historyRef
          .where('userId', '==', user.uid)
          .orderBy('timestamp', 'desc')
          .get();

        if (userHistory.size >= 20) {
          const oldest = userHistory.docs[userHistory.size - 1];
          await oldest.ref.delete();
        }

        await historyRef.add({
          userId: user.uid,
          fromCityId,
          toCityId,
          fromCityName: fromLocation,
          toCityName: toLocation,
          fromCode,
          toCode,
          date: travelDate.toISOString().split('T')[0],
          timestamp: firestore.FieldValue.serverTimestamp(),
        });
      }

      await saveRecentSearch(
        fromCityId,
        toCityId,
        fromLocation,
        toLocation,
        fromCode,
        toCode
      );

      navigation.navigate('SearchResults', {
        fromCityId,
        toCityId,
        fromCityName: fromLocation,
        toCityName: toLocation,
        fromCode,
        toCode,
        date: travelDate.toISOString().split('T')[0],
        timeSlot: travelTimeSlot,
      });
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to save search. Please try again.');
      navigation.navigate('SearchResults', {
        fromCityId,
        toCityId,
        fromCityName: fromLocation,
        toCityName: toLocation,
        fromCode,
        toCode,
        date: travelDate.toISOString().split('T')[0],
        timeSlot: travelTimeSlot,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickBookingPress = (booking: QuickBooking) => {
    setFromLocation(booking.fromCityName);
    setToLocation(booking.toCityName);
    setFromCode(booking.fromCode);
    setToCode(booking.toCode);
    setFromCityId(booking.fromCityId);
    setToCityId(booking.toCityId);

    navigation.navigate('SearchResults', {
      fromCityId: booking.fromCityId,
      toCityId: booking.toCityId,
      fromCityName: booking.fromCityName,
      toCityName: booking.toCityName,
      fromCode: booking.fromCode,
      toCode: booking.toCode,
      date: new Date().toISOString().split('T')[0],
      timeSlot: '',
      routeId: booking.routeId,
      isQuickBooking: true,
    });
  };

  const handleRecentSearchPress = (search: RecentSearch) => {
    const fromCity = cities.find(c => c.id === search.fromCityId);
    const toCity = cities.find(c => c.id === search.toCityId);

    if (fromCity && toCity) {
      setFromLocation(fromCity.name);
      setToLocation(toCity.name);
      setFromCode(fromCity.code);
      setToCode(toCity.code);
      setFromCityId(fromCity.id);
      setToCityId(toCity.id);

      navigation.navigate('SearchResults', {
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        fromCityName: fromCity.name,
        toCityName: toCity.name,
        fromCode: fromCity.code,
        toCode: toCity.code,
        date: new Date().toISOString().split('T')[0],
        timeSlot: '',
      });
    }
  };

  const handlePopularRoutePress = (route: Route) => {
    if (!routeTrips[route.id]?.length) {
      Alert.alert(
        'No Trips Available',
        `Sorry, no active trips found for ${route.fromCityName} → ${route.toCityName}. Please try another date.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setFromLocation(route.fromCityName);
    setToLocation(route.toCityName);
    setFromCode(route.fromCode);
    setToCode(route.toCode);
    setFromCityId(route.fromCityId);
    setToCityId(route.toCityId);

    navigation.navigate('SearchResults', {
      fromCityId: route.fromCityId,
      toCityId: route.toCityId,
      fromCityName: route.fromCityName,
      toCityName: route.toCityName,
      fromCode: route.fromCode,
      toCode: route.toCode,
      date: travelDate.toISOString().split('T')[0],
      timeSlot: '',
      routeId: route.id,
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

  const formatFare = (fare: number) => `PKR ${fare.toLocaleString()}`;
  const getRouteTrip = (routeId: string): Trip | undefined => routeTrips[routeId]?.[0];

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
            <TouchableOpacity onPress={() => setShowCityModal(false)} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Pakistan cities..."
              value={searchQuery}
              onChangeText={handleSearchCities}
              placeholderTextColor="#999"
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
              <Text style={styles.loadingText}>Loading Pakistan cities...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.cityItem,
                    (citySelectionType === 'from' && fromCityId === item.id) ||
                    (citySelectionType === 'to' && toCityId === item.id)
                      ? styles.cityItemSelected
                      : null
                  ]}
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
                    <Text style={styles.cityCodeSmall}>{item.code} • {item.province}</Text>
                  </View>
                  {item.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>Popular</Text>
                    </View>
                  )}
                  {((citySelectionType === 'from' && fromCityId === item.id) ||
                    (citySelectionType === 'to' && toCityId === item.id)) && (
                    <Icon name="check-circle" size={24} color="#4A90E2" />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Icon name="location-off" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No cities found</Text>
                  <Text style={styles.emptySubText}>Try searching for a different city</Text>
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
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>BOOK YOUR TRIP</Text>
          <Text style={styles.subtitle}>Find and book your bus in minutes</Text>
        </View>

        <View style={styles.searchCard}>
          <Text style={styles.sectionTitle}>SEARCH ROUTES</Text>

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

          <TouchableOpacity style={styles.swapButton} onPress={handleSwapLocations}>
            <Icon name="swap-vert" size={24} color="#4A90E2" />
          </TouchableOpacity>

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

          <TouchableOpacity style={styles.currentLocationRow} onPress={handleCurrentLocation}>
            <Icon name="my-location" size={20} color="#4A90E2" />
            <Text style={styles.currentLocationText}>Use my current location</Text>
          </TouchableOpacity>

          {fromLocation && suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Popular from here:</Text>
              <View style={styles.suggestionsList}>
                {suggestions.map(city => (
                  <TouchableOpacity
                    key={city.id}
                    style={styles.suggestionChip}
                    onPress={() => {
                      setToLocation(city.name);
                      setToCode(city.code);
                      setToCityId(city.id);
                    }}
                  >
                    <Icon name="location-on" size={16} color="#4A90E2" />
                    <Text style={styles.suggestionChipText}>{city.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.row}>
            <View style={styles.halfInputContainer}>
              <Icon name="calendar-today" size={20} color="#4A90E2" style={styles.inputIcon} />
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
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
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowTimePicker(true)}>
                <Text style={styles.dateText}>
                  {travelTimeSlot ? TIME_SLOTS.find(t => t.value === travelTimeSlot)?.label : 'Anytime'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Modal
            visible={showTimePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowTimePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.timePickerContainer}>
                <View style={styles.timePickerHeader}>
                  <Text style={styles.timePickerTitle}>Select Time</Text>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                    <Icon name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={TIME_SLOTS}
                  keyExtractor={(item) => item.value}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.timeSlotItem,
                        travelTimeSlot === item.value && styles.timeSlotItemSelected
                      ]}
                      onPress={() => {
                        setTravelTimeSlot(item.value);
                        setShowTimePicker(false);
                      }}
                    >
                      <Text style={[
                        styles.timeSlotText,
                        travelTimeSlot === item.value && styles.timeSlotTextSelected
                      ]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </Modal>

          {showDatePicker && (
            <DateTimePicker
              value={travelDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}

          <TouchableOpacity
            style={[styles.searchButton, (loading || !fromCityId || !toCityId) && styles.disabledButton]}
            onPress={handleSearch}
            disabled={loading || !fromCityId || !toCityId}
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

        {recentSearches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RECENT SEARCHES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentSearches.map((search) => (
                <TouchableOpacity
                  key={search.id}
                  style={styles.recentSearchCard}
                  onPress={() => handleRecentSearchPress(search)}
                >
                  <Icon name="history" size={20} color="#4A90E2" />
                  <Text style={styles.recentSearchText}>
                    {search.fromCityName} → {search.toCityName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

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
                  <Text style={styles.quickBookingFare}>{formatFare(item.fare)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>POPULAR ROUTES</Text>

          {loadingRoutes ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : popularRoutes.length > 0 ? (
            popularRoutes.map((route) => {
              const trip = getRouteTrip(route.id);
              return (
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
                      <Text style={styles.routeNumber}>
                        {trip?.busNumber ? `Bus ${trip.busNumber} • ` : ''}
                        {route.busTypes.join(' • ')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.routeDetails}>
                    <View style={styles.routeRow}>
                      <Icon name="location-on" size={18} color="#4A90E2" />
                      <View style={styles.locationTextContainer}>
                        <Text style={styles.routeFrom}>From: {route.fromCityName} ({route.fromCode})</Text>
                        <Text style={styles.routeTo}>To: {route.toCityName} ({route.toCode})</Text>
                      </View>
                    </View>

                    <View style={styles.routeInfoRow}>
                      <View style={styles.infoItem}>
                        <Icon name="schedule" size={16} color="#666" />
                        <Text style={styles.infoText}>
                          {trip?.departureTime || 'Multiple times'} - {trip?.arrivalTime || ''}
                        </Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Icon name="hourglass-empty" size={16} color="#666" />
                        <Text style={styles.infoText}>{route.duration}</Text>
                      </View>
                    </View>

                    <View style={styles.routeInfoRow}>
                      <View style={styles.infoItem}>
                        <Icon name="attach-money" size={16} color="#666" />
                        <Text style={styles.infoText}>From {formatFare(route.baseFare)}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Icon name="star" size={16} color="#FFD700" />
                        <Text style={styles.infoText}>{route.rating.toFixed(1)} ({route.totalRatings})</Text>
                      </View>
                      {trip && (
                        <View style={styles.infoItem}>
                          <Icon name="event-seat" size={16} color="#666" />
                          <Text style={styles.infoText}>{trip.availableSeats} seats</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.bookNowButton}>
                    <Text style={styles.bookNowText}>BOOK NOW</Text>
                    <Icon name="arrow-forward" size={18} color="#FFF" />
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No popular routes available</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <CitySelectionModal />
    </SafeAreaView>
  );
};

// Styles remain unchanged
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 24, marginTop: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1A237E', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666' },
  searchCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1A237E', marginBottom: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 12, paddingHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E3E8EF', height: 56 },
  inputIcon: { marginRight: 12 },
  inputContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputText: { fontSize: 16, color: '#1A1A1A' },
  placeholderText: { color: '#999' },
  cityCode: { fontSize: 14, color: '#4A90E2', fontWeight: '500', marginLeft: 8 },
  cityCodeSmall: { fontSize: 12, color: '#666' },
  swapButton: { position: 'absolute', right: 30, top: 90, backgroundColor: '#FFF', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E3E8EF', zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  currentLocationRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, marginBottom: 16 },
  currentLocationText: { fontSize: 14, color: '#4A90E2', marginLeft: 8 },
  suggestionsContainer: { marginBottom: 16 },
  suggestionsTitle: { fontSize: 14, color: '#666', marginBottom: 8 },
  suggestionsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F7FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#4A90E2' },
  suggestionChipText: { fontSize: 14, color: '#4A90E2', marginLeft: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  halfInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E3E8EF', height: 56, marginRight: 12 },
  dateButton: { flex: 1, justifyContent: 'center', height: '100%' },
  dateText: { fontSize: 16, color: '#1A1A1A' },
  searchButton: { backgroundColor: '#4A90E2', borderRadius: 12, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, shadowColor: '#4A90E2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  disabledButton: { backgroundColor: '#B0B0B0', shadowColor: '#666' },
  searchButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginRight: 8 },
  recentSearchCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginRight: 12, borderWidth: 1, borderColor: '#E3E8EF' },
  recentSearchText: { fontSize: 14, color: '#1A1A1A', marginLeft: 8 },
  quickBookingsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  quickBookingCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginRight: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E3E8EF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  quickBookingIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickBookingName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 4, textAlign: 'center' },
  quickBookingFare: { fontSize: 14, color: '#2E7D32', fontWeight: 'bold' },
  routeCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#E3E8EF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  routeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  busIconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  routeTitleContainer: { flex: 1 },
  routeName: { fontSize: 20, fontWeight: 'bold', color: '#1A237E', marginBottom: 4 },
  routeNumber: { fontSize: 14, color: '#666', fontWeight: '500' },
  routeDetails: { marginBottom: 20 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  locationTextContainer: { marginLeft: 12, flex: 1 },
  routeFrom: { fontSize: 16, color: '#1A1A1A', fontWeight: '500', marginBottom: 4 },
  routeTo: { fontSize: 16, color: '#1A1A1A', fontWeight: '500' },
  routeInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  infoItem: { flexDirection: 'row', alignItems: 'center' },
  infoText: { fontSize: 14, color: '#666', marginLeft: 8 },
  bookNowButton: { backgroundColor: '#4A90E2', borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  bookNowText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginRight: 8 },
  skeletonCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#E3E8EF' },
  skeletonHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  skeletonIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0F0F0', marginRight: 16 },
  skeletonTitleContainer: { flex: 1 },
  skeletonTitle: { height: 20, backgroundColor: '#F0F0F0', borderRadius: 4, marginBottom: 8, width: '80%' },
  skeletonSubtitle: { height: 14, backgroundColor: '#F0F0F0', borderRadius: 4, width: '60%' },
  skeletonContent: { marginBottom: 20 },
  skeletonRow: { height: 16, backgroundColor: '#F0F0F0', borderRadius: 4, marginBottom: 12, width: '90%' },
  skeletonButton: { height: 48, backgroundColor: '#F0F0F0', borderRadius: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, minHeight: '70%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A237E' },
  closeButton: { padding: 8 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 12, paddingHorizontal: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E3E8EF', height: 50 },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#1A1A1A' },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  cityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8 },
  cityItemSelected: { backgroundColor: '#F0F7FF', borderRadius: 8 },
  cityIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cityInfo: { flex: 1 },
  cityName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  popularBadge: { backgroundColor: '#FFD700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 12 },
  popularBadgeText: { fontSize: 10, color: '#1A1A1A', fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#F0F0F0' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { marginTop: 12, fontSize: 16, color: '#999', fontWeight: '600' },
  emptySubText: { marginTop: 8, fontSize: 14, color: '#999' },
  timePickerContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '50%' },
  timePickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  timePickerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A237E' },
  timeSlotItem: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  timeSlotItemSelected: { backgroundColor: '#F0F7FF' },
  timeSlotText: { fontSize: 16, color: '#1A1A1A' },
  timeSlotTextSelected: { color: '#4A90E2', fontWeight: '600' },
});

export default HomeScreen;
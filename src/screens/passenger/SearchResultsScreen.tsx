// src/screens/passenger/SearchResultsScreen.tsx - FIXED DATE QUERY
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PassengerStackParamList } from '../../navigation/PassengerNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

type SearchResultsScreenNavigationProp = StackNavigationProp<PassengerStackParamList, 'SearchResults'>;
type SearchResultsScreenRouteProp = RouteProp<PassengerStackParamList, 'SearchResults'>;

interface Bus {
  id: string;
  busNumber: string;
  busType: string;
  departureTime: string;
  arrivalTime: string;
  routeName: string;
  routeCode: string;
  availableSeats: number;
  totalSeats: number;
  fare: number;
  driver: {
    id: string;
    name: string;
    rating: number;
  };
  amenities: string[];
  busId: string;
  operator: string;
  duration: string;
  distance: string;
  from: string;
  to: string;
  fromCode: string;
  toCode: string;
  startDate: string; // Changed to string
  endDate: string;   // Changed to string
  days: string[];
  repeatType: string;
  status: string;
}

const SearchResultsScreen = () => {
  const navigation = useNavigation<SearchResultsScreenNavigationProp>();
  const route = useRoute<SearchResultsScreenRouteProp>();
  const user = auth().currentUser;

  const params = route.params ?? {};
  const from = params.fromCityName ?? '';
  const to = params.toCityName ?? '';
  const fromCode = params.fromCode ?? '';
  const toCode = params.toCode ?? '';
  const date = params.date ?? '';
  const time = params.timeSlot ?? 'Anytime';
  const routeId = params.routeId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allTrips, setAllTrips] = useState<Bus[]>([]);
  const [filteredBuses, setFilteredBuses] = useState<Bus[]>([]);
  const [sortBy, setSortBy] = useState<'departure' | 'price' | 'rating'>('departure');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectingId, setSelectingId] = useState<string | null>(null);

  // ✅ FIXED: Check if trip runs on selected date (works with string dates)
  const isTripRunningOnDate = useCallback((trip: Bus, selectedDate: string): boolean => {
    if (!selectedDate || selectedDate === 'Anytime') return true;

    const dateObj = new Date(selectedDate);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3);

    // Get the date string in YYYY-MM-DD format
    const dateString = selectedDate;

    // Check if trip has specific date range
    if (trip.startDate && trip.endDate) {
      // Compare strings directly (YYYY-MM-DD format works with string comparison)
      if (dateString < trip.startDate) return false;
      if (dateString > trip.endDate) return false;
    }

    // Check if day is in trip's days array
    if (trip.days && Array.isArray(trip.days) && trip.days.length > 0) {
      return trip.days.includes(dayOfWeek);
    }

    return true;
  }, []);

  const calculateDuration = (departure: string, arrival: string): string => {
    if (!departure || !arrival) return 'N/A';
    if (!departure.includes(':') || !arrival.includes(':')) return 'N/A';

    const [depHour, depMin] = departure.split(':').map(Number);
    const [arrHour, arrMin] = arrival.split(':').map(Number);

    if (isNaN(depHour) || isNaN(depMin) || isNaN(arrHour) || isNaN(arrMin)) return 'N/A';

    let diffMinutes = (arrHour * 60 + arrMin) - (depHour * 60 + depMin);
    if (diffMinutes < 0) diffMinutes += 24 * 60;

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    return `${hours}h ${minutes}m`;
  };

  const fetchBuses = async () => {
    try {
      setLoading(true);

      let query: any = firestore().collection('trips');

      if (routeId) {
        query = query.where('routeId', '==', routeId);
      } else if (fromCode && toCode) {
        query = query.where('fromCode', '==', fromCode)
                     .where('toCode', '==', toCode);
      } else if (from && to) {
        query = query.where('from', '==', from)
                     .where('to', '==', to);
      } else {
        setAllTrips([]);
        setFilteredBuses([]);
        setLoading(false);
        return;
      }

      // ✅ FIXED: Only filter by status, no date filtering in query
      query = query.where('status', 'in', ['active', 'upcoming']);

      console.log('🔍 Fetching trips with:', { fromCode, toCode, date });

      const snapshot = await query.get();

      console.log(`📦 Found ${snapshot.docs.length} trips in Firestore`);

      let tripsList: Bus[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          busNumber: data.busNumber || 'N/A',
          busType: data.busType || 'Standard',
          departureTime: data.departureTime || '00:00',
          arrivalTime: data.arrivalTime || '00:00',
          routeName: data.routeName || '',
          routeCode: data.routeCode || '',
          availableSeats: data.availableSeats ?? 0,
          totalSeats: data.totalSeats ?? 40,
          fare: data.fare ?? 0,
          driver: {
            id: data.driverId || '',
            name: data.driverName || 'Not assigned',
            rating: data.driverRating || 4.0,
          },
          amenities: data.amenities ?? ['AC', 'WiFi'],
          busId: data.busId || doc.id,
          operator: data.operator || 'ZUGO Transport',
          duration: data.duration || calculateDuration(data.departureTime, data.arrivalTime),
          distance: data.distance || '45 km',
          from: data.from || from,
          to: data.to || to,
          fromCode: data.fromCode || fromCode,
          toCode: data.toCode || toCode,
          startDate: data.startDate || '', // Store as string
          endDate: data.endDate || '',     // Store as string
          days: data.days || [],
          repeatType: data.repeatType,
          status: data.status || 'upcoming',
        };
      });

      console.log(`📋 Before filters: ${tripsList.length} trips`);

      // ✅ FIXED: Filter available seats in JavaScript
      tripsList = tripsList.filter(trip => trip.availableSeats > 0);
      console.log(`✅ After seat filter: ${tripsList.length} trips`);

      // ✅ FIXED: Apply date filtering in JavaScript with string comparison
      if (date && date !== 'Anytime') {
        const beforeFilter = tripsList.length;
        tripsList = tripsList.filter(trip => isTripRunningOnDate(trip, date));
        console.log(`📅 After date filter (${date}): ${beforeFilter} -> ${tripsList.length} trips`);

        // Log each trip's date range for debugging
        tripsList.forEach(trip => {
          console.log(`  - Trip: ${trip.busNumber}, dates: ${trip.startDate} - ${trip.endDate}, days: ${trip.days?.length || 0}`);
        });
      }

      // Sort by departure time
      const sorted = [...tripsList].sort((a, b) =>
        a.departureTime.localeCompare(b.departureTime)
      );

      setAllTrips(tripsList);
      setFilteredBuses(sorted);

      if (tripsList.length === 0) {
        console.log('⚠️ No trips found after filtering');
      }
    } catch (error) {
      console.error('Error fetching buses:', error);
      Alert.alert('Error', 'Failed to load bus schedules. Please try again.');
      setAllTrips([]);
      setFilteredBuses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const validateAndNavigate = async (bus: Bus) => {
    if (!bus) return;

    setSelectingId(bus.id);

    try {
      const doc = await firestore().collection('trips').doc(bus.id).get();
      const freshData = doc.data();

      if (!freshData || freshData.availableSeats <= 0) {
        Alert.alert(
          'Seats Full',
          'Sorry, seats on this bus just got booked. Please try another bus.',
          [{ text: 'OK', onPress: () => fetchBuses() }]
        );
        setSelectingId(null);
        return;
      }

      navigation.navigate('SeatSelection', {
        tripId: bus.id,
        busId: bus.busId || bus.id,
        from,
        to,
        date,
        time: bus.departureTime,
        fare: bus.fare,
        busNumber: bus.busNumber,
        fromCode: bus.fromCode || fromCode,
        toCode: bus.toCode || toCode,
      });
    } catch (error) {
      console.error('Error validating seats:', error);
      Alert.alert('Error', 'Failed to verify seat availability. Please try again.');
    } finally {
      setSelectingId(null);
    }
  };

  const handleSelectBus = (tripDocId: string) => {
    const selectedBus = filteredBuses.find(bus => bus.id === tripDocId);
    if (!selectedBus) return;

    if (selectedBus.availableSeats <= 0) {
      Alert.alert('No Seats Available', 'This bus has no available seats.');
      return;
    }

    validateAndNavigate(selectedBus);
  };

  const handleSort = (type: 'departure' | 'price' | 'rating') => {
    setSortBy(type);

    const sortedBuses = [...filteredBuses];

    switch (type) {
      case 'departure':
        sortedBuses.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
        break;
      case 'price':
        sortedBuses.sort((a, b) => a.fare - b.fare);
        break;
      case 'rating':
        sortedBuses.sort((a, b) => (b.driver?.rating || 0) - (a.driver?.rating || 0));
        break;
    }

    setFilteredBuses(sortedBuses);
  };

  const handleFilter = (type: string) => {
    setFilterType(type);

    if (type === 'all') {
      setFilteredBuses([...allTrips]);
      handleSort(sortBy);
      return;
    }

    const filtered = allTrips.filter(bus => {
      if (type === 'ac') return bus.amenities.includes('AC');
      if (type === 'luxury') return bus.busType === 'Luxury';
      if (type === 'economy') return bus.fare <= 1000;
      return false;
    });

    setFilteredBuses(filtered);
    setTimeout(() => handleSort(sortBy), 0);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBuses();
  }, [fromCode, toCode, from, to, date, routeId]);

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`;
  };

  const resultsCount = useMemo(() => filteredBuses.length, [filteredBuses]);

  useEffect(() => {
    fetchBuses();
  }, [fromCode, toCode, from, to, date, routeId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Finding buses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#1A237E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SEARCH RESULTS</Text>
        </View>

        <View style={styles.searchSummaryCard}>
          <View style={styles.searchSummaryRow}>
            <View style={styles.locationContainer}>
              <Icon name="location-on" size={20} color="#4A90E2" />
              <Text style={styles.locationText}>{from || '?'}</Text>
              {fromCode ? <Text style={styles.locationCode}>({fromCode})</Text> : null}
            </View>
            <Icon name="arrow-forward" size={20} color="#666" />
            <View style={styles.locationContainer}>
              <Icon name="location-on" size={20} color="#4A90E2" />
              <Text style={styles.locationText}>{to || '?'}</Text>
              {toCode ? <Text style={styles.locationCode}>({toCode})</Text> : null}
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Icon name="calendar-today" size={16} color="#666" />
              <Text style={styles.detailText}>{date || 'Any date'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Icon name="access-time" size={16} color="#666" />
              <Text style={styles.detailText}>{time}</Text>
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
            onPress={() => handleFilter('all')}
          >
            <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}>
              All ({resultsCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterType === 'ac' && styles.filterChipActive]}
            onPress={() => handleFilter('ac')}
          >
            <Icon name="ac-unit" size={16} color={filterType === 'ac' ? '#FFF' : '#666'} />
            <Text style={[styles.filterChipText, filterType === 'ac' && styles.filterChipTextActive]}>
              AC
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterType === 'luxury' && styles.filterChipActive]}
            onPress={() => handleFilter('luxury')}
          >
            <Icon name="star" size={16} color={filterType === 'luxury' ? '#FFF' : '#666'} />
            <Text style={[styles.filterChipText, filterType === 'luxury' && styles.filterChipTextActive]}>
              Luxury
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterType === 'economy' && styles.filterChipActive]}
            onPress={() => handleFilter('economy')}
          >
            <Icon name="attach-money" size={16} color={filterType === 'economy' ? '#FFF' : '#666'} />
            <Text style={[styles.filterChipText, filterType === 'economy' && styles.filterChipTextActive]}>
              Economy
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.sortSection}>
          <Text style={styles.sortTitle}>Sort by:</Text>
          <View style={styles.sortButtons}>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'departure' && styles.sortButtonActive]}
              onPress={() => handleSort('departure')}
            >
              <Icon name="schedule" size={16} color={sortBy === 'departure' ? '#FFF' : '#666'} />
              <Text style={[styles.sortButtonText, sortBy === 'departure' && styles.sortButtonTextActive]}>
                Departure
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'price' && styles.sortButtonActive]}
              onPress={() => handleSort('price')}
            >
              <Icon name="attach-money" size={16} color={sortBy === 'price' ? '#FFF' : '#666'} />
              <Text style={[styles.sortButtonText, sortBy === 'price' && styles.sortButtonTextActive]}>
                Price
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'rating' && styles.sortButtonActive]}
              onPress={() => handleSort('rating')}
            >
              <Icon name="star" size={16} color={sortBy === 'rating' ? '#FFF' : '#666'} />
              <Text style={[styles.sortButtonText, sortBy === 'rating' && styles.sortButtonTextActive]}>
                Rating
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.resultsCount}>
          {resultsCount} {resultsCount === 1 ? 'bus' : 'buses'} found
        </Text>

        {filteredBuses.map((bus) => (
          <TouchableOpacity
            key={bus.id}
            style={styles.busCard}
            onPress={() => handleSelectBus(bus.id)}
            activeOpacity={0.7}
            disabled={selectingId === bus.id}
          >
            <View style={styles.timeHeader}>
              <View style={styles.timeContainer}>
                <Icon name="schedule" size={18} color="#4A90E2" />
                <Text style={styles.timeText}>
                  {bus.departureTime} - {bus.arrivalTime}
                </Text>
              </View>
              <View style={[
                styles.seatBadge,
                bus.availableSeats < 5 && styles.seatBadgeWarning,
                bus.availableSeats === 0 && styles.seatBadgeSoldOut
              ]}>
                <Icon name="event-seat" size={16} color="#FFF" />
                <Text style={styles.seatBadgeText}>
                  {bus.availableSeats === 0 ? 'Sold Out' : `${bus.availableSeats} seats`}
                </Text>
              </View>
            </View>

            <View style={styles.busDetails}>
              <View style={styles.busInfo}>
                <View style={styles.busNumberContainer}>
                  <Icon name="directions-bus" size={24} color="#FFF" />
                  <Text style={styles.busNumber}>{bus.busNumber}</Text>
                </View>
                <Text style={styles.busType}>{bus.busType}</Text>
              </View>

              <View style={styles.detailsColumn}>
                <Text style={styles.routeText}>{bus.routeName}</Text>
                <Text style={styles.routeCode}>{bus.routeCode}</Text>

                <View style={styles.driverRow}>
                  <Icon name="person" size={16} color="#666" />
                  <Text style={styles.driverText}>Driver: {bus.driver.name}</Text>
                  <View style={styles.ratingContainer}>
                    <Icon name="star" size={14} color="#FFD700" />
                    <Text style={styles.ratingText}>{bus.driver.rating.toFixed(1)}</Text>
                  </View>
                </View>

                <View style={styles.amenitiesRow}>
                  {bus.amenities.slice(0, 3).map((amenity, index) => (
                    <View key={index} style={styles.amenityBadge}>
                      <Text style={styles.amenityText}>{amenity}</Text>
                    </View>
                  ))}
                  {bus.amenities.length > 3 && (
                    <View style={styles.amenityBadge}>
                      <Text style={styles.amenityText}>+{bus.amenities.length - 3}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.tripInfoRow}>
                  <View style={styles.tripInfoItem}>
                    <Icon name="timer" size={14} color="#666" />
                    <Text style={styles.tripInfoText}>{bus.duration}</Text>
                  </View>
                  <View style={styles.tripInfoItem}>
                    <Icon name="straighten" size={14} color="#666" />
                    <Text style={styles.tripInfoText}>{bus.distance} km</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.footer}>
              <View style={styles.fareContainer}>
                <Text style={styles.fareLabel}>Fare:</Text>
                <Text style={styles.fareAmount}>{formatCurrency(bus.fare)}</Text>
                <Text style={styles.perPerson}>/person</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.selectButton,
                  (bus.availableSeats === 0 || selectingId === bus.id) && styles.selectButtonDisabled
                ]}
                onPress={() => handleSelectBus(bus.id)}
                disabled={bus.availableSeats === 0 || selectingId === bus.id}
              >
                {selectingId === bus.id ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.selectButtonText}>
                      {bus.availableSeats === 0 ? 'SOLD OUT' : 'SELECT SEATS'}
                    </Text>
                    {bus.availableSeats > 0 && (
                      <Icon name="arrow-forward" size={18} color="#FFF" />
                    )}
                  </>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {filteredBuses.length === 0 && (
          <View style={styles.noResultsContainer}>
            <Icon name="search-off" size={60} color="#CCC" />
            <Text style={styles.noResultsText}>No buses found</Text>
            <Text style={styles.noResultsSubtext}>
              {date && date !== 'Anytime'
                ? `No buses available for ${date}. Try another date.`
                : 'Try different search criteria or check back later.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// Styles remain the same as your original
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#4A90E2' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  backButton: { padding: 8, marginRight: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1A237E', flex: 1 },
  searchSummaryCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  searchSummaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  locationText: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginLeft: 8 },
  locationCode: { fontSize: 12, color: '#4A90E2', marginLeft: 4 },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  detailItem: { flexDirection: 'row', alignItems: 'center' },
  detailText: { fontSize: 14, color: '#666', marginLeft: 8 },
  filterScroll: { marginBottom: 16 },
  filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E3E8EF', marginRight: 12 },
  filterChipActive: { backgroundColor: '#4A90E2', borderColor: '#4A90E2' },
  filterChipText: { fontSize: 14, color: '#666', marginLeft: 6 },
  filterChipTextActive: { color: '#FFF' },
  sortSection: { marginBottom: 20 },
  sortTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
  sortButtons: { flexDirection: 'row' },
  sortButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E3E8EF', marginRight: 12 },
  sortButtonActive: { backgroundColor: '#4A90E2', borderColor: '#4A90E2' },
  sortButtonText: { fontSize: 14, color: '#666', marginLeft: 6 },
  sortButtonTextActive: { color: '#FFF' },
  resultsCount: { fontSize: 16, color: '#666', marginBottom: 16, fontStyle: 'italic' },
  busCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  timeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  timeContainer: { flexDirection: 'row', alignItems: 'center' },
  timeText: { fontSize: 18, fontWeight: '600', color: '#1A237E', marginLeft: 8 },
  seatBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4CAF50', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  seatBadgeWarning: { backgroundColor: '#FF9800' },
  seatBadgeSoldOut: { backgroundColor: '#F44336' },
  seatBadgeText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  busDetails: { flexDirection: 'row', marginBottom: 20 },
  busInfo: { alignItems: 'center', marginRight: 20 },
  busNumberContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4A90E2', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginBottom: 8 },
  busNumber: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  busType: { fontSize: 14, color: '#666', fontStyle: 'italic' },
  detailsColumn: { flex: 1 },
  routeText: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  routeCode: { fontSize: 14, color: '#4A90E2', marginBottom: 12 },
  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  driverText: { fontSize: 14, color: '#666', marginLeft: 8, marginRight: 12 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3CD', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  ratingText: { fontSize: 12, fontWeight: '600', color: '#856404', marginLeft: 4 },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  amenityBadge: { backgroundColor: '#E8F4FD', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginRight: 8, marginBottom: 8 },
  amenityText: { fontSize: 12, color: '#4A90E2', fontWeight: '500' },
  tripInfoRow: { flexDirection: 'row', marginTop: 4 },
  tripInfoItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  tripInfoText: { fontSize: 12, color: '#666', marginLeft: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  fareContainer: { flexDirection: 'row', alignItems: 'baseline' },
  fareLabel: { fontSize: 14, color: '#666', marginRight: 6 },
  fareAmount: { fontSize: 24, fontWeight: 'bold', color: '#4CAF50' },
  perPerson: { fontSize: 12, color: '#999', marginLeft: 4 },
  selectButton: { backgroundColor: '#4A90E2', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, shadowColor: '#4A90E2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  selectButtonDisabled: { backgroundColor: '#CCC', shadowColor: '#999' },
  selectButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginRight: 8 },
  noResultsContainer: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  noResultsText: { fontSize: 24, fontWeight: 'bold', color: '#666', marginTop: 20, marginBottom: 8 },
  noResultsSubtext: { fontSize: 16, color: '#999', textAlign: 'center' },
});

export default SearchResultsScreen;
// src/screens/passenger/SearchResultsScreen.tsx - UI FIXED
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

// ✅ Import status constants
import { TRIP_STATUS } from '../../constants/status';

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
  date: string;
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
  const searchDate = params.date ?? '';
  const time = params.timeSlot ?? 'Anytime';
  const routeId = params.routeId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allTrips, setAllTrips] = useState<Bus[]>([]);
  const [filteredBuses, setFilteredBuses] = useState<Bus[]>([]);
  const [sortBy, setSortBy] = useState<'departure' | 'price' | 'rating'>('departure');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectingId, setSelectingId] = useState<string | null>(null);

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

      console.log('🔍 Fetching trips with:', { fromCode, toCode, searchDate, routeId });

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

      query = query.where('status', '==', TRIP_STATUS.SCHEDULED);

      if (searchDate && searchDate !== 'Anytime') {
        query = query.where('date', '==', searchDate);
        console.log('📅 Filtering by date:', searchDate);
      }

      const snapshot = await query.get();

      console.log(`📦 Found ${snapshot.docs.length} trips in Firestore for date ${searchDate}`);

      let tripsList: Bus[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          busNumber: data.busNumber || 'N/A',
          busType: data.busType || 'Standard',
          departureTime: data.departureTime || '00:00',
          arrivalTime: data.arrivalTime || '00:00',
          routeName: data.routeName || `${data.from || ''} → ${data.to || ''}`,
          routeCode: data.routeCode || '',
          availableSeats: data.availableSeats ?? 0,
          totalSeats: data.totalSeats ?? 40,
          fare: data.fare ?? 0,
          driver: {
            id: data.driverId || '',
            name: data.driverName || 'Not assigned',
            rating: 4.0,
          },
          amenities: ['AC', 'WiFi', 'Water'],
          busId: data.busId || doc.id,
          operator: 'ZUGO Transport',
          duration: data.duration || calculateDuration(data.departureTime, data.arrivalTime),
          distance: data.distance || '285 km',
          from: data.from || from,
          to: data.to || to,
          fromCode: data.fromCode || fromCode,
          toCode: data.toCode || toCode,
          date: data.date || '',
          status: data.status,
        };
      });

      tripsList = tripsList.filter(trip => trip.availableSeats > 0);

      const sorted = [...tripsList].sort((a, b) =>
        a.departureTime.localeCompare(b.departureTime)
      );

      setAllTrips(tripsList);
      setFilteredBuses(sorted);
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
        from: bus.from,
        to: bus.to,
        date: bus.date || searchDate,
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
  }, [fromCode, toCode, from, to, searchDate, routeId]);

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`;
  };

  const resultsCount = useMemo(() => filteredBuses.length, [filteredBuses]);

  useEffect(() => {
    fetchBuses();
  }, [fromCode, toCode, from, to, searchDate, routeId]);

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
              <Text style={styles.detailText}>{searchDate || 'Any date'}</Text>
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
          {resultsCount} {resultsCount === 1 ? 'bus' : 'buses'} found for {searchDate}
        </Text>

        {filteredBuses.map((bus) => (
          <TouchableOpacity
            key={bus.id}
            style={styles.busCard}
            onPress={() => handleSelectBus(bus.id)}
            activeOpacity={0.9}
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
                <Icon name="event-seat" size={14} color="#FFF" />
                <Text style={styles.seatBadgeText}>
                  {bus.availableSeats === 0 ? 'Sold Out' : `${bus.availableSeats} seats`}
                </Text>
              </View>
            </View>

            <View style={styles.busDetails}>
              <View style={styles.busInfo}>
                <View style={styles.busNumberContainer}>
                  <Icon name="directions-bus" size={22} color="#FFF" />
                  <Text style={styles.busNumber}>{bus.busNumber}</Text>
                </View>
                <Text style={styles.busType}>{bus.busType}</Text>
              </View>

              <View style={styles.detailsColumn}>
                <Text style={styles.routeText}>{bus.routeName}</Text>

                <View style={styles.driverRow}>
                  <Icon name="person" size={14} color="#666" />
                  <Text style={styles.driverText}>Driver: {bus.driver.name}</Text>
                </View>

                <View style={styles.amenitiesRow}>
                  {bus.amenities.slice(0, 3).map((amenity, index) => (
                    <View key={index} style={styles.amenityBadge}>
                      <Text style={styles.amenityText}>{amenity}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.tripInfoRow}>
                  <View style={styles.tripInfoItem}>
                    <Icon name="timer" size={12} color="#666" />
                    <Text style={styles.tripInfoText}>{bus.duration}</Text>
                  </View>
                  <View style={styles.tripInfoItem}>
                    <Icon name="straighten" size={12} color="#666" />
                    <Text style={styles.tripInfoText}>{bus.distance}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ✅ FIXED: Footer with properly contained button */}
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
                      <Icon name="arrow-forward" size={16} color="#FFF" />
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
              {searchDate && searchDate !== 'Anytime'
                ? `No buses available for ${searchDate}. Try another date.`
                : 'Try different search criteria or check back later.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ✅ UPDATED STYLES - Button properly contained
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

  // ✅ FIXED: Bus Card - all content properly contained
  busCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden', // ✅ Ensures everything stays inside
  },

  timeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
  },
  timeContainer: { flexDirection: 'row', alignItems: 'center' },
  timeText: { fontSize: 16, fontWeight: '600', color: '#1A237E', marginLeft: 8 },
  seatBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  seatBadgeWarning: { backgroundColor: '#FF9800' },
  seatBadgeSoldOut: { backgroundColor: '#F44336' },
  seatBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '600', marginLeft: 4 },

  busDetails: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 12,
  },
  busInfo: { alignItems: 'center', marginRight: 16, width: 80 },
  busNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 6,
    width: '100%',
    justifyContent: 'center',
  },
  busNumber: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginLeft: 6 },
  busType: { fontSize: 12, color: '#666', fontStyle: 'italic' },

  detailsColumn: { flex: 1 },
  routeText: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 6 },
  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  driverText: { fontSize: 13, color: '#666', marginLeft: 6, flex: 1 },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  amenityBadge: { backgroundColor: '#E8F4FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 8, marginBottom: 4 },
  amenityText: { fontSize: 11, color: '#4A90E2', fontWeight: '500' },
  tripInfoRow: { flexDirection: 'row', marginTop: 2 },
  tripInfoItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  tripInfoText: { fontSize: 11, color: '#666', marginLeft: 4 },

  // ✅ FIXED: Footer with button properly contained
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  fareContainer: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  fareLabel: { fontSize: 13, color: '#666', marginRight: 4 },
  fareAmount: { fontSize: 20, fontWeight: 'bold', color: '#4CAF50' },
  perPerson: { fontSize: 11, color: '#999', marginLeft: 4 },

  selectButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  selectButtonDisabled: { backgroundColor: '#CCC', shadowColor: '#999' },
  selectButtonText: { color: '#FFF', fontSize: 13, fontWeight: '600', marginRight: 6 },

  noResultsContainer: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  noResultsText: { fontSize: 20, fontWeight: 'bold', color: '#666', marginTop: 20, marginBottom: 8 },
  noResultsSubtext: { fontSize: 14, color: '#999', textAlign: 'center' },
});

export default SearchResultsScreen;
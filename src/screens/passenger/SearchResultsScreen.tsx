import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
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
}

const SearchResultsScreen = () => {
  const navigation = useNavigation<SearchResultsScreenNavigationProp>();
  const route = useRoute<SearchResultsScreenRouteProp>();
  const user = auth().currentUser;

  const { from, to, fromCode, toCode, date, time, routeId } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [filteredBuses, setFilteredBuses] = useState<Bus[]>([]);
  const [sortBy, setSortBy] = useState<'departure' | 'price' | 'rating'>('departure');
  const [filterType, setFilterType] = useState<string>('all');

  // Fetch buses from Firebase
  useEffect(() => {
    fetchBuses();
  }, [from, to, date]);

  const fetchBuses = async () => {
    try {
      setLoading(true);

      // Query trips based on from/to locations
      let query = firestore().collection('trips');

      // If we have routeId from quick booking, use it
      if (routeId) {
        query = query.where('routeId', '==', routeId);
      } else {
        // Otherwise search by from/to
        if (fromCode) {
          query = query.where('fromCode', '==', fromCode);
        }
        if (toCode) {
          query = query.where('toCode', '==', toCode);
        }
      }

      // Filter by date (if provided)
      if (date && date !== 'Anytime') {
        query = query.where('date', '==', date);
      }

      // Only show trips with available seats
      query = query.where('availableSeats', '>', 0);

      const snapshot = await query.get();

      const busesList: Bus[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();

        // Get route details
        let routeName = data.routeName || '';
        let routeCode = data.routeCode || '';

        if (data.routeId) {
          const routeDoc = await firestore().collection('routes').doc(data.routeId).get();
          if (routeDoc.exists) {
            const routeData = routeDoc.data();
            routeName = routeData?.name || routeName;
            routeCode = routeData?.code || routeCode;
          }
        }

        // Get driver details
        let driverName = 'Not assigned';
        let driverRating = 0;

        if (data.driverId) {
          const driverDoc = await firestore().collection('drivers').doc(data.driverId).get();
          if (driverDoc.exists) {
            const driverData = driverDoc.data();
            driverName = driverData?.fullName || 'Driver';
            driverRating = driverData?.rating || 0;
          }
        }

        busesList.push({
          id: doc.id,
          busNumber: data.busNumber || 'N/A',
          busType: data.busType || 'Standard',
          departureTime: data.departureTime || '00:00',
          arrivalTime: data.arrivalTime || '00:00',
          routeName: routeName,
          routeCode: data.routeCode || '',
          availableSeats: data.availableSeats || 0,
          totalSeats: data.totalSeats || 40,
          fare: data.fare || 0,
          driver: {
            id: data.driverId || '',
            name: driverName,
            rating: driverRating,
          },
          amenities: data.amenities || ['AC', 'WiFi'],
          busId: data.busId || '',
          operator: data.operator || 'ZUGO Transport',
          duration: data.duration || '1h 30m',
          distance: data.distance || '45 km',
        });
      }

      // Sort by departure time initially
      const sorted = busesList.sort((a, b) =>
        a.departureTime.localeCompare(b.departureTime)
      );

      setBuses(sorted);
      setFilteredBuses(sorted);
      setLoading(false);

    } catch (error) {
      console.error('Error fetching buses:', error);
      Alert.alert('Error', 'Failed to load bus schedules');
      setLoading(false);
    }
  };

  const handleSelectBus = (busId: string) => {
    const selectedBus = buses.find(bus => bus.id === busId);
    if (selectedBus && selectedBus.availableSeats > 0) {
      navigation.navigate('SeatSelection', {
        tripId: busId,
        busId: selectedBus.busId,
        from,
        to,
        fromCode,
        toCode,
        date,
        time: selectedBus.departureTime,
        fare: selectedBus.fare,
        busNumber: selectedBus.busNumber,
      });
    } else {
      Alert.alert('No Seats Available', 'This bus has no available seats.');
    }
  };

  const handleSort = (type: 'departure' | 'price' | 'rating') => {
    setSortBy(type);

    let sortedBuses = [...filteredBuses];

    switch (type) {
      case 'departure':
        sortedBuses.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
        break;
      case 'price':
        sortedBuses.sort((a, b) => a.fare - b.fare);
        break;
      case 'rating':
        sortedBuses.sort((a, b) => b.driver.rating - a.driver.rating);
        break;
    }

    setFilteredBuses(sortedBuses);
  };

  const handleFilter = (type: string) => {
    setFilterType(type);

    if (type === 'all') {
      setFilteredBuses(buses);
      return;
    }

    const filtered = buses.filter(bus => {
      if (type === 'ac' && bus.amenities.includes('AC')) return true;
      if (type === 'luxury' && bus.busType === 'Luxury') return true;
      if (type === 'economy' && bus.fare < 15) return true;
      return false;
    });

    setFilteredBuses(filtered);
  };

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`;
  };

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
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#1A237E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SEARCH RESULTS</Text>
        </View>

        {/* Search Summary */}
        <View style={styles.searchSummaryCard}>
          <View style={styles.searchSummaryRow}>
            <View style={styles.locationContainer}>
              <Icon name="location-on" size={20} color="#4A90E2" />
              <Text style={styles.locationText}>{from}</Text>
              {fromCode && <Text style={styles.locationCode}>({fromCode})</Text>}
            </View>
            <Icon name="arrow-forward" size={20} color="#666" />
            <View style={styles.locationContainer}>
              <Icon name="location-on" size={20} color="#4A90E2" />
              <Text style={styles.locationText}>{to}</Text>
              {toCode && <Text style={styles.locationCode}>({toCode})</Text>}
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Icon name="calendar-today" size={16} color="#666" />
              <Text style={styles.detailText}>{date}</Text>
            </View>
            <View style={styles.detailItem}>
              <Icon name="access-time" size={16} color="#666" />
              <Text style={styles.detailText}>{time}</Text>
            </View>
          </View>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
            onPress={() => handleFilter('all')}
          >
            <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}>
              All
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

        {/* Sort Options */}
        <View style={styles.sortSection}>
          <Text style={styles.sortTitle}>Sort by:</Text>
          <View style={styles.sortButtons}>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'departure' && styles.sortButtonActive]}
              onPress={() => handleSort('departure')}
            >
              <Icon
                name="schedule"
                size={16}
                color={sortBy === 'departure' ? '#FFF' : '#666'}
              />
              <Text style={[styles.sortButtonText, sortBy === 'departure' && styles.sortButtonTextActive]}>
                Departure
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'price' && styles.sortButtonActive]}
              onPress={() => handleSort('price')}
            >
              <Icon
                name="attach-money"
                size={16}
                color={sortBy === 'price' ? '#FFF' : '#666'}
              />
              <Text style={[styles.sortButtonText, sortBy === 'price' && styles.sortButtonTextActive]}>
                Price
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'rating' && styles.sortButtonActive]}
              onPress={() => handleSort('rating')}
            >
              <Icon
                name="star"
                size={16}
                color={sortBy === 'rating' ? '#FFF' : '#666'}
              />
              <Text style={[styles.sortButtonText, sortBy === 'rating' && styles.sortButtonTextActive]}>
                Rating
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results Count */}
        <Text style={styles.resultsCount}>
          {filteredBuses.length} buses found
        </Text>

        {/* Bus Results */}
        {filteredBuses.map((bus) => (
          <TouchableOpacity
            key={bus.id}
            style={styles.busCard}
            onPress={() => handleSelectBus(bus.id)}
            activeOpacity={0.7}
          >
            {/* Time Header */}
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

            {/* Bus Details */}
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
                    <Text style={styles.ratingText}>{bus.driver.rating.toFixed(1)}★</Text>
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
                    <Text style={styles.tripInfoText}>{bus.distance}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Fare and Action */}
            <View style={styles.footer}>
              <View style={styles.fareContainer}>
                <Text style={styles.fareLabel}>Fare:</Text>
                <Text style={styles.fareAmount}>{formatCurrency(bus.fare)}</Text>
                <Text style={styles.perPerson}>/person</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.selectButton,
                  bus.availableSeats === 0 && styles.selectButtonDisabled
                ]}
                onPress={() => handleSelectBus(bus.id)}
                disabled={bus.availableSeats === 0}
              >
                <Text style={styles.selectButtonText}>
                  {bus.availableSeats === 0 ? 'SOLD OUT' : 'SELECT SEATS'}
                </Text>
                {bus.availableSeats > 0 && (
                  <Icon name="arrow-forward" size={18} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {/* No Results Message */}
        {filteredBuses.length === 0 && (
          <View style={styles.noResultsContainer}>
            <Icon name="search-off" size={60} color="#CCC" />
            <Text style={styles.noResultsText}>No buses found</Text>
            <Text style={styles.noResultsSubtext}>
              Try different search criteria
            </Text>
          </View>
        )}
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4A90E2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    flex: 1,
  },
  searchSummaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  locationCode: {
    fontSize: 12,
    color: '#4A90E2',
    marginLeft: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    marginRight: 12,
  },
  filterChipActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  sortSection: {
    marginBottom: 20,
  },
  sortTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  sortButtons: {
    flexDirection: 'row',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    marginRight: 12,
  },
  sortButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  sortButtonTextActive: {
    color: '#FFF',
  },
  resultsCount: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  busCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  timeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A237E',
    marginLeft: 8,
  },
  seatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  seatBadgeWarning: {
    backgroundColor: '#FF9800',
  },
  seatBadgeSoldOut: {
    backgroundColor: '#F44336',
  },
  seatBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  busDetails: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  busInfo: {
    alignItems: 'center',
    marginRight: 20,
  },
  busNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  busNumber: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  busType: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  detailsColumn: {
    flex: 1,
  },
  routeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  routeCode: {
    fontSize: 14,
    color: '#4A90E2',
    marginBottom: 12,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginRight: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
    marginLeft: 4,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  amenityBadge: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  amenityText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
  tripInfoRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  tripInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  tripInfoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  fareContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  fareLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 6,
  },
  fareAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  perPerson: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  selectButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  selectButtonDisabled: {
    backgroundColor: '#CCC',
    shadowColor: '#999',
  },
  selectButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noResultsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});

export default SearchResultsScreen;
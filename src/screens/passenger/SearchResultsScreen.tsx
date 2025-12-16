import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PassengerStackParamList } from '../../navigation/PassengerNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';

type SearchResultsScreenNavigationProp = StackNavigationProp<PassengerStackParamList, 'SearchResults'>;
type SearchResultsScreenRouteProp = RouteProp<PassengerStackParamList, 'SearchResults'>;

const SearchResultsScreen = () => {
  const navigation = useNavigation<SearchResultsScreenNavigationProp>();
  const route = useRoute<SearchResultsScreenRouteProp>();
  const { from, to, date, time } = route.params;

  // Dummy bus data
  const [buses, setBuses] = useState([
    {
      id: 'bus-001',
      busNumber: 'B-001',
      busType: 'Toyota Coaster',
      departureTime: '08:00 AM',
      arrivalTime: '09:30 AM',
      route: 'Downtown Express (RT-005)',
      availableSeats: 12,
      fare: 12,
      driver: { name: 'Ali Ahmed', rating: 4.8 },
      amenities: ['AC', 'WiFi', 'Water'],
    },
    {
      id: 'bus-002',
      busNumber: 'B-003',
      busType: 'Mitsubishi Rosa',
      departureTime: '09:00 AM',
      arrivalTime: '10:30 AM',
      route: 'Airport Express',
      availableSeats: 8,
      fare: 15,
      driver: { name: 'Sara Khan', rating: 4.5 },
      amenities: ['AC', 'TV'],
    },
    {
      id: 'bus-003',
      busNumber: 'B-005',
      busType: 'Hiace',
      departureTime: '10:00 AM',
      arrivalTime: '11:30 AM',
      route: 'Premium Service',
      availableSeats: 20,
      fare: 20,
      driver: { name: 'Usman Ali', rating: 4.2 },
      amenities: ['AC', 'VIP', 'WiFi', 'Snacks'],
    },
  ]);

  const handleSelectBus = (busId: string) => {
    const selectedBus = buses.find(bus => bus.id === busId);
    if (selectedBus && selectedBus.availableSeats > 0) {
      navigation.navigate('SeatSelection', {
        busId,
        from,
        to,
        date,
        time: selectedBus.departureTime,
      });
    } else {
      Alert.alert('No Seats Available', 'This bus has no available seats.');
    }
  };

  const handleSort = (type: 'price' | 'time' | 'rating') => {
    let sortedBuses = [...buses];

    switch (type) {
      case 'price':
        sortedBuses.sort((a, b) => a.fare - b.fare);
        break;
      case 'time':
        sortedBuses.sort((a, b) =>
          a.departureTime.localeCompare(b.departureTime)
        );
        break;
      case 'rating':
        sortedBuses.sort((a, b) => b.driver.rating - a.driver.rating);
        break;
    }

    setBuses(sortedBuses);
    Alert.alert('Sorted', `Sorted by ${type}`);
  };

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
            </View>
            <Icon name="arrow-forward" size={20} color="#666" />
            <View style={styles.locationContainer}>
              <Icon name="location-on" size={20} color="#4A90E2" />
              <Text style={styles.locationText}>{to}</Text>
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

        {/* Sort Options */}
        <View style={styles.sortSection}>
          <Text style={styles.sortTitle}>Sort by:</Text>
          <View style={styles.sortButtons}>
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => handleSort('time')}
            >
              <Text style={styles.sortButtonText}>Departure Time</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => handleSort('price')}
            >
              <Text style={styles.sortButtonText}>Price</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => handleSort('rating')}
            >
              <Text style={styles.sortButtonText}>Rating</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results Count */}
        <Text style={styles.resultsCount}>
          {buses.length} buses found
        </Text>

        {/* Bus Results */}
        {buses.map((bus) => (
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
              <View style={styles.seatBadge}>
                <Icon name="event-seat" size={16} color="#FFF" />
                <Text style={styles.seatBadgeText}>{bus.availableSeats} seats</Text>
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
                <Text style={styles.routeText}>{bus.route}</Text>

                <View style={styles.driverRow}>
                  <Icon name="person" size={16} color="#666" />
                  <Text style={styles.driverText}>Driver: {bus.driver.name}</Text>
                  <View style={styles.ratingContainer}>
                    <Icon name="star" size={14} color="#FFD700" />
                    <Text style={styles.ratingText}>{bus.driver.rating}★</Text>
                  </View>
                </View>

                <View style={styles.amenitiesRow}>
                  {bus.amenities.map((amenity, index) => (
                    <View key={index} style={styles.amenityBadge}>
                      <Text style={styles.amenityText}>{amenity}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Fare and Action */}
            <View style={styles.footer}>
              <View style={styles.fareContainer}>
                <Text style={styles.fareLabel}>Fare:</Text>
                <Text style={styles.fareAmount}>${bus.fare}</Text>
                <Text style={styles.perPerson}>/person</Text>
              </View>

              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => handleSelectBus(bus.id)}
              >
                <Text style={styles.selectButtonText}>SELECT SEATS</Text>
                <Icon name="arrow-forward" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {/* No Results Message */}
        {buses.length === 0 && (
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
    marginLeft: 12,
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
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    marginRight: 12,
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666',
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
    marginTop: 8,
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
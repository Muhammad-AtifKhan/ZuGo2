import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PassengerStackParamList } from '../../navigation/PassengerNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';

type HomeScreenNavigationProp = StackNavigationProp<PassengerStackParamList, 'Home'>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const [fromLocation, setFromLocation] = useState('City Center');
  const [toLocation, setToLocation] = useState('Airport');
  const [travelDate, setTravelDate] = useState(new Date());
  const [travelTime, setTravelTime] = useState('08:00 AM');

  // Quick bookings - Now with actual route information
  const quickBookings = [
    {
      id: '1',
      name: 'Home → Office',
      time: '08:00 AM',
      from: 'Home',
      to: 'Office',
      routeId: 'RT-001',
      busNumber: 'B-101',
      fare: '$5'
    },
    {
      id: '2',
      name: 'University → Mall',
      time: '05:00 PM',
      from: 'University',
      to: 'Shopping Mall',
      routeId: 'RT-002',
      busNumber: 'B-202',
      fare: '$7'
    },
    {
      id: '3',
      name: 'Airport → City Center',
      time: 'Any Time',
      from: 'International Airport',
      to: 'City Center',
      routeId: 'RT-003',
      busNumber: 'B-303',
      fare: '$12'
    },
  ];

  // Popular routes - Dummy data
  const popularRoutes = [
    {
      id: '1',
      name: 'Downtown Express',
      from: 'Main Terminal',
      to: 'Airport',
      frequency: 'Every 30 min',
      fare: '$10',
      busNumber: 'B-001',
      departureTime: '08:00 AM',
      arrivalTime: '09:30 AM',
    },
    {
      id: '2',
      name: 'University Shuttle',
      from: 'City Center',
      to: 'University',
      frequency: 'Every 1 hour',
      fare: '$8',
      busNumber: 'B-002',
      departureTime: '09:00 AM',
      arrivalTime: '10:00 AM',
    },
  ];

  const handleSearch = () => {
    if (!fromLocation || !toLocation) {
      Alert.alert('Missing Information', 'Please enter both locations');
      return;
    }

    navigation.navigate('SearchResults', {
      from: fromLocation,
      to: toLocation,
      date: travelDate.toLocaleDateString(),
      time: travelTime || 'Anytime',
    });
  };

  const handleQuickBook = (route: any) => {
    // Navigate to booking screen with route details
    navigation.navigate('SearchResults', {
      from: route.from,
      to: route.to,
      date: new Date().toLocaleDateString(),
      time: route.departureTime || route.time || 'Anytime',
      routeId: route.id || route.routeId,
      busNumber: route.busNumber,
      fare: route.fare
    });
  };

  const handleQuickBookingPress = (booking: any) => {
    // Set the locations for quick booking
    setFromLocation(booking.from);
    setToLocation(booking.to);

    // If there's a specific time, set it
    if (booking.time !== 'Any Time') {
      setTravelTime(booking.time);
    }

    // Navigate to search results with booking details
    navigation.navigate('SearchResults', {
      from: booking.from,
      to: booking.to,
      date: new Date().toLocaleDateString(),
      time: booking.time !== 'Any Time' ? booking.time : 'Anytime',
      routeId: booking.routeId,
      busNumber: booking.busNumber,
      fare: booking.fare,
      isQuickBooking: true
    });
  };

  const handleCurrentLocation = () => {
    // Simulate getting current location
    Alert.alert('Current Location', 'Fetching your location...');
    setFromLocation('Current Location (Detected)');
  };

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

          {/* From Location */}
          <View style={styles.inputContainer}>
            <Icon name="location-on" size={24} color="#4A90E2" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Current Location"
              placeholderTextColor="#999"
              value={fromLocation}
              onChangeText={setFromLocation}
            />
            <TouchableOpacity
              style={styles.currentLocationBtn}
              onPress={handleCurrentLocation}
            >
              <Icon name="my-location" size={20} color="#4A90E2" />
            </TouchableOpacity>
          </View>

          {/* To Location */}
          <View style={styles.inputContainer}>
            <Icon name="location-on" size={24} color="#4A90E2" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter Destination"
              placeholderTextColor="#999"
              value={toLocation}
              onChangeText={setToLocation}
            />
          </View>

          {/* Date & Time Row */}
          <View style={styles.row}>
            <View style={styles.halfInputContainer}>
              <Icon name="calendar-today" size={20} color="#4A90E2" style={styles.inputIcon} />
              <TouchableOpacity style={styles.dateButton}>
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
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>SEARCH BUSES</Text>
            <Icon name="search" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Quick Bookings */}
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
                <Text style={styles.quickBookingFare}>{item.fare}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Popular Routes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>POPULAR ROUTES</Text>
          {popularRoutes.map((route) => (
            <TouchableOpacity
              key={route.id}
              style={styles.routeCard}
              onPress={() => handleQuickBook(route)}
            >
              <View style={styles.routeHeader}>
                <View style={styles.busIconContainer}>
                  <Icon name="directions-bus" size={24} color="#FFF" />
                </View>
                <View style={styles.routeTitleContainer}>
                  <Text style={styles.routeName}>{route.name}</Text>
                  <Text style={styles.routeNumber}>Bus {route.busNumber}</Text>
                </View>
              </View>

              <View style={styles.routeDetails}>
                <View style={styles.routeRow}>
                  <Icon name="location-on" size={18} color="#4A90E2" />
                  <View style={styles.locationTextContainer}>
                    <Text style={styles.routeFrom}>From: {route.from}</Text>
                    <Text style={styles.routeTo}>To: {route.to}</Text>
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
                    <Text style={styles.infoText}>Fare: {route.fare}</Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Icon name="star" size={16} color="#FFD700" />
                    <Text style={styles.infoText}>4.8 ★</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.bookNowButton}
                onPress={() => handleQuickBook(route)}
              >
                <Text style={styles.bookNowText}>BOOK NOW</Text>
                <Icon name="arrow-forward" size={18} color="#FFF" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    height: '100%',
  },
  currentLocationBtn: {
    padding: 8,
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
});

export default HomeScreen;
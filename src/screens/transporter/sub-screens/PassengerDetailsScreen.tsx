import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute } from '@react-navigation/native';

const PassengerDetailsScreen = () => {
  const route = useRoute<any>();
  const { passengerId = 'TKT-2024-0157' } = route.params || {};

  const passenger = {
    name: 'Ali Ahmed',
    ticket: '#TKT-2024-0157',
    trip: 'TR-45 (B-001)',
    seat: '12A',
    fare: '$12',
    paymentStatus: 'Paid',
    bookingDate: '14/03/2024',
    from: 'City Center (Stop 2)',
    to: 'Airport (Stop 5)',
    boardingTime: '09:00 AM',
    estimatedArrival: '10:30 AM',
    phone: '+92 300 1234567',
    email: 'ali@email.com',
    emergencyContact: '+92 300 7654321',
    specialNeeds: ['Wheelchair assistance', 'Extra luggage (2 pieces)', 'Priority seating'],
  };

  const statusHistory = [
    { date: '14 Mar', event: 'Booking confirmed' },
    { date: '15 Mar 08:45', event: 'Checked-in' },
    { date: '15 Mar 09:00', event: 'Boarded ✓' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>👤</Text>
        <Text style={styles.passengerName}>{passenger.name}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BOOKING INFO:</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ticket</Text>
            <Text style={styles.infoValue}>{passenger.ticket}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trip</Text>
            <Text style={styles.infoValue}>{passenger.trip}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Seat</Text>
            <Text style={styles.infoValue}>{passenger.seat}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fare</Text>
            <Text style={styles.infoValue}>{passenger.fare} ({passenger.paymentStatus})</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Booking Date</Text>
            <Text style={styles.infoValue}>{passenger.bookingDate}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>JOURNEY DETAILS:</Text>
        <View style={styles.journeyCard}>
          <View style={styles.journeyRow}>
            <Text style={styles.journeyLabel}>From</Text>
            <Text style={styles.journeyValue}>{passenger.from}</Text>
          </View>
          <View style={styles.journeyRow}>
            <Text style={styles.journeyLabel}>To</Text>
            <Text style={styles.journeyValue}>{passenger.to}</Text>
          </View>
          <View style={styles.journeyRow}>
            <Text style={styles.journeyLabel}>Boarding Time</Text>
            <Text style={styles.journeyValue}>{passenger.boardingTime}</Text>
          </View>
          <View style={styles.journeyRow}>
            <Text style={styles.journeyLabel}>Estimated Arrival</Text>
            <Text style={styles.journeyValue}>{passenger.estimatedArrival}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CONTACT INFO:</Text>
        <View style={styles.contactCard}>
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Phone</Text>
            <Text style={styles.contactValue}>{passenger.phone}</Text>
          </View>
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactValue}>{passenger.email}</Text>
          </View>
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Emergency Contact</Text>
            <Text style={styles.contactValue}>{passenger.emergencyContact}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SPECIAL NOTES:</Text>
        <View style={styles.notesCard}>
          {passenger.specialNeeds.map((need, index) => (
            <View key={index} style={styles.noteItem}>
              <Text style={styles.noteCheckbox}>□</Text>
              <Text style={styles.noteText}>{need}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>STATUS HISTORY:</Text>
        <View style={styles.historyCard}>
          {statusHistory.map((item, index) => (
            <View key={index} style={styles.historyItem}>
              <View style={styles.historyDate}>
                <Text style={styles.historyDateText}>{item.date}</Text>
              </View>
              <Text style={styles.historyEvent}>{item.event}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionButton, styles.primaryButton]}>
          <Text style={styles.actionButtonText}>CONTACT PASSENGER</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>UPDATE STATUS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.warningButton]}>
          <Text style={styles.actionButtonText}>ISSUE REFUND</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.infoButton]}>
          <Text style={styles.actionButtonText}>VIEW HISTORY</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  passengerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666666',
  },
  infoValue: {
    fontSize: 14,
    color: '#1A237E',
    fontWeight: '600',
  },
  journeyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  journeyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  journeyLabel: {
    fontSize: 14,
    color: '#666666',
  },
  journeyValue: {
    fontSize: 14,
    color: '#1A237E',
    fontWeight: '600',
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contactLabel: {
    fontSize: 14,
    color: '#666666',
  },
  contactValue: {
    fontSize: 14,
    color: '#1A237E',
    fontWeight: '600',
  },
  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  noteCheckbox: {
    fontSize: 20,
    color: '#666666',
    marginRight: 12,
  },
  noteText: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  historyDate: {
    width: 80,
  },
  historyDateText: {
    fontSize: 14,
    color: '#666666',
  },
  historyEvent: {
    fontSize: 14,
    color: '#1A237E',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  warningButton: {
    backgroundColor: '#FF9800',
  },
  infoButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default PassengerDetailsScreen;
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';

const ScheduleScreen: React.FC = () => {
  const days = [
    { day: 'Mon', date: '12', duties: '8:00 AM - 5:00 PM' },
    { day: 'Tue', date: '13', duties: '9:00 AM - 6:00 PM' },
    { day: 'Wed', date: '14', duties: '8:00 AM - 4:00 PM' },
    { day: 'Thu', date: '15', duties: 'OFF' },
    { day: 'Fri', date: '16', duties: '8:00 AM - 5:00 PM' },
    { day: 'Sat', date: '17', duties: 'OFF' },
    { day: 'Sun', date: '18', duties: 'OFF' },
  ];

  const todayDetails = [
    { time: '8:00 AM - 12:00 PM', bus: 'B-001', route: 'City Express' },
    { time: '1:00 PM - 4:00 PM', bus: 'B-002', route: 'University Shuttle' },
    { time: '6:00 PM - 10:00 PM', bus: 'B-001', route: 'Night Service' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>📅 MY SCHEDULE</Text>
        <Text style={styles.headerSubtitle}>March 2024</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Weekly Calendar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WEEKLY VIEW</Text>
          <View style={styles.calendarContainer}>
            {days.map((item, index) => (
              <View key={index} style={styles.dayCard}>
                <Text style={styles.dayName}>{item.day}</Text>
                <Text style={styles.dateNumber}>{item.date}</Text>
                <Text style={styles.dutyHours}>{item.duties}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Today's Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TODAY'S DUTIES</Text>
          <View style={styles.dutiesContainer}>
            {todayDetails.map((duty, index) => (
              <View key={index} style={styles.dutyCard}>
                <Text style={styles.dutyTime}>{duty.time}</Text>
                <Text style={styles.dutyDetails}>Bus: {duty.bus} | Route: {duty.route}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>SCHEDULED</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Coming Soon Message */}
        <View style={styles.comingSoonSection}>
          <Text style={styles.comingSoonTitle}>🔄 Coming Soon</Text>
          <Text style={styles.comingSoonText}>
            • Request shift change{"\n"}
            • View monthly schedule{"\n"}
            • Set availability{"\n"}
            • Swap duties with other drivers
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E3F2FD',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
  },
  calendarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCard: {
    alignItems: 'center',
    flex: 1,
    padding: 8,
  },
  dayName: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  dateNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  dutyHours: {
    fontSize: 10,
    color: '#4CAF50',
    textAlign: 'center',
    height: 28,
  },
  dutiesContainer: {
    gap: 12,
  },
  dutyCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  dutyTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 4,
  },
  dutyDetails: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  comingSoonSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
  },
  comingSoonText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 24,
    textAlign: 'center',
  },
});

export default ScheduleScreen;
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';

const EmergencyScreen: React.FC = () => {
  const emergencyContacts = [
    { id: 1, name: '🚨 POLICE', number: '112', color: '#F44336' },
    { id: 2, name: '🏥 AMBULANCE', number: '115', color: '#2196F3' },
    { id: 3, name: '🚒 FIRE BRIGADE', number: '116', color: '#FF9800' },
    { id: 4, name: '📞 TRANSPORTER', number: '+92 300 1234567', color: '#4CAF50' },
    { id: 5, name: '🚗 ROAD ASSISTANCE', number: '+92 300 9876543', color: '#9C27B0' },
    { id: 6, name: '👮 TRANSPORT AUTHORITY', number: '+92 300 5555555', color: '#607D8B' },
  ];

  const handleCall = (number: string, name: string) => {
    Alert.alert(
      `Call ${name}`,
      `Do you want to call ${name} at ${number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            const phoneNumber = `tel:${number}`;
            Linking.openURL(phoneNumber).catch(err => {
              Alert.alert('Error', 'Could not make the call.');
            });
          }
        }
      ]
    );
  };

  const handleSOS = () => {
    Alert.alert(
      '🚨 EMERGENCY SOS',
      'This will send your location to emergency contacts and the transporter. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'SEND SOS',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'SOS Sent',
              'Emergency services have been notified with your location. Help is on the way.',
              [{ text: 'OK' }]
            );
          }
        }
      ]
    );
  };

  const emergencyInstructions = [
    '1. Stay calm and assess the situation',
    '2. Ensure passenger safety first',
    '3. Use SOS button for immediate help',
    '4. Call relevant emergency service',
    '5. Follow instructions from authorities',
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#F44336" barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>🆘 EMERGENCY</Text>
        <Text style={styles.headerSubtitle}>Immediate Assistance</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* SOS Button */}
        <TouchableOpacity style={styles.sosContainer} onPress={handleSOS}>
          <View style={styles.sosButton}>
            <Text style={styles.sosText}>SOS</Text>
            <Text style={styles.sosSubtext}>Tap in case of emergency</Text>
          </View>
        </TouchableOpacity>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EMERGENCY CONTACTS</Text>
          <View style={styles.contactsGrid}>
            {emergencyContacts.map(contact => (
              <TouchableOpacity
                key={contact.id}
                style={[styles.contactCard, { borderLeftColor: contact.color }]}
                onPress={() => handleCall(contact.number, contact.name)}
              >
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactNumber}>{contact.number}</Text>
                <View style={styles.callButton}>
                  <Text style={styles.callButtonText}>📞 CALL</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Emergency Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EMERGENCY PROCEDURE</Text>
          <View style={styles.instructionsCard}>
            {emergencyInstructions.map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>{index + 1}</Text>
                <Text style={styles.instructionText}>{instruction}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Important Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>⚠️ IMPORTANT INFORMATION</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              • Your location is automatically shared when using SOS
            </Text>
            <Text style={styles.infoText}>
              • Keep emergency exits clear at all times
            </Text>
            <Text style={styles.infoText}>
              • First aid kit is located under driver's seat
            </Text>
            <Text style={styles.infoText}>
              • Fire extinguisher is located near the door
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={() => handleCall('112', 'Police')}>
            <Text style={styles.quickActionEmoji}>🚨</Text>
            <Text style={styles.quickActionText}>Police</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} onPress={() => handleCall('115', 'Ambulance')}>
            <Text style={styles.quickActionEmoji}>🏥</Text>
            <Text style={styles.quickActionText}>Ambulance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} onPress={() => handleCall('+92 300 1234567', 'Transporter')}>
            <Text style={styles.quickActionEmoji}>📞</Text>
            <Text style={styles.quickActionText}>Transporter</Text>
          </TouchableOpacity>
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
    backgroundColor: '#F44336',
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
    color: '#FFCDD2',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sosContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  sosButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  sosText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sosSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 8,
    opacity: 0.9,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
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
    marginBottom: 16,
  },
  contactsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  contactCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  contactName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  contactNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F44336',
    marginBottom: 12,
  },
  callButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  instructionsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F44336',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: 'bold',
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#1A237E',
    lineHeight: 20,
  },
  infoSection: {
    marginTop: 24,
  },
  infoTitle: {
    fontSize: 16,
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
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    marginBottom: 32,
  },
  quickAction: {
    alignItems: 'center',
    padding: 16,
  },
  quickActionEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#1A237E',
    fontWeight: '500',
  },
});

export default EmergencyScreen;
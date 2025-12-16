import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

const NotificationDetailsScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { notificationId } = route.params || {};

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🔔</Text>
        <Text style={styles.title}>TRIP DELAY ALERT</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Trip:</Text>
          <Text style={styles.value}>TR-45 (B-001)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Driver:</Text>
          <Text style={styles.value}>Ali Ahmed</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Route:</Text>
          <Text style={styles.value}>Downtown Express</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Delay:</Text>
          <Text style={[styles.value, styles.delayText]}>+15 minutes</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Reason:</Text>
          <Text style={styles.value}>Heavy traffic on Main Road</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Time:</Text>
          <Text style={styles.value}>10:15 AM</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ IMPACT:</Text>
        <View style={styles.impactItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.impactText}>Next stop: University (ETA: 10:45 AM)</Text>
        </View>
        <View style={styles.impactItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.impactText}>8 passengers waiting</Text>
        </View>
        <View style={styles.impactItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.impactText}>Connection trips affected</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACTIONS:</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>CONTACT DRIVER</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>UPDATE PASSENGERS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>MODIFY SCHEDULE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.resolveButton]}>
            <Text style={[styles.actionButtonText, styles.resolveButtonText]}>MARK RESOLVED</Text>
          </TouchableOpacity>
        </View>
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  label: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#1A237E',
    fontWeight: '600',
  },
  delayText: {
    color: '#FF9800',
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
  impactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 20,
    color: '#FF9800',
    marginRight: 8,
  },
  impactText: {
    fontSize: 16,
    color: '#666666',
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  resolveButton: {
    backgroundColor: '#4CAF50',
  },
  resolveButtonText: {
    color: '#FFFFFF',
  },
});

export default NotificationDetailsScreen;
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';

const ProfileScreen: React.FC = () => {
  const [notifications, setNotifications] = useState({
    trip: true,
    passenger: true,
    system: false,
    emergency: true,
  });

  const driverInfo = {
    name: 'Ali Ahmed',
    email: 'driver.ali@transport.com',
    phone: '+92 300 1234567',
    driverId: 'DRV-0015',
    licenseNumber: 'LIC-2024-0015',
    experience: '5 years',
    rating: 4.8,
    totalTrips: 1245,
  };

  const toggleNotification = (type: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Logged Out', 'You have been logged out successfully.');
            // In real app, navigate to login screen
          }
        }
      ]
    );
  };

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'Feature coming soon!');
  };

  const handleLanguage = () => {
    Alert.alert('Language', 'Feature coming soon!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>👤 MY PROFILE</Text>
        <Text style={styles.headerSubtitle}>Driver Information & Settings</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Driver Info Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DRIVER INFORMATION</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{driverInfo.name}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{driverInfo.email}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{driverInfo.phone}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Driver ID</Text>
              <Text style={styles.infoValue}>{driverInfo.driverId}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>License</Text>
              <Text style={styles.infoValue}>{driverInfo.licenseNumber}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{driverInfo.rating}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{driverInfo.totalTrips}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{driverInfo.experience}</Text>
            <Text style={styles.statLabel}>Experience</Text>
          </View>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTIFICATION SETTINGS</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingTitle}>Trip Notifications</Text>
                <Text style={styles.settingDescription}>Updates about your trips</Text>
              </View>
              <Switch
                value={notifications.trip}
                onValueChange={() => toggleNotification('trip')}
                trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
              />
            </View>

            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingTitle}>Passenger Alerts</Text>
                <Text style={styles.settingDescription}>Boarding and passenger updates</Text>
              </View>
              <Switch
                value={notifications.passenger}
                onValueChange={() => toggleNotification('passenger')}
                trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
              />
            </View>

            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingTitle}>System Messages</Text>
                <Text style={styles.settingDescription}>App updates and announcements</Text>
              </View>
              <Switch
                value={notifications.system}
                onValueChange={() => toggleNotification('system')}
                trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
              />
            </View>

            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingTitle}>Emergency Alerts</Text>
                <Text style={styles.settingDescription}>Critical alerts only</Text>
              </View>
              <Switch
                value={notifications.emergency}
                onValueChange={() => toggleNotification('emergency')}
                trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
              />
            </View>
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT ACTIONS</Text>
          <View style={styles.actionsCard}>
            <TouchableOpacity style={styles.actionButton} onPress={handleChangePassword}>
              <Text style={styles.actionButtonText}>🔐 Change Password</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleLanguage}>
              <Text style={styles.actionButtonText}>🌐 Language</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>📄 Terms & Conditions</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>🛡️ Privacy Policy</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>❓ Help & Support</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>🚪 Logout</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>Version 1.0.0 • Driver App</Text>
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
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  settingsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666666',
  },
  actionsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#1A237E',
    marginLeft: 12,
  },
  logoutButton: {
    backgroundColor: '#F44336',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  versionText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginBottom: 32,
  },
});

export default ProfileScreen;
import React, { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { DrawerNavigationProp } from '@react-navigation/drawer';

type RootDrawerParamList = {
  Main: undefined;
  Schedule: undefined;
  VehicleCheck: undefined;
  Earnings: undefined;
  Emergency: undefined;
  Profile: undefined;
  Notifications: undefined;
  Boarding: undefined;
  Route: undefined;
};

interface ProfileScreenProps {
  navigation: DrawerNavigationProp<RootDrawerParamList, 'Profile'>;
}

interface DriverProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  driverId: string;
  licenseNumber: string;
  licenseExpiry: string;
  experience: string;
  rating: number;
  totalTrips: number;
  totalEarnings: number;
  joinDate: string;
  address: string;
  emergencyContact: string;
  vehicleAssigned?: string;
  busNumber?: string;
  status: 'online' | 'offline' | 'on-duty';
}

interface NotificationSettings {
  trip: boolean;
  passenger: boolean;
  system: boolean;
  emergency: boolean;
  earnings: boolean;
  maintenance: boolean;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const user = auth().currentUser;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    trip: true,
    passenger: true,
    system: false,
    emergency: true,
    earnings: true,
    maintenance: true,
  });

  // Edit profile modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState<{ field: string; value: string } | null>(null);

  // Fetch driver profile from Firebase
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);

        // Get driver profile from drivers collection
        const driverDoc = await firestore().collection('drivers').doc(user.uid).get();

        if (driverDoc.exists) {
          const data = driverDoc.data();

          setDriverProfile({
            id: driverDoc.id,
            fullName: data?.fullName || 'Driver',
            email: data?.email || user.email || '',
            phone: data?.contactNumber || '+92 300 1234567',
            driverId: data?.driverId || `DRV-${user.uid.slice(0, 4)}`,
            licenseNumber: data?.licenseNumber || 'LIC-2024-0015',
            licenseExpiry: data?.licenseExpiry || '2025-12-31',
            experience: data?.experience || '5 years',
            rating: data?.rating || 4.8,
            totalTrips: data?.totalRides || 1245,
            totalEarnings: data?.totalEarnings || 0,
            joinDate: data?.joiningDate || '2023-01-15',
            address: data?.address || 'Lahore, Pakistan',
            emergencyContact: data?.emergencyContact || '+92 300 7654321',
            vehicleAssigned: data?.vehicleAssigned,
            busNumber: data?.busNumber,
            status: data?.status || 'online',
          });

          // Get notification settings
          if (data?.notificationSettings) {
            setNotificationSettings({
              trip: data.notificationSettings.trip ?? true,
              passenger: data.notificationSettings.passenger ?? true,
              system: data.notificationSettings.system ?? false,
              emergency: data.notificationSettings.emergency ?? true,
              earnings: data.notificationSettings.earnings ?? true,
              maintenance: data.notificationSettings.maintenance ?? true,
            });
          }
        } else {
          // Create basic profile if doesn't exist
          setDriverProfile({
            id: user.uid,
            fullName: user.displayName || 'Driver',
            email: user.email || '',
            phone: '+92 300 1234567',
            driverId: `DRV-${user.uid.slice(0, 4)}`,
            licenseNumber: 'LIC-2024-0015',
            licenseExpiry: '2025-12-31',
            experience: '5 years',
            rating: 4.8,
            totalTrips: 1245,
            totalEarnings: 0,
            joinDate: new Date().toISOString().split('T')[0],
            address: 'Lahore, Pakistan',
            emergencyContact: '+92 300 7654321',
            status: 'online',
          });
        }

        setLoading(false);
        setRefreshing(false);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Toggle notification setting
  const toggleNotification = async (type: keyof NotificationSettings) => {
    if (!user || !driverProfile) return;

    const newValue = !notificationSettings[type];

    // Update local state
    setNotificationSettings(prev => ({
      ...prev,
      [type]: newValue
    }));

    // Update Firebase
    try {
      await firestore().collection('drivers').doc(user.uid).update({
        [`notificationSettings.${type}`]: newValue,
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      // Revert local state if Firebase update fails
      setNotificationSettings(prev => ({
        ...prev,
        [type]: !newValue
      }));
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  // Handle edit profile field
  const handleEditField = (field: string, currentValue: string) => {
    setEditField({ field, value: currentValue });
    setEditModalVisible(true);
  };

  // Save edited field
  const saveEditedField = async (newValue: string) => {
    if (!user || !editField || !driverProfile) return;

    setSaving(true);

    try {
      // Map field names to Firebase fields
      const fieldMap: { [key: string]: string } = {
        'Phone': 'contactNumber',
        'Emergency Contact': 'emergencyContact',
        'Address': 'address',
      };

      const firebaseField = fieldMap[editField.field] || editField.field.toLowerCase();

      await firestore().collection('drivers').doc(user.uid).update({
        [firebaseField]: newValue,
      });

      // Update local state
      setDriverProfile(prev => {
        if (!prev) return prev;

        const updatedProfile = { ...prev };
        if (editField.field === 'Phone') updatedProfile.phone = newValue;
        if (editField.field === 'Emergency Contact') updatedProfile.emergencyContact = newValue;
        if (editField.field === 'Address') updatedProfile.address = newValue;

        return updatedProfile;
      });

      setEditModalVisible(false);
      setEditField(null);
      Alert.alert('Success', `${editField.field} updated successfully`);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await auth().signOut();
              // Navigation will be handled by RootNavigator
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  // Handle change password
  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'Enter your new password',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reset Email',
          onPress: async () => {
            if (user?.email) {
              try {
                await auth().sendPasswordResetEmail(user.email);
                Alert.alert(
                  'Password Reset Email Sent',
                  'Please check your email to reset your password.'
                );
              } catch (error) {
                Alert.alert('Error', 'Failed to send reset email');
              }
            }
          }
        }
      ]
    );
  };

  // Handle language selection
  const handleLanguage = () => {
    Alert.alert(
      'Select Language',
      'Choose your preferred language',
      [
        { text: 'English', onPress: () => Alert.alert('Language', 'English selected') },
        { text: 'Urdu', onPress: () => Alert.alert('Language', 'Urdu selected') },
        { text: 'Punjabi', onPress: () => Alert.alert('Language', 'Punjabi selected') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Data will auto-refresh via Firebase listeners
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`;
  };

  // Check if license is expiring soon
  const isLicenseExpiringSoon = () => {
    if (!driverProfile?.licenseExpiry) return false;

    const expiryDate = new Date(driverProfile.licenseExpiry);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays <= 30 && diffDays > 0;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>👤 MY PROFILE</Text>
        <Text style={styles.headerSubtitle}>Driver Information & Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* License Expiry Warning */}
        {isLicenseExpiringSoon() && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningEmoji}>⚠️</Text>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>License Expiring Soon</Text>
              <Text style={styles.warningText}>
                Your license expires on {driverProfile?.licenseExpiry}. Please renew.
              </Text>
            </View>
          </View>
        )}

        {/* Driver Info Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DRIVER INFORMATION</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{driverProfile?.fullName}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{driverProfile?.email}</Text>
            </View>
            <View style={styles.divider} />

            <TouchableOpacity style={styles.infoRow} onPress={() => handleEditField('Phone', driverProfile?.phone || '')}>
              <Text style={styles.infoLabel}>Phone</Text>
              <View style={styles.infoValueContainer}>
                <Text style={styles.infoValue}>{driverProfile?.phone}</Text>
                <Text style={styles.editIcon}>✎</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Driver ID</Text>
              <Text style={styles.infoValue}>{driverProfile?.driverId}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>License</Text>
              <Text style={styles.infoValue}>{driverProfile?.licenseNumber}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>License Expiry</Text>
              <Text style={[styles.infoValue, isLicenseExpiringSoon() && styles.expiringText]}>
                {driverProfile?.licenseExpiry}
              </Text>
            </View>
            <View style={styles.divider} />

            <TouchableOpacity style={styles.infoRow} onPress={() => handleEditField('Emergency Contact', driverProfile?.emergencyContact || '')}>
              <Text style={styles.infoLabel}>Emergency Contact</Text>
              <View style={styles.infoValueContainer}>
                <Text style={styles.infoValue}>{driverProfile?.emergencyContact}</Text>
                <Text style={styles.editIcon}>✎</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.divider} />

            <TouchableOpacity style={styles.infoRow} onPress={() => handleEditField('Address', driverProfile?.address || '')}>
              <Text style={styles.infoLabel}>Address</Text>
              <View style={styles.infoValueContainer}>
                <Text style={styles.infoValue}>{driverProfile?.address}</Text>
                <Text style={styles.editIcon}>✎</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{driverProfile?.rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{driverProfile?.totalTrips}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{driverProfile?.experience}</Text>
            <Text style={styles.statLabel}>Experience</Text>
          </View>
        </View>

        {/* Vehicle Info (if assigned) */}
        {driverProfile?.busNumber && (
          <View style={styles.vehicleSection}>
            <Text style={styles.sectionTitle}>ASSIGNED VEHICLE</Text>
            <View style={styles.vehicleCard}>
              <Text style={styles.vehicleNumber}>Bus: {driverProfile.busNumber}</Text>
              <Text style={styles.vehicleId}>ID: {driverProfile.vehicleAssigned}</Text>
            </View>
          </View>
        )}

        {/* Earnings Summary */}
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>Total Earnings</Text>
          <Text style={styles.earningsValue}>{formatCurrency(driverProfile?.totalEarnings || 0)}</Text>
          <Text style={styles.earningsSubtext}>Since joining on {driverProfile?.joinDate}</Text>
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
                value={notificationSettings.trip}
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
                value={notificationSettings.passenger}
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
                value={notificationSettings.system}
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
                value={notificationSettings.emergency}
                onValueChange={() => toggleNotification('emergency')}
                trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
              />
            </View>

            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingTitle}>Earnings Updates</Text>
                <Text style={styles.settingDescription}>Payment and earnings notifications</Text>
              </View>
              <Switch
                value={notificationSettings.earnings}
                onValueChange={() => toggleNotification('earnings')}
                trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
              />
            </View>

            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingTitle}>Maintenance Reminders</Text>
                <Text style={styles.settingDescription}>Vehicle maintenance alerts</Text>
              </View>
              <Switch
                value={notificationSettings.maintenance}
                onValueChange={() => toggleNotification('maintenance')}
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
              <Text style={styles.actionButtonEmoji}>🔐</Text>
              <Text style={styles.actionButtonText}>Change Password</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleLanguage}>
              <Text style={styles.actionButtonEmoji}>🌐</Text>
              <Text style={styles.actionButtonText}>Language</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Terms', 'Terms & Conditions')}>
              <Text style={styles.actionButtonEmoji}>📄</Text>
              <Text style={styles.actionButtonText}>Terms & Conditions</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Privacy', 'Privacy Policy')}>
              <Text style={styles.actionButtonEmoji}>🛡️</Text>
              <Text style={styles.actionButtonText}>Privacy Policy</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Help', 'Contact support at support@zugo.com')}>
              <Text style={styles.actionButtonEmoji}>❓</Text>
              <Text style={styles.actionButtonText}>Help & Support</Text>
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

      {/* Edit Field Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit {editField?.field}</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              value={editField?.value}
              onChangeText={(text) => setEditField(prev => prev ? { ...prev, value: text } : null)}
              placeholder={`Enter ${editField?.field}`}
              keyboardType={editField?.field === 'Phone' || editField?.field === 'Emergency Contact' ? 'phone-pad' : 'default'}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => saveEditedField(editField?.value || '')}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  warningBanner: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#FFFFFF',
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
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editIcon: {
    fontSize: 14,
    color: '#4A90E2',
  },
  expiringText: {
    color: '#F44336',
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
  vehicleSection: {
    marginTop: 20,
  },
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  vehicleNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  vehicleId: {
    fontSize: 14,
    color: '#666666',
  },
  earningsCard: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  earningsValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  earningsSubtext: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
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
  actionButtonEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#1A237E',
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  modalClose: {
    fontSize: 20,
    color: '#666666',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
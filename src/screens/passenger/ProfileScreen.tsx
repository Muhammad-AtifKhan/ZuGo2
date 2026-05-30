import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  TextInput,
  Switch,
  Image,
  Modal,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';

// Define navigation types
type RootStackParamList = {
  Login: undefined;
  RoleSelection: undefined;
  ChatSupport: undefined;
  FAQ: undefined;
  PrivacyPolicy: undefined;
  TermsConditions: undefined;
};

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface UserData {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  profileImage: string | null;
  loyaltyPoints: number;
  memberSince: string;
  totalTrips: number;
  totalSaved: number;
  cnic?: string;
  address?: string;
  city?: string;
}

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

interface SpecialNeeds {
  wheelchair: boolean;
  extraLuggage: boolean;
  priorityBoarding: boolean;
  assistanceRequired: boolean;
}

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const user = auth().currentUser;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [userData, setUserData] = useState<UserData>({
    name: '',
    email: user?.email || '',
    phone: '',
    dateOfBirth: '',
    profileImage: null,
    loyaltyPoints: 0,
    memberSince: '',
    totalTrips: 0,
    totalSaved: 0,
    cnic: '',
    address: '',
    city: '',
  });

  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>({
    name: '',
    relationship: '',
    phone: '',
  });

  const [specialNeeds, setSpecialNeeds] = useState<SpecialNeeds>({
    wheelchair: false,
    extraLuggage: false,
    priorityBoarding: false,
    assistanceRequired: false,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'help'>('profile');

  // Dropdown states
  const [showSeatDropdown, setShowSeatDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  // Load user data from Firebase
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    try {
      setLoading(true);

      // Get user document
      const userDoc = await firestore().collection('users').doc(user?.uid).get();

      if (userDoc.exists) {
        const data = userDoc.data();

        // Calculate total trips
        const bookingsSnapshot = await firestore()
          .collection('bookings')
          .where('userId', '==', user?.uid)
          .get();

        const totalTrips = bookingsSnapshot.size;

        // Calculate total saved (simplified - in real app would be from transactions)
        const totalSaved = bookingsSnapshot.docs.reduce((sum, doc) => {
          const bookingData = doc.data();
          return sum + (bookingData.discount || 0);
        }, 0);

        setUserData({
          name: data?.fullName || data?.name || '',
          email: user?.email || '',
          phone: data?.phone || '',
          dateOfBirth: data?.dateOfBirth || '',
          profileImage: data?.profileImage || null,
          loyaltyPoints: data?.loyaltyPoints || 0,
          memberSince: data?.createdAt?.toDate?.()
            ? new Date(data.createdAt.toDate()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            : 'Jan 2024',
          totalTrips: totalTrips,
          totalSaved: totalSaved,
          cnic: data?.cnic || '',
          address: data?.address || '',
          city: data?.city || '',
        });

        // Load emergency contact
        if (data?.emergencyContact) {
          setEmergencyContact(data.emergencyContact);
        }

        // Load special needs
        if (data?.specialNeeds) {
          setSpecialNeeds(data.specialNeeds);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
      setLoading(false);
    }
  };

  // Logout function
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLogoutLoading(true);
            try {
              await auth().signOut();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            } finally {
              setLogoutLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    setIsEditing(true);
    setShowSeatDropdown(false);
    setShowLanguageDropdown(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);

    try {
      await firestore().collection('users').doc(user.uid).update({
        fullName: userData.name,
        phone: userData.phone,
        dateOfBirth: userData.dateOfBirth,
        cnic: userData.cnic,
        address: userData.address,
        city: userData.city,
        emergencyContact: emergencyContact,
        specialNeeds: specialNeeds,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleImagePicker = () => {
    Alert.alert(
      'Profile Photo',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => openCamera() },
        { text: 'Choose from Gallery', onPress: () => openGallery() },
        { text: 'Remove Photo', style: 'destructive', onPress: handleRemoveImage },
      ]
    );
  };

  const openGallery = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.5 }, async (response) => {
      if (response.didCancel) return;

      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      if (response.assets && response.assets[0].uri) {
        await uploadImage(response.assets[0].uri);
      }
    });
  };

  const openCamera = () => {
    Alert.alert('Camera', 'Camera feature coming soon');
  };

  const uploadImage = async (uri: string) => {
    if (!user) return;

    setUploading(true);

    try {
      const filename = `profile_${user.uid}_${Date.now()}.jpg`;
      const reference = storage().ref(`profile_images/${filename}`);

      await reference.putFile(uri);
      const downloadUrl = await reference.getDownloadURL();

      await firestore().collection('users').doc(user.uid).update({
        profileImage: downloadUrl,
      });

      setUserData({ ...userData, profileImage: downloadUrl });
      Alert.alert('Success', 'Profile photo updated');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!user) return;

    try {
      await firestore().collection('users').doc(user.uid).update({
        profileImage: null,
      });

      setUserData({ ...userData, profileImage: null });
    } catch (error) {
      console.error('Error removing image:', error);
      Alert.alert('Error', 'Failed to remove image');
    }
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Choose contact method:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call Support', onPress: () => Linking.openURL('tel:+92211234567') },
        { text: 'Email Support', onPress: () => Linking.openURL('mailto:support@zugo.com') },
        { text: 'Live Chat', onPress: () => navigation.navigate('ChatSupport') },
      ]
    );
  };

  const handleViewFAQ = () => {
    navigation.navigate('FAQ');
  };

  const handlePrivacyPolicy = () => {
    navigation.navigate('PrivacyPolicy');
  };

  const handleTermsConditions = () => {
    navigation.navigate('TermsConditions');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;

            try {
              await firestore().collection('users').doc(user.uid).delete();
              await user.delete();
              Alert.alert('Account Deleted', 'Your account has been deleted');
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderProfileSection = () => (
    <View style={styles.section}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity
          style={styles.profileImageContainer}
          onPress={isEditing ? handleImagePicker : undefined}
          disabled={!isEditing || uploading}
        >
          {uploading ? (
            <View style={styles.profileImagePlaceholder}>
              <ActivityIndicator size="large" color="#FFF" />
            </View>
          ) : userData.profileImage ? (
            <Image source={{ uri: userData.profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Icon name="person" size={40} color="#FFF" />
            </View>
          )}
          {isEditing && !uploading && (
            <View style={styles.editPhotoButton}>
              <Icon name="camera-alt" size={16} color="#4A90E2" />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{userData.name || 'User'}</Text>
          <Text style={styles.userEmail}>{userData.email}</Text>
          <Text style={styles.userPhone}>{userData.phone || 'Add phone number'}</Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Icon name="stars" size={24} color="#FFD700" />
          <Text style={styles.statNumber}>{userData.loyaltyPoints}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>

        <View style={styles.statCard}>
          <Icon name="history" size={24} color="#4A90E2" />
          <Text style={styles.statNumber}>{userData.totalTrips}</Text>
          <Text style={styles.statLabel}>Trips</Text>
        </View>

        <View style={styles.statCard}>
          <Icon name="savings" size={24} color="#4CAF50" />
          <Text style={styles.statNumber}>PKR {userData.totalSaved}</Text>
          <Text style={styles.statLabel}>Saved</Text>
        </View>

        <View style={styles.statCard}>
          <Icon name="calendar-today" size={24} color="#FF9800" />
          <Text style={styles.statNumber}>{userData.memberSince}</Text>
          <Text style={styles.statLabel}>Member</Text>
        </View>
      </View>

      {/* Personal Information */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>PERSONAL INFORMATION</Text>

        <View style={styles.infoRow}>
          <Icon name="person" size={20} color="#666" />
          <Text style={styles.infoLabel}>Full Name:</Text>
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={userData.name}
              onChangeText={(text) => setUserData({...userData, name: text})}
              placeholder="Enter your full name"
            />
          ) : (
            <Text style={styles.infoValue}>{userData.name || 'Not set'}</Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Icon name="email" size={20} color="#666" />
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{userData.email}</Text>
        </View>

        <View style={styles.infoRow}>
          <Icon name="phone" size={20} color="#666" />
          <Text style={styles.infoLabel}>Phone:</Text>
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={userData.phone}
              onChangeText={(text) => setUserData({...userData, phone: text})}
              keyboardType="phone-pad"
              placeholder="+92 XXX XXXXXXX"
            />
          ) : (
            <Text style={styles.infoValue}>{userData.phone || 'Not set'}</Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Icon name="cake" size={20} color="#666" />
          <Text style={styles.infoLabel}>Date of Birth:</Text>
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={userData.dateOfBirth}
              onChangeText={(text) => setUserData({...userData, dateOfBirth: text})}
              placeholder="DD/MM/YYYY"
            />
          ) : (
            <Text style={styles.infoValue}>{userData.dateOfBirth || 'Not set'}</Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Icon name="credit-card" size={20} color="#666" />
          <Text style={styles.infoLabel}>CNIC:</Text>
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={userData.cnic}
              onChangeText={(text) => setUserData({...userData, cnic: text})}
              placeholder="XXXXX-XXXXXXX-X"
            />
          ) : (
            <Text style={styles.infoValue}>{userData.cnic || 'Not set'}</Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Icon name="home" size={20} color="#666" />
          <Text style={styles.infoLabel}>Address:</Text>
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={userData.address}
              onChangeText={(text) => setUserData({...userData, address: text})}
              placeholder="Your address"
            />
          ) : (
            <Text style={styles.infoValue}>{userData.address || 'Not set'}</Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Icon name="location-city" size={20} color="#666" />
          <Text style={styles.infoLabel}>City:</Text>
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={userData.city}
              onChangeText={(text) => setUserData({...userData, city: text})}
              placeholder="Your city"
            />
          ) : (
            <Text style={styles.infoValue}>{userData.city || 'Not set'}</Text>
          )}
        </View>
      </View>

      {/* Special Needs */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>SPECIAL NEEDS</Text>

        <View style={styles.specialNeedsContainer}>
          <TouchableOpacity
            style={[
              styles.specialNeedOption,
              specialNeeds.wheelchair && styles.specialNeedSelected,
            ]}
            onPress={() => setSpecialNeeds({...specialNeeds, wheelchair: !specialNeeds.wheelchair})}
            disabled={!isEditing}
          >
            <Icon
              name="accessible"
              size={24}
              color={specialNeeds.wheelchair ? '#4CAF50' : '#666'}
            />
            <Text style={[
              styles.specialNeedText,
              specialNeeds.wheelchair && styles.specialNeedTextSelected,
            ]}>
              Wheelchair Access
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.specialNeedOption,
              specialNeeds.extraLuggage && styles.specialNeedSelected,
            ]}
            onPress={() => setSpecialNeeds({...specialNeeds, extraLuggage: !specialNeeds.extraLuggage})}
            disabled={!isEditing}
          >
            <Icon
              name="work"
              size={24}
              color={specialNeeds.extraLuggage ? '#4CAF50' : '#666'}
            />
            <Text style={[
              styles.specialNeedText,
              specialNeeds.extraLuggage && styles.specialNeedTextSelected,
            ]}>
              Extra Luggage
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.specialNeedOption,
              specialNeeds.priorityBoarding && styles.specialNeedSelected,
            ]}
            onPress={() => setSpecialNeeds({...specialNeeds, priorityBoarding: !specialNeeds.priorityBoarding})}
            disabled={!isEditing}
          >
            <Icon
              name="priority-high"
              size={24}
              color={specialNeeds.priorityBoarding ? '#4CAF50' : '#666'}
            />
            <Text style={[
              styles.specialNeedText,
              specialNeeds.priorityBoarding && styles.specialNeedTextSelected,
            ]}>
              Priority Boarding
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.specialNeedOption,
              specialNeeds.assistanceRequired && styles.specialNeedSelected,
            ]}
            onPress={() => setSpecialNeeds({...specialNeeds, assistanceRequired: !specialNeeds.assistanceRequired})}
            disabled={!isEditing}
          >
            <Icon
              name="assistant"
              size={24}
              color={specialNeeds.assistanceRequired ? '#4CAF50' : '#666'}
            />
            <Text style={[
              styles.specialNeedText,
              specialNeeds.assistanceRequired && styles.specialNeedTextSelected,
            ]}>
              Assistance Required
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Emergency Contact */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>EMERGENCY CONTACT</Text>

        <View style={styles.infoRow}>
          <Icon name="person" size={20} color="#666" />
          <Text style={styles.infoLabel}>Name:</Text>
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={emergencyContact.name}
              onChangeText={(text) => setEmergencyContact({...emergencyContact, name: text})}
              placeholder="Emergency contact name"
            />
          ) : (
            <Text style={styles.infoValue}>{emergencyContact.name || 'Not set'}</Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Icon name="group" size={20} color="#666" />
          <Text style={styles.infoLabel}>Relationship:</Text>
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={emergencyContact.relationship}
              onChangeText={(text) => setEmergencyContact({...emergencyContact, relationship: text})}
              placeholder="Relationship"
            />
          ) : (
            <Text style={styles.infoValue}>{emergencyContact.relationship || 'Not set'}</Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Icon name="phone" size={20} color="#666" />
          <Text style={styles.infoLabel}>Phone:</Text>
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={emergencyContact.phone}
              onChangeText={(text) => setEmergencyContact({...emergencyContact, phone: text})}
              keyboardType="phone-pad"
              placeholder="+92 XXX XXXXXXX"
            />
          ) : (
            <Text style={styles.infoValue}>{emergencyContact.phone || 'Not set'}</Text>
          )}
        </View>
      </View>

      {/* Help & Support Section - Moved here from help tab */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>HELP & SUPPORT</Text>

        <TouchableOpacity style={styles.helpItem} onPress={handleViewFAQ}>
          <Icon name="help" size={20} color="#4A90E2" />
          <Text style={styles.helpItemText}>How to book a trip?</Text>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.helpItem} onPress={handleViewFAQ}>
          <Icon name="cancel" size={20} color="#4A90E2" />
          <Text style={styles.helpItemText}>How to cancel a booking?</Text>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.helpItem} onPress={handleViewFAQ}>
          <Icon name="location-on" size={20} color="#4A90E2" />
          <Text style={styles.helpItemText}>How to track my bus?</Text>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.helpItem} onPress={handleViewFAQ}>
          <Icon name="payment" size={20} color="#4A90E2" />
          <Text style={styles.helpItemText}>Payment issues?</Text>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Contact Support Card */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>CONTACT SUPPORT</Text>

        <TouchableOpacity style={styles.contactItem} onPress={handleContactSupport}>
          <Icon name="phone" size={24} color="#4CAF50" />
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Phone Support</Text>
            <Text style={styles.contactValue}>+92 21 1234567</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactItem} onPress={handleContactSupport}>
          <Icon name="email" size={24} color="#FF9800" />
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Email Support</Text>
            <Text style={styles.contactValue}>support@zugo.com</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactItem} onPress={handleContactSupport}>
          <Icon name="chat" size={24} color="#25D366" />
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Live Chat</Text>
            <Text style={styles.contactValue}>24/7 Support</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.officeHours}>
          <Icon name="access-time" size={20} color="#666" />
          <Text style={styles.officeHoursText}>Office Hours: 8 AM - 10 PM</Text>
        </View>
      </View>

      {/* Legal Card */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>LEGAL</Text>

        <TouchableOpacity style={styles.legalItem} onPress={handlePrivacyPolicy}>
          <Icon name="privacy-tip" size={20} color="#666" />
          <Text style={styles.legalItemText}>Privacy Policy</Text>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.legalItem} onPress={handleTermsConditions}>
          <Icon name="gavel" size={20} color="#666" />
          <Text style={styles.legalItemText}>Terms & Conditions</Text>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.legalItem} onPress={() => Alert.alert('About', 'ZUGO App Version 1.0.0')}>
          <Icon name="info" size={20} color="#666" />
          <Text style={styles.legalItemText}>About This App</Text>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.legalItem, styles.deleteItem]} onPress={handleDeleteAccount}>
          <Icon name="delete-forever" size={20} color="#F44336" />
          <Text style={[styles.legalItemText, styles.deleteText]}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
        <Text style={styles.appCopyright}>© 2024 ZUGO Transport. All rights reserved.</Text>
      </View>

      {/* Edit/Save Buttons */}
      <View style={styles.actionButtons}>
        {isEditing ? (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Icon name="check" size={20} color="#FFF" />
                  <Text style={styles.saveButtonText}>SAVE CHANGES</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => {
                setIsEditing(false);
                loadUserData();
                setShowSeatDropdown(false);
                setShowLanguageDropdown(false);
              }}
            >
              <Icon name="close" size={20} color="#666" />
              <Text style={styles.cancelButtonText}>CANCEL</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={handleEditProfile}
          >
            <Icon name="edit" size={20} color="#4A90E2" />
            <Text style={styles.editButtonText}>EDIT PROFILE</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderHelpSection = () => null; // Help section removed

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Icon name="person" size={32} color="#1A237E" />
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>My Profile</Text>
            <Text style={styles.subtitle}>Manage your account & settings</Text>
          </View>
        </View>

        {/* Active Section Content - Only Profile now */}
        {renderProfileSection()}

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, logoutLoading && styles.buttonDisabled]}
          onPress={handleLogout}
          disabled={logoutLoading}
        >
          <Icon name="logout" size={20} color={logoutLoading ? "#999" : "#F44336"} />
          <Text style={[styles.logoutText, logoutLoading && styles.logoutTextDisabled]}>
            {logoutLoading ? 'LOGGING OUT...' : 'LOGOUT'}
          </Text>
        </TouchableOpacity>
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
    marginBottom: 24,
    marginTop: 10,
  },
  headerTextContainer: {
    marginLeft: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  // Profile Section
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFF',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  infoCard: {
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    marginRight: 12,
    minWidth: 100,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  editInput: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#4A90E2',
    fontSize: 16,
    color: '#1A1A1A',
    paddingVertical: 4,
  },
  specialNeedsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  specialNeedOption: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    marginBottom: 12,
  },
  specialNeedSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  specialNeedText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  specialNeedTextSelected: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 8,
  },
  editButton: {
    borderColor: '#4A90E2',
    backgroundColor: '#FFF',
  },
  editButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  saveButton: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    borderColor: '#E3E8EF',
    backgroundColor: '#FFF',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Help Items
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  helpItemText: {
    fontSize: 16,
    color: '#1A1A1A',
    flex: 1,
    marginLeft: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 16,
  },
  contactLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 14,
    color: '#666',
  },
  officeHours: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  officeHoursText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  legalItemText: {
    fontSize: 16,
    color: '#1A1A1A',
    flex: 1,
    marginLeft: 12,
  },
  deleteItem: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
  deleteText: {
    color: '#F44336',
  },
  appInfo: {
    alignItems: 'center',
    padding: 20,
  },
  appVersion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  appCopyright: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F44336',
    marginBottom: 30,
  },
  logoutText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  logoutTextDisabled: {
    color: '#999',
  },
  buttonDisabled: {
    borderColor: '#CCC',
    backgroundColor: '#F5F5F5',
  },
});

export default ProfileScreen;
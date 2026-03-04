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

interface PaymentMethod {
  id: string;
  type: 'visa' | 'mastercard' | 'jazzcash' | 'easypaisa';
  lastFour: string;
  expiry: string;
  name: string;
  isDefault: boolean;
  token?: string;
}

interface NotificationSettings {
  tripReminders: boolean;
  boardingAlerts: boolean;
  delayUpdates: boolean;
  promotionalOffers: boolean;
  systemUpdates: boolean;
  bookingConfirmations: boolean;
  receipts: boolean;
  newsletter: boolean;
  bookingDetailsSMS: boolean;
  importantAlertsSMS: boolean;
  otpCodesSMS: boolean;
}

interface UserPreferences {
  defaultPayment: 'card' | 'mobile';
  seatPreference: 'window' | 'aisle' | 'any';
  language: 'english' | 'urdu' | 'arabic';
  currency: 'USD' | 'PKR';
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

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    tripReminders: true,
    boardingAlerts: true,
    delayUpdates: true,
    promotionalOffers: false,
    systemUpdates: true,
    bookingConfirmations: true,
    receipts: true,
    newsletter: false,
    bookingDetailsSMS: true,
    importantAlertsSMS: true,
    otpCodesSMS: true,
  });

  const [preferences, setPreferences] = useState<UserPreferences>({
    defaultPayment: 'card',
    seatPreference: 'window',
    language: 'english',
    currency: 'USD',
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
  const [activeSection, setActiveSection] = useState<'profile' | 'payments' | 'notifications' | 'help'>('profile');

  // Dropdown states
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [showSeatDropdown, setShowSeatDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  // Payment modal states
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    name: '',
    cvv: '',
  });

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

        // Load payment methods
        if (data?.paymentMethods) {
          setPaymentMethods(data.paymentMethods);
        }

        // Load notification settings
        if (data?.notificationSettings) {
          setNotifications({
            ...notifications,
            ...data.notificationSettings,
          });
        }

        // Load preferences
        if (data?.preferences) {
          setPreferences({
            ...preferences,
            ...data.preferences,
          });
        }

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

  // ✅ FIXED: Logout function - navigation reset REMOVED
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
              // ✅ RootNavigator automatically shows AuthNavigator
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
    setShowPaymentDropdown(false);
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
        preferences: preferences,
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
    // Implement camera functionality
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

  const handleAddPaymentMethod = () => {
    Alert.alert(
      'Add Payment Method',
      'Select payment method type:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Credit/Debit Card', onPress: () => setShowAddCardModal(true) },
        { text: 'JazzCash', onPress: () => addMobileWallet('jazzcash') },
        { text: 'EasyPaisa', onPress: () => addMobileWallet('easypaisa') },
      ]
    );
  };

  const handleSaveCard = async () => {
    if (!user) return;

    if (!cardDetails.number || cardDetails.number.replace(/\s/g, '').length !== 16) {
      Alert.alert('Invalid Card', 'Please enter a valid 16-digit card number');
      return;
    }

    if (!cardDetails.expiry || !/^\d{2}\/\d{2}$/.test(cardDetails.expiry)) {
      Alert.alert('Invalid Expiry', 'Please enter expiry date in MM/YY format');
      return;
    }

    if (!cardDetails.name) {
      Alert.alert('Invalid Name', 'Please enter cardholder name');
      return;
    }

    if (!cardDetails.cvv || cardDetails.cvv.length !== 3) {
      Alert.alert('Invalid CVV', 'Please enter 3-digit CVV');
      return;
    }

    const newCard: PaymentMethod = {
      id: `card-${Date.now()}`,
      type: cardDetails.number.startsWith('4') ? 'visa' : 'mastercard',
      lastFour: cardDetails.number.slice(-4),
      expiry: cardDetails.expiry,
      name: cardDetails.name,
      isDefault: paymentMethods.length === 0,
    };

    const updatedMethods = [...paymentMethods, newCard];

    try {
      await firestore().collection('users').doc(user.uid).update({
        paymentMethods: updatedMethods,
      });

      setPaymentMethods(updatedMethods);
      setShowAddCardModal(false);
      setCardDetails({ number: '', expiry: '', name: '', cvv: '' });
      Alert.alert('Success', 'Card added successfully');
    } catch (error) {
      console.error('Error saving card:', error);
      Alert.alert('Error', 'Failed to save card');
    }
  };

  const addMobileWallet = async (wallet: 'jazzcash' | 'easypaisa') => {
    if (!user) return;

    const newWallet: PaymentMethod = {
      id: `${wallet}-${Date.now()}`,
      type: wallet,
      lastFour: '',
      expiry: '',
      name: wallet === 'jazzcash' ? 'JazzCash' : 'EasyPaisa',
      isDefault: paymentMethods.length === 0,
    };

    const updatedMethods = [...paymentMethods, newWallet];

    try {
      await firestore().collection('users').doc(user.uid).update({
        paymentMethods: updatedMethods,
      });

      setPaymentMethods(updatedMethods);
      Alert.alert('Success', `${wallet === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'} connected successfully`);
    } catch (error) {
      console.error('Error adding wallet:', error);
      Alert.alert('Error', 'Failed to connect wallet');
    }
  };

  const handleSetDefaultPayment = async (id: string) => {
    if (!user) return;

    const updatedMethods = paymentMethods.map(method => ({
      ...method,
      isDefault: method.id === id,
    }));

    try {
      await firestore().collection('users').doc(user.uid).update({
        paymentMethods: updatedMethods,
      });

      setPaymentMethods(updatedMethods);
      Alert.alert('Updated', 'Default payment method updated');
    } catch (error) {
      console.error('Error updating default payment:', error);
      Alert.alert('Error', 'Failed to update default payment');
    }
  };

  const handleRemovePayment = async (id: string) => {
    if (!user) return;

    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updatedMethods = paymentMethods.filter(method => method.id !== id);

            try {
              await firestore().collection('users').doc(user.uid).update({
                paymentMethods: updatedMethods,
              });

              setPaymentMethods(updatedMethods);
              Alert.alert('Removed', 'Payment method removed');
            } catch (error) {
              console.error('Error removing payment:', error);
              Alert.alert('Error', 'Failed to remove payment method');
            }
          },
        },
      ]
    );
  };

  const handleToggleNotification = (key: keyof NotificationSettings) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveNotifications = async () => {
    if (!user) return;

    try {
      await firestore().collection('users').doc(user.uid).update({
        notificationSettings: notifications,
      });

      Alert.alert('Saved', 'Notification preferences updated');
    } catch (error) {
      console.error('Error saving notifications:', error);
      Alert.alert('Error', 'Failed to save preferences');
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

  // ✅ FIXED: Delete Account function - navigation reset REMOVED
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
              // Delete user data from Firestore
              await firestore().collection('users').doc(user.uid).delete();

              // Delete user auth
              await user.delete();

              Alert.alert('Account Deleted', 'Your account has been deleted');
              // ✅ No navigation needed - user becomes null, RootNavigator shows AuthNavigator
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/(\d{1,4})/g);
    return match ? match.join(' ') : '';
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 3) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
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
          <Text style={styles.statNumber}>${userData.totalSaved}</Text>
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

      {/* Preferences */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>PREFERENCES</Text>

        <View style={styles.preferenceRow}>
          <Text style={styles.preferenceLabel}>Default Payment:</Text>
          {isEditing ? (
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => {
                  setShowPaymentDropdown(!showPaymentDropdown);
                  setShowSeatDropdown(false);
                  setShowLanguageDropdown(false);
                }}
              >
                <Text style={styles.dropdownText}>
                  {preferences.defaultPayment === 'card' ? 'Credit/Debit Card' : 'Mobile Wallet'}
                </Text>
                <Icon
                  name={showPaymentDropdown ? "arrow-drop-up" : "arrow-drop-down"}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>

              {showPaymentDropdown && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.dropdownMenuItem}
                    onPress={() => {
                      setPreferences({...preferences, defaultPayment: 'card'});
                      setShowPaymentDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownMenuItemText}>Credit/Debit Card</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dropdownMenuItem}
                    onPress={() => {
                      setPreferences({...preferences, defaultPayment: 'mobile'});
                      setShowPaymentDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownMenuItemText}>Mobile Wallet</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.preferenceValue}>
              {preferences.defaultPayment === 'card' ? 'Credit/Debit Card' : 'Mobile Wallet'}
            </Text>
          )}
        </View>

        <View style={styles.preferenceRow}>
          <Text style={styles.preferenceLabel}>Seat Preference:</Text>
          {isEditing ? (
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => {
                  setShowSeatDropdown(!showSeatDropdown);
                  setShowPaymentDropdown(false);
                  setShowLanguageDropdown(false);
                }}
              >
                <Text style={styles.dropdownText}>
                  {preferences.seatPreference === 'window' ? 'Window' :
                   preferences.seatPreference === 'aisle' ? 'Aisle' : 'Any'}
                </Text>
                <Icon
                  name={showSeatDropdown ? "arrow-drop-up" : "arrow-drop-down"}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>

              {showSeatDropdown && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.dropdownMenuItem}
                    onPress={() => {
                      setPreferences({...preferences, seatPreference: 'window'});
                      setShowSeatDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownMenuItemText}>Window</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dropdownMenuItem}
                    onPress={() => {
                      setPreferences({...preferences, seatPreference: 'aisle'});
                      setShowSeatDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownMenuItemText}>Aisle</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dropdownMenuItem}
                    onPress={() => {
                      setPreferences({...preferences, seatPreference: 'any'});
                      setShowSeatDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownMenuItemText}>Any</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.preferenceValue}>
              {preferences.seatPreference === 'window' ? 'Window' :
               preferences.seatPreference === 'aisle' ? 'Aisle' : 'Any'}
            </Text>
          )}
        </View>

        <View style={styles.preferenceRow}>
          <Text style={styles.preferenceLabel}>Language:</Text>
          {isEditing ? (
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => {
                  setShowLanguageDropdown(!showLanguageDropdown);
                  setShowPaymentDropdown(false);
                  setShowSeatDropdown(false);
                }}
              >
                <Text style={styles.dropdownText}>
                  {preferences.language === 'english' ? 'English' :
                   preferences.language === 'urdu' ? 'Urdu' : 'العربية'}
                </Text>
                <Icon
                  name={showLanguageDropdown ? "arrow-drop-up" : "arrow-drop-down"}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>

              {showLanguageDropdown && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.dropdownMenuItem}
                    onPress={() => {
                      setPreferences({...preferences, language: 'english'});
                      setShowLanguageDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownMenuItemText}>English</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dropdownMenuItem}
                    onPress={() => {
                      setPreferences({...preferences, language: 'urdu'});
                      setShowLanguageDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownMenuItemText}>Urdu</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dropdownMenuItem}
                    onPress={() => {
                      setPreferences({...preferences, language: 'arabic'});
                      setShowLanguageDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownMenuItemText}>العربية</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.preferenceValue}>
              {preferences.language === 'english' ? 'English' :
               preferences.language === 'urdu' ? 'Urdu' : 'العربية'}
            </Text>
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
                loadUserData(); // Reload original data
                setShowPaymentDropdown(false);
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

  const renderPaymentsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>PAYMENT METHODS</Text>

      <View style={styles.paymentsList}>
        {paymentMethods.map((method) => (
          <View key={method.id} style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <View style={styles.paymentIcon}>
                <Icon
                  name={
                    method.type === 'visa' ? 'credit-card' :
                    method.type === 'mastercard' ? 'card-membership' :
                    'smartphone'
                  }
                  size={28}
                  color="#4A90E2"
                />
              </View>

              <View style={styles.paymentInfo}>
                <Text style={styles.paymentName}>{method.name}</Text>
                {method.type === 'visa' || method.type === 'mastercard' ? (
                  <Text style={styles.paymentDetails}>
                    **** **** **** {method.lastFour} • Expires {method.expiry}
                  </Text>
                ) : (
                  <Text style={styles.paymentDetails}>
                    Connected • {method.name}
                  </Text>
                )}
              </View>

              {method.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                </View>
              )}
            </View>

            <View style={styles.paymentActions}>
              {!method.isDefault && (
                <TouchableOpacity
                  style={styles.paymentActionButton}
                  onPress={() => handleSetDefaultPayment(method.id)}
                >
                  <Icon name="star" size={18} color="#FFD700" />
                  <Text style={styles.paymentActionText}>Set Default</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.paymentActionButton, styles.removeButton]}
                onPress={() => handleRemovePayment(method.id)}
              >
                <Icon name="delete" size={18} color="#F44336" />
                <Text style={[styles.paymentActionText, styles.removeText]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.addPaymentButton}
        onPress={handleAddPaymentMethod}
      >
        <Icon name="add" size={24} color="#4A90E2" />
        <Text style={styles.addPaymentText}>ADD PAYMENT METHOD</Text>
      </TouchableOpacity>

      <View style={styles.mobileWallets}>
        <Text style={styles.walletsTitle}>MOBILE WALLETS</Text>

        <View style={styles.walletsList}>
          <TouchableOpacity
            style={styles.walletButton}
            onPress={() => addMobileWallet('jazzcash')}
          >
            <Icon name="smartphone" size={24} color="#4A90E2" />
            <Text style={styles.walletText}>JazzCash</Text>
            <Text style={styles.walletStatus}>
              {paymentMethods.some(m => m.type === 'jazzcash') ? 'Connected' : 'Not Connected'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.walletButton}
            onPress={() => addMobileWallet('easypaisa')}
          >
            <Icon name="smartphone" size={24} color="#4A90E2" />
            <Text style={styles.walletText}>EasyPaisa</Text>
            <Text style={styles.walletStatus}>
              {paymentMethods.some(m => m.type === 'easypaisa') ? 'Connected' : 'Not Connected'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderNotificationsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>NOTIFICATION SETTINGS</Text>

      <View style={styles.notificationsCard}>
        <Text style={styles.notificationsSubtitle}>PUSH NOTIFICATIONS</Text>

        <View style={styles.notificationRow}>
          <View style={styles.notificationInfo}>
            <Icon name="notifications" size={20} color="#666" />
            <Text style={styles.notificationLabel}>Trip Reminders</Text>
            <Text style={styles.notificationDesc}>1 hour before departure</Text>
          </View>
          <Switch
            value={notifications.tripReminders}
            onValueChange={() => handleToggleNotification('tripReminders')}
            trackColor={{ false: '#DDD', true: '#4CAF50' }}
          />
        </View>

        <View style={styles.notificationRow}>
          <View style={styles.notificationInfo}>
            <Icon name="directions-bus" size={20} color="#666" />
            <Text style={styles.notificationLabel}>Boarding Alerts</Text>
            <Text style={styles.notificationDesc}>When boarding starts</Text>
          </View>
          <Switch
            value={notifications.boardingAlerts}
            onValueChange={() => handleToggleNotification('boardingAlerts')}
            trackColor={{ false: '#DDD', true: '#4CAF50' }}
          />
        </View>

        <View style={styles.notificationRow}>
          <View style={styles.notificationInfo}>
            <Icon name="schedule" size={20} color="#666" />
            <Text style={styles.notificationLabel}>Delay Updates</Text>
            <Text style={styles.notificationDesc}>If delay > 10 minutes</Text>
          </View>
          <Switch
            value={notifications.delayUpdates}
            onValueChange={() => handleToggleNotification('delayUpdates')}
            trackColor={{ false: '#DDD', true: '#4CAF50' }}
          />
        </View>

        <View style={styles.notificationRow}>
          <View style={styles.notificationInfo}>
            <Icon name="local-offer" size={20} color="#666" />
            <Text style={styles.notificationLabel}>Promotional Offers</Text>
            <Text style={styles.notificationDesc}>Discounts & deals</Text>
          </View>
          <Switch
            value={notifications.promotionalOffers}
            onValueChange={() => handleToggleNotification('promotionalOffers')}
            trackColor={{ false: '#DDD', true: '#4CAF50' }}
          />
        </View>

        <View style={styles.notificationRow}>
          <View style={styles.notificationInfo}>
            <Icon name="system-update" size={20} color="#666" />
            <Text style={styles.notificationLabel}>System Updates</Text>
            <Text style={styles.notificationDesc}>App updates & maintenance</Text>
          </View>
          <Switch
            value={notifications.systemUpdates}
            onValueChange={() => handleToggleNotification('systemUpdates')}
            trackColor={{ false: '#DDD', true: '#4CAF50' }}
          />
        </View>
      </View>

      <View style={styles.notificationsCard}>
        <Text style={styles.notificationsSubtitle}>EMAIL NOTIFICATIONS</Text>

        <View style={styles.notificationRow}>
          <View style={styles.notificationInfo}>
            <Icon name="email" size={20} color="#666" />
            <Text style={styles.notificationLabel}>Booking Confirmations</Text>
          </View>
          <Switch
            value={notifications.bookingConfirmations}
            onValueChange={() => handleToggleNotification('bookingConfirmations')}
            trackColor={{ false: '#DDD', true: '#4CAF50' }}
          />
        </View>

        <View style={styles.notificationRow}>
          <View style={styles.notificationInfo}>
            <Icon name="receipt" size={20} color="#666" />
            <Text style={styles.notificationLabel}>Receipts</Text>
          </View>
          <Switch
            value={notifications.receipts}
            onValueChange={() => handleToggleNotification('receipts')}
            trackColor={{ false: '#DDD', true: '#4CAF50' }}
          />
        </View>

        <View style={styles.notificationRow}>
          <View style={styles.notificationInfo}>
            <Icon name="newspaper" size={20} color="#666" />
            <Text style={styles.notificationLabel}>Newsletter</Text>
            <Text style={styles.notificationDesc}>Monthly updates</Text>
          </View>
          <Switch
            value={notifications.newsletter}
            onValueChange={() => handleToggleNotification('newsletter')}
            trackColor={{ false: '#DDD', true: '#4CAF50' }}
          />
        </View>
      </View>

      <View style={styles.notificationsCard}>
        <Text style={styles.notificationsSubtitle}>SMS NOTIFICATIONS</Text>

        <View style={styles.notificationRow}>
          <View style={styles.notificationInfo}>
            <Icon name="sms" size={20} color="#666" />
            <Text style={styles.notificationLabel}>Booking Details</Text>
          </View>
          <Switch
            value={notifications.bookingDetailsSMS}
            onValueChange={() => handleToggleNotification('bookingDetailsSMS')}
            trackColor={{ false: '#DDD', true: '#4CAF50' }}
          />
        </View>

        <View style={styles.notificationRow}>
          <View style={styles.notificationInfo}>
            <Icon name="warning" size={20} color="#666" />
            <Text style={styles.notificationLabel}>Important Alerts</Text>
          </View>
          <Switch
            value={notifications.importantAlertsSMS}
            onValueChange={() => handleToggleNotification('importantAlertsSMS')}
            trackColor={{ false: '#DDD', true: '#4CAF50' }}
          />
        </View>

        <View style={styles.notificationRow}>
          <View style={styles.notificationInfo}>
            <Icon name="lock" size={20} color="#666" />
            <Text style={styles.notificationLabel}>OTP Codes</Text>
          </View>
          <Switch
            value={notifications.otpCodesSMS}
            onValueChange={() => handleToggleNotification('otpCodesSMS')}
            trackColor={{ false: '#DDD', true: '#4CAF50' }}
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.saveNotificationsButton}
        onPress={handleSaveNotifications}
      >
        <Text style={styles.saveNotificationsText}>SAVE NOTIFICATION PREFERENCES</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHelpSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>HELP & SUPPORT</Text>

      <View style={styles.helpCard}>
        <Text style={styles.helpSubtitle}>QUICK HELP</Text>

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

      <View style={styles.helpCard}>
        <Text style={styles.helpSubtitle}>CONTACT SUPPORT</Text>

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
            <Text style={styles.contactLabel}>WhatsApp</Text>
            <Text style={styles.contactValue}>+92 300 9999999</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.officeHours}>
          <Icon name="access-time" size={20} color="#666" />
          <Text style={styles.officeHoursText}>Office Hours: 8 AM - 10 PM</Text>
        </View>
      </View>

      <View style={styles.legalCard}>
        <Text style={styles.legalTitle}>LEGAL</Text>

        <TouchableOpacity style={styles.legalItem} onPress={handlePrivacyPolicy}>
          <Icon name="privacy-tip" size={20} color="#666" />
          <Text style={styles.legalItemText}>Privacy Policy</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.legalItem} onPress={handleTermsConditions}>
          <Icon name="gavel" size={20} color="#666" />
          <Text style={styles.legalItemText}>Terms & Conditions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.legalItem} onPress={() => Alert.alert('About', 'ZUGO App Version 1.0.0')}>
          <Icon name="info" size={20} color="#666" />
          <Text style={styles.legalItemText}>About This App</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.legalItem, styles.deleteItem]} onPress={handleDeleteAccount}>
          <Icon name="delete-forever" size={20} color="#F44336" />
          <Text style={[styles.legalItemText, styles.deleteText]}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.appInfo}>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
        <Text style={styles.appCopyright}>© 2024 ZUGO Transport. All rights reserved.</Text>
      </View>
    </View>
  );

  // Add Payment Method Modal
  const AddCardModal = () => (
    <Modal
      visible={showAddCardModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddCardModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Card</Text>
            <TouchableOpacity onPress={() => setShowAddCardModal(false)}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Card Number</Text>
              <TextInput
                style={styles.formInput}
                placeholder="1234 5678 9012 3456"
                value={formatCardNumber(cardDetails.number)}
                onChangeText={(text) => setCardDetails({...cardDetails, number: text.replace(/\s/g, '')})}
                keyboardType="numeric"
                maxLength={19}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, {flex: 1, marginRight: 10}]}>
                <Text style={styles.formLabel}>Expiry Date</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="MM/YY"
                  value={cardDetails.expiry}
                  onChangeText={(text) => setCardDetails({...cardDetails, expiry: formatExpiry(text)})}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View style={[styles.formGroup, {flex: 1}]}>
                <Text style={styles.formLabel}>CVV</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="123"
                  value={cardDetails.cvv}
                  onChangeText={(text) => setCardDetails({...cardDetails, cvv: text.replace(/\D/g, '')})}
                  keyboardType="numeric"
                  maxLength={3}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Cardholder Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="John Doe"
                value={cardDetails.name}
                onChangeText={(text) => setCardDetails({...cardDetails, name: text})}
              />
            </View>

            <View style={styles.securityNote}>
              <Icon name="lock" size={16} color="#4CAF50" />
              <Text style={styles.securityText}>Your payment information is secure and encrypted</Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelModalButton]}
              onPress={() => setShowAddCardModal(false)}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveModalButton]}
              onPress={handleSaveCard}
            >
              <Text style={styles.saveModalButtonText}>Add Card</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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

        {/* Navigation Tabs */}
        <View style={styles.navTabs}>
          <TouchableOpacity
            style={[
              styles.navTab,
              activeSection === 'profile' && styles.navTabActive,
            ]}
            onPress={() => setActiveSection('profile')}
          >
            <Icon
              name="person"
              size={20}
              color={activeSection === 'profile' ? '#FFF' : '#4A90E2'}
            />
            <Text style={[
              styles.navTabText,
              activeSection === 'profile' && styles.navTabTextActive,
            ]}>
              Profile
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navTab,
              activeSection === 'payments' && styles.navTabActive,
            ]}
            onPress={() => setActiveSection('payments')}
          >
            <Icon
              name="payment"
              size={20}
              color={activeSection === 'payments' ? '#FFF' : '#4A90E2'}
            />
            <Text style={[
              styles.navTabText,
              activeSection === 'payments' && styles.navTabTextActive,
            ]}>
              Payments
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navTab,
              activeSection === 'notifications' && styles.navTabActive,
            ]}
            onPress={() => setActiveSection('notifications')}
          >
            <Icon
              name="notifications"
              size={20}
              color={activeSection === 'notifications' ? '#FFF' : '#4A90E2'}
            />
            <Text style={[
              styles.navTabText,
              activeSection === 'notifications' && styles.navTabTextActive,
            ]}>
              Notifications
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navTab,
              activeSection === 'help' && styles.navTabActive,
            ]}
            onPress={() => setActiveSection('help')}
          >
            <Icon
              name="help"
              size={20}
              color={activeSection === 'help' ? '#FFF' : '#4A90E2'}
            />
            <Text style={[
              styles.navTabText,
              activeSection === 'help' && styles.navTabTextActive,
            ]}>
              Help
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Section Content */}
        {activeSection === 'profile' && renderProfileSection()}
        {activeSection === 'payments' && renderPaymentsSection()}
        {activeSection === 'notifications' && renderNotificationsSection()}
        {activeSection === 'help' && renderHelpSection()}

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

      {/* Add Card Modal */}
      <AddCardModal />
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
  navTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  navTabActive: {
    backgroundColor: '#4A90E2',
  },
  navTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginLeft: 6,
  },
  navTabTextActive: {
    color: '#FFF',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
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
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  preferenceLabel: {
    fontSize: 16,
    color: '#666',
  },
  preferenceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  dropdownContainer: {
    position: 'relative',
    minWidth: 150,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    minWidth: 150,
  },
  dropdownText: {
    fontSize: 16,
    color: '#1A1A1A',
    flex: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  dropdownMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownMenuItemText: {
    fontSize: 16,
    color: '#1A1A1A',
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
  // Payments Section
  paymentsList: {
    marginBottom: 20,
  },
  paymentCard: {
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
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 4,
  },
  paymentDetails: {
    fontSize: 14,
    color: '#666',
  },
  defaultBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  paymentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },
  paymentActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  paymentActionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  removeButton: {
    marginLeft: 24,
  },
  removeText: {
    color: '#F44336',
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E3E8EF',
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  addPaymentText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginLeft: 8,
  },
  mobileWallets: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  walletsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 16,
  },
  walletsList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  walletButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginHorizontal: 8,
  },
  walletText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 8,
    marginBottom: 4,
  },
  walletStatus: {
    fontSize: 12,
    color: '#666',
  },
  // Notifications Section
  notificationsCard: {
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
  notificationsSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 16,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  notificationDesc: {
    fontSize: 14,
    color: '#666',
  },
  saveNotificationsButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  saveNotificationsText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Help Section
  helpCard: {
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
  helpSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 16,
  },
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
  legalCard: {
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
  legalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 16,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E3E8EF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#F8F9FA',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    marginTop: 10,
  },
  securityText: {
    fontSize: 12,
    color: '#2E7D32',
    marginLeft: 8,
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelModalButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E3E8EF',
  },
  saveModalButton: {
    backgroundColor: '#4A90E2',
  },
  cancelModalButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveModalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
// src/screens/transporter/subscreens/AddDriverScreen.tsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Clipboard from '@react-native-clipboard/clipboard'; // ✅ FIX: Updated clipboard import

// Import driver auth service
import { createDriverWithSecondaryApp } from '../../../services/driverAuthService';

// Types
import { Driver } from '../../../types/driver.types';

// Constants
import { COLORS, SIZES, SHADOWS } from '../../../constants/theme';

const AddDriverScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { mode, driver, transporterId: routeTransporterId } = route.params as {
    mode: 'add' | 'edit';
    driver?: Driver;
    transporterId?: string;
  };

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [transporterName, setTransporterName] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | ''>('');

  // Available buses for assignment
  const [availableBuses, setAvailableBuses] = useState<Array<{id: string, busNumber: string}>>([]);
  const [showBusPicker, setShowBusPicker] = useState(false);

  // ✅ FIX: Single source of truth - removed vehicleAssigned field
  const [formData, setFormData] = useState({
    fullName: '',
    contactNumber: '',
    email: '',
    cnic: '',
    licenseNumber: '',
    licenseType: 'heavy' as 'light' | 'heavy' | 'both',
    licenseExpiry: '',
    address: '',
    emergencyContact: '',
    joiningDate: '',
    salary: '',
    employmentType: 'fulltime' as 'fulltime' | 'parttime' | 'contract',
    vehicleAssignedBusId: '',
    status: 'active' as 'active' | 'on_duty' | 'inactive' | 'on_leave' | 'suspended',
    experienceYears: '',
    password: '',
    confirmPassword: '',
  });

  // ✅ FIX: Update field helper to avoid inline setState
  const updateField = useCallback((key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  // ✅ FIX: Debounced email duplicate check
  const emailCheckTimeout = useRef<NodeJS.Timeout>();
  const [emailError, setEmailError] = useState('');

  // Load existing driver data if in edit mode
  useEffect(() => {
    if (mode === 'edit' && driver) {
      setFormData({
        fullName: driver.fullName || '',
        contactNumber: driver.contactNumber || '',
        email: driver.email || '',
        cnic: driver.cnic || '',
        licenseNumber: driver.licenseNumber || '',
        licenseType: driver.licenseType || 'heavy',
        licenseExpiry: driver.licenseExpiry || '',
        address: driver.address || '',
        emergencyContact: driver.emergencyContact || '',
        joiningDate: driver.joiningDate || '',
        salary: driver.salary?.toString() || '',
        employmentType: driver.employmentType || 'fulltime',
        vehicleAssignedBusId: driver.vehicleAssignedBusId || '',
        status: driver.status || 'active',
        experienceYears: driver.experienceYears?.toString() || '',
        password: '',
        confirmPassword: '',
      });
    }
  }, [mode, driver]);

  // ✅ FIX: REMOVED auto status override - let user manually set status
  // Users can now manually control driver status

  // Fetch transporter name
  useEffect(() => {
    const user = auth().currentUser;
    if (!user) return;

    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            setTransporterName(doc.data()?.fullName || 'Transporter');
          }
        },
        (error) => console.error('Error fetching user:', error)
      );

    return () => unsubscribe();
  }, []);

  // Fetch available buses for assignment
  useEffect(() => {
    const user = auth().currentUser;
    if (!user) return;

    const unsubscribe = firestore()
      .collection('buses')
      .where('transporterId', '==', user.uid)
      .where('status', '==', 'active')
      .where('isDeleted', '==', false)
      .onSnapshot((snapshot) => {
        const buses = snapshot.docs.map(doc => ({
          id: doc.id,
          busNumber: doc.data().busNumber,
        }));
        setAvailableBuses(buses);
      });

    return () => unsubscribe();
  }, []);

  // ✅ FIX: Email duplicate check function
  const checkEmailDuplicate = useCallback(async (email: string): Promise<boolean> => {
    if (!email || mode === 'edit') return true;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return true;

    try {
      const user = auth().currentUser;
      const transporterId = routeTransporterId || user?.uid;

      if (!transporterId) return true;

      const existingDriver = await firestore()
        .collection('drivers')
        .where('email', '==', normalizedEmail)
        .where('transporterId', '==', transporterId)
        .where('isDeleted', '==', false)
        .limit(1)
        .get();

      if (!existingDriver.empty) {
        setEmailError('This email is already registered with another driver');
        return false;
      }

      setEmailError('');
      return true;
    } catch (error) {
      console.error('Error checking email duplicate:', error);
      return true;
    }
  }, [mode, routeTransporterId]);

  // ✅ FIX: Debounced email validation
  useEffect(() => {
    if (emailCheckTimeout.current) {
      clearTimeout(emailCheckTimeout.current);
    }

    if (formData.email && mode === 'add') {
      emailCheckTimeout.current = setTimeout(() => {
        checkEmailDuplicate(formData.email);
      }, 500);
    }

    return () => {
      if (emailCheckTimeout.current) {
        clearTimeout(emailCheckTimeout.current);
      }
    };
  }, [formData.email, checkEmailDuplicate, mode]);

  const licenseTypes = [
    { id: 'light', label: 'Light Vehicle', icon: '🚗' },
    { id: 'heavy', label: 'Heavy Vehicle', icon: '🚌' },
    { id: 'both', label: 'Both', icon: '🚙' },
  ];

  const employmentTypes = [
    { id: 'fulltime', label: 'Full-time', icon: '👔' },
    { id: 'parttime', label: 'Part-time', icon: '⏰' },
    { id: 'contract', label: 'Contract', icon: '📝' },
  ];

  const statusTypes = [
    { id: 'active', label: 'Active', color: '#34C759', icon: '🟢' },
    { id: 'on_duty', label: 'On Duty', color: '#007AFF', icon: '🔵' },
    { id: 'inactive', label: 'Inactive', color: '#FF3B30', icon: '🔴' },
    { id: 'on_leave', label: 'On Leave', color: '#FF9500', icon: '🟠' },
    { id: 'suspended', label: 'Suspended', color: '#8E8E93', icon: '⚪' },
  ];

  // Format CNIC (35202-1234567-1)
  const formatCNIC = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.length > 5) {
      if (cleaned.length > 12) {
        cleaned = cleaned.substring(0, 13);
        return `${cleaned.substring(0, 5)}-${cleaned.substring(5, 12)}-${cleaned.substring(12, 13)}`;
      }
      return `${cleaned.substring(0, 5)}-${cleaned.substring(5)}`;
    }
    return cleaned;
  };

  // Format phone (0300-1234567)
  const formatPhone = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.length > 4) {
      return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 11)}`;
    }
    return cleaned;
  };

  // Calculate password strength
  const calculatePasswordStrength = (password: string) => {
    if (!password) {
      setPasswordStrength('');
      return;
    }

    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    if (score >= 6) setPasswordStrength('strong');
    else if (score >= 4) setPasswordStrength('medium');
    else setPasswordStrength('weak');
  };

  // DATE PICKER FUNCTIONS
  const handleDatePress = (field: string) => {
    if (loading) return;
    setCurrentDateField(field);
    if (formData[field as keyof typeof formData]) {
      setSelectedDate(new Date(formData[field as keyof typeof formData] as string));
    } else {
      setSelectedDate(new Date());
    }
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, date: Date | undefined) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0];
      updateField(currentDateField, formattedDate);
    }
  };

  const handleAndroidDateConfirm = () => {
    const formattedDate = selectedDate.toISOString().split('T')[0];
    updateField(currentDateField, formattedDate);
    setShowDatePicker(false);
  };

  // ✅ FIX: Check for duplicate driver with both CNIC and email
  const checkDuplicateDriver = async (transporterId: string): Promise<boolean> => {
    try {
      const cleanedCNIC = formData.cnic.replace(/\D/g, '');
      const normalizedEmail = formData.email.trim().toLowerCase();

      // Check CNIC duplicate
      const existingByCNIC = await firestore()
        .collection('drivers')
        .where('cnic', '==', cleanedCNIC)
        .where('transporterId', '==', transporterId)
        .where('isDeleted', '==', false)
        .limit(1)
        .get();

      if (!existingByCNIC.empty) {
        if (mode === 'edit' && driver?.id) {
          const isSameDriver = existingByCNIC.docs.some(doc => doc.id === driver.id);
          if (!isSameDriver) {
            Alert.alert('Error', 'A driver with this CNIC already exists');
            return false;
          }
        } else if (mode === 'add') {
          Alert.alert('Error', 'A driver with this CNIC already exists');
          return false;
        }
      }

      // ✅ FIX: Check email duplicate (only for add mode)
      if (mode === 'add' && normalizedEmail) {
        const existingByEmail = await firestore()
          .collection('drivers')
          .where('email', '==', normalizedEmail)
          .where('transporterId', '==', transporterId)
          .where('isDeleted', '==', false)
          .limit(1)
          .get();

        if (!existingByEmail.empty) {
          Alert.alert('Error', 'A driver with this email already exists');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking duplicate:', error);
      return true;
    }
  };

  // VALIDATION
  const validateForm = () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Please enter driver full name');
      return false;
    }

    const phoneRegex = /^[0-9]{10,15}$/;
    const cleanedPhone = formData.contactNumber.replace(/\D/g, '');
    if (!formData.contactNumber.trim()) {
      Alert.alert('Error', 'Please enter contact number');
      return false;
    }
    if (!phoneRegex.test(cleanedPhone)) {
      Alert.alert('Error', 'Please enter a valid phone number (10-15 digits)');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter driver email address');
      return false;
    }
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    // ✅ FIX: Email duplicate validation
    if (emailError) {
      Alert.alert('Error', emailError);
      return false;
    }

    const cnicRegex = /^[0-9]{5}-[0-9]{7}-[0-9]{1}$/;
    if (!formData.cnic.trim()) {
      Alert.alert('Error', 'Please enter CNIC number');
      return false;
    }
    if (!cnicRegex.test(formData.cnic)) {
      Alert.alert('Error', 'Please enter CNIC in correct format: 42301-1234567-8');
      return false;
    }

    if (!formData.licenseNumber.trim()) {
      Alert.alert('Error', 'Please enter license number');
      return false;
    }

    if (formData.licenseExpiry) {
      const expiryDate = new Date(formData.licenseExpiry);
      if (expiryDate < new Date()) {
        Alert.alert('Error', 'License has already expired. Please enter a valid future date.');
        return false;
      }
    }

    if (!formData.address.trim()) {
      Alert.alert('Error', 'Please enter address');
      return false;
    }

    if (formData.salary) {
      const salaryNum = parseInt(formData.salary);
      if (isNaN(salaryNum) || salaryNum < 0 || salaryNum > 500000) {
        Alert.alert('Error', 'Please enter a valid salary (0 - 500,000 PKR)');
        return false;
      }
    }

    if (formData.experienceYears) {
      const expNum = parseInt(formData.experienceYears);
      if (isNaN(expNum) || expNum < 0 || expNum > 50) {
        Alert.alert('Error', 'Please enter valid experience (0-50 years)');
        return false;
      }
    }

    if (mode === 'add') {
      if (!formData.password) {
        Alert.alert('Error', 'Please enter password for driver');
        return false;
      }
      if (formData.password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return false;
      }
      if (passwordStrength === 'weak') {
        Alert.alert('Weak Password', 'Please use a stronger password with mix of letters, numbers and symbols');
        return false;
      }
    }
    return true;
  };

  // ✅ FIX: Check if license is expired
  const isLicenseExpired = () => {
    if (!formData.licenseExpiry) return false;
    const expiryDate = new Date(formData.licenseExpiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiryDate < today;
  };

  // SUBMIT HANDLER with batch writes
  const handleSubmit = async () => {
    // ✅ FIX: Loading lock to prevent multiple submissions
    if (loading) return;

    if (!validateForm()) return;
    setLoading(true);

    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to add drivers');
        await auth().signOut();
        setLoading(false);
        return;
      }

      // ✅ FIX: Use provided transporterId or current user's uid
      const transporterId = routeTransporterId || currentUser.uid;
      if (!transporterId) {
        Alert.alert('Error', 'Transporter ID is required');
        setLoading(false);
        return;
      }

      // Check for duplicate driver (both CNIC and email)
      const isUnique = await checkDuplicateDriver(transporterId);
      if (!isUnique) {
        setLoading(false);
        return;
      }

      // Clean and normalize data
      const cleanedPhone = formData.contactNumber.replace(/\D/g, '');
      const cleanedCNIC = formData.cnic.replace(/\D/g, '');
      const normalizedEmail = formData.email.trim().toLowerCase();
      const normalizedFullName = formData.fullName.trim();

      // Add search keywords
      const searchKeywords = [
        normalizedFullName.toLowerCase(),
        cleanedPhone,
        cleanedCNIC,
        normalizedEmail,
      ];

      const licenseExpired = isLicenseExpired();

      if (mode === 'add') {
        // Secondary Firebase auth
        const driverUID = await createDriverWithSecondaryApp(
          normalizedEmail,
          formData.password,
          normalizedFullName
        );

        // Use batch write for atomic transaction
        const batch = firestore().batch();

        // Drivers collection
        const driverRef = firestore().collection('drivers').doc(driverUID);
        batch.set(driverRef, {
          fullName: normalizedFullName,
          contactNumber: cleanedPhone,
          email: normalizedEmail,
          cnic: cleanedCNIC,
          cnicFormatted: formData.cnic,
          licenseNumber: formData.licenseNumber,
          licenseType: formData.licenseType,
          licenseExpiry: formData.licenseExpiry || null,
          isLicenseExpired: licenseExpired,
          address: formData.address,
          emergencyContact: formData.emergencyContact ? formData.emergencyContact.replace(/\D/g, '') : '',
          joiningDate: formData.joiningDate || new Date().toISOString().split('T')[0],
          salary: parseInt(formData.salary) || 0,
          employmentType: formData.employmentType,
          vehicleAssignedBusId: formData.vehicleAssignedBusId || null,
          experienceYears: parseInt(formData.experienceYears) || 0,
          status: formData.status,
          isAvailable: formData.status === 'active' || formData.status === 'on_duty',
          uid: driverUID,
          transporterId: transporterId,
          role: 'driver',
          isDeleted: false,
          searchKeywords: searchKeywords,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

        // Users collection
        const userRef = firestore().collection('users').doc(driverUID);
        batch.set(userRef, {
          uid: driverUID,
          fullName: normalizedFullName,
          email: normalizedEmail,
          phone: cleanedPhone,
          userType: 'driver',
          transporterId: transporterId,
          status: formData.status || 'active',
          isDeleted: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

        // Driver credentials reference
        const credRef = firestore().collection('driver_credentials').doc(driverUID);
        batch.set(credRef, {
          driverId: driverUID,
          transporterId,
          email: normalizedEmail,
          driverName: normalizedFullName,
          phone: cleanedPhone,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

        // Increment transporter driver count
        const transporterRef = firestore().collection('transporters').doc(transporterId);
        batch.set(transporterRef, {
          driversCount: firestore.FieldValue.increment(1),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // Commit batch
        await batch.commit();

        // ✅ FIX: Copy password to clipboard using updated library
        Clipboard.setString(formData.password);

        Alert.alert(
          'Success',
          `Driver added successfully!\n\n📧 Email: ${normalizedEmail}\n\n🔑 Password has been copied to clipboard. Share it securely with the driver.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        // Update existing driver
        if (!driver?.id) throw new Error('Driver ID not found');

        // Use batch write for update
        const batch = firestore().batch();

        const driverRef = firestore().collection('drivers').doc(driver.id);
        batch.update(driverRef, {
          fullName: normalizedFullName,
          contactNumber: cleanedPhone,
          email: normalizedEmail,
          cnic: cleanedCNIC,
          cnicFormatted: formData.cnic,
          licenseNumber: formData.licenseNumber,
          licenseType: formData.licenseType,
          licenseExpiry: formData.licenseExpiry || null,
          isLicenseExpired: licenseExpired,
          address: formData.address,
          emergencyContact: formData.emergencyContact ? formData.emergencyContact.replace(/\D/g, '') : '',
          joiningDate: formData.joiningDate,
          salary: parseInt(formData.salary) || 0,
          employmentType: formData.employmentType,
          vehicleAssignedBusId: formData.vehicleAssignedBusId || null,
          experienceYears: parseInt(formData.experienceYears) || 0,
          status: formData.status,
          isAvailable: formData.status === 'active' || formData.status === 'on_duty',
          searchKeywords: searchKeywords,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

        const userRef = firestore().collection('users').doc(driver.id);
        batch.update(userRef, {
          fullName: normalizedFullName,
          email: normalizedEmail,
          phone: cleanedPhone,
          status: formData.status || 'active',
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

        await batch.commit();

        Alert.alert('Success', 'Driver updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      console.error('❌ Driver save error:', error);

      let errorMessage = 'Failed to save driver.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please use a different email.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use stronger password.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Password generator
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    updateField('password', password);
    updateField('confirmPassword', password);
    calculatePasswordStrength(password);
    // ✅ FIX: Copy to clipboard using updated library
    Clipboard.setString(password);
    Alert.alert('Password Generated', 'Password has been copied to clipboard.');
  };

  // ✅ FIX: Render bus assignment with dropdown picker
  const renderBusAssignment = () => {
    const selectedBus = availableBuses.find(b => b.id === formData.vehicleAssignedBusId);

    return (
      <View>
        <TouchableOpacity
          style={styles.busSelector}
          onPress={() => setShowBusPicker(true)}
          disabled={loading}
        >
          <Text style={styles.busSelectorIcon}>🚌</Text>
          <Text style={selectedBus ? styles.busSelectorText : styles.busSelectorPlaceholder}>
            {selectedBus ? selectedBus.busNumber : 'Select a bus (optional)'}
          </Text>
          <Text style={styles.busSelectorArrow}>▼</Text>
        </TouchableOpacity>

        {showBusPicker && (
          <Modal
            transparent={true}
            animationType="slide"
            visible={showBusPicker}
            onRequestClose={() => setShowBusPicker(false)}
          >
            <View style={styles.busPickerOverlay}>
              <View style={styles.busPickerContainer}>
                <View style={styles.busPickerHeader}>
                  <Text style={styles.busPickerTitle}>Select Bus</Text>
                  <TouchableOpacity onPress={() => setShowBusPicker(false)}>
                    <Text style={styles.busPickerClose}>Close</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView>
                  <TouchableOpacity
                    style={styles.busPickerOption}
                    onPress={() => {
                      updateField('vehicleAssignedBusId', '');
                      setShowBusPicker(false);
                    }}
                  >
                    <Text style={styles.busPickerOptionText}>None (Unassigned)</Text>
                  </TouchableOpacity>
                  {availableBuses.map((bus) => (
                    <TouchableOpacity
                      key={bus.id}
                      style={[
                        styles.busPickerOption,
                        formData.vehicleAssignedBusId === bus.id && styles.busPickerOptionSelected
                      ]}
                      onPress={() => {
                        updateField('vehicleAssignedBusId', bus.id);
                        setShowBusPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.busPickerOptionText,
                        formData.vehicleAssignedBusId === bus.id && styles.busPickerOptionTextSelected
                      ]}>
                        {bus.busNumber}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {availableBuses.length === 0 && (
                    <Text style={styles.busPickerEmpty}>No active buses available</Text>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </View>
    );
  };

  // ========== RENDER FUNCTIONS ==========
  const renderStatusOptions = () => {
    return (
      <View style={styles.statusOptionsContainer}>
        {statusTypes.map((status) => (
          <TouchableOpacity
            key={status.id}
            style={[
              styles.statusButton,
              { borderColor: status.color },
              formData.status === status.id && { backgroundColor: `${status.color}20` }
            ]}
            onPress={() => {
              if (!loading) {
                updateField('status', status.id);
              }
            }}
            disabled={loading}
          >
            <Text style={styles.statusIcon}>{status.icon}</Text>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={styles.statusLabel}>{status.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Password strength indicator
  const renderPasswordStrength = () => {
    if (!passwordStrength) return null;

    const colors = {
      weak: '#FF3B30',
      medium: '#FF9500',
      strong: '#34C759',
    };

    return (
      <View style={styles.strengthContainer}>
        <View style={styles.strengthBarContainer}>
          <View style={[
            styles.strengthBar,
            {
              width: passwordStrength === 'weak' ? '33%' : passwordStrength === 'medium' ? '66%' : '100%',
              backgroundColor: colors[passwordStrength]
            }
          ]} />
        </View>
        <Text style={[styles.strengthText, { color: colors[passwordStrength] }]}>
          {passwordStrength.toUpperCase()} Password
        </Text>
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          {mode === 'add' ? 'Creating driver account...' : 'Updating driver...'}
        </Text>
        <Text style={styles.loadingSubText}>Using secure secondary Firebase instance</Text>
      </View>
    );
  }

  // ========== MAIN RENDER ==========
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {mode === 'add' ? 'Add New Driver' : 'Edit Driver Details'}
          </Text>
          <View style={styles.headerRight} />
        </View>

        {/* Service Info Banner (only for add mode) */}
        {mode === 'add' && (
          <View style={styles.serviceInfoBanner}>
            <Text style={styles.serviceInfoIcon}>🔐</Text>
            <View style={styles.serviceInfoContent}>
              <Text style={styles.serviceInfoTitle}>Using DriverAuthService</Text>
              <Text style={styles.serviceInfoText}>
                Secondary Firebase app instance - Transporter stays logged in
              </Text>
            </View>
          </View>
        )}

        {/* Form Container */}
        <View style={styles.formContainer}>
          {/* ===== PERSONAL INFORMATION ===== */}
          <Text style={styles.sectionTitle}>👤 Personal Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter driver's full name"
              value={formData.fullName}
              onChangeText={(text) => updateField('fullName', text)}
              editable={!loading}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Contact Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="0300-1234567"
                value={formData.contactNumber}
                onChangeText={(text) => updateField('contactNumber', formatPhone(text))}
                keyboardType="phone-pad"
                maxLength={12}
                editable={!loading}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={[styles.input, emailError ? styles.inputError : null]}
                placeholder="driver@email.com"
                value={formData.email}
                onChangeText={(text) => updateField('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              {emailError ? (
                <Text style={styles.errorText}>{emailError}</Text>
              ) : (
                <Text style={styles.inputNote}>
                  Driver will use this email to login
                </Text>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CNIC Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="35202-1234567-1"
              value={formData.cnic}
              onChangeText={(text) => updateField('cnic', formatCNIC(text))}
              maxLength={15}
              keyboardType="numeric"
              editable={!loading}
            />
            <Text style={styles.inputNote}>Format: 12345-1234567-1</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="House #, Street, City"
              value={formData.address}
              onChangeText={(text) => updateField('address', text)}
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Emergency Contact (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="0300-9876543"
              value={formData.emergencyContact}
              onChangeText={(text) => updateField('emergencyContact', formatPhone(text))}
              keyboardType="phone-pad"
              maxLength={12}
              editable={!loading}
            />
          </View>

          {/* ===== LOGIN CREDENTIALS (Only for add mode) ===== */}
          {mode === 'add' && (
            <>
              <Text style={styles.sectionTitle}>🔐 Login Credentials</Text>

              <View style={styles.passwordHeader}>
                <Text style={styles.label}>Set Driver Password *</Text>
                <TouchableOpacity onPress={generateRandomPassword} disabled={loading}>
                  <Text style={styles.generatePasswordText}>🎲 Generate</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Enter password (min 6 chars)"
                    value={formData.password}
                    onChangeText={(text) => {
                      updateField('password', text);
                      calculatePasswordStrength(text);
                    }}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                  </TouchableOpacity>
                </View>
                {renderPasswordStrength()}
                <Text style={styles.passwordHint}>
                  Use strong password with letters, numbers, and symbols
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password *</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChangeText={(text) => updateField('confirmPassword', text)}
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.passwordInfo}>
                <Text style={styles.passwordInfoTitle}>📝 Important:</Text>
                <Text style={styles.passwordInfoText}>
                  • Driver will use email & password to login{'\n'}
                  • Password has been copied to clipboard{'\n'}
                  • Share credentials securely with driver{'\n'}
                  • Driver can change password later after login
                </Text>
              </View>
            </>
          )}

          {/* ===== LICENSE INFORMATION ===== */}
          <Text style={styles.sectionTitle}>📄 License Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>License Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="LHR-123456"
              value={formData.licenseNumber}
              onChangeText={(text) => updateField('licenseNumber', text.toUpperCase())}
              autoCapitalize="characters"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>License Type</Text>
            <View style={styles.optionsContainer}>
              {licenseTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.optionButton,
                    formData.licenseType === type.id && styles.optionButtonSelected
                  ]}
                  onPress={() => updateField('licenseType', type.id)}
                  disabled={loading}
                >
                  <Text style={styles.optionIcon}>{type.icon}</Text>
                  <Text style={[
                    styles.optionLabel,
                    formData.licenseType === type.id && styles.optionLabelSelected
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>License Expiry Date</Text>
            <TouchableOpacity
              style={[styles.dateInput, loading && styles.disabledInput]}
              onPress={() => handleDatePress('licenseExpiry')}
            >
              <Text style={formData.licenseExpiry ? styles.dateSelectedText : styles.datePlaceholderText}>
                {formData.licenseExpiry || 'Select date'}
              </Text>
              <Text style={styles.calendarIcon}>📅</Text>
            </TouchableOpacity>
            {isLicenseExpired() && formData.licenseExpiry && (
              <Text style={styles.warningText}>⚠️ License has expired!</Text>
            )}
          </View>

          {/* ===== EMPLOYMENT INFORMATION ===== */}
          <Text style={styles.sectionTitle}>💼 Employment Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Joining Date</Text>
            <TouchableOpacity
              style={[styles.dateInput, loading && styles.disabledInput]}
              onPress={() => handleDatePress('joiningDate')}
            >
              <Text style={formData.joiningDate ? styles.dateSelectedText : styles.datePlaceholderText}>
                {formData.joiningDate || 'Select date'}
              </Text>
              <Text style={styles.calendarIcon}>📅</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Monthly Salary (PKR)</Text>
              <TextInput
                style={styles.input}
                placeholder="45000"
                value={formData.salary}
                onChangeText={(text) => updateField('salary', text)}
                keyboardType="numeric"
                editable={!loading}
              />
              <Text style={styles.inputNote}>0 - 500,000 PKR</Text>
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Experience (Years)</Text>
              <TextInput
                style={styles.input}
                placeholder="5"
                value={formData.experienceYears}
                onChangeText={(text) => updateField('experienceYears', text)}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Employment Type</Text>
            <View style={styles.employmentOptions}>
              {employmentTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.employmentButton,
                    formData.employmentType === type.id && styles.employmentButtonSelected
                  ]}
                  onPress={() => updateField('employmentType', type.id)}
                  disabled={loading}
                >
                  <Text style={[
                    styles.employmentLabel,
                    formData.employmentType === type.id && styles.employmentLabelSelected
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Driver Status</Text>
            {renderStatusOptions()}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Assigned Vehicle (Optional)</Text>
            {renderBusAssignment()}
            <Text style={styles.inputNote}>
              Select a bus from available active buses
            </Text>
          </View>

          {/* ===== ACTION BUTTONS ===== */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === 'add' ? 'Add Driver' : 'Update Driver'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ===== SERVICE NOTE ===== */}
          {mode === 'add' && (
            <View style={styles.serviceNote}>
              <Text style={styles.serviceNoteTitle}>🔧 Using DriverAuthService</Text>
              <Text style={styles.serviceNoteText}>
                • Secondary Firebase app instance{'\n'}
                • Transporter session preserved{'\n'}
                • Secure account creation{'\n'}
                • Password copied to clipboard for security
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ===== DATE PICKER MODAL ===== */}
      {showDatePicker && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.modalClose}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={currentDateField === 'licenseExpiry' ? new Date() : undefined}
              />
              {Platform.OS === 'android' && (
                <View style={styles.androidButtons}>
                  <TouchableOpacity
                    style={styles.androidButtonCancel}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.androidButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.androidButtonConfirm}
                    onPress={handleAndroidDateConfirm}
                  >
                    <Text style={[styles.androidButtonText, styles.confirmButtonText]}>OK</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

// ========== STYLES ==========
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SIZES.sm,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  loadingSubText: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textLight,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.lg,
    backgroundColor: COLORS.primary,
  },
  backButton: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerRight: {
    width: 24,
  },
  serviceInfoBanner: {
    flexDirection: 'row',
    backgroundColor: '#E8F0FE',
    padding: SIZES.md,
    marginHorizontal: SIZES.md,
    marginTop: SIZES.md,
    borderRadius: SIZES.xs,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    alignItems: 'center',
  },
  serviceInfoIcon: {
    fontSize: 24,
    marginRight: SIZES.sm,
  },
  serviceInfoContent: {
    flex: 1,
  },
  serviceInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 2,
  },
  serviceInfoText: {
    fontSize: 12,
    color: COLORS.primary,
  },
  formContainer: {
    padding: SIZES.md,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: SIZES.xl,
    marginBottom: SIZES.md,
  },
  inputGroup: {
    marginBottom: SIZES.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    padding: SIZES.sm,
    fontSize: 16,
    backgroundColor: COLORS.white,
    color: COLORS.text,
  },
  inputError: {
    borderColor: '#FF3B30',
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  disabledInput: {
    backgroundColor: COLORS.greyLight,
    opacity: 0.7,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  inputNote: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    margin: 4,
    backgroundColor: COLORS.white,
    minWidth: 120,
  },
  optionButtonSelected: {
    backgroundColor: COLORS.infoLight,
    borderColor: COLORS.secondary,
  },
  optionIcon: {
    fontSize: 20,
    marginRight: SIZES.xs,
  },
  optionLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  optionLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    padding: SIZES.sm,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateSelectedText: {
    fontSize: 16,
    color: COLORS.text,
  },
  datePlaceholderText: {
    fontSize: 16,
    color: COLORS.textLighter,
  },
  calendarIcon: {
    fontSize: 20,
    color: COLORS.secondary,
  },
  employmentOptions: {
    flexDirection: 'row',
  },
  employmentButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    paddingVertical: SIZES.xs,
    marginHorizontal: 2,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  employmentButtonSelected: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  employmentLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  employmentLabelSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  statusOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    margin: 4,
    backgroundColor: COLORS.white,
  },
  statusIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusLabel: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  generatePasswordText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 40,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  eyeIcon: {
    fontSize: 20,
  },
  passwordHint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
  strengthContainer: {
    marginTop: 4,
  },
  strengthBarContainer: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'right',
  },
  passwordInfo: {
    backgroundColor: '#FFF3E0',
    padding: SIZES.md,
    borderRadius: SIZES.xs,
    marginBottom: SIZES.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB300',
  },
  passwordInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: SIZES.xs,
  },
  passwordInfoText: {
    fontSize: 12,
    color: '#5D4037',
    lineHeight: 18,
  },
  // Bus selector styles
  busSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    padding: SIZES.sm,
    backgroundColor: COLORS.white,
  },
  busSelectorIcon: {
    fontSize: 20,
    marginRight: SIZES.sm,
  },
  busSelectorText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  busSelectorPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textLighter,
  },
  busSelectorArrow: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  busPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  busPickerContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.lg,
    borderTopRightRadius: SIZES.lg,
    maxHeight: '80%',
  },
  busPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  busPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  busPickerClose: {
    fontSize: 16,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  busPickerOption: {
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  busPickerOptionSelected: {
    backgroundColor: COLORS.infoLight,
  },
  busPickerOptionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  busPickerOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  busPickerEmpty: {
    padding: SIZES.lg,
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 14,
  },
  warningText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: SIZES.xxxl,
    marginBottom: SIZES.lg,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.xs,
    alignItems: 'center',
    marginHorizontal: SIZES.xs,
  },
  cancelButton: {
    backgroundColor: COLORS.greyLight,
  },
  submitButton: {
    backgroundColor: COLORS.secondary,
  },
  buttonDisabled: {
    backgroundColor: COLORS.grey,
  },
  cancelButtonText: {
    color: COLORS.textLight,
    fontWeight: '600',
    fontSize: 16,
  },
  submitButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  serviceNote: {
    backgroundColor: '#F3E5F5',
    padding: SIZES.md,
    borderRadius: SIZES.xs,
    marginTop: SIZES.md,
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  serviceNoteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9C27B0',
    marginBottom: SIZES.xs,
  },
  serviceNoteText: {
    fontSize: 12,
    color: '#9C27B0',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.lg,
    borderTopRightRadius: SIZES.lg,
    paddingBottom: SIZES.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalClose: {
    fontSize: 16,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  androidButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SIZES.md,
    paddingTop: SIZES.sm,
  },
  androidButtonCancel: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    marginRight: SIZES.sm,
  },
  androidButtonConfirm: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.secondary,
    borderRadius: SIZES.xs,
  },
  androidButtonText: {
    fontSize: 16,
    color: COLORS.text,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default AddDriverScreen;
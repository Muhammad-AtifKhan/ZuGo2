// src/screens/transporter/subscreens/AddDriverScreen.tsx
import React, { useState, useEffect } from 'react';
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

// Types
import { Driver } from '../../../types/driver.types';

// Constants
import { COLORS, SIZES, SHADOWS } from '../../../constants/theme';

const AddDriverScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { mode, driver, transporterId } = route.params as {
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

  const [formData, setFormData] = useState({
    fullName: '',
    contactNumber: '',
    email: '',
    cnic: '',
    licenseNumber: '',
    licenseType: 'heavy',
    licenseExpiry: '',
    address: '',
    emergencyContact: '',
    joiningDate: '',
    salary: '',
    employmentType: 'fulltime',
    vehicleAssigned: '',
    status: 'active',
    password: '',
    confirmPassword: '',
  });

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
        vehicleAssigned: driver.vehicleAssigned || '',
        status: driver.status || 'active',
        password: '',
        confirmPassword: '',
      });
    }
  }, [mode, driver]);

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
    { id: 'active', label: 'Active', color: '#34C759' },
    { id: 'inactive', label: 'Inactive', color: '#FF3B30' },
    { id: 'on_leave', label: 'On Leave', color: '#FF9500' },
    { id: 'suspended', label: 'Suspended', color: '#8E8E93' },
  ];

  // ========== DATE PICKER FUNCTIONS ==========
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
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0];

      if (currentDateField === 'licenseExpiry') {
        setFormData({...formData, licenseExpiry: formattedDate});
      } else if (currentDateField === 'joiningDate') {
        setFormData({...formData, joiningDate: formattedDate});
      }
    }
  };

  const handleAndroidDateConfirm = () => {
    const formattedDate = selectedDate.toISOString().split('T')[0];

    if (currentDateField === 'licenseExpiry') {
      setFormData({...formData, licenseExpiry: formattedDate});
    } else if (currentDateField === 'joiningDate') {
      setFormData({...formData, joiningDate: formattedDate});
    }

    setShowDatePicker(false);
  };

  // ========== VALIDATION FUNCTIONS ==========
  const validateForm = () => {
    // Basic validation
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Please enter driver full name');
      return false;
    }

    if (!formData.contactNumber.trim()) {
      Alert.alert('Error', 'Please enter contact number');
      return false;
    }

    // Validate phone number
    const phoneRegex = /^[0-9]{10,15}$/;
    const cleanedPhone = formData.contactNumber.replace(/\D/g, '');
    if (!phoneRegex.test(cleanedPhone)) {
      Alert.alert('Error', 'Please enter a valid phone number (10-15 digits)');
      return false;
    }

    // ✅ EMAIL IS NOW REQUIRED
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter driver email address');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (!formData.cnic.trim()) {
      Alert.alert('Error', 'Please enter CNIC number');
      return false;
    }

    // Validate CNIC format (Pakistan)
    const cnicRegex = /^[0-9]{5}-[0-9]{7}-[0-9]{1}$/;
    if (!cnicRegex.test(formData.cnic)) {
      Alert.alert('Error', 'Please enter CNIC in correct format: 42301-1234567-8');
      return false;
    }

    if (!formData.licenseNumber.trim()) {
      Alert.alert('Error', 'Please enter license number');
      return false;
    }

    if (!formData.address.trim()) {
      Alert.alert('Error', 'Please enter address');
      return false;
    }

    // Password validation for new drivers
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
    }

    return true;
  };

  // ========== FIREBASE FUNCTIONS ==========
  const createDriverAccount = async (driverData: any) => {
    try {
      // Use the password provided by transporter
      const driverPassword = driverData.password;

      // ✅ Use ACTUAL EMAIL provided by transporter
      const driverEmail = driverData.email.trim().toLowerCase();

      console.log('Creating driver account with:', {
        email: driverEmail,
      });

      // Create driver user account in Firebase Auth
      const userCredential = await auth().createUserWithEmailAndPassword(
        driverEmail,
        driverPassword
      );

      const driverId = userCredential.user.uid;

      // Update user profile with driver name
      await userCredential.user.updateProfile({
        displayName: driverData.fullName,
      });

      console.log('Driver account created successfully:', driverId);

      return {
        driverId,
        email: driverEmail,
        password: driverPassword
      };

    } catch (error: any) {
      console.error('Driver account creation error:', error);

      if (error.code === 'auth/email-already-in-use') {
        Alert.alert(
          'Email Already Exists',
          `The email ${driverData.email} is already registered.\n\nPlease use a different email address for this driver.`,
          [{ text: 'OK' }]
        );
        throw new Error('EMAIL_ALREADY_EXISTS');
      }
      throw error;
    }
  };

  const saveDriverToFirestore = async (
    driverId: string,
    driverData: any,
    transporterId: string,
    password: string
  ) => {
    // ✅ Store ACTUAL EMAIL in Firestore
    const driverEmail = driverData.email.trim().toLowerCase();

    const driverDataWithMeta = {
      fullName: driverData.fullName,
      contactNumber: driverData.contactNumber,
      email: driverEmail,
      cnic: driverData.cnic,
      licenseNumber: driverData.licenseNumber,
      licenseType: driverData.licenseType,
      licenseExpiry: driverData.licenseExpiry,
      address: driverData.address,
      emergencyContact: driverData.emergencyContact,
      joiningDate: driverData.joiningDate || new Date().toISOString().split('T')[0],
      salary: parseInt(driverData.salary) || 0,
      employmentType: driverData.employmentType,
      vehicleAssigned: driverData.vehicleAssigned || '',
      status: driverData.status,
      uid: driverId,
      transporterId: transporterId,
      passwordSetByTransporter: true,
      passwordSetDate: new Date().toISOString(),
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
      accountCreated: true,
      lastLogin: null,
      totalRides: 0,
      rating: 0,
      earnings: 0,
      documents: {
        cnicFront: null,
        cnicBack: null,
        license: null,
        photo: null,
      },
      assignedVehicles: [],
      currentLocation: null,
    };

    console.log('Saving driver to Firestore:', {
      driverId,
      email: driverEmail,
      transporterId
    });

    // Save to drivers collection
    await firestore()
      .collection('drivers')
      .doc(driverId)
      .set(driverDataWithMeta);

    // Also add to users collection for unified querying
    await firestore()
      .collection('users')
      .doc(driverId)
      .set({
        uid: driverId,
        fullName: driverData.fullName,
        email: driverEmail,
        phone: `+92${driverData.contactNumber.replace(/\D/g, '').slice(1)}`,
        userType: 'driver',
        transporterId: transporterId,
        status: driverData.status || 'active',
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    // Save credentials securely in separate collection
    await firestore()
      .collection('driver_credentials')
      .doc(driverId)
      .set({
        driverId,
        transporterId,
        email: driverEmail,
        password: password,
        driverName: driverData.fullName,
        phone: driverData.contactNumber,
        createdAt: firestore.FieldValue.serverTimestamp(),
        accessAllowed: [transporterId],
      });

    // Update transporter's drivers count
    const transporterRef = firestore().collection('transporters').doc(transporterId);
    const transporterDoc = await transporterRef.get();

    if (transporterDoc.exists) {
      await transporterRef.update({
        driversCount: firestore.FieldValue.increment(1),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    } else {
      await transporterRef.set({
        transporterId,
        driversCount: 1,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    }

    console.log('Driver saved to Firestore successfully');
    return driverDataWithMeta;
  };

  const updateDriverInFirestore = async (driverId: string, driverData: any) => {
    const updateData = {
      fullName: driverData.fullName,
      contactNumber: driverData.contactNumber,
      email: driverData.email.trim().toLowerCase(),
      cnic: driverData.cnic,
      licenseNumber: driverData.licenseNumber,
      licenseType: driverData.licenseType,
      licenseExpiry: driverData.licenseExpiry,
      address: driverData.address,
      emergencyContact: driverData.emergencyContact,
      joiningDate: driverData.joiningDate,
      salary: parseInt(driverData.salary) || 0,
      employmentType: driverData.employmentType,
      vehicleAssigned: driverData.vehicleAssigned || '',
      status: driverData.status,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    // Update in drivers collection
    await firestore()
      .collection('drivers')
      .doc(driverId)
      .update(updateData);

    // Also update in users collection
    await firestore()
      .collection('users')
      .doc(driverId)
      .update({
        fullName: driverData.fullName,
        email: driverData.email.trim().toLowerCase(),
        phone: `+92${driverData.contactNumber.replace(/\D/g, '').slice(1)}`,
        status: driverData.status || 'active',
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    return updateData;
  };

  // ========== FORM SUBMISSION ==========
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Get current transporter (logged in user)
      const currentUser = auth().currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to add drivers');
        navigation.navigate('Login');
        setLoading(false);
        return;
      }

      const transporterId = currentUser.uid;

      if (mode === 'add') {
        // Create new driver with transporter-provided email and password
        const driverAccount = await createDriverAccount(formData);
        await saveDriverToFirestore(
          driverAccount.driverId,
          formData,
          transporterId,
          driverAccount.password
        );

        const successMessage = `✅ Driver Added Successfully!\n\n📋 Driver Login Credentials:\n\n📧 Email: ${driverAccount.email}\n🔑 Password: ${driverAccount.password}\n\n⚠️ Important Instructions:\n1. Share these EXACT credentials with the driver\n2. Driver must use this EXACT email to login\n3. Save this information securely\n4. Driver can login immediately`;

        Alert.alert(
          'Success',
          successMessage,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            },
            {
              text: '📋 Show Credentials',
              onPress: () => {
                Alert.alert(
                  'Driver Credentials',
                  `Email: ${driverAccount.email}\nPassword: ${driverAccount.password}`,
                  [
                    { text: 'OK' },
                    {
                      text: 'Copy',
                      onPress: () => {
                        // You can add copy functionality here
                        Alert.alert('Copied', 'Credentials copied to clipboard');
                      }
                    }
                  ]
                );
              }
            }
          ]
        );

      } else {
        // Update existing driver
        if (!driver?.id) {
          Alert.alert('Error', 'Driver ID not found');
          setLoading(false);
          return;
        }

        await updateDriverInFirestore(driver.id, formData);

        Alert.alert(
          'Success',
          'Driver updated successfully!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }

    } catch (error: any) {
      setLoading(false);
      console.error('Driver save error:', error);

      if (error.message === 'EMAIL_ALREADY_EXISTS') {
        // Already handled in createDriverAccount
        return;
      }

      let errorMessage = 'Failed to save driver. Please try again.';

      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered. Please use a different email.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please use stronger password.';
          break;
        case 'permission-denied':
          errorMessage = 'You do not have permission to add drivers.';
          break;
        default:
          errorMessage = error.message || 'An unknown error occurred.';
      }

      Alert.alert('Error', errorMessage);
    }
  };

  // Generate random password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({
      ...formData,
      password: password,
      confirmPassword: password
    });
    Alert.alert('Password Generated', `Generated: ${password}`);
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
                setFormData({...formData, status: status.id});
              }
            }}
            disabled={loading}
          >
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={styles.statusLabel}>{status.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Saving driver...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            if (!loading) {
              navigation.goBack();
            }
          }}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {mode === 'add' ? 'Add New Driver' : 'Edit Driver Details'}
          </Text>
          <View style={styles.headerRight} />
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Personal Information */}
          <Text style={styles.sectionTitle}>👤 Personal Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ali Ahmed"
              value={formData.fullName}
              onChangeText={(text) => setFormData({...formData, fullName: text})}
              editable={!loading}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Contact Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="03001234567"
                value={formData.contactNumber}
                onChangeText={(text) => setFormData({...formData, contactNumber: text})}
                keyboardType="phone-pad"
                editable={!loading}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="driver@email.com"
                value={formData.email}
                onChangeText={(text) => setFormData({...formData, email: text})}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <Text style={styles.inputNote}>
                Driver will use this email to login
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CNIC Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="42301-1234567-8"
              value={formData.cnic}
              onChangeText={(text) => setFormData({...formData, cnic: text})}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="House #, Street, City"
              value={formData.address}
              onChangeText={(text) => setFormData({...formData, address: text})}
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Emergency Contact</Text>
            <TextInput
              style={styles.input}
              placeholder="03009876543"
              value={formData.emergencyContact}
              onChangeText={(text) => setFormData({...formData, emergencyContact: text})}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          {/* Login Credentials (Only for new drivers) */}
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
                    onChangeText={(text) => setFormData({...formData, password: text})}
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
                    onChangeText={(text) => setFormData({...formData, confirmPassword: text})}
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
                <Text style={styles.passwordInfoTitle}>📝 Important Instructions:</Text>
                <Text style={styles.passwordInfoText}>
                  1. Set a password for the driver{'\n'}
                  2. Share credentials securely with driver{'\n'}
                  3. Driver will use the email above to login{'\n'}
                  4. Driver can change password later{'\n'}
                  5. Keep credentials confidential
                </Text>
              </View>
            </>
          )}

          {/* License Information */}
          <Text style={styles.sectionTitle}>📄 License Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>License Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="LHR-123456"
              value={formData.licenseNumber}
              onChangeText={(text) => setFormData({...formData, licenseNumber: text})}
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
                  onPress={() => {
                    if (!loading) {
                      setFormData({...formData, licenseType: type.id});
                    }
                  }}
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
          </View>

          {/* Employment Information */}
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
                onChangeText={(text) => setFormData({...formData, salary: text})}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Employment Type</Text>
              <View style={styles.employmentOptions}>
                {employmentTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.employmentButton,
                      formData.employmentType === type.id && styles.employmentButtonSelected
                    ]}
                    onPress={() => {
                      if (!loading) {
                        setFormData({...formData, employmentType: type.id});
                      }
                    }}
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
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Driver Status</Text>
            {renderStatusOptions()}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Assigned Vehicle (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Bus-01 or Registration Number"
              value={formData.vehicleAssigned}
              onChangeText={(text) => setFormData({...formData, vehicleAssigned: text})}
              editable={!loading}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => {
                if (!loading) {
                  navigation.goBack();
                }
              }}
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

          {/* Information Note */}
          <View style={styles.infoNote}>
            <Text style={styles.infoNoteTitle}>⚠️ Important:</Text>
            <Text style={styles.infoNoteText}>
              • Driver will use the provided email and password to login{'\n'}
              • Share credentials securely with driver{'\n'}
              • Driver can change password after login{'\n'}
              • Keep a record of driver credentials
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
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
  // Password section styles
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
  // Input note for email
  inputNote: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
    fontStyle: 'italic',
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
  infoNote: {
    backgroundColor: '#E8F0FE',
    padding: SIZES.md,
    borderRadius: SIZES.xs,
    marginTop: SIZES.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoNoteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SIZES.xs,
  },
  infoNoteText: {
    fontSize: 12,
    color: COLORS.primary,
    lineHeight: 18,
  },
  // Modal styles
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
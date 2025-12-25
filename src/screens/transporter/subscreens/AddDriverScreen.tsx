// AddDriverScreen.tsx - WITH REQUIRED EMAIL FIELD
import React, { useState } from 'react';
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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const AddDriverScreen = ({ navigation, route }: any) => {
  const mode = route.params?.mode || 'add';
  const existingDriver = route.params?.driver || null;

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: existingDriver?.fullName || '',
    contactNumber: existingDriver?.contactNumber || '',
    email: existingDriver?.email || '', // ← Now REQUIRED
    cnic: existingDriver?.cnic || '',
    licenseNumber: existingDriver?.licenseNumber || '',
    licenseType: existingDriver?.licenseType || 'heavy',
    licenseExpiry: existingDriver?.licenseExpiry || '',
    address: existingDriver?.address || '',
    emergencyContact: existingDriver?.emergencyContact || '',
    joiningDate: existingDriver?.joiningDate || '',
    salary: existingDriver?.salary || '',
    employmentType: existingDriver?.employmentType || 'fulltime',
    vehicleAssigned: existingDriver?.vehicleAssigned || '',
    status: existingDriver?.status || 'active',
    password: '',
    confirmPassword: '',
  });

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

      // ✅ Use ACTUAL EMAIL provided by transporter (not random)
      const driverEmail = driverData.email.trim().toLowerCase();

      console.log('Creating driver account with:', {
        email: driverEmail,
        password: driverPassword
      });

      // Create driver user account in Firebase Auth
      const userCredential = await auth().createUserWithEmailAndPassword(
        driverEmail, // ← ACTUAL EMAIL FROM FORM
        driverPassword
      );

      const driverId = userCredential.user.uid;

      // Update user profile with driver role
      await userCredential.user.updateProfile({
        displayName: driverData.fullName,
      });

      console.log('Driver account created successfully:', driverId);

      // Return driver info with ACTUAL EMAIL
      return {
        driverId,
        email: driverEmail, // ← ACTUAL EMAIL
        password: driverPassword
      };

    } catch (error: any) {
      console.error('Driver account creation error:', error);

      // If email already exists, ask transporter to use different email
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

  const saveDriverToFirestore = async (driverId: string, driverData: any, transporterId: string, password: string) => {
    // ✅ Store ACTUAL EMAIL in Firestore
    const driverEmail = driverData.email.trim().toLowerCase();

    const driverDataWithMeta = {
      ...driverData,
      uid: driverId,
      email: driverEmail, // ← ACTUAL EMAIL
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

    // Remove password from Firestore data (for security)
    const { password: _, confirmPassword: __, ...firestoreData } = driverDataWithMeta;

    console.log('Saving driver to Firestore:', {
      driverId,
      email: driverEmail,
      transporterId
    });

    // Save to drivers collection
    await firestore()
      .collection('drivers')
      .doc(driverId)
      .set(firestoreData);

    // Also add to users collection for unified querying
    await firestore()
      .collection('users')
      .doc(driverId)
      .set({
        uid: driverId,
        fullName: driverData.fullName,
        email: driverEmail, // ← ACTUAL EMAIL
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
        email: driverEmail, // ← ACTUAL EMAIL
        password: password,
        driverName: driverData.fullName,
        phone: driverData.contactNumber,
        createdAt: firestore.FieldValue.serverTimestamp(),
        accessAllowed: [transporterId],
      });

    // Update transporter's drivers list
    await firestore()
      .collection('transporters')
      .doc(transporterId)
      .update({
        driversCount: firestore.FieldValue.increment(1),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    console.log('Driver saved to Firestore successfully');
    return driverDataWithMeta;
  };

  const updateDriverInFirestore = async (driverId: string, driverData: any) => {
    const { password: _, confirmPassword: __, ...updateData } = {
      ...driverData,
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

      // Prepare driver data
      const driverData = {
        ...formData,
        phone: `+92${formData.contactNumber.replace(/\D/g, '').slice(1)}`,
        phoneLocal: formData.contactNumber,
      };

      let driverAccount;
      let successMessage = '';

      if (mode === 'add') {
        // Create new driver with transporter-provided email and password
        driverAccount = await createDriverAccount(driverData);
        await saveDriverToFirestore(driverAccount.driverId, driverData, transporterId, driverAccount.password);

        successMessage = `✅ Driver Added Successfully!\n\n📋 Driver Login Credentials:\n\n📧 Email: ${driverAccount.email}\n🔑 Password: ${driverAccount.password}\n\n⚠️ Important Instructions:\n1. Share these EXACT credentials with the driver\n2. Driver must use this EXACT email to login\n3. Save this information securely\n4. Driver can login immediately`;

      } else {
        // Update existing driver
        const driverId = existingDriver.uid;
        await updateDriverInFirestore(driverId, driverData);
        successMessage = 'Driver updated successfully!';
      }

      setLoading(false);

      // Show success with clear instructions
      Alert.alert(
        'Success',
        successMessage,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            }
          },
          mode === 'add' && {
            text: '📋 Show Credentials Again',
            onPress: () => {
              Alert.alert(
                'Driver Credentials',
                `Email: ${driverAccount.email}\nPassword: ${driverAccount.password}`,
                [
                  { text: 'OK' },
                  {
                    text: 'Email to Driver',
                    onPress: () => {
                      Alert.alert(
                        'Send Email',
                        `Send credentials to driver via email?\n\nEmail: ${driverAccount.email}`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Send', onPress: () => {
                            // Here you would implement email sending
                            Alert.alert('Info', 'Email functionality will be added in next update');
                          }}
                        ]
                      );
                    }
                  }
                ]
              );
            }
          }
        ].filter(Boolean) as { text: string; onPress: () => void }[]
      );

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
              <Text style={styles.label}>Email Address *</Text> {/* ← NOW REQUIRED */}
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
              <Text style={styles.label}>Monthly Salary (₹)</Text>
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
              <Text style={styles.submitButtonText}>
                {loading ? 'Saving...' : mode === 'add' ? 'Add Driver' : 'Update Driver'}
              </Text>
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

        {/* Date Picker Modal for iOS */}
        {showDatePicker && Platform.OS === 'ios' && (
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
                  display="spinner"
                  onChange={handleDateChange}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Android Date Picker */}
        {showDatePicker && Platform.OS === 'android' && (
          <View style={styles.androidDatePickerContainer}>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
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
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#1A237E',
  },
  backButton: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 24,
  },
  formContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A237E',
    marginTop: 24,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  disabledInput: {
    backgroundColor: '#F5F5F5',
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
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 4,
    backgroundColor: '#FFFFFF',
    minWidth: 120,
  },
  optionButtonSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  optionLabel: {
    fontSize: 14,
    color: '#333333',
  },
  optionLabelSelected: {
    color: '#1A237E',
    fontWeight: '600',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateSelectedText: {
    fontSize: 16,
    color: '#333333',
  },
  datePlaceholderText: {
    fontSize: 16,
    color: '#999999',
  },
  calendarIcon: {
    fontSize: 20,
    color: '#4A90E2',
  },
  employmentOptions: {
    flexDirection: 'row',
  },
  employmentButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    paddingVertical: 8,
    marginHorizontal: 2,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  employmentButtonSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  employmentLabel: {
    fontSize: 12,
    color: '#666666',
  },
  employmentLabelSelected: {
    color: '#FFFFFF',
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 4,
    backgroundColor: '#FFFFFF',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusLabel: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '500',
  },
  // Password section styles
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  generatePasswordText: {
    color: '#4A90E2',
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
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  passwordInfo: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB300',
  },
  passwordInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 8,
  },
  passwordInfoText: {
    fontSize: 12,
    color: '#5D4037',
    lineHeight: 18,
  },
  // Input note for email
  inputNote: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 32,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
  },
  buttonDisabled: {
    backgroundColor: '#6c8bc7',
  },
  cancelButtonText: {
    color: '#666666',
    fontWeight: '600',
    fontSize: 16,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  infoNote: {
    backgroundColor: '#E8F0FE',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1a73e8',
  },
  infoNoteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 8,
  },
  infoNoteText: {
    fontSize: 12,
    color: '#1a73e8',
    lineHeight: 18,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  modalClose: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
  // Android date picker styles
  androidDatePickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  androidButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  androidButtonCancel: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
  },
  androidButtonConfirm: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4A90E2',
    borderRadius: 6,
  },
  androidButtonText: {
    fontSize: 16,
    color: '#333333',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default AddDriverScreen;
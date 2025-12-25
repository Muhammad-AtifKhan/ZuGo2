// src/screens/auth/PassengerRegistrationScreen.tsx - FIREBASE INTEGRATED
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Define navigation types
type StackParamList = {
  PassengerRegistration: undefined;
  OTPVerification: { phone: string; role: string };
  Login: undefined;
  Home: undefined;
};

type NavigationProp = NativeStackNavigationProp<StackParamList>;

// Route params type
type RouteParams = {
  role?: 'passenger' | 'driver' | 'transporter';
};

export default function PassengerRegistrationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const params = route.params as RouteParams;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'passenger' | 'driver' | 'transporter'>(
    params?.role || 'passenger'
  );

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Validate email format
  const isValidEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Validate phone number
  const isValidPhone = (phone: string) => {
    const re = /^[0-9]{10,15}$/;
    return re.test(phone.replace(/\D/g, ''));
  };

  // Format phone number
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      return `+92${cleaned.substring(1)}`; // Pakistan country code
    }
    return `+${cleaned}`;
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!isValidEmail(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!formData.phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    const cleanedPhone = formData.phone.replace(/\D/g, '');
    if (!isValidPhone(cleanedPhone)) {
      Alert.alert('Error', 'Please enter a valid phone number (10-15 digits)');
      return;
    }

    if (!formData.password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!termsAccepted) {
      Alert.alert('Error', 'Please accept terms and conditions');
      return;
    }

    setLoading(true);

    try {
      // 1. Create user in Firebase Authentication
      const userCredential = await auth().createUserWithEmailAndPassword(
        formData.email.trim().toLowerCase(),
        formData.password
      );

      const user = userCredential.user;

      // 2. Update user profile with name
      await user.updateProfile({
        displayName: formData.name.trim(),
      });

      // 3. Send email verification
      await user.sendEmailVerification();

      // 4. Store additional user data in Firestore
      const formattedPhone = formatPhoneNumber(formData.phone);

      await firestore()
        .collection('users')
        .doc(user.uid)
        .set({
          uid: user.uid,
          fullName: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formattedPhone,
          phoneLocal: formData.phone.trim(),
          userType: selectedRole,
          emailVerified: false,
          profileComplete: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
          status: 'active',
        });

      // 5. Show success message with email verification info
      Alert.alert(
        'Registration Successful! 🎉',
        `Your ${selectedRole} account has been created!\n\nWe've sent a verification email to ${formData.email}. Please verify your email to continue.\n\nYou can now login with your credentials.`,
        [
          {
            text: 'Login Now',
            onPress: () => {
              // Reset form
              setFormData({
                name: '',
                email: '',
                phone: '',
                password: '',
                confirmPassword: '',
              });
              setTermsAccepted(false);

              // Navigate to login with pre-filled email
              navigation.reset({
                index: 0,
                routes: [{
                  name: 'Login',
                  params: { preFilledEmail: formData.email }
                }],
              });
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('Registration Error:', error);

      let errorMessage = 'Registration failed. Please try again.';

      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered. Please login or use a different email.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'The email address is not valid.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled. Please contact support.';
          break;
        case 'auth/weak-password':
          errorMessage = 'The password is too weak. Please use a stronger password.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many requests. Please try again later.';
          break;
        default:
          errorMessage = error.message || 'An unknown error occurred.';
      }

      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP verification (optional - for phone verification)
  const handleOTPVerification = () => {
    // This is optional - you can implement phone verification later
    // For now, we'll just show a message
    Alert.alert(
      'Phone Verification',
      'Phone verification will be implemented in the next phase.\n\nFor now, please use email verification.',
      [{ text: 'OK' }]
    );
  };

  // Role badges for visual indication
  const roleBadges = {
    passenger: { color: '#4285f4', label: 'Passenger', emoji: '🧑‍💼' },
    driver: { color: '#fbbc04', label: 'Driver', emoji: '🚗' },
    transporter: { color: '#ea4335', label: 'Transporter', emoji: '🏢' },
  };

  const currentRole = roleBadges[selectedRole];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with Role Badge */}
          <View style={styles.header}>
            <View style={[styles.roleBadge, { backgroundColor: currentRole.color }]}>
              <Text style={styles.roleEmoji}>{currentRole.emoji}</Text>
              <Text style={styles.roleLabel}>{currentRole.label} Registration</Text>
            </View>

            <Text style={styles.title}>Create Your Account</Text>
            <Text style={styles.subtitle}>
              Fill in your details to get started as a {currentRole.label.toLowerCase()}
            </Text>

            <View style={styles.firebaseIndicator}>
              <Text style={styles.firebaseIndicatorText}>
                🔒 Secure Firebase Registration
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                value={formData.name}
                onChangeText={value => handleChange('name', value)}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="john@example.com"
                value={formData.email}
                onChangeText={value => handleChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
              <Text style={styles.inputNote}>
                We'll send verification to this email
              </Text>
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="03XX XXXXXXX"
                value={formData.phone}
                onChangeText={value => handleChange('phone', value)}
                keyboardType="phone-pad"
                maxLength={15}
                editable={!loading}
              />
              <Text style={styles.inputNote}>
                Pakistani format: 03XX-XXXXXXX
              </Text>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                value={formData.password}
                onChangeText={value => handleChange('password', value)}
                secureTextEntry
                editable={!loading}
              />
              <Text style={styles.inputNote}>
                Use a strong password with letters, numbers, and symbols
              </Text>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChangeText={value => handleChange('confirmPassword', value)}
                secureTextEntry
                editable={!loading}
              />
            </View>

            {/* Terms & Conditions */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setTermsAccepted(!termsAccepted)}
              activeOpacity={0.7}
              disabled={loading}
            >
              <View style={styles.checkbox}>
                {termsAccepted && <View style={styles.checkboxInner} />}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.termsLink}>Terms & Conditions</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            {/* Firebase Info */}
            <View style={styles.firebaseInfo}>
              <Text style={styles.firebaseInfoTitle}>🔐 Firebase Security</Text>
              <Text style={styles.firebaseInfoText}>
                • Email verification required{'\n'}
                • Secure password encryption{'\n'}
                • Real-time data sync{'\n'}
                • Encrypted user data storage
              </Text>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.registerButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.registerButtonText}>
                  Create {currentRole.label} Account
                </Text>
              )}
            </TouchableOpacity>

            {/* OTP Verification Button (Optional) */}
            <TouchableOpacity
              style={styles.otpButton}
              onPress={handleOTPVerification}
              disabled={loading}
            >
              <Text style={styles.otpButtonText}>
                📱 Verify Phone Number (Optional)
              </Text>
            </TouchableOpacity>

            {/* Already have account */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
            >
              <Text style={styles.loginText}>
                Already have an account? <Text style={styles.loginBold}>Login</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Role Information */}
          <View style={styles.roleInfo}>
            <Text style={styles.roleInfoTitle}>About {currentRole.label} Account:</Text>
            {selectedRole === 'passenger' && (
              <Text style={styles.roleInfoText}>
                • Book rides across the city{'\n'}
                • Track your rides in real-time{'\n'}
                • Multiple payment options{'\n'}
                • Ride history and receipts{'\n'}
                • 24/7 customer support
              </Text>
            )}
            {selectedRole === 'driver' && (
              <Text style={styles.roleInfoText}>
                • Accept ride requests{'\n'}
                • Earn money on your schedule{'\n'}
                • Track your earnings{'\n'}
                • Get passenger ratings{'\n'}
                • Flexible working hours
              </Text>
            )}
            {selectedRole === 'transporter' && (
              <Text style={styles.roleInfoText}>
                • Manage fleet of vehicles{'\n'}
                • Monitor driver performance{'\n'}
                • Track business analytics{'\n'}
                • Manage payments{'\n'}
                • Scale your transport business
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  roleEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  roleLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#202124',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#5f6368',
    textAlign: 'center',
    marginBottom: 12,
  },
  firebaseIndicator: {
    backgroundColor: '#FFA000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  firebaseIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#202124',
    backgroundColor: '#FFFFFF',
  },
  inputNote: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 4,
    fontStyle: 'italic',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#1a73e8',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    backgroundColor: '#1a73e8',
    borderRadius: 2,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#5f6368',
    lineHeight: 20,
  },
  termsLink: {
    color: '#1a73e8',
    fontWeight: '600',
  },
  firebaseInfo: {
    backgroundColor: '#E8F0FE',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#1a73e8',
  },
  firebaseInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 8,
  },
  firebaseInfoText: {
    fontSize: 12,
    color: '#1a73e8',
    lineHeight: 18,
  },
  registerButton: {
    backgroundColor: '#1a73e8',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#6c8bc7',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  otpButton: {
    backgroundColor: '#34A853',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  otpButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: '#5f6368',
  },
  loginBold: {
    color: '#1a73e8',
    fontWeight: '600',
  },
  roleInfo: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  roleInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#202124',
    marginBottom: 12,
  },
  roleInfoText: {
    fontSize: 14,
    color: '#5f6368',
    lineHeight: 22,
  },
});
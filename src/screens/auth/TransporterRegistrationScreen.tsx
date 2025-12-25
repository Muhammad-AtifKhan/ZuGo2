// src/screens/auth/TransporterRegistrationScreen.tsx - FIREBASE INTEGRATED
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
  TransporterRegistration: undefined;
  OTPVerification: { phone: string; role: string };
  Login: undefined;
  Home: undefined;
};

type NavigationProp = NativeStackNavigationProp<StackParamList>;

// Route params type
type RouteParams = {
  role?: 'passenger' | 'driver' | 'transporter';
};

export default function TransporterRegistrationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const params = route.params as RouteParams;

  const [formData, setFormData] = useState({
    companyName: '',
    businessEmail: '',
    contactPhone: '',
    businessAddress: '',
    taxNumber: '',
    contactPerson: '',
    password: '',
    confirmPassword: '',
  });

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

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
    if (!formData.companyName.trim()) {
      Alert.alert('Error', 'Please enter company name');
      return;
    }

    if (!formData.contactPerson.trim()) {
      Alert.alert('Error', 'Please enter contact person name');
      return;
    }

    if (!formData.businessEmail.trim()) {
      Alert.alert('Error', 'Please enter business email');
      return;
    }

    if (!isValidEmail(formData.businessEmail)) {
      Alert.alert('Error', 'Please enter a valid business email address');
      return;
    }

    if (!formData.contactPhone.trim()) {
      Alert.alert('Error', 'Please enter contact phone number');
      return;
    }

    const cleanedPhone = formData.contactPhone.replace(/\D/g, '');
    if (!isValidPhone(cleanedPhone)) {
      Alert.alert('Error', 'Please enter a valid phone number (10-15 digits)');
      return;
    }

    if (!formData.businessAddress.trim()) {
      Alert.alert('Error', 'Please enter business address');
      return;
    }

    if (!formData.taxNumber.trim()) {
      Alert.alert('Error', 'Please enter tax/registration number');
      return;
    }

    if (!formData.password) {
      Alert.alert('Error', 'Please enter password');
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
        formData.businessEmail.trim().toLowerCase(),
        formData.password
      );

      const user = userCredential.user;

      // 2. Update user profile with company name
      await user.updateProfile({
        displayName: formData.companyName.trim(),
      });

      // 3. Send email verification
      await user.sendEmailVerification();

      // 4. Store transporter data in Firestore
      const formattedPhone = formatPhoneNumber(formData.contactPhone);

      await firestore()
        .collection('users')
        .doc(user.uid)
        .set({
          uid: user.uid,
          companyName: formData.companyName.trim(),
          contactPerson: formData.contactPerson.trim(),
          email: formData.businessEmail.trim().toLowerCase(),
          phone: formattedPhone,
          phoneLocal: formData.contactPhone.trim(),
          businessAddress: formData.businessAddress.trim(),
          taxNumber: formData.taxNumber.trim().toUpperCase(),
          userType: 'transporter',
          businessType: 'transport',
          emailVerified: false,
          profileComplete: false,
          fleetSize: 0,
          driversCount: 0,
          status: 'pending_verification', // Admin verification needed
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      // 5. Also create a transporter document in separate collection
      await firestore()
        .collection('transporters')
        .doc(user.uid)
        .set({
          uid: user.uid,
          companyName: formData.companyName.trim(),
          contactPerson: formData.contactPerson.trim(),
          email: formData.businessEmail.trim().toLowerCase(),
          phone: formattedPhone,
          businessAddress: formData.businessAddress.trim(),
          taxNumber: formData.taxNumber.trim().toUpperCase(),
          registrationDate: firestore.FieldValue.serverTimestamp(),
          status: 'pending',
          documents: {
            taxCertificate: false,
            businessLicense: false,
            insurance: false,
          },
          rating: 0,
          totalRides: 0,
        });

      // 6. Show success message
      Alert.alert(
        'Registration Submitted! 🎉',
        `Your transport business registration has been submitted!\n\nWe've sent a verification email to ${formData.businessEmail}.\n\nPlease note: Transport business accounts require admin approval. You'll be notified once your account is verified.`,
        [
          {
            text: 'Go to Login',
            onPress: () => {
              // Reset form
              setFormData({
                companyName: '',
                businessEmail: '',
                contactPhone: '',
                businessAddress: '',
                taxNumber: '',
                contactPerson: '',
                password: '',
                confirmPassword: '',
              });
              setTermsAccepted(false);

              // Navigate to login
              navigation.reset({
                index: 0,
                routes: [{
                  name: 'Login',
                  params: { preFilledEmail: formData.businessEmail }
                }],
              });
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('Transporter Registration Error:', error);

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
        default:
          errorMessage = error.message || 'An unknown error occurred.';
      }

      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleEmoji}>🏢</Text>
              <Text style={styles.roleLabel}>Transport Business Registration</Text>
            </View>

            <Text style={styles.title}>Register Your Transport Business</Text>
            <Text style={styles.subtitle}>
              Fill in your business details to get started
            </Text>

            <View style={styles.firebaseIndicator}>
              <Text style={styles.firebaseIndicatorText}>
                🔒 Secure Business Registration
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Company Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Company Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="ABC Transport Company"
                value={formData.companyName}
                onChangeText={value => handleChange('companyName', value)}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>

            {/* Contact Person */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Person Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                value={formData.contactPerson}
                onChangeText={value => handleChange('contactPerson', value)}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>

            {/* Business Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="info@company.com"
                value={formData.businessEmail}
                onChangeText={value => handleChange('businessEmail', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
              <Text style={styles.inputNote}>
                Official business email for verification
              </Text>
            </View>

            {/* Contact Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Phone *</Text>
              <TextInput
                style={styles.input}
                placeholder="03XX XXXXXXX"
                value={formData.contactPhone}
                onChangeText={value => handleChange('contactPhone', value)}
                keyboardType="phone-pad"
                maxLength={15}
                editable={!loading}
              />
              <Text style={styles.inputNote}>
                Primary contact number
              </Text>
            </View>

            {/* Business Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Full business address with city"
                value={formData.businessAddress}
                onChangeText={value => handleChange('businessAddress', value)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!loading}
              />
            </View>

            {/* Tax/Registration Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tax/Registration Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., NTN-XXXXXX or Registration No."
                value={formData.taxNumber}
                onChangeText={value => handleChange('taxNumber', value)}
                autoCapitalize="characters"
                editable={!loading}
              />
              <Text style={styles.inputNote}>
                For business verification purposes
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
                Strong password recommended for business account
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

            {/* Business Registration Info */}
            <View style={styles.registrationInfo}>
              <Text style={styles.registrationInfoTitle}>Business Registration Process:</Text>
              <Text style={styles.registrationInfoText}>
                1. Submit registration form{'\n'}
                2. Verify your email address{'\n'}
                3. Admin review and approval{'\n'}
                4. Account activation notification{'\n'}
                5. Start managing your fleet
              </Text>
            </View>

            {/* Firebase Security Info */}
            <View style={styles.firebaseInfo}>
              <Text style={styles.firebaseInfoTitle}>🔐 Business Account Security</Text>
              <Text style={styles.firebaseInfoText}>
                • Enterprise-grade security{'\n'}
                • Encrypted data storage{'\n'}
                • Email verification required{'\n'}
                • Admin approval process{'\n'}
                • Audit trail maintained
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
                  Submit Business Registration
                </Text>
              )}
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

          {/* Business Benefits */}
          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsTitle}>Benefits for Transport Businesses:</Text>
            <View style={styles.benefitsGrid}>
              <View style={styles.benefitCard}>
                <Text style={styles.benefitEmoji}>🚚</Text>
                <Text style={styles.benefitText}>Fleet Management</Text>
              </View>
              <View style={styles.benefitCard}>
                <Text style={styles.benefitEmoji}>📊</Text>
                <Text style={styles.benefitText}>Analytics Dashboard</Text>
              </View>
              <View style={styles.benefitCard}>
                <Text style={styles.benefitEmoji}>👥</Text>
                <Text style={styles.benefitText}>Driver Management</Text>
              </View>
              <View style={styles.benefitCard}>
                <Text style={styles.benefitEmoji}>💰</Text>
                <Text style={styles.benefitText}>Payment Tracking</Text>
              </View>
            </View>
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
    backgroundColor: '#ea4335',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  roleEmoji: {
    fontSize: 20,
    marginRight: 8,
    color: '#FFFFFF',
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
  textArea: {
    minHeight: 100,
    paddingTop: 12,
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
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ea4335',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    backgroundColor: '#ea4335',
    borderRadius: 2,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#5f6368',
    lineHeight: 20,
  },
  termsLink: {
    color: '#ea4335',
    fontWeight: '600',
  },
  registrationInfo: {
    backgroundColor: '#FCE8E6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ea4335',
  },
  registrationInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ea4335',
    marginBottom: 8,
  },
  registrationInfoText: {
    fontSize: 12,
    color: '#ea4335',
    lineHeight: 18,
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
    backgroundColor: '#ea4335',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#f28b82',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
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
  benefitsContainer: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#202124',
    marginBottom: 16,
    textAlign: 'center',
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  benefitCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  benefitEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 12,
    color: '#5f6368',
    textAlign: 'center',
    fontWeight: '500',
  },
});
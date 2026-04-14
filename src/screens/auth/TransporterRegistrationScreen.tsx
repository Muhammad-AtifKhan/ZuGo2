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

type AuthStackParamList = {
  Login: undefined;
  RoleSelection: undefined;
  PassengerRegistration: { role: 'passenger' };
  TransporterRegistration: { role: 'transporter' };
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;
type RouteParams = { role?: 'transporter' };

export default function TransporterRegistrationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const params = route.params as RouteParams;

  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    businessEmail: '',
    contactPhone: '',
    businessAddress: '',
    taxNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async () => {
    // ========== VALIDATION ==========
    if (!formData.companyName.trim()) {
      return Alert.alert('Error', 'Please enter company name');
    }
    if (!formData.contactPerson.trim()) {
      return Alert.alert('Error', 'Please enter contact person name');
    }
    if (!formData.businessEmail.trim() || !isValidEmail(formData.businessEmail)) {
      return Alert.alert('Error', 'Please enter a valid business email');
    }
    if (!formData.contactPhone.trim()) {
      return Alert.alert('Error', 'Please enter contact phone number');
    }
    if (!formData.businessAddress.trim()) {
      return Alert.alert('Error', 'Please enter business address');
    }
    if (!formData.taxNumber.trim()) {
      return Alert.alert('Error', 'Please enter tax/registration number');
    }
    if (!formData.password || formData.password.length < 6) {
      return Alert.alert('Error', 'Password must be at least 6 characters');
    }
    if (formData.password !== formData.confirmPassword) {
      return Alert.alert('Error', 'Passwords do not match');
    }
    if (!termsAccepted) {
      return Alert.alert('Error', 'Please accept terms and conditions');
    }

    setLoading(true);

    try {
      // ========== 1. CREATE FIREBASE AUTH USER ==========
      const userCredential = await auth().createUserWithEmailAndPassword(
        formData.businessEmail.trim().toLowerCase(),
        formData.password
      );

      const user = userCredential.user;

      // ========== 2. PREPARE DATA ==========
      const normalizedEmail = formData.businessEmail.trim().toLowerCase();
      const cleanedPhone = formData.contactPhone.replace(/\D/g, '');
      const now = firestore.FieldValue.serverTimestamp();

      const commonData = {
        companyName: formData.companyName.trim(),
        contactPerson: formData.contactPerson.trim(),
        email: normalizedEmail,
        phone: cleanedPhone,
        businessAddress: formData.businessAddress.trim(),
        taxNumber: formData.taxNumber.trim().toUpperCase(),
      };

      // ========== 3. BATCH WRITE TO BOTH COLLECTIONS BEFORE EMAIL VERIFICATION ==========
      const batch = firestore().batch();

      // 📁 Save to 'users' collection (for authentication & role checking)
      const userRef = firestore().collection('users').doc(user.uid);
      batch.set(userRef, {
        uid: user.uid,
        ...commonData,
        userType: 'transporter',
        emailVerified: false,
        profileComplete: true,
        status: 'pending_verification',
        createdAt: now,
        updatedAt: now,
      });

      // 📁 Save to 'transporters' collection (for business-specific data)
      const transporterRef = firestore().collection('transporters').doc(user.uid);
      batch.set(transporterRef, {
        uid: user.uid,
        ...commonData,
        driversCount: 0,              // Initial driver count
        totalTrips: 0,                // Total trips completed
        totalRevenue: 0,              // Total revenue generated
        rating: 0,                    // Average rating (0-5)
        totalRatings: 0,              // Number of ratings received
        isVerified: false,            // Admin verification status
        isActive: true,               // Account active status
        createdAt: now,
        updatedAt: now,
      });

      // Commit batch - both succeed or both fail
      await batch.commit();

      // Update profile with company name
      await user.updateProfile({
        displayName: formData.companyName.trim(),
      });

      // Send email verification
      await user.sendEmailVerification();

      // ========== 4. SIGN OUT & SHOW SUCCESS ==========
      await auth().signOut();

      Alert.alert(
        'Registration Successful! 🎉',
        `Business account created for ${formData.businessEmail}\n\n📧 A verification email has been sent.\n\nPlease verify your email before logging in.`,
        [
          {
            text: 'Go to Login',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          }
        ]
      );

      // Reset form
      setFormData({
        companyName: '',
        contactPerson: '',
        businessEmail: '',
        contactPhone: '',
        businessAddress: '',
        taxNumber: '',
        password: '',
        confirmPassword: '',
      });
      setTermsAccepted(false);

    } catch (error: any) {
      console.error('Transporter Registration Error:', error);

      let message = 'Registration failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already registered. Please login instead.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password is too weak. Use at least 6 characters.';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'Network error. Check your internet connection.';
      }

      Alert.alert('Registration Failed', message);
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

            <Text style={styles.title}>Register Your Business</Text>
            <Text style={styles.subtitle}>
              Fill in your business details to get started
            </Text>

            <View style={styles.verifyBadge}>
              <Text style={styles.verifyBadgeText}>
                📧 Email verification required
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Person *</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                value={formData.contactPerson}
                onChangeText={value => handleChange('contactPerson', value)}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>

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
                We'll send verification link to this email
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Phone *</Text>
              <TextInput
                style={styles.input}
                placeholder="03XX XXXXXXX"
                value={formData.contactPhone}
                onChangeText={value => handleChange('contactPhone', value)}
                keyboardType="phone-pad"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Full business address"
                value={formData.businessAddress}
                onChangeText={value => handleChange('businessAddress', value)}
                multiline
                numberOfLines={2}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tax/Registration Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="NTN-XXXXXX"
                value={formData.taxNumber}
                onChangeText={value => handleChange('taxNumber', value)}
                autoCapitalize="characters"
                editable={!loading}
              />
            </View>

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
            </View>

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

            {/* Terms */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setTermsAccepted(!termsAccepted)}
              activeOpacity={0.7}
              disabled={loading}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxActive]}>
                {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.termsText}>
                I agree to the <Text style={styles.termsLink}>Terms & Conditions</Text>
              </Text>
            </TouchableOpacity>

            {/* Email Verification Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>📧 After Registration:</Text>
              <Text style={styles.infoText}>
                1. You'll receive a verification email{'\n'}
                2. Click the link in the email{'\n'}
                3. Return to login page{'\n'}
                4. Sign in with your credentials
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
                  Register Business
                </Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
            >
              <Text style={styles.loginText}>
                Already have an account? <Text style={styles.loginBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
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
  verifyBadge: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  verifyBadgeText: {
    color: '#1a73e8',
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputNote: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 4,
    fontStyle: 'italic',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#ea4335',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#ea4335',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#5f6368',
  },
  termsLink: {
    color: '#ea4335',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#E8F0FE',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#1a73e8',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1a73e8',
    lineHeight: 20,
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
});
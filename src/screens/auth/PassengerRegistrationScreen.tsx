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
type RouteParams = { role?: 'passenger' };

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

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      return Alert.alert('Error', 'Please enter your full name');
    }
    if (!formData.email.trim() || !isValidEmail(formData.email)) {
      return Alert.alert('Error', 'Please enter a valid email address');
    }
    if (!formData.phone.trim()) {
      return Alert.alert('Error', 'Please enter your phone number');
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
      // Create user in Firebase Authentication
      const userCredential = await auth().createUserWithEmailAndPassword(
        formData.email.trim().toLowerCase(),
        formData.password
      );

      const user = userCredential.user;

      // Update profile with name
      await user.updateProfile({
        displayName: formData.name.trim(),
      });

      // Send email verification
      await user.sendEmailVerification();

      // Store user data in Firestore
      await firestore()
        .collection('users')
        .doc(user.uid)
        .set({
          uid: user.uid,
          fullName: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          userType: 'passenger',
          emailVerified: false,
          profileComplete: true,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
          status: 'pending_verification',
        });

      // Sign out immediately so user must verify email before login
      await auth().signOut();

      // Show success message
      Alert.alert(
        'Registration Successful! 🎉',
        `Account created for ${formData.email}\n\n📧 A verification email has been sent to your email address.\n\nPlease verify your email before logging in.`,
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
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
      });
      setTermsAccepted(false);

    } catch (error: any) {
      console.error('Registration Error:', error);

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
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleEmoji}>🧑‍💼</Text>
              <Text style={styles.roleLabel}>Passenger Registration</Text>
            </View>

            <Text style={styles.title}>Create Your Account</Text>
            <Text style={styles.subtitle}>
              Fill in your details to get started as a passenger
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
                We'll send verification link to this email
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="03XX XXXXXXX"
                value={formData.phone}
                onChangeText={value => handleChange('phone', value)}
                keyboardType="phone-pad"
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
                  Create Passenger Account
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
    backgroundColor: '#fff',
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
    backgroundColor: '#4285f4',
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
    borderColor: '#4285f4',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4285f4',
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
    color: '#4285f4',
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
    backgroundColor: '#4285f4',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#6c8bc7',
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
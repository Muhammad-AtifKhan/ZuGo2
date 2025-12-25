// src/screens/auth/ForgotPasswordScreen.tsx - FIREBASE INTEGRATED
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';

type OnboardingStackParamList = {
  ForgotPassword: undefined;
  OTPVerification: { phone: string; role: string };
  Login: undefined;
  PasswordReset: { email: string };
};

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Validate email format
  const isValidEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Validate phone number (for future phone auth)
  const isValidPhone = (phone: string) => {
    const re = /^[0-9]{10,15}$/;
    return re.test(phone.replace(/\D/g, ''));
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    // Check if input is email or phone
    const cleanedInput = email.trim();
    const isEmail = isValidEmail(cleanedInput);
    const isPhone = isValidPhone(cleanedInput.replace(/\D/g, ''));

    if (!isEmail && !isPhone) {
      Alert.alert('Error', 'Please enter a valid email address or phone number');
      return;
    }

    setLoading(true);

    try {
      if (isEmail) {
        // Firebase email password reset
        await auth().sendPasswordResetEmail(cleanedInput);

        setEmailSent(true);

        Alert.alert(
          'Reset Link Sent! ✅',
          `Password reset instructions have been sent to:\n\n${cleanedInput}\n\nPlease check your inbox (and spam folder) for the reset link.`,
          [
            {
              text: 'Go to Login',
              onPress: () => {
                setEmail('');
                setEmailSent(false);
                navigation.navigate('Login', {
                  message: 'Password reset email sent. Check your inbox.'
                });
              }
            },
            {
              text: 'Try Another Email',
              onPress: () => {
                setEmail('');
                setEmailSent(false);
              }
            }
          ]
        );
      } else if (isPhone) {
        // Phone OTP verification (will be implemented in Phase 2)
        Alert.alert(
          'Phone Verification Coming Soon',
          'Phone number password reset will be available in the next update.\n\nFor now, please use email to reset your password.',
          [
            {
              text: 'Use Email Instead',
              onPress: () => setEmail('')
            },
            {
              text: 'Go to Login',
              style: 'cancel',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );

        // For future implementation:
        // navigation.navigate('OTPVerification', {
        //   phone: cleanedInput.replace(/\D/g, ''),
        //   role: 'password_reset',
        // });
      }
    } catch (error: any) {
      console.error('Password Reset Error:', error);

      let errorMessage = 'Failed to send reset instructions. Please try again.';

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email. Please check the email address.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'The email address is not valid.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        default:
          errorMessage = error.message || 'An unknown error occurred.';
      }

      Alert.alert('Reset Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.firebaseBadge}>
              <Text style={styles.firebaseBadgeText}>🔐 Firebase Password Reset</Text>
            </View>

            <Text style={styles.title}>Reset Your Password</Text>
            <Text style={styles.subtitle}>
              Enter your registered email to receive password reset instructions
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your registered email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading && !emailSent}
              />
              <Text style={styles.inputNote}>
                We'll send a reset link to this email
              </Text>
            </View>

            {/* Success Message */}
            {emailSent && (
              <View style={styles.successContainer}>
                <Text style={styles.successEmoji}>✅</Text>
                <Text style={styles.successText}>
                  Reset email sent successfully!
                </Text>
                <Text style={styles.successSubtext}>
                  Check your inbox and follow the instructions
                </Text>
              </View>
            )}

            {/* Firebase Information */}
            <View style={styles.firebaseInfo}>
              <Text style={styles.firebaseInfoTitle}>About Password Reset:</Text>
              <Text style={styles.firebaseInfoText}>
                • Secure Firebase authentication{'\n'}
                • Reset link expires in 1 hour{'\n'}
                • Check spam folder if not received{'\n'}
                • One-time use link for security
              </Text>
            </View>

            {/* Reset Button */}
            <TouchableOpacity
              style={[styles.resetButton, (loading || emailSent) && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading || emailSent}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : emailSent ? (
                <Text style={styles.resetButtonText}>Email Sent ✓</Text>
              ) : (
                <Text style={styles.resetButtonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            {/* Phone Reset Option (Future) */}
            <TouchableOpacity
              style={styles.phoneOption}
              onPress={() => {
                Alert.alert(
                  'Phone Reset',
                  'Phone number password reset is coming soon in Phase 2.\n\nPlease use email reset for now.',
                  [{ text: 'OK' }]
                );
              }}
            >
              <Text style={styles.phoneOptionText}>
                📱 Reset via phone number (Coming Soon)
              </Text>
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToLogin}
              disabled={loading}
            >
              <Text style={styles.backButtonText}>← Back to Login</Text>
            </TouchableOpacity>
          </View>

          {/* Security Information */}
          <View style={styles.securityInfo}>
            <Text style={styles.securityTitle}>🔒 Security Note</Text>
            <Text style={styles.securityText}>
              For security reasons, we only send reset links to registered emails.
              The link expires in 1 hour and can only be used once.
            </Text>
          </View>
        </View>
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 48,
    alignItems: 'center',
  },
  firebaseBadge: {
    backgroundColor: '#FFA000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  firebaseBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#202124',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#5f6368',
    lineHeight: 24,
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 24,
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
  successContainer: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  successEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'center',
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
  resetButton: {
    backgroundColor: '#1a73e8',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#6c8bc7',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  phoneOption: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DADCE0',
  },
  phoneOptionText: {
    color: '#5f6368',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#5f6368',
    fontWeight: '600',
  },
  securityInfo: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB300',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#5D4037',
    lineHeight: 18,
  },
});
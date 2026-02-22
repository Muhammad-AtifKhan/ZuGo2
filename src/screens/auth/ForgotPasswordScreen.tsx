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
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';

type AuthStackParamList = {
  ForgotPassword: undefined;
  OTPVerification: { phone: string; role: string };
  Login: undefined;
  PasswordReset: { email: string };
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhone = (phone: string) => /^[0-9]{10,15}$/.test(phone.replace(/\D/g, ''));

  const handleResetPassword = async () => {
    const input = email.trim();
    if (!input) return Alert.alert('Error', 'Please enter your email address');

    const emailValid = isValidEmail(input);
    const phoneValid = isValidPhone(input);

    if (!emailValid && !phoneValid) {
      return Alert.alert('Error', 'Please enter a valid email address or phone number');
    }

    setLoading(true);

    try {
      if (emailValid) {
        await auth().sendPasswordResetEmail(input);
        setEmailSent(true);

        Alert.alert(
          'Reset Link Sent! ✅',
          `Password reset instructions have been sent to:\n\n${input}\n\nPlease check your inbox (and spam folder) for the reset link.`,
          [
            {
              text: 'Go to Login',
              onPress: () => {
                setEmail('');
                setEmailSent(false);
                navigation.navigate('Login', { message: 'Password reset email sent. Check your inbox.' });
              },
            },
            {
              text: 'Try Another Email',
              onPress: () => setEmail(''),
            },
          ]
        );
      } else {
        Alert.alert(
          'Phone Verification Coming Soon',
          'Phone number password reset will be available in the next update.\n\nPlease use email to reset your password.',
          [
            { text: 'Use Email Instead', onPress: () => setEmail('') },
            { text: 'Go to Login', style: 'cancel', onPress: () => navigation.navigate('Login') },
          ]
        );
      }
    } catch (error: any) {
      let errorMessage = 'Failed to send reset instructions. Please try again.';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'The email address is not valid.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection.';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      Alert.alert('Reset Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
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
            <Text style={styles.inputNote}>We'll send a reset link to this email</Text>

            {emailSent && (
              <View style={styles.successContainer}>
                <Text style={styles.successEmoji}>✅</Text>
                <Text style={styles.successText}>Reset email sent successfully!</Text>
                <Text style={styles.successSubtext}>Check your inbox and follow the instructions</Text>
              </View>
            )}

            {/* Firebase Info */}
            <View style={styles.firebaseInfo}>
              <Text style={styles.firebaseInfoTitle}>About Password Reset:</Text>
              <Text style={styles.firebaseInfoText}>
                • Secure Firebase authentication{'\n'}
                • Reset link expires in 1 hour{'\n'}
                • Check spam folder if not received{'\n'}
                • One-time use link for security
              </Text>
            </View>

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

            <TouchableOpacity
              style={styles.phoneOption}
              onPress={() =>
                Alert.alert(
                  'Phone Reset',
                  'Phone number password reset is coming soon in Phase 2.\n\nPlease use email reset for now.',
                  [{ text: 'OK' }]
                )
              }
            >
              <Text style={styles.phoneOptionText}>📱 Reset via phone number (Coming Soon)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
            >
              <Text style={styles.backButtonText}>← Back to Login</Text>
            </TouchableOpacity>
          </View>

          {/* Security Info */}
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  keyboardAvoid: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  header: { marginBottom: 40, alignItems: 'center' },
  firebaseBadge: { backgroundColor: '#FFA000', padding: 10, borderRadius: 20, marginBottom: 16 },
  firebaseBadgeText: { color: '#fff', fontWeight: '600' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#202124', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#5f6368', textAlign: 'center', lineHeight: 20 },
  form: { marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: '#202124', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#DADCE0', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fff', color: '#202124' },
  inputNote: { fontSize: 12, color: '#5f6368', marginTop: 4, fontStyle: 'italic' },
  successContainer: { backgroundColor: '#E8F5E9', padding: 16, borderRadius: 12, alignItems: 'center', marginVertical: 16, borderWidth: 1, borderColor: '#C8E6C9' },
  successEmoji: { fontSize: 28, marginBottom: 8 },
  successText: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32', marginBottom: 4 },
  successSubtext: { fontSize: 14, color: '#2E7D32' },
  firebaseInfo: { backgroundColor: '#E8F0FE', padding: 16, borderRadius: 8, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#1a73e8' },
  firebaseInfoTitle: { fontWeight: 'bold', color: '#1a73e8', marginBottom: 6, fontSize: 14 },
  firebaseInfoText: { color: '#1a73e8', fontSize: 12, lineHeight: 18 },
  resetButton: { backgroundColor: '#1a73e8', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  buttonDisabled: { backgroundColor: '#6c8bc7' },
  resetButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  phoneOption: { backgroundColor: '#F8F9FA', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#DADCE0' },
  phoneOptionText: { color: '#5f6368', fontSize: 14, fontWeight: '600' },
  backButton: { alignItems: 'center' },
  backButtonText: { fontSize: 14, fontWeight: '600', color: '#5f6368' },
  securityInfo: { backgroundColor: '#FFF3E0', padding: 16, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#FFB300' },
  securityTitle: { fontSize: 14, fontWeight: 'bold', color: '#E65100', marginBottom: 8 },
  securityText: { fontSize: 12, color: '#5D4037', lineHeight: 18 },
});
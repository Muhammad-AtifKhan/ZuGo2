// src/screens/auth/ForgotPasswordScreen.tsx - COMPLETE
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type OnboardingStackParamList = {
  ForgotPassword: undefined;
  OTPVerification: { phone: string; role: string };
  Login: undefined;
};

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = () => {
    if (!emailOrPhone.trim()) {
      Alert.alert('Error', 'Please enter email or phone number');
      return;
    }

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);

      // Check if input is phone number
      const isPhone = /^\d+$/.test(emailOrPhone.replace(/\D/g, ''));

      if (isPhone && emailOrPhone.replace(/\D/g, '').length >= 10) {
        // Navigate to OTP verification for phone
        navigation.navigate('OTPVerification', {
          phone: emailOrPhone,
          role: 'password_reset',
        });
      } else {
        // For email, show success message
        Alert.alert(
          'Reset Link Sent',
          `Password reset instructions have been sent to ${emailOrPhone}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      }
    }, 1500);
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
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>
              Enter your email or phone number to reset your password
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email or Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter registered email or phone"
                value={emailOrPhone}
                onChangeText={setEmailOrPhone}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Note */}
            <View style={styles.noteContainer}>
              <Text style={styles.noteText}>
                • For phone number: You will receive an OTP{'\n'}
                • For email: You will receive a reset link
              </Text>
            </View>

            {/* Reset Button */}
            <TouchableOpacity
              style={[styles.resetButton, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              <Text style={styles.resetButtonText}>
                {loading ? 'Sending...' : 'Send Reset Instructions'}
              </Text>
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
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
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#202124',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#5f6368',
    lineHeight: 24,
  },
  form: {
    marginBottom: 20,
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
  },
  noteContainer: {
    backgroundColor: '#E8F0FE',
    padding: 16,
    borderRadius: 8,
    marginBottom: 32,
  },
  noteText: {
    fontSize: 14,
    color: '#1a73e8',
    lineHeight: 22,
  },
  resetButton: {
    backgroundColor: '#1a73e8',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#6c8bc7',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#5f6368',
  },
});
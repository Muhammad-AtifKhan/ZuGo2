// src/screens/auth/OTPVerificationScreen.tsx - COMPLETE UPDATED
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Define navigation types
type RootStackParamList = {
  Passenger: undefined;
  Transporter: undefined;
  Driver: undefined;
  Login: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface OTPVerificationScreenProps {
  setUserRole?: (role: 'passenger' | 'driver' | 'transporter' | null) => void;
  route?: {
    params?: {
      phone?: string;
      role?: string;
    };
  };
}

export default function OTPVerificationScreen({
  setUserRole,
  route: propRoute
}: OTPVerificationScreenProps) {
  const navigation = useNavigation<NavigationProp>();
  const reactNavigationRoute = useRoute();

  // Combine props route and React Navigation route
  const routeParams = propRoute?.params || (reactNavigationRoute.params as any) || {};

  const phone = routeParams.phone || '03001234567';
  const role = routeParams.role || 'passenger';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    console.log('OTP Screen - Phone:', phone);
    console.log('OTP Screen - Role:', role);
    console.log('OTP Screen - setUserRole available:', !!setUserRole);
  }, [phone, role]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Paste handling
      const pastedOtp = value.split('');
      const newOtp = [...otp];
      pastedOtp.forEach((char, i) => {
        if (index + i < 6) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);

      // Focus next empty input
      const nextEmptyIndex = newOtp.findIndex((digit, i) => i >= index && digit === '');
      if (nextEmptyIndex !== -1 && inputsRef.current[nextEmptyIndex]) {
        inputsRef.current[nextEmptyIndex]?.focus();
      }
    } else {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto focus next input
      if (value && index < 5 && inputsRef.current[index + 1]) {
        inputsRef.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = () => {
    setTimer(60);
    Alert.alert('OTP Sent', `New OTP sent to ${phone}`);
  };

  const handleVerify = () => {
    const otpString = otp.join('');

    if (otpString.length !== 6) {
      Alert.alert('Error', 'Please enter 6-digit OTP');
      return;
    }

    setLoading(true);

    // Simulate verification
    setTimeout(() => {
      setLoading(false);

      if (role === 'password_reset') {
        // For password reset
        Alert.alert(
          'Password Reset',
          'Your password has been reset successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Go back to login
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              },
            },
          ]
        );
      } else {
        // For registration
        const roleName = role.charAt(0).toUpperCase() + role.slice(1);

        Alert.alert(
          'Success',
          `Account ${role === 'passenger' ? 'created' : 'registered'} successfully!\nWelcome ${roleName}!`,
          [
            {
              text: 'Continue',
              onPress: () => {
                // Set user role if function available
                if (setUserRole) {
                  setUserRole(role as 'passenger' | 'transporter');
                  console.log(`setUserRole called with: ${role}`);
                }

                // Determine route based on role
                let routeName: 'Passenger' | 'Transporter' = 'Passenger';
                if (role === 'transporter') {
                  routeName = 'Transporter';
                }

                console.log(`Navigating to: ${routeName}`);

                // Direct navigation to dashboard
                navigation.reset({
                  index: 0,
                  routes: [{ name: routeName }],
                });
              },
            },
          ]
        );
      }
    }, 1500);
  };

  const handleEditPhone = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Verify Phone Number</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={styles.phoneText}>{phone}</Text>
          </Text>
          <Text style={styles.roleText}>
            Registering as: <Text style={styles.roleHighlight}>{role}</Text>
          </Text>
        </View>

        {/* OTP Inputs */}
        <View style={styles.otpContainer}>
          {[0, 1, 2, 3, 4, 5].map(index => (
            <TextInput
              key={index}
              ref={(ref: TextInput | null) => {
                inputsRef.current[index] = ref;
              }}
              style={styles.otpInput}
              value={otp[index]}
              onChangeText={value => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              autoFocus={index === 0}
            />
          ))}
        </View>

        {/* Timer */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>
            {timer > 0 ? `Resend OTP in ${timer}s` : 'Didn\'t receive code?'}
          </Text>
          {timer === 0 && (
            <TouchableOpacity onPress={handleResendOtp}>
              <Text style={styles.resendText}>Resend OTP</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Note */}
        <View style={styles.noteContainer}>
          <Text style={styles.noteText}>
            <Text style={styles.noteBold}>Note:</Text> The OTP will expire in 5 minutes
          </Text>
          <Text style={styles.noteText}>
            For demo, enter any 6 digits
          </Text>
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.verifyButton, loading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading}
        >
          <Text style={styles.verifyButtonText}>
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </Text>
        </TouchableOpacity>

        {/* Edit Phone */}
        <TouchableOpacity
          style={styles.editPhoneButton}
          onPress={handleEditPhone}
        >
          <Text style={styles.editPhoneText}>Edit phone number</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#202124',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#5f6368',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  phoneText: {
    fontWeight: '600',
    color: '#1a73e8',
  },
  roleText: {
    fontSize: 14,
    color: '#5f6368',
    marginTop: 8,
  },
  roleHighlight: {
    fontWeight: 'bold',
    color: '#ea4335',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  otpInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: '#DADCE0',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    color: '#202124',
  },
  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 14,
    color: '#5f6368',
    marginRight: 8,
  },
  resendText: {
    fontSize: 14,
    color: '#1a73e8',
    fontWeight: '600',
  },
  noteContainer: {
    backgroundColor: '#F3E5F5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 32,
    alignItems: 'center',
  },
  noteText: {
    fontSize: 14,
    color: '#7B1FA2',
    marginBottom: 4,
    textAlign: 'center',
  },
  noteBold: {
    fontWeight: 'bold',
  },
  verifyButton: {
    backgroundColor: '#1a73e8',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#6c8bc7',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  editPhoneButton: {
    alignItems: 'center',
  },
  editPhoneText: {
    fontSize: 16,
    color: '#5f6368',
  },
});
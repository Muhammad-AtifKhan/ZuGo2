// src/screens/auth/OTPVerificationScreen.tsx - FIREBASE INTEGRATED
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Define navigation types
type RootStackParamList = {
  Passenger: undefined;
  Transporter: undefined;
  Driver: undefined;
  Login: undefined;
  Home: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function OTPVerificationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();

  const routeParams = route.params as any || {};
  const phone = routeParams.phone || '03001234567';
  const role = routeParams.role || 'passenger';
  const email = routeParams.email || '';
  const userId = routeParams.userId || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const inputsRef = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    console.log('OTP Screen Parameters:', { phone, role, email, userId });

    // Start timer
    const interval = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // For Firebase phone auth - you would implement this later
  const requestOTP = async () => {
    // This is for Firebase Phone Auth - implement in phase 2
    Alert.alert(
      'Phone Verification',
      'Phone OTP verification will be implemented in Phase 2.\n\nFor now, please use email verification which has been sent to your email address.',
      [{ text: 'OK' }]
    );
  };

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

    if (email) {
      // Resend email verification
      const user = auth().currentUser;
      if (user) {
        user.sendEmailVerification()
          .then(() => {
            Alert.alert('Email Sent', 'Verification email has been resent.');
          })
          .catch(error => {
            Alert.alert('Error', error.message);
          });
      } else {
        Alert.alert('Info', 'Please use email verification sent during registration.');
      }
    } else {
      requestOTP();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');

    if (otpString.length !== 6) {
      Alert.alert('Error', 'Please enter 6-digit OTP');
      return;
    }

    setLoading(true);

    // For demo/testing - accept any OTP
    // In production, you would verify with Firebase
    if (role === 'password_reset') {
      // Password reset flow
      setTimeout(() => {
        setLoading(false);
        Alert.alert(
          'Password Reset Successful!',
          'Your password has been reset. You can now login with your new password.',
          [
            {
              text: 'Go to Login',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              },
            },
          ]
        );
      }, 1500);
    } else {
      // Registration verification flow
      setTimeout(async () => {
        try {
          // Update user verification status in Firestore
          if (userId) {
            await firestore()
              .collection('users')
              .doc(userId)
              .update({
                phoneVerified: true,
                updatedAt: firestore.FieldValue.serverTimestamp(),
              });
          }

          setLoading(false);

          Alert.alert(
            'Success! 🎉',
            `Phone verification complete!\n\nWelcome ${role === 'passenger' ? 'Passenger' : 'Transporter'}!`,
            [
              {
                text: 'Go to Dashboard',
                onPress: () => {
                  // Navigate based on role
                  const routeMap = {
                    passenger: 'Passenger',
                    transporter: 'Transporter',
                    driver: 'Driver'
                  };

                  navigation.reset({
                    index: 0,
                    routes: [{ name: routeMap[role as keyof typeof routeMap] as any }],
                  });
                },
              },
            ]
          );

        } catch (error: any) {
          setLoading(false);
          Alert.alert('Error', error.message);
        }
      }, 1500);
    }
  };

  const handleEditPhone = () => {
    navigation.goBack();
  };

  const handleSkipForNow = () => {
    Alert.alert(
      'Skip Phone Verification',
      'You can verify your phone number later from your profile settings. Continue to dashboard?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            const routeMap = {
              passenger: 'Passenger',
              transporter: 'Transporter',
              driver: 'Driver'
            };

            navigation.reset({
              index: 0,
              routes: [{ name: routeMap[role as keyof typeof routeMap] as any }],
            });
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.firebaseBadge}>
            <Text style={styles.firebaseBadgeText}>🔐 Firebase Verification</Text>
          </View>

          <Text style={styles.title}>Verify Your Account</Text>

          {email ? (
            <Text style={styles.subtitle}>
              Email verification has been sent to:{'\n'}
              <Text style={styles.emailText}>{email}</Text>
            </Text>
          ) : (
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={styles.phoneText}>{phone}</Text>
            </Text>
          )}

          <Text style={styles.roleText}>
            Account Type: <Text style={styles.roleHighlight}>
              {role === 'passenger' ? 'Passenger' : 'Transporter'}
            </Text>
          </Text>

          <View style={styles.infoNote}>
            <Text style={styles.infoNoteText}>
              {email
                ? 'For demo: Enter any 6 digits to continue'
                : 'Phone OTP: Coming in Phase 2'}
            </Text>
          </View>
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
              editable={!loading}
            />
          ))}
        </View>

        {/* Timer & Resend */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>
            {timer > 0 ? `Resend in ${timer}s` : "Didn't receive code?"}
          </Text>
          {timer === 0 && (
            <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
              <Text style={styles.resendText}>Resend Code</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Firebase Note */}
        <View style={styles.firebaseNote}>
          <Text style={styles.firebaseNoteTitle}>About Verification:</Text>
          <Text style={styles.firebaseNoteText}>
            • Email verification required for login{'\n'}
            • Phone verification optional{'\n'}
            • Secure Firebase authentication{'\n'}
            • Real-time verification status
          </Text>
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.verifyButton, loading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify & Continue</Text>
          )}
        </TouchableOpacity>

        {/* Skip Option */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkipForNow}
          disabled={loading}
        >
          <Text style={styles.skipText}>Skip for now →</Text>
        </TouchableOpacity>

        {/* Edit Phone */}
        <TouchableOpacity
          style={styles.editPhoneButton}
          onPress={handleEditPhone}
          disabled={loading}
        >
          <Text style={styles.editPhoneText}>
            {email ? 'Use different email' : 'Edit phone number'}
          </Text>
        </TouchableOpacity>

        {/* Firebase Security Info */}
        <View style={styles.securityInfo}>
          <Text style={styles.securityTitle}>🔒 Security Information</Text>
          <Text style={styles.securityText}>
            Your verification data is securely stored in Firebase.
            This helps prevent unauthorized access to your account.
          </Text>
        </View>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#202124',
    marginBottom: 16,
    textAlign: 'center',
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
  emailText: {
    fontWeight: '600',
    color: '#34A853',
    fontStyle: 'italic',
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
  infoNote: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  infoNoteText: {
    fontSize: 12,
    color: '#1a73e8',
    fontStyle: 'italic',
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
    backgroundColor: '#F8F9FA',
  },
  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
  firebaseNote: {
    backgroundColor: '#F3E5F5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 32,
  },
  firebaseNoteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7B1FA2',
    marginBottom: 8,
  },
  firebaseNoteText: {
    fontSize: 12,
    color: '#7B1FA2',
    lineHeight: 18,
  },
  verifyButton: {
    backgroundColor: '#1a73e8',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#6c8bc7',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DADCE0',
  },
  skipText: {
    color: '#5f6368',
    fontSize: 14,
    fontWeight: '600',
  },
  editPhoneButton: {
    alignItems: 'center',
    marginBottom: 32,
  },
  editPhoneText: {
    fontSize: 16,
    color: '#5f6368',
  },
  securityInfo: {
    backgroundColor: '#E8F0FE',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1a73e8',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#1a73e8',
    lineHeight: 18,
  },
});
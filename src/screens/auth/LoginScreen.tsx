// src/screens/auth/LoginScreen.tsx - FIREBASE INTEGRATED
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
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Define navigation types
type RootStackParamList = {
  Passenger: undefined;
  Driver: undefined;
  RoleSelection: undefined;
  Transporter: undefined;
  Onboarding: undefined;
  Auth: undefined;
  ForgotPassword: undefined;
  Home: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface LoginScreenProps {
  setUserRole?: (role: 'passenger' | 'driver' | 'transporter' | null) => void;
}

export default function LoginScreen({ setUserRole }: LoginScreenProps) {
  const navigation = useNavigation<NavigationProp>();
  const [credentials, setCredentials] = useState({
    emailOrPhone: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Helper function to check if input is email or phone
  const isEmail = (input: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
  };

  // Handle Firebase login
  const handleLogin = async () => {
    if (!credentials.emailOrPhone.trim()) {
      Alert.alert('Error', 'Please enter email or phone number');
      return;
    }

    if (!credentials.password) {
      Alert.alert('Error', 'Please enter password');
      return;
    }

    setLoading(true);

    try {
      let email = credentials.emailOrPhone.trim();

      // If user entered phone number, convert to email
      // Note: Firebase requires email for email/password auth
      // For phone authentication, you'd need separate flow
      const phoneRegex = /^[0-9]{10,15}$/;
      if (phoneRegex.test(email.replace(/\D/g, ''))) {
        // This is a phone number
        // For now, we'll treat it as email for demo
        // In production, you need separate phone auth
        Alert.alert('Info', 'Phone login will be implemented separately');
        setLoading(false);
        return;
      }

      // If not email format
      if (!isEmail(email)) {
        Alert.alert('Error', 'Please enter a valid email address');
        setLoading(false);
        return;
      }

      // Firebase login
      const userCredential = await auth().signInWithEmailAndPassword(
        email,
        credentials.password
      );

      const user = userCredential.user;

      // Check if email is verified
      if (!user.emailVerified) {
        Alert.alert(
          'Email Not Verified',
          'Please verify your email before logging in.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Resend Verification',
              onPress: async () => {
                try {
                  await user.sendEmailVerification();
                  Alert.alert('Success', 'Verification email sent!');
                } catch (error: any) {
                  Alert.alert('Error', error.message);
                }
              }
            },
            {
              text: 'Continue Anyway',
              onPress: () => navigateBasedOnUserType(user.uid)
            }
          ]
        );
        setLoading(false);
        return;
      }

      // Navigate based on user type
      await navigateBasedOnUserType(user.uid);

    } catch (error: any) {
      console.error('Login error:', error);

      let errorMessage = 'Login failed. Please try again.';

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email. Please register.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        default:
          errorMessage = error.message || 'An unknown error occurred.';
      }

      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Navigate based on user type from Firestore
  const navigateBasedOnUserType = async (userId: string) => {
    try {
      // Get user data from Firestore
      const userDoc = await firestore()
        .collection('users')
        .doc(userId)
        .get();

      let userType: 'passenger' | 'driver' | 'transporter' = 'passenger';

      if (userDoc.exists) {
        const userData = userDoc.data();
        userType = userData?.userType || 'passenger';

        // Set user role in parent component if available
        if (setUserRole) {
          setUserRole(userType);
        }

        // Navigate to respective dashboard
        const routeMap = {
          passenger: 'Passenger',
          driver: 'Driver',
          transporter: 'Transporter'
        };

        navigation.reset({
          index: 0,
          routes: [{ name: routeMap[userType] as any }],
        });

        Alert.alert(
          'Login Successful',
          `Welcome ${userData?.fullName || ''}!`,
          [{ text: 'Continue' }]
        );
      } else {
        // User not in Firestore, use default
        if (setUserRole) setUserRole('passenger');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Passenger' }],
        });
        Alert.alert('Success', 'Login successful!');
      }

    } catch (error) {
      console.log('Error fetching user data:', error);
      // Default navigation
      if (setUserRole) setUserRole('passenger');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Passenger' }],
      });
      Alert.alert('Success', 'Login successful!');
    }
  };

  // Handle demo login with Firebase test accounts
  // LoginScreen.tsx - ERROR FIX (line 337 ke aas-pass)
  const handleDemoLogin = async (role: 'passenger' | 'driver' | 'transporter') => {
    const roleName = role.charAt(0).toUpperCase() + role.slice(1);

    Alert.alert(
      `Demo Login as ${roleName}`,
      `This will sign you in with a test ${role.toLowerCase()} account.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          onPress: async () => {
            setLoading(true);

            // Test credentials for demo
            const demoCredentials = {
              passenger: { email: 'demo.passenger@test.com', password: 'Passenger123!' },
              driver: { email: 'demo.driver@test.com', password: 'Driver123!' },
              transporter: { email: 'demo.transporter@test.com', password: 'Transporter123!' }
            };

            try {
              // Try to login with demo credentials
              const userCredential = await auth().signInWithEmailAndPassword(
                demoCredentials[role].email,
                demoCredentials[role].password
              );

              // Set user role
              if (setUserRole) {
                setUserRole(role);
              }

              // Navigate to respective dashboard
              const routeMap = {
                passenger: 'Passenger',
                driver: 'Driver',
                transporter: 'Transporter'
              };

              navigation.reset({
                index: 0,
                routes: [{ name: routeMap[role] as any }],
              });

              Alert.alert(
                'Demo Login Successful',
                `Logged in as ${roleName}`
              );

            } catch (error: any) { // ← YEH LINE FIX KAREN
              console.log('Demo login error:', error);

              // If demo accounts don't exist, create them
              if (error.code === 'auth/user-not-found') {
                Alert.alert(
                  'Demo Accounts Not Found',
                  'Creating demo accounts first...',
                  [
                    {
                      text: 'Create & Login',
                      onPress: async () => {
                        try {
                          // Create demo account
                          const userCredential = await auth().createUserWithEmailAndPassword(
                            demoCredentials[role].email,
                            demoCredentials[role].password
                          );

                          // Save user data to Firestore
                          await firestore()
                            .collection('users')
                            .doc(userCredential.user.uid)
                            .set({
                              uid: userCredential.user.uid,
                              email: demoCredentials[role].email,
                              fullName: `Demo ${roleName}`,
                              userType: role,
                              isDemo: true,
                              createdAt: firestore.FieldValue.serverTimestamp(),
                            });

                          // Set user role and navigate
                          if (setUserRole) setUserRole(role);
                          navigation.reset({
                            index: 0,
                            routes: [{ name: roleName as any }],
                          });

                          Alert.alert(
                            'Demo Account Created',
                            `Logged in as Demo ${roleName}`
                          );

                        } catch (createError: any) { // ← YEH BHI FIX KAREN
                          console.log('Create account error:', createError);
                          Alert.alert('Error', createError.message || 'Failed to create account');
                        } finally {
                          setLoading(false);
                        }
                      }
                    },
                    {
                      text: 'Cancel',
                      style: 'cancel',
                      onPress: () => setLoading(false)
                    }
                  ]
                );
              } else {
                console.log('Other error:', error);
                Alert.alert('Error', error.message || 'Login failed');
                setLoading(false);
              }
            } finally {
              if (!error || (error && error.code !== 'auth/user-not-found')) {
                setLoading(false);
              }
            }
          },
        },
      ]
    );
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    if (!credentials.emailOrPhone.trim()) {
      Alert.alert('Email Required', 'Please enter your email first to reset password');
      return;
    }

    const email = credentials.emailOrPhone.trim();

    if (!isEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    Alert.alert(
      'Reset Password',
      `Send password reset link to ${email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              await auth().sendPasswordResetEmail(email);
              Alert.alert(
                'Email Sent',
                'Password reset link has been sent to your email.'
              );
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  // Handle register
  const handleRegister = () => {
    navigation.navigate('RoleSelection');
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
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to City Transport System</Text>
            <View style={styles.firebaseBadge}>
              <Text style={styles.firebaseBadgeText}>🔐 Firebase Secure Login</Text>
            </View>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="john@example.com"
                value={credentials.emailOrPhone}
                onChangeText={value =>
                  setCredentials(prev => ({ ...prev, emailOrPhone: value }))
                }
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
              <Text style={styles.inputNote}>
                Enter your registered email address
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={credentials.password}
                onChangeText={value =>
                  setCredentials(prev => ({ ...prev, password: value }))
                }
                secureTextEntry
                editable={!loading}
              />
            </View>

            {/* Remember Me & Forgot Password */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberContainer}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
                disabled={loading}
              >
                <View style={styles.checkbox}>
                  {rememberMe && <View style={styles.checkboxInner} />}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Firebase Status */}
            <View style={styles.firebaseStatus}>
              <Text style={styles.firebaseStatusText}>
                🔗 Connected to Firebase Authentication
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            {/* Quick Demo Login Section */}
            <View style={styles.demoSection}>
              <Text style={styles.demoTitle}>Quick Demo Access</Text>
              <Text style={styles.demoSubtitle}>
                Test different roles with Firebase authentication
              </Text>

              <View style={styles.demoButtons}>
                <TouchableOpacity
                  style={[styles.demoButton, { backgroundColor: '#4285f4' }]}
                  onPress={() => handleDemoLogin('passenger')}
                  disabled={loading}
                >
                  <View style={styles.demoButtonContent}>
                    <Text style={styles.demoButtonEmoji}>🧑‍💼</Text>
                    <Text style={styles.demoButtonText}>Passenger</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.demoButton, { backgroundColor: '#fbbc04' }]}
                  onPress={() => handleDemoLogin('driver')}
                  disabled={loading}
                >
                  <View style={styles.demoButtonContent}>
                    <Text style={styles.demoButtonEmoji}>🚗</Text>
                    <Text style={styles.demoButtonText}>Driver</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.demoButton, { backgroundColor: '#ea4335' }]}
                  onPress={() => handleDemoLogin('transporter')}
                  disabled={loading}
                >
                  <View style={styles.demoButtonContent}>
                    <Text style={styles.demoButtonEmoji}>🏢</Text>
                    <Text style={styles.demoButtonText}>Transporter</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Register Section */}
            <View style={styles.registerSection}>
              <Text style={styles.registerText}>Don't have an account?</Text>
              <TouchableOpacity onPress={handleRegister} disabled={loading}>
                <Text style={styles.registerLink}> Create Account</Text>
              </TouchableOpacity>
            </View>

            {/* Information Note */}
            <View style={styles.noteContainer}>
              <Text style={styles.noteTitle}>ℹ️ Firebase Authentication</Text>
              <Text style={styles.noteText}>
                • Secure email/password authentication{'\n'}
                • Email verification supported{'\n'}
                • Password reset via email{'\n'}
                • User data stored in Firestore{'\n'}
                • Real-time authentication state
              </Text>
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
    justifyContent: 'center',
  },
  header: {
    marginBottom: 48,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
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
  firebaseBadge: {
    backgroundColor: '#FFA000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  firebaseBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  form: {
    marginBottom: 20,
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
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#1a73e8',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    backgroundColor: '#1a73e8',
    borderRadius: 2,
  },
  rememberText: {
    fontSize: 14,
    color: '#5f6368',
  },
  forgotText: {
    fontSize: 14,
    color: '#1a73e8',
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#1a73e8',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#6c8bc7',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  firebaseStatus: {
    backgroundColor: '#E8F0FE',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  firebaseStatusText: {
    color: '#1a73e8',
    fontSize: 14,
    fontWeight: '500',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#DADCE0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#5f6368',
    fontSize: 14,
  },
  demoSection: {
    backgroundColor: '#F8F9FA',
    padding: 24,
    borderRadius: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  demoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#202124',
    marginBottom: 8,
    textAlign: 'center',
  },
  demoSubtitle: {
    fontSize: 14,
    color: '#5f6368',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  demoButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  demoButton: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 1,
  },
  demoButtonContent: {
    alignItems: 'center',
  },
  demoButtonEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  demoButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  registerText: {
    fontSize: 16,
    color: '#5f6368',
  },
  registerLink: {
    fontSize: 16,
    color: '#1a73e8',
    fontWeight: 'bold',
  },
  noteContainer: {
    backgroundColor: '#E8F0FE',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1a73e8',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#1a73e8',
    lineHeight: 22,
  },
});
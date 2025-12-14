// src/screens/auth/LoginScreen.tsx - COMPLETE WORKING VERSION
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Define navigation types
type RootStackParamList = {
  Passenger: undefined;
  Driver: undefined;
  RoleSelection: undefined;
  Transporter: undefined;
  Onboarding: undefined;
  Auth: undefined;
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

  // Handle regular login
  const handleLogin = () => {
    if (!credentials.emailOrPhone.trim()) {
      Alert.alert('Error', 'Please enter email or phone number');
      return;
    }

    if (!credentials.password) {
      Alert.alert('Error', 'Please enter password');
      return;
    }

    setLoading(true);

    // Simulate login API call
    setTimeout(() => {
      setLoading(false);

      // For demo - Auto login as passenger
      Alert.alert(
        'Login Successful',
        'Welcome to City Transport!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Set role if function available
              if (setUserRole) {
                setUserRole('passenger');
              }

              // Direct navigation to Passenger dashboard
              navigation.reset({
                index: 0,
                routes: [{ name: 'Passenger' }],
              });
            },
          },
        ]
      );
    }, 1500);
  };

  // Handle demo login with direct navigation
  const handleDemoLogin = (role: 'passenger' | 'driver' | 'transporter') => {
    const roleName = role.charAt(0).toUpperCase() + role.slice(1);
    const routeName = roleName as 'Passenger' | 'Driver' | 'Transporter';

    Alert.alert(
      `Login as ${roleName}`,
      `You will be redirected to ${roleName} Dashboard`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          onPress: () => {
            // Set user role if function available
            if (setUserRole) {
              setUserRole(role);
              console.log(`User role set to: ${role}`);
            }

            // DIRECT NAVIGATION TO DASHBOARD
            navigation.reset({
              index: 0,
              routes: [{ name: routeName }],
            });
          },
        },
      ]
    );
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'This feature will be available soon. For now, use demo login buttons.',
      [{ text: 'OK' }]
    );
  };

  // Handle register
  const handleRegister = () => {

    console.log('Register button clicked');
    navigation.navigate('RoleSelection');
  };

  // Handle Forgot Password


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
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email or Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="john@example.com or 03XX-XXXXXXX"
                value={credentials.emailOrPhone}
                onChangeText={value =>
                  setCredentials(prev => ({ ...prev, emailOrPhone: value }))
                }
                keyboardType="email-address"
                autoCapitalize="none"
              />
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
              />
            </View>

            {/* Remember Me & Forgot Password */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberContainer}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View style={styles.checkbox}>
                  {rememberMe && <View style={styles.checkboxInner} />}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

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
                Click any button to test different roles immediately
              </Text>

              <View style={styles.demoButtons}>
                <TouchableOpacity
                  style={[styles.demoButton, { backgroundColor: '#4285f4' }]}
                  onPress={() => handleDemoLogin('passenger')}
                >
                  <View style={styles.demoButtonContent}>
                    <Text style={styles.demoButtonEmoji}>🧑‍💼</Text>
                    <Text style={styles.demoButtonText}>Passenger</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.demoButton, { backgroundColor: '#fbbc04' }]}
                  onPress={() => handleDemoLogin('driver')}
                >
                  <View style={styles.demoButtonContent}>
                    <Text style={styles.demoButtonEmoji}>🚗</Text>
                    <Text style={styles.demoButtonText}>Driver</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.demoButton, { backgroundColor: '#ea4335' }]}
                  onPress={() => handleDemoLogin('transporter')}
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
              <TouchableOpacity onPress={handleRegister}>
                <Text style={styles.registerLink}> Create Account</Text>
              </TouchableOpacity>
            </View>

            {/* Information Note */}
            <View style={styles.noteContainer}>
              <Text style={styles.noteTitle}>ℹ️ Information</Text>
              <Text style={styles.noteText}>
                • This is a demo version{'\n'}
                • Demo buttons provide immediate access{'\n'}
                • Registration flow coming soon{'\n'}
                • Real authentication will be added in Phase-2
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
    marginBottom: 32,
  },
  buttonDisabled: {
    backgroundColor: '#6c8bc7',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
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
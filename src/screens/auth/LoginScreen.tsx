// src/screens/auth/LoginScreen.tsx - CLEAN VERSION
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
  RoleSelection: undefined;
  ForgotPassword: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface LoginScreenProps {
  setUserRole: (role: 'passenger' | 'driver' | 'transporter' | null) => void;
}

export default function LoginScreen({ setUserRole }: LoginScreenProps) {
  const navigation = useNavigation<NavigationProp>();
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  // Handle login
  const handleLogin = async () => {
    if (!credentials.email.trim()) {
      Alert.alert('Error', 'Please enter email address');
      return;
    }

    if (!credentials.password) {
      Alert.alert('Error', 'Please enter password');
      return;
    }

    setLoading(true);

    try {
      const email = credentials.email.trim().toLowerCase();

      // Firebase login
      const userCredential = await auth().signInWithEmailAndPassword(
        email,
        credentials.password
      );

      const user = userCredential.user;

      // Get user data from Firestore
      const userDoc = await firestore()
        .collection('users')
        .doc(user.uid)
        .get();

      let userType: 'passenger' | 'driver' | 'transporter' = 'passenger';

      if (userDoc.exists) {
        const userData = userDoc.data();
        userType = userData?.userType || 'passenger';
      }

      // Set user role - RootNavigator automatically handle karega
      setUserRole(userType);

      Alert.alert(
        'Login Successful',
        `Welcome back!`,
        [{ text: 'Continue' }]
      );

    } catch (error: any) {
      console.error('Login error:', error);

      let errorMessage = 'Login failed. Please try again.';

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Check your internet connection.';
          break;
        default:
          errorMessage = 'An error occurred. Please try again.';
      }

      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    if (!credentials.email.trim()) {
      Alert.alert('Email Required', 'Please enter your email first');
      return;
    }

    const email = credentials.email.trim();

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
              Alert.alert('Error', 'Failed to send reset email. Please check email address.');
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
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={credentials.email}
                onChangeText={value =>
                  setCredentials(prev => ({ ...prev, email: value }))
                }
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="next"
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
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotContainer}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            {/* Register Section */}
            <View style={styles.registerSection}>
              <Text style={styles.registerText}>Don't have an account?</Text>
              <TouchableOpacity onPress={handleRegister} disabled={loading}>
                <Text style={styles.registerLink}> Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* App Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Select your role during registration
            </Text>
            <View style={styles.roleIcons}>
              <View style={styles.roleIcon}>
                <Text style={styles.roleEmoji}>🧑‍💼</Text>
                <Text style={styles.roleText}>Passenger</Text>
              </View>
              <View style={styles.roleIcon}>
                <Text style={styles.roleEmoji}>🚗</Text>
                <Text style={styles.roleText}>Driver</Text>
              </View>
              <View style={styles.roleIcon}>
                <Text style={styles.roleEmoji}>🏢</Text>
                <Text style={styles.roleText}>Transporter</Text>
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
    marginBottom: 32,
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
  forgotContainer: {
    alignSelf: 'flex-end',
    marginBottom: 32,
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
    marginBottom: 24,
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
    marginBottom: 24,
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
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
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
  infoContainer: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#5f6368',
    marginBottom: 16,
    textAlign: 'center',
  },
  roleIcons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  roleIcon: {
    alignItems: 'center',
  },
  roleEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  roleText: {
    fontSize: 12,
    color: '#5f6368',
    fontWeight: '500',
  },
});
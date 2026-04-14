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

type AuthStackParamList = {
  Login: undefined;
  RoleSelection: undefined;
  ForgotPassword: undefined;
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!credentials.email.trim() || !credentials.password) {
      return Alert.alert('Error', 'Please enter both email and password');
    }

    setLoading(true);
    try {
      const email = credentials.email.trim().toLowerCase();

      // Sign in
      const userCredential = await auth().signInWithEmailAndPassword(
        email,
        credentials.password
      );

      const user = userCredential.user;

      // 🔥 CHECK EMAIL VERIFICATION
      if (!user.emailVerified) {
        try {
          // Sign out se PEHLE verification email bhejo
          await user.sendEmailVerification();
        } catch (e) {
          // ignore karo agar already sent tha
        }

        await auth().signOut();

        Alert.alert(
          'Email Not Verified',
          'Please verify your email before logging in.\n\nA verification email has been sent to your inbox.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Check if user exists in Firestore
      const userDoc = await firestore()
        .collection('users')
        .doc(user.uid)
        .get();

      if (!userDoc.exists) {
        await auth().signOut();
        return Alert.alert(
          'Account Error',
          'Your account is not properly set up. Please register again.'
        );
      }

      const userType = userDoc.data()?.userType?.toLowerCase?.();
      if (!userType || !['passenger', 'driver', 'transporter'].includes(userType)) {
        await auth().signOut();
        return Alert.alert(
          'Account Error',
          'Invalid account type. Please contact support.'
        );
      }

      // Success - RootNavigator will handle navigation based on role

    } catch (error: any) {

      let msg = 'Login failed. Please try again.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password.';
      } else if (error.code === 'auth/invalid-email') {
        msg = 'Invalid email address format.';
      } else if (error.code === 'auth/too-many-requests') {
        msg = 'Too many failed attempts. Please try later.';
      } else if (error.code === 'auth/network-request-failed') {
        msg = 'Network error. Check your internet connection.';
      }
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!credentials.email.trim()) {
      return Alert.alert('Email Required', 'Please enter your email address first');
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
            } catch (error) {
              Alert.alert(
                'Error',
                'Failed to send reset email. Please check if the email is registered.'
              );
            }
          },
        },
      ]
    );
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
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>

            <View style={styles.verifyBadge}>
              <Text style={styles.verifyBadgeText}>
                📧 Email verification required
              </Text>
            </View>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#9AA0A6"
                value={credentials.email}
                onChangeText={value => setCredentials(prev => ({ ...prev, email: value }))}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#9AA0A6"
                value={credentials.password}
                onChangeText={value => setCredentials(prev => ({ ...prev, password: value }))}
                secureTextEntry
                editable={!loading}
                onSubmitEditing={handleLogin}
              />
            </View>

            <TouchableOpacity
              style={styles.forgotContainer}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.navigate('RoleSelection')}
              disabled={loading}
            >
              <Text style={styles.registerText}>
                Don't have an account? <Text style={styles.registerBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Email Verification Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>📧 Email Verification Required</Text>
            <Text style={styles.infoText}>
              • Check your inbox for verification email{'\n'}
              • Click the verification link{'\n'}
              • Then login with your credentials
            </Text>
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
  },
  subtitle: {
    fontSize: 16,
    color: '#5f6368',
    marginBottom: 16,
  },
  verifyBadge: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  verifyBadgeText: {
    color: '#1a73e8',
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: '#fff',
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
    color: '#fff',
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
  registerLink: {
    alignItems: 'center',
  },
  registerText: {
    fontSize: 16,
    color: '#5f6368',
  },
  registerBold: {
    color: '#1a73e8',
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1a73e8',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#5f6368',
    lineHeight: 22,
  },
});
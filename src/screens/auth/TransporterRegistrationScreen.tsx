// src/screens/auth/TransporterRegistrationScreen.tsx - COMPLETE
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type OnboardingStackParamList = {
  TransporterRegistration: undefined;
  OTPVerification: { phone: string; role: string };
};

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

export default function TransporterRegistrationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [formData, setFormData] = useState({
    companyName: '',
    businessEmail: '',
    contactPhone: '',
    businessAddress: '',
    taxNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.companyName.trim()) {
      Alert.alert('Error', 'Please enter company name');
      return;
    }

    if (!formData.businessEmail.trim() || !formData.businessEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid business email');
      return;
    }

    if (!formData.contactPhone.trim() || formData.contactPhone.length < 10) {
      Alert.alert('Error', 'Please enter a valid contact number (at least 10 digits)');
      return;
    }

    if (!formData.businessAddress.trim()) {
      Alert.alert('Error', 'Please enter business address');
      return;
    }

    if (!formData.taxNumber.trim()) {
      Alert.alert('Error', 'Please enter tax/registration number');
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!termsAccepted) {
      Alert.alert('Error', 'Please accept terms and conditions');
      return;
    }

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      // Navigate to OTP verification
      navigation.navigate('OTPVerification', {
        phone: formData.contactPhone,
        role: 'transporter',
      });
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Register Your Transport Business</Text>
            <Text style={styles.subtitle}>
              Fill in your business details to get started
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Company Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="ABC Transport Company"
                value={formData.companyName}
                onChangeText={value => handleChange('companyName', value)}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="info@company.com"
                value={formData.businessEmail}
                onChangeText={value => handleChange('businessEmail', value)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Phone *</Text>
              <TextInput
                style={styles.input}
                placeholder="03XX XXXXXXX"
                value={formData.contactPhone}
                onChangeText={value => handleChange('contactPhone', value)}
                keyboardType="phone-pad"
                maxLength={11}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="Full business address"
                value={formData.businessAddress}
                onChangeText={value => handleChange('businessAddress', value)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tax/Registration Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., NTN-XXXXXX"
                value={formData.taxNumber}
                onChangeText={value => handleChange('taxNumber', value)}
                autoCapitalize="characters"
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
              />
            </View>

            {/* Terms & Conditions */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setTermsAccepted(!termsAccepted)}
              activeOpacity={0.7}
            >
              <View style={styles.checkbox}>
                {termsAccepted && <View style={styles.checkboxInner} />}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.termsLink}>Terms & Conditions</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            {/* Note for Drivers */}
            <View style={styles.driverNote}>
              <Text style={styles.driverNoteText}>
                <Text style={styles.driverNoteBold}>Note:</Text> After registration,
                you can add drivers from your transporter dashboard.
                Drivers will receive login credentials from you.
              </Text>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.registerButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.registerButtonText}>
                {loading ? 'Registering Business...' : 'Register Business'}
              </Text>
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.loginText}>
                Already have an account? <Text style={styles.loginBold}>Login</Text>
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
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#202124',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#5f6368',
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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#1a73e8',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    backgroundColor: '#1a73e8',
    borderRadius: 2,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#5f6368',
    lineHeight: 20,
  },
  termsLink: {
    color: '#1a73e8',
    fontWeight: '600',
  },
  driverNote: {
    backgroundColor: '#E8F0FE',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  driverNoteText: {
    fontSize: 14,
    color: '#1a73e8',
    lineHeight: 20,
  },
  driverNoteBold: {
    fontWeight: 'bold',
  },
  registerButton: {
    backgroundColor: '#ea4335',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#f28b82',
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
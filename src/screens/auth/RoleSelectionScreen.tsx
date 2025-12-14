// src/screens/auth/RoleSelectionScreen.tsx - COMPLETE
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type OnboardingStackParamList = {
  Login: undefined;
  RoleSelection: undefined;
  PassengerRegistration: undefined;
  TransporterRegistration: undefined;
};

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

export default function RoleSelectionScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Join as</Text>
          <Text style={styles.subtitle}>
            Choose how you want to use City Transport
          </Text>
        </View>

        {/* Role Cards */}
        <View style={styles.rolesContainer}>
          {/* Passenger Card */}
          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => navigation.navigate('PassengerRegistration')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#E8F0FE' }]}>
              <Text style={styles.emoji}>🧑‍💼</Text>
            </View>
            <Text style={styles.roleTitle}>Passenger</Text>
            <Text style={styles.roleDescription}>
              Book rides, track buses, and travel across the city
            </Text>
            <View style={styles.features}>
              <Text style={styles.feature}>✓ Instant booking</Text>
              <Text style={styles.feature}>✓ Real-time tracking</Text>
              <Text style={styles.feature}>✓ Digital payments</Text>
            </View>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => navigation.navigate('PassengerRegistration')}
            >
              <Text style={styles.selectButtonText}>Select Passenger</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Transporter Card */}
          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => navigation.navigate('TransporterRegistration')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FCE8E6' }]}>
              <Text style={styles.emoji}>🏢</Text>
            </View>
            <Text style={styles.roleTitle}>Transporter</Text>
            <Text style={styles.roleDescription}>
              Manage fleet, add drivers, and grow your transport business
            </Text>
            <View style={styles.features}>
              <Text style={styles.feature}>✓ Fleet management</Text>
              <Text style={styles.feature}>✓ Driver assignment</Text>
              <Text style={styles.feature}>✓ Revenue tracking</Text>
            </View>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => navigation.navigate('TransporterRegistration')}
            >
              <Text style={styles.selectButtonText}>Select Transporter</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* Note */}
        <View style={styles.noteContainer}>
          <Text style={styles.noteText}>
            <Text style={styles.noteBold}>Note:</Text> Drivers can only be added by Transporters.
            If you're a driver, please contact your company for login credentials.
          </Text>
        </View>

        {/* Already have account */}
        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginBold}>Login</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
    textAlign: 'center',
  },
  rolesContainer: {
    marginBottom: 32,
  },
  roleCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E8EAED',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'center',
  },
  emoji: {
    fontSize: 40,
  },
  roleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#202124',
    marginBottom: 12,
    textAlign: 'center',
  },
  roleDescription: {
    fontSize: 15,
    color: '#5f6368',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  features: {
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  feature: {
    fontSize: 14,
    color: '#34a853',
    marginBottom: 6,
    paddingLeft: 8,
  },
  selectButton: {
    backgroundColor: '#1a73e8',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noteContainer: {
    backgroundColor: '#FFF8E1',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB300',
  },
  noteText: {
    fontSize: 14,
    color: '#5D4037',
    lineHeight: 20,
  },
  noteBold: {
    fontWeight: 'bold',
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 16,
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
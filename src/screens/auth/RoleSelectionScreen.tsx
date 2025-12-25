// src/screens/auth/RoleSelectionScreen.tsx - FIREBASE INTEGRATED
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';

// Define navigation types
type OnboardingStackParamList = {
  Login: undefined;
  RoleSelection: undefined;
  PassengerRegistration: { role: 'passenger' };
  TransporterRegistration: { role: 'transporter' };
  DriverRegistration: { role: 'driver' };
};

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

export default function RoleSelectionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedRole, setSelectedRole] = useState<'passenger' | 'transporter' | null>(null);
  const [loading, setLoading] = useState(false);

  // Role configurations
  const roles = [
    {
      id: 'passenger',
      title: 'Passenger',
      emoji: '🧑‍💼',
      color: '#4285f4',
      backgroundColor: '#E8F0FE',
      description: 'Book rides, track buses, and travel across the city',
      features: [
        '✓ Instant booking',
        '✓ Real-time tracking',
        '✓ Digital payments',
        '✓ Ride history',
        '✓ 24/7 support',
      ],
    },
    {
      id: 'transporter',
      title: 'Transporter',
      emoji: '🏢',
      color: '#ea4335',
      backgroundColor: '#FCE8E6',
      description: 'Manage fleet, add drivers, and grow your transport business',
      features: [
        '✓ Fleet management',
        '✓ Driver assignment',
        '✓ Revenue tracking',
        '✓ Business analytics',
        '✓ Driver management',
      ],
    },
  ];

  const handleRoleSelect = async (role: 'passenger' | 'transporter') => {
    setSelectedRole(role);

    // Save role selection temporarily in Firestore (optional tracking)
    try {
      await firestore()
        .collection('temp_selections')
        .add({
          selectedRole: role,
          timestamp: firestore.FieldValue.serverTimestamp(),
          deviceInfo: 'mobile',
        });

      console.log('Role selection saved for analytics');
    } catch (error) {
      console.log('Note: Could not save selection data', error);
      // Continue anyway - this is just for analytics
    }

    Alert.alert(
      `Continue as ${role === 'passenger' ? 'Passenger' : 'Transporter'}?`,
      `You'll be taken to ${role} registration form. You can complete your registration there.`,
      [
        {
          text: 'Change Role',
          style: 'cancel',
          onPress: () => setSelectedRole(null)
        },
        {
          text: 'Continue',
          onPress: () => navigateToRegistration(role)
        }
      ]
    );
  };

  const navigateToRegistration = (role: 'passenger' | 'transporter') => {
    // Navigate to respective registration screen with role param
    if (role === 'passenger') {
      navigation.navigate('PassengerRegistration', { role: 'passenger' });
    } else {
      navigation.navigate('TransporterRegistration', { role: 'transporter' });
    }
  };

  const RoleCard = ({ role }: { role: typeof roles[0] }) => {
    const isSelected = selectedRole === role.id;

    return (
      <TouchableOpacity
        style={[
          styles.roleCard,
          { borderColor: role.color },
          isSelected && {
            borderWidth: 3,
            backgroundColor: `${role.color}15`,
            transform: [{ scale: 1.02 }]
          }
        ]}
        onPress={() => handleRoleSelect(role.id as 'passenger' | 'transporter')}
        activeOpacity={0.8}
        disabled={loading}
      >
        <View style={[styles.iconContainer, { backgroundColor: role.backgroundColor }]}>
          <Text style={styles.emoji}>{role.emoji}</Text>
        </View>

        <Text style={styles.roleTitle}>{role.title}</Text>
        <Text style={styles.roleDescription}>{role.description}</Text>

        <View style={styles.features}>
          {role.features.map((feature, index) => (
            <Text key={index} style={styles.feature}>
              {feature}
            </Text>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.selectButton,
            { backgroundColor: role.color },
            isSelected && styles.selectedButton
          ]}
          onPress={() => handleRoleSelect(role.id as 'passenger' | 'transporter')}
          disabled={loading}
        >
          <Text style={styles.selectButtonText}>
            {isSelected ? 'Selected ✓' : 'Select'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Join as</Text>
          <Text style={styles.subtitle}>
            Choose how you want to use City Transport
          </Text>

          <View style={styles.firebaseBadge}>
            <Text style={styles.firebaseBadgeText}>
              🔐 Firebase Secure Registration
            </Text>
          </View>
        </View>

        {/* Firebase Registration Info */}
        <View style={styles.firebaseInfo}>
          <Text style={styles.firebaseInfoTitle}>Registration Process:</Text>
          <Text style={styles.firebaseInfoText}>
            • Select your role below{'\n'}
            • Fill registration form{'\n'}
            • Email verification{'\n'}
            • Access your dashboard
          </Text>
        </View>

        {/* Role Cards */}
        <View style={styles.rolesContainer}>
          {roles.map((role) => (
            <RoleCard key={role.id} role={role} />
          ))}
        </View>

        {/* Selected Role Action */}
        {selectedRole && (
          <View style={styles.selectedAction}>
            <Text style={styles.selectedActionText}>
              Selected: <Text style={{ color: roles.find(r => r.id === selectedRole)?.color, fontWeight: 'bold' }}>
                {selectedRole === 'passenger' ? 'Passenger' : 'Transporter'}
              </Text>
            </Text>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => navigateToRegistration(selectedRole)}
              disabled={loading}
            >
              <Text style={styles.continueButtonText}>
                Continue Registration →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Driver Information */}
        <View style={styles.driverInfo}>
          <Text style={styles.driverInfoTitle}>🚗 About Drivers:</Text>
          <Text style={styles.driverInfoText}>
            Drivers are managed by Transporters.{'\n'}
            If you're a driver, please contact your Transport company for login credentials.
          </Text>
          <Text style={styles.driverInfoNote}>
            Driver registration is handled by Transporters through their dashboard.
          </Text>
        </View>

        {/* Firebase Benefits */}
        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>Benefits of Firebase Integration:</Text>
          <View style={styles.benefitsGrid}>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitEmoji}>🔒</Text>
              <Text style={styles.benefitText}>Secure Auth</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitEmoji}>📧</Text>
              <Text style={styles.benefitText}>Email Verification</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitEmoji}>⚡</Text>
              <Text style={styles.benefitText}>Fast Signup</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitEmoji}>📊</Text>
              <Text style={styles.benefitText}>Data Sync</Text>
            </View>
          </View>
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

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
    marginBottom: 16,
  },
  firebaseBadge: {
    backgroundColor: '#FFA000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  firebaseBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  firebaseInfo: {
    backgroundColor: '#E8F0FE',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#1a73e8',
  },
  firebaseInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 8,
  },
  firebaseInfoText: {
    fontSize: 14,
    color: '#1a73e8',
    lineHeight: 22,
  },
  rolesContainer: {
    marginBottom: 24,
  },
  roleCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E8EAED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    lineHeight: 20,
  },
  selectButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedButton: {
    opacity: 0.9,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedAction: {
    backgroundColor: '#F0F7FF',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#1a73e8',
    alignItems: 'center',
  },
  selectedActionText: {
    fontSize: 18,
    color: '#1a73e8',
    marginBottom: 16,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  driverInfo: {
    backgroundColor: '#FFF3E0',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB300',
  },
  driverInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 8,
  },
  driverInfoText: {
    fontSize: 14,
    color: '#5D4037',
    lineHeight: 20,
    marginBottom: 8,
  },
  driverInfoNote: {
    fontSize: 12,
    color: '#8D6E63',
    fontStyle: 'italic',
  },
  benefitsContainer: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#202124',
    marginBottom: 16,
    textAlign: 'center',
  },
  benefitsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  benefitItem: {
    alignItems: 'center',
    width: '23%',
  },
  benefitEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 11,
    color: '#5f6368',
    textAlign: 'center',
    fontWeight: '500',
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
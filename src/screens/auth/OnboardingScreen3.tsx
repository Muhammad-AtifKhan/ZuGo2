// src/screens/auth/OnboardingScreen3.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type OnboardingStackParamList = {
  Onboarding1: undefined;
  Onboarding2: undefined;
  Onboarding3: undefined;
  Login: undefined;
};

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

export default function OnboardingScreen3() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Illustration */}
        <View style={styles.illustration}>
          <Text style={styles.emoji}>🏢</Text>
          <Text style={styles.illustrationText}>Business Management</Text>
        </View>

        {/* Title & Description */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Manage Your Transport Business</Text>
          <Text style={styles.description}>
            Add drivers, manage your fleet, track revenue, and optimize routes.
            Everything you need to run a successful transport business.
          </Text>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomContainer}>
          {/* Pagination Dots */}
          <View style={styles.pagination}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={[styles.dot, styles.activeDot]} />
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  illustration: {
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    borderRadius: 20,
    marginTop: 40,
  },
  emoji: {
    fontSize: 100,
    marginBottom: 16,
  },
  illustrationText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ea4335',
  },
  textContainer: {
    flex: 0.25,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#202124',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#5f6368',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomContainer: {
    flex: 0.15,
    justifyContent: 'space-between',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DADCE0',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#1a73e8',
    width: 24,
  },
  buttonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  getStartedButton: {
    backgroundColor: '#1a73e8',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  getStartedText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
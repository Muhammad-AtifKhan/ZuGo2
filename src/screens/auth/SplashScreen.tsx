// src/screens/auth/SplashScreen.tsx - ZUGO PREMIUM VERSION

import React from 'react';
import { View, Text, StyleSheet, StatusBar, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SplashScreen() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>

          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>🚌</Text>
            <Text style={styles.appName}>ZuGo</Text>
            <Text style={styles.tagline}>Move Smart. Move ZuGo.</Text>
          </View>

          {/* Loading Section */}
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Initializing your journey...</Text>
            <View style={styles.loadingBar}>
              <View style={styles.loadingProgress} />
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2026 ZuGo Transport System</Text>
          </View>

        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Deep premium navy
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 100,
  },
  logoEmoji: {
    fontSize: 90,
    marginBottom: 20,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#CBD5E1',
    marginTop: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  loadingText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 14,
  },
  loadingBar: {
    width: 220,
    height: 4,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
  },
  loadingProgress: {
    width: '70%',
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
  },
  footerText: {
    fontSize: 12,
    color: '#64748B',
  },
});
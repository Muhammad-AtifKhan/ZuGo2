// src/screens/auth/SplashScreen.tsx - FIXED VERSION
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SplashScreen() {
  // ✅ NO navigation logic here
  // ✅ Splash just shows UI, RootNavigator handles navigation
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* App Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.emoji}>🚌</Text>
          <Text style={styles.appName}>City Transport</Text>
          <Text style={styles.tagline}>Smart Urban Mobility</Text>
        </View>

        {/* Loading Indicator */}
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
          <View style={styles.loadingBar}>
            <View style={styles.loadingProgress} />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2024 City Transport System</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#5f6368',
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#5f6368',
    marginBottom: 12,
  },
  loadingBar: {
    width: 200,
    height: 4,
    backgroundColor: '#E8EAED',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    width: '60%',
    height: '100%',
    backgroundColor: '#1a73e8',
    borderRadius: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#9AA0A6',
  },
});
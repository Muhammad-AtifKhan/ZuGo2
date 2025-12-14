import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export default function SplashScreen({ navigation }: any) {
  useEffect(() => {
    setTimeout(() => {
      navigation.replace('Login');
    }, 2000); // 2 seconds splash
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>City Transport</Text>
      <Text style={styles.subtitle}>Management System</Text>
      <ActivityIndicator size="large" color="#0A7AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A7AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
  },
});

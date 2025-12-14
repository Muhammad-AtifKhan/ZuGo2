import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function LoginScreen({ setUserRole }: any) {

  const handleLogin = (role: 'passenger' | 'driver' | 'transporter') => {
    setUserRole(role); // ✅ now defined
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login As</Text>

      <TouchableOpacity style={styles.button} onPress={() => handleLogin('passenger')}>
        <Text style={styles.text}>Passenger</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => handleLogin('driver')}>
        <Text style={styles.text}>Driver</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => handleLogin('transporter')}>
        <Text style={styles.text}>Transporter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, marginBottom: 20 },
  button: {
    backgroundColor: '#0A7AFF',
    padding: 14,
    borderRadius: 8,
    width: 200,
    marginBottom: 10,
  },
  text: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
});

import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

const passengers = [
  { id: '1', name: 'Ali Khan' },
  { id: '2', name: 'Ahmed Raza' },
  { id: '3', name: 'Sara Malik' },
];

export default function BoardingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Passenger Boarding</Text>

      <FlatList
        data={passengers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.name}</Text>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Boarded</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#0A7AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  buttonText: { color: '#fff' },
});

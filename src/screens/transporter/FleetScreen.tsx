import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function FleetScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Fleet Management Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 18 }
});

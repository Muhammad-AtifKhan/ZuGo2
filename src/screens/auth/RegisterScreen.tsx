// src/screens/auth/RoleSelectionScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
} from 'react-native';

interface Props {
  navigation: any;
}

export default function RoleSelectionScreen({ navigation }: Props) {
  const [selectedRole, setSelectedRole] = useState<
    'passenger' | 'driver' | 'transporter' | null
  >(null);

  const handleContinue = () => {
    if (!selectedRole) return;

    if (selectedRole === 'passenger') {
      navigation.navigate('PassengerRegistration');
    } else if (selectedRole === 'transporter') {
      navigation.navigate('TransporterRegistration');
    } else {
      navigation.navigate('Register', { role: selectedRole });
    }
  };

  const RoleCard = ({
    role,
    title,
    description,
    emoji,
  }: {
    role: 'passenger' | 'driver' | 'transporter';
    title: string;
    description: string;
    emoji: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.card,
        selectedRole === role && styles.cardActive,
      ]}
      onPress={() => setSelectedRole(role)}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>

          <Text style={styles.title}>Choose Your Role</Text>
          <Text style={styles.subtitle}>
            Select how you want to use ZuGo
          </Text>

          <View style={styles.cardContainer}>
            <RoleCard
              role="passenger"
              emoji="🧍"
              title="Passenger"
              description="Book rides and travel easily across the city"
            />

            <RoleCard
              role="driver"
              emoji="🚗"
              title="Driver"
              description="Provide rides and earn money"
            />

            <RoleCard
              role="transporter"
              emoji="🏢"
              title="Transporter"
              description="Manage buses, drivers and routes"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              !selectedRole && styles.buttonDisabled,
            ]}
            disabled={!selectedRole}
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#202124',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#5f6368',
    marginBottom: 40,
  },
  cardContainer: {
    marginBottom: 40,
  },
  card: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardActive: {
    borderColor: '#1a73e8',
    backgroundColor: '#E8F0FE',
  },
  emoji: {
    fontSize: 36,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#202124',
  },
  cardDescription: {
    fontSize: 14,
    color: '#5f6368',
  },
  button: {
    backgroundColor: '#1a73e8',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
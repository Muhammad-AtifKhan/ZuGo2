// src/components/transporter/StatCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
  subLabel?: string;
  color: string;
}

export const StatCard = ({ icon, value, label, subLabel, color }: StatCardProps) => (
  <View style={[styles.card, SHADOWS.small]}>
    <Text style={[styles.icon, { color }]}>{icon}</Text>
    <Text style={styles.value}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
    {subLabel && <Text style={styles.subLabel}>{subLabel}</Text>}
  </View>
);

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    alignItems: 'center',
  },
  icon: {
    fontSize: 32,
    marginBottom: SIZES.xs,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SIZES.xs,
  },
  label: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  subLabel: {
    fontSize: 11,
    color: COLORS.textLighter,
    textAlign: 'center',
  },
});
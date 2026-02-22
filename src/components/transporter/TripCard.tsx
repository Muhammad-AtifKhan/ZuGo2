// src/components/transporter/TripCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Trip } from '../../types/transporter.types';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

interface TripCardProps {
  trip: Trip;
  onPress: () => void;
  formatTime: (date: Date) => string;
  formatCurrency: (amount: number) => string;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => string;
}

export const TripCard = ({
  trip,
  onPress,
  formatTime,
  formatCurrency,
  getStatusColor,
  getStatusIcon,
}: TripCardProps) => {
  const tripTime = trip.time?.toDate ? trip.time.toDate() : new Date(trip.time);

  return (
    <TouchableOpacity style={[styles.card, SHADOWS.small]} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.time}>{formatTime(tripTime)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
          <Text style={styles.statusText}>
            {getStatusIcon(trip.status)} {trip.status}
          </Text>
        </View>
      </View>

      <Text style={styles.route}>{trip.route}</Text>

      <View style={styles.details}>
        <Text style={styles.detail}>🚌 {trip.busNumber}</Text>
        <Text style={styles.detail}>👤 {trip.driverName}</Text>
        <Text style={styles.detail}>👥 {trip.passengers}</Text>
      </View>

      <Text style={styles.revenue}>{formatCurrency(trip.revenue)}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  time: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  route: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.sm,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.xs,
  },
  detail: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  revenue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
});
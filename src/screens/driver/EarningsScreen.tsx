import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';

const EarningsScreen: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  const todayEarnings = {
    baseFare: 120.00,
    distanceFare: 45.50,
    bonus: 15.00,
    total: 180.50,
  };

  const weeklyEarnings = [
    { day: 'Monday', amount: 143.00 },
    { day: 'Tuesday', amount: 155.50 },
    { day: 'Wednesday', amount: 138.00 },
    { day: 'Thursday', amount: 147.50 },
    { day: 'Friday', amount: 132.00 },
    { day: 'Saturday', amount: 165.00 },
    { day: 'Sunday', amount: 120.50 },
  ];

  const monthlyEarnings = [
    { month: 'January', amount: 3200.00 },
    { month: 'February', amount: 3450.50 },
    { month: 'March', amount: 2800.00 },
  ];

  const weeklyTotal = weeklyEarnings.reduce((sum, day) => sum + day.amount, 0);
  const monthlyTotal = monthlyEarnings.reduce((sum, month) => sum + month.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 MY EARNINGS</Text>
        <Text style={styles.headerSubtitle}>Track your income</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'today' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('today')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === 'today' && styles.periodButtonTextActive]}>
              TODAY
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'week' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('week')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === 'week' && styles.periodButtonTextActive]}>
              WEEK
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('month')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === 'month' && styles.periodButtonTextActive]}>
              MONTH
            </Text>
          </TouchableOpacity>
        </View>

        {/* Today's Earnings */}
        {selectedPeriod === 'today' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TODAY'S BREAKDOWN</Text>
            <View style={styles.earningsCard}>
              <View style={styles.earningRow}>
                <Text style={styles.earningLabel}>Base Fare</Text>
                <Text style={styles.earningValue}>${todayEarnings.baseFare.toFixed(2)}</Text>
              </View>
              <View style={styles.earningRow}>
                <Text style={styles.earningLabel}>Distance Fare</Text>
                <Text style={styles.earningValue}>${todayEarnings.distanceFare.toFixed(2)}</Text>
              </View>
              <View style={styles.earningRow}>
                <Text style={styles.earningLabel}>Bonus</Text>
                <Text style={styles.earningValue}>+${todayEarnings.bonus.toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.earningRow}>
                <Text style={styles.earningLabelTotal}>TOTAL</Text>
                <Text style={styles.earningValueTotal}>${todayEarnings.total.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Weekly Earnings */}
        {selectedPeriod === 'week' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>WEEKLY EARNINGS</Text>
            <View style={styles.earningsCard}>
              {weeklyEarnings.map((day, index) => (
                <View key={index} style={styles.earningRow}>
                  <Text style={styles.earningLabel}>{day.day}</Text>
                  <Text style={styles.earningValue}>${day.amount.toFixed(2)}</Text>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.earningRow}>
                <Text style={styles.earningLabelTotal}>WEEKLY TOTAL</Text>
                <Text style={styles.earningValueTotal}>${weeklyTotal.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Monthly Earnings */}
        {selectedPeriod === 'month' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MONTHLY EARNINGS</Text>
            <View style={styles.earningsCard}>
              {monthlyEarnings.map((month, index) => (
                <View key={index} style={styles.earningRow}>
                  <Text style={styles.earningLabel}>{month.month}</Text>
                  <Text style={styles.earningValue}>${month.amount.toFixed(2)}</Text>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.earningRow}>
                <Text style={styles.earningLabelTotal}>MONTHLY TOTAL</Text>
                <Text style={styles.earningValueTotal}>${monthlyTotal.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${weeklyTotal.toFixed(2)}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${(weeklyTotal * 4).toFixed(2)}</Text>
            <Text style={styles.statLabel}>Projected Monthly</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Trips Completed</Text>
          </View>
        </View>

        {/* Coming Soon */}
        <View style={styles.comingSoonSection}>
          <Text style={styles.comingSoonTitle}>📈 Coming Soon</Text>
          <Text style={styles.comingSoonText}>
            • Detailed earnings reports{"\n"}
            • Tax calculations{"\n"}
            • Payment history{"\n"}
            • Withdrawal options
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E3F2FD',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#4A90E2',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 16,
  },
  earningsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  earningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  earningLabel: {
    fontSize: 14,
    color: '#666666',
  },
  earningValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
  },
  earningLabelTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  earningValueTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  divider: {
    height: 1,
    backgroundColor: '#4A90E2',
    marginVertical: 8,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  comingSoonSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
  },
  comingSoonText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 24,
    textAlign: 'center',
  },
});

export default EarningsScreen;
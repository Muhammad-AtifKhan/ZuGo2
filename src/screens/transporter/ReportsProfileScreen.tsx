// src/screens/transporter/ReportsProfileScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
  Switch,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Constants
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Define navigation types
type RootStackParamList = {
  Login: undefined;
  RoleSelection: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Simple types
type ReportStats = {
  totalRevenue: number;
  avgDailyRevenue: number;
  totalTrips: number;
  avgRating: number;
  activeBuses: number;
  activeDrivers: number;
  completedTrips: number;
  cancelledTrips: number;
};

type DailyRevenue = {
  day: string;
  revenue: number;
};

type MonthlyRevenue = {
  month: string;
  revenue: number;
};

type BusPerformance = {
  busNumber: string;
  trips: number;
  revenue: number;
  rating: number;
};

type DriverPerformance = {
  driverName: string;
  trips: number;
  rating: number;
  revenue: number;
};

const ReportsProfileScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState('reports'); // reports, profile, settings
  const [reportType, setReportType] = useState('daily'); // daily, monthly
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false); // 👈 NEW
  const [refreshing, setRefreshing] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Firebase data states
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [busPerformance, setBusPerformance] = useState<BusPerformance[]>([]);
  const [driverPerformance, setDriverPerformance] = useState<DriverPerformance[]>([]);

  const [stats, setStats] = useState<ReportStats>({
    totalRevenue: 0,
    avgDailyRevenue: 0,
    totalTrips: 0,
    avgRating: 0,
    activeBuses: 0,
    activeDrivers: 0,
    completedTrips: 0,
    cancelledTrips: 0,
  });

  // Settings state - with default values
  const [settings, setSettings] = useState({
    notifications: true,
    emailReports: true,
    lowBusAlert: true,
    maintenanceReminders: true,
    autoGenerateReports: false,
  });

  // Profile state
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    name: 'ZUGO Transport',
    registration: '',
    email: '',
    phone: '',
    address: '',
    taxNumber: '',
    established: '',
    totalBuses: 0,
    totalDrivers: 0,
  });

  const user = auth().currentUser;

  // ========== LOAD SETTINGS SPECIFICALLY ==========
  const loadSettings = useCallback(async () => {
    if (!user) return;

    setSettingsLoading(true);
    try {
      const settingsDoc = await firestore()
        .collection('settings')
        .doc(user.uid)
        .get();

      if (settingsDoc.exists) {
        setSettings(settingsDoc.data() as typeof settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  }, [user]);

  // Load settings when settings tab is opened
  useEffect(() => {
    if (activeTab === 'settings') {
      loadSettings();
    }
  }, [activeTab, loadSettings]);

  // ========== FETCH DATA FROM FIREBASE ==========
  const fetchAllData = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Fetch company profile
      const companyDoc = await firestore()
        .collection('transporters')
        .doc(user.uid)
        .get();

      if (companyDoc.exists) {
        const data = companyDoc.data();
        setCompanyInfo({
          name: data?.companyName || 'ZUGO Transport',
          registration: data?.registration || '',
          email: data?.email || user.email || '',
          phone: data?.phone || '',
          address: data?.address || '',
          taxNumber: data?.taxNumber || '',
          established: data?.established || '',
          totalBuses: data?.totalBuses || 0,
          totalDrivers: data?.totalDrivers || 0,
        });
      }

      // Fetch buses for stats
      const busesSnapshot = await firestore()
        .collection('buses')
        .where('transporterId', '==', user.uid)
        .get();

      const buses = busesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fetch drivers for stats
      const driversSnapshot = await firestore()
        .collection('drivers')
        .where('transporterId', '==', user.uid)
        .get();

      const drivers = driversSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fetch trips for stats
      const tripsSnapshot = await firestore()
        .collection('trips')
        .where('transporterId', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();

      const trips = tripsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Calculate stats
      const activeBuses = buses.filter(b => b.status === 'active').length;
      const activeDrivers = drivers.filter(d => d.status === 'active' || d.status === 'on-duty').length;
      const completedTrips = trips.filter(t => t.status === 'completed').length;
      const cancelledTrips = trips.filter(t => t.status === 'cancelled').length;

      let totalRevenue = 0;
      let totalTrips = trips.length;
      let totalRating = 0;
      let driversWithRating = 0;

      trips.forEach(trip => {
        const passengers = (trip.totalSeats || 0) - (trip.availableSeats || 0);
        const revenue = passengers * (trip.fare || 0);
        totalRevenue += revenue;
      });

      drivers.forEach(driver => {
        if (driver.rating) {
          totalRating += driver.rating;
          driversWithRating++;
        }
      });

      const avgRating = driversWithRating > 0 ? totalRating / driversWithRating : 0;

      setStats({
        totalRevenue,
        avgDailyRevenue: Math.round(totalRevenue / 30), // Approx daily average
        totalTrips,
        avgRating: parseFloat(avgRating.toFixed(1)),
        activeBuses,
        activeDrivers,
        completedTrips,
        cancelledTrips,
      });

      // Generate daily revenue (last 7 days)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dailyRev: DailyRevenue[] = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayName = days[date.getDay()];

        // Filter trips for this date
        const dayTrips = trips.filter(trip => {
          const tripDate = trip.startDate ? new Date(trip.startDate) : null;
          return tripDate && tripDate.toDateString() === date.toDateString();
        });

        const dayRevenue = dayTrips.reduce((sum, trip) => {
          const passengers = (trip.totalSeats || 0) - (trip.availableSeats || 0);
          return sum + (passengers * (trip.fare || 0));
        }, 0);

        dailyRev.push({
          day: dayName,
          revenue: dayRevenue,
        });
      }
      setDailyRevenue(dailyRev);

      // Generate monthly revenue (last 6 months)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyRev: MonthlyRevenue[] = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = months[date.getMonth()];

        // Filter trips for this month
        const monthTrips = trips.filter(trip => {
          const tripDate = trip.startDate ? new Date(trip.startDate) : null;
          return tripDate &&
                 tripDate.getMonth() === date.getMonth() &&
                 tripDate.getFullYear() === date.getFullYear();
        });

        const monthRevenue = monthTrips.reduce((sum, trip) => {
          const passengers = (trip.totalSeats || 0) - (trip.availableSeats || 0);
          return sum + (passengers * (trip.fare || 0));
        }, 0);

        monthlyRev.push({
          month: monthName,
          revenue: monthRevenue,
        });
      }
      setMonthlyRevenue(monthlyRev);

      // Generate bus performance (top 5)
      const busPerf: BusPerformance[] = buses.map(bus => {
        const busTrips = trips.filter(t => t.busId === bus.id);
        const busRevenue = busTrips.reduce((sum, trip) => {
          const passengers = (trip.totalSeats || 0) - (trip.availableSeats || 0);
          return sum + (passengers * (trip.fare || 0));
        }, 0);

        return {
          busNumber: bus.busNumber || 'Unknown',
          trips: busTrips.length,
          revenue: busRevenue,
          rating: bus.rating || 4.5,
        };
      }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
      setBusPerformance(busPerf);

      // Generate driver performance (top 5)
      const driverPerf: DriverPerformance[] = drivers.map(driver => {
        const driverTrips = trips.filter(t => t.driverId === driver.id);
        const driverRevenue = driverTrips.reduce((sum, trip) => {
          const passengers = (trip.totalSeats || 0) - (trip.availableSeats || 0);
          return sum + (passengers * (trip.fare || 0));
        }, 0);

        return {
          driverName: driver.fullName || 'Unknown',
          trips: driverTrips.length,
          rating: driver.rating || 4.0,
          revenue: driverRevenue,
        };
      }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
      setDriverPerformance(driverPerf);

    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Manual refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllData();
  }, [fetchAllData]);

  // ========== SETTINGS FUNCTIONS ==========
  const toggleSetting = async (key: keyof typeof settings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);

    if (!user) return;

    try {
      await firestore()
        .collection('settings')
        .doc(user.uid)
        .set(newSettings, { merge: true });
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  // ========== PROFILE FUNCTIONS ==========
  const handleUpdateProfile = async () => {
    if (!user) return;

    try {
      await firestore()
        .collection('transporters')
        .doc(user.uid)
        .update({
          companyName: companyInfo.name,
          registration: companyInfo.registration,
          email: companyInfo.email,
          phone: companyInfo.phone,
          address: companyInfo.address,
          taxNumber: companyInfo.taxNumber,
          established: companyInfo.established,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      Alert.alert('Success', 'Company profile updated successfully');
      setProfileModalVisible(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  // ========== LOGOUT FUNCTION ==========
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLogoutLoading(true);
            try {
              await auth().signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            } finally {
              setLogoutLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // ========== RENDER FUNCTIONS ==========
  const renderBarChart = (data: any[], maxValue: number, color: string, label: string) => {
    const chartHeight = 100;

    if (data.length === 0) {
      return <Text style={styles.emptyText}>No data available</Text>;
    }

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartBars}>
          {data.map((item, index) => {
            const barHeight = (item.revenue / maxValue) * chartHeight;
            return (
              <View key={index} style={styles.barColumn}>
                <View style={[styles.bar, { height: Math.max(barHeight, 2), backgroundColor: color }]} />
                <Text style={styles.barLabel}>{item.day || item.month}</Text>
                <Text style={styles.barValue}>PKR {item.revenue.toLocaleString()}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderReportSection = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Report Type Toggle */}
      <View style={styles.reportTypeContainer}>
        <TouchableOpacity
          style={[styles.reportTypeButton, reportType === 'daily' && styles.reportTypeActive]}
          onPress={() => setReportType('daily')}
        >
          <Text style={[styles.reportTypeText, reportType === 'daily' && styles.reportTypeTextActive]}>
            Daily
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.reportTypeButton, reportType === 'monthly' && styles.reportTypeActive]}
          onPress={() => setReportType('monthly')}
        >
          <Text style={[styles.reportTypeText, reportType === 'monthly' && styles.reportTypeTextActive]}>
            Monthly
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStatsContainer}>
        <View style={[styles.quickStatCard, SHADOWS.small]}>
          <Text style={styles.quickStatIcon}>💰</Text>
          <Text style={styles.quickStatValue}>PKR {stats.totalRevenue.toLocaleString()}</Text>
          <Text style={styles.quickStatLabel}>Total Revenue</Text>
        </View>
        <View style={[styles.quickStatCard, SHADOWS.small]}>
          <Text style={styles.quickStatIcon}>📊</Text>
          <Text style={styles.quickStatValue}>PKR {stats.avgDailyRevenue.toLocaleString()}</Text>
          <Text style={styles.quickStatLabel}>Avg Daily</Text>
        </View>
        <View style={[styles.quickStatCard, SHADOWS.small]}>
          <Text style={styles.quickStatIcon}>🚌</Text>
          <Text style={styles.quickStatValue}>{stats.totalTrips}</Text>
          <Text style={styles.quickStatLabel}>Total Trips</Text>
        </View>
        <View style={[styles.quickStatCard, SHADOWS.small]}>
          <Text style={styles.quickStatIcon}>⭐</Text>
          <Text style={styles.quickStatValue}>{stats.avgRating}</Text>
          <Text style={styles.quickStatLabel}>Avg Rating</Text>
        </View>
      </View>

      {/* Revenue Chart */}
      <View style={[styles.sectionCard, SHADOWS.medium]}>
        <Text style={styles.sectionTitle}>Revenue Trend</Text>
        {reportType === 'daily' && renderBarChart(
          dailyRevenue,
          Math.max(...dailyRevenue.map(d => d.revenue), 1),
          COLORS.secondary,
          'Daily Revenue'
        )}
        {reportType === 'monthly' && renderBarChart(
          monthlyRevenue,
          Math.max(...monthlyRevenue.map(m => m.revenue), 1),
          COLORS.success,
          'Monthly Revenue'
        )}
      </View>

      {/* Bus Performance */}
      <View style={[styles.sectionCard, SHADOWS.medium]}>
        <Text style={styles.sectionTitle}>Top Buses</Text>
        {busPerformance.length === 0 ? (
          <Text style={styles.emptyText}>No bus data available</Text>
        ) : (
          busPerformance.map((bus, index) => (
            <View key={index} style={styles.performanceItem}>
              <View style={styles.performanceHeader}>
                <Text style={styles.performanceName}>🚌 {bus.busNumber}</Text>
                <Text style={styles.performanceRating}>⭐ {bus.rating.toFixed(1)}</Text>
              </View>
              <View style={styles.performanceDetails}>
                <View style={styles.performanceDetail}>
                  <Text style={styles.detailLabel}>Trips:</Text>
                  <Text style={styles.detailValue}>{bus.trips}</Text>
                </View>
                <View style={styles.performanceDetail}>
                  <Text style={styles.detailLabel}>Revenue:</Text>
                  <Text style={styles.detailValue}>PKR {bus.revenue.toLocaleString()}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Driver Performance */}
      <View style={[styles.sectionCard, SHADOWS.medium]}>
        <Text style={styles.sectionTitle}>Top Drivers</Text>
        {driverPerformance.length === 0 ? (
          <Text style={styles.emptyText}>No driver data available</Text>
        ) : (
          driverPerformance.map((driver, index) => (
            <View key={index} style={styles.performanceItem}>
              <View style={styles.performanceHeader}>
                <Text style={styles.performanceName}>👤 {driver.driverName}</Text>
                <Text style={styles.performanceRating}>⭐ {driver.rating.toFixed(1)}</Text>
              </View>
              <View style={styles.performanceDetails}>
                <View style={styles.performanceDetail}>
                  <Text style={styles.detailLabel}>Trips:</Text>
                  <Text style={styles.detailValue}>{driver.trips}</Text>
                </View>
                <View style={styles.performanceDetail}>
                  <Text style={styles.detailLabel}>Revenue:</Text>
                  <Text style={styles.detailValue}>PKR {driver.revenue.toLocaleString()}</Text>
                </View>
                <View style={styles.performanceDetail}>
                  <Text style={styles.detailLabel}>Rank:</Text>
                  <Text style={[styles.detailValue, { color: index === 0 ? '#FFD700' : COLORS.secondary }]}>
                    #{index + 1}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderProfileSection = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Company Profile Card */}
      <View style={[styles.profileCard, SHADOWS.medium]}>
        <View style={styles.companyHeader}>
          <View style={styles.companyLogo}>
            <Text style={styles.logoText}>{companyInfo.name.substring(0, 2).toUpperCase()}</Text>
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{companyInfo.name}</Text>
            <Text style={styles.companyTag}>Transport Service Provider</Text>
          </View>
        </View>

        <View style={styles.profileDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📧 Email:</Text>
            <Text style={styles.detailValue}>{companyInfo.email || user?.email || 'Not set'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📞 Phone:</Text>
            <Text style={styles.detailValue}>{companyInfo.phone || 'Not set'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>🏢 Address:</Text>
            <Text style={styles.detailValue}>{companyInfo.address || 'Not set'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📝 Registration:</Text>
            <Text style={styles.detailValue}>{companyInfo.registration || 'Not set'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📅 Established:</Text>
            <Text style={styles.detailValue}>{companyInfo.established || 'Not set'}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => setProfileModalVisible(true)}
        >
          <Text style={styles.editProfileButtonText}>✏️ Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Business Stats */}
      <View style={[styles.statsCard, SHADOWS.medium]}>
        <Text style={styles.statsTitle}>Business Statistics</Text>
        <View style={styles.businessStats}>
          <View style={styles.businessStat}>
            <Text style={styles.businessStatIcon}>🚌</Text>
            <Text style={styles.businessStatValue}>{stats.activeBuses}</Text>
            <Text style={styles.businessStatLabel}>Active Buses</Text>
          </View>
          <View style={styles.businessStat}>
            <Text style={styles.businessStatIcon}>👤</Text>
            <Text style={styles.businessStatValue}>{stats.activeDrivers}</Text>
            <Text style={styles.businessStatLabel}>Active Drivers</Text>
          </View>
          <View style={styles.businessStat}>
            <Text style={styles.businessStatIcon}>✅</Text>
            <Text style={styles.businessStatValue}>{stats.completedTrips}</Text>
            <Text style={styles.businessStatLabel}>Completed</Text>
          </View>
          <View style={styles.businessStat}>
            <Text style={styles.businessStatIcon}>❌</Text>
            <Text style={styles.businessStatValue}>{stats.cancelledTrips}</Text>
            <Text style={styles.businessStatLabel}>Cancelled</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderSettingsSection = () => {
    // 👇 AGAR SETTINGS LOAD HO RAHI HAIN TO LOADER DIKHAO
    if (settingsLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      );
    }

    // 👇 SETTINGS AVAILABLE HAIN TO RENDER KARO
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Notification Settings */}
        <View style={[styles.sectionCard, SHADOWS.medium]}>
          <Text style={styles.sectionTitle}>🔔 Notification Settings</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>Receive alerts on your device</Text>
            </View>
            <Switch
              value={settings?.notifications ?? true}
              onValueChange={() => toggleSetting('notifications')}
              trackColor={{ false: COLORS.border, true: COLORS.secondary }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Email Reports</Text>
              <Text style={styles.settingDescription}>Daily/weekly reports via email</Text>
            </View>
            <Switch
              value={settings?.emailReports ?? true}
              onValueChange={() => toggleSetting('emailReports')}
              trackColor={{ false: COLORS.border, true: COLORS.secondary }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Low Bus Alert</Text>
              <Text style={styles.settingDescription}>Alert when bus count is low</Text>
            </View>
            <Switch
              value={settings?.lowBusAlert ?? true}
              onValueChange={() => toggleSetting('lowBusAlert')}
              trackColor={{ false: COLORS.border, true: COLORS.secondary }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Maintenance Reminders</Text>
              <Text style={styles.settingDescription}>Remind for bus maintenance</Text>
            </View>
            <Switch
              value={settings?.maintenanceReminders ?? true}
              onValueChange={() => toggleSetting('maintenanceReminders')}
              trackColor={{ false: COLORS.border, true: COLORS.secondary }}
            />
          </View>
        </View>

        {/* App Settings */}
        <View style={[styles.sectionCard, SHADOWS.medium]}>
          <Text style={styles.sectionTitle}>📱 App Settings</Text>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>App Version</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>
        </View>

        {/* Help & Support */}
        <View style={[styles.sectionCard, SHADOWS.medium]}>
          <Text style={styles.sectionTitle}>🆘 Help & Support</Text>

          <TouchableOpacity style={styles.helpItem}>
            <Text style={styles.helpItemText}>📚 FAQ & Guides</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.helpItem}>
            <Text style={styles.helpItemText}>📞 Contact Support</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.helpItem}>
            <Text style={styles.helpItemText}>📖 Terms & Conditions</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.helpItem}>
            <Text style={styles.helpItemText}>🔒 Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, logoutLoading && styles.buttonDisabled]}
          onPress={handleLogout}
          disabled={logoutLoading}
        >
          {logoutLoading ? (
            <Text style={styles.logoutButtonText}>Logging out...</Text>
          ) : (
            <Text style={styles.logoutButtonText}>🚪 Logout</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading reports data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>📊 Reports & Profile</Text>
          <Text style={styles.subtitle}>Analytics and company settings</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.tabActive]}
          onPress={() => setActiveTab('reports')}
        >
          <Text style={[styles.tabText, activeTab === 'reports' && styles.tabTextActive]}>
            📊 Reports
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
            🏢 Profile
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.tabActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>
            ⚙️ Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {activeTab === 'reports' && renderReportSection()}
        {activeTab === 'profile' && renderProfileSection()}
        {activeTab === 'settings' && renderSettingsSection()}
      </View>

      {/* Edit Profile Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={profileModalVisible}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Company Profile</Text>

            <TextInput
              style={styles.input}
              placeholder="Company Name"
              value={companyInfo.name}
              onChangeText={(text) => setCompanyInfo({...companyInfo, name: text})}
            />

            <TextInput
              style={styles.input}
              placeholder="Registration Number"
              value={companyInfo.registration}
              onChangeText={(text) => setCompanyInfo({...companyInfo, registration: text})}
            />

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={companyInfo.email}
              onChangeText={(text) => setCompanyInfo({...companyInfo, email: text})}
              keyboardType="email-address"
            />

            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={companyInfo.phone}
              onChangeText={(text) => setCompanyInfo({...companyInfo, phone: text})}
              keyboardType="phone-pad"
            />

            <TextInput
              style={styles.input}
              placeholder="Address"
              value={companyInfo.address}
              onChangeText={(text) => setCompanyInfo({...companyInfo, address: text})}
              multiline
            />

            <TextInput
              style={styles.input}
              placeholder="Tax Number"
              value={companyInfo.taxNumber}
              onChangeText={(text) => setCompanyInfo({...companyInfo, taxNumber: text})}
            />

            <TextInput
              style={styles.input}
              placeholder="Established Date (YYYY-MM-DD)"
              value={companyInfo.established}
              onChangeText={(text) => setCompanyInfo({...companyInfo, established: text})}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setProfileModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleUpdateProfile}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  loadingText: {
    marginTop: SIZES.sm,
    fontSize: 16,
    color: COLORS.primary,
  },
  header: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.lg,
    backgroundColor: COLORS.primary,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.greyLight,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SIZES.sm,
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: SIZES.xs,
  },
  tabActive: {
    backgroundColor: COLORS.secondary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  contentContainer: {
    flex: 1,
    paddingBottom: SIZES.lg,
  },
  reportTypeContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.xs,
    margin: SIZES.md,
    marginBottom: SIZES.xs,
  },
  reportTypeButton: {
    flex: 1,
    paddingVertical: SIZES.xs,
    alignItems: 'center',
    borderRadius: SIZES.xs,
  },
  reportTypeActive: {
    backgroundColor: COLORS.secondary,
  },
  reportTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  reportTypeTextActive: {
    color: COLORS.white,
  },
  quickStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SIZES.md,
    marginBottom: SIZES.md,
  },
  quickStatCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    marginHorizontal: '1%',
    alignItems: 'center',
  },
  quickStatIcon: {
    fontSize: 24,
    marginBottom: SIZES.xs,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  quickStatLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginHorizontal: SIZES.md,
    marginBottom: SIZES.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SIZES.md,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textLight,
    padding: SIZES.lg,
  },
  chartContainer: {
    marginBottom: SIZES.lg,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: SIZES.md,
  },
  barColumn: {
    alignItems: 'center',
    width: `${100 / 7}%`,
  },
  bar: {
    width: 20,
    borderRadius: 4,
    marginBottom: SIZES.xs,
  },
  barLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  barValue: {
    fontSize: 9,
    color: COLORS.textLighter,
  },
  performanceItem: {
    marginBottom: SIZES.md,
    paddingBottom: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  performanceName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  performanceRating: {
    fontSize: 14,
    color: COLORS.warning,
    fontWeight: '600',
  },
  performanceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceDetail: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.lg,
    margin: SIZES.md,
    marginBottom: SIZES.md,
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  companyLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  companyTag: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  profileDetails: {
    marginBottom: SIZES.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.xs,
  },
  editProfileButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.xs,
    alignItems: 'center',
  },
  editProfileButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  statsCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.lg,
    marginHorizontal: SIZES.md,
    marginBottom: SIZES.md,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SIZES.md,
  },
  businessStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  businessStat: {
    width: '48%',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  businessStatIcon: {
    fontSize: 24,
    marginBottom: SIZES.xs,
  },
  businessStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  businessStatLabel: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  settingValue: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  helpItem: {
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  helpItemText: {
    fontSize: 15,
    color: COLORS.text,
  },
  logoutButton: {
    backgroundColor: COLORS.danger,
    marginHorizontal: SIZES.md,
    marginTop: SIZES.md,
    marginBottom: SIZES.xxxl,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.xs,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },
  buttonDisabled: {
    backgroundColor: COLORS.grey,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.lg,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SIZES.lg,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    padding: SIZES.sm,
    marginBottom: SIZES.md,
    fontSize: 16,
    color: COLORS.text,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SIZES.xs,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.xs,
    alignItems: 'center',
    marginHorizontal: SIZES.xs,
  },
  cancelButton: {
    backgroundColor: COLORS.greyLight,
  },
  saveButton: {
    backgroundColor: COLORS.secondary,
  },
  cancelButtonText: {
    color: COLORS.textLight,
    fontWeight: '600',
    fontSize: 16,
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default ReportsProfileScreen;
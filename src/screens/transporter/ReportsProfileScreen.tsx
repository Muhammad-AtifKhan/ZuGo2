import React, { useState } from 'react';
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
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mock data for reports
const mockReports = {
  dailyRevenue: [
    { day: 'Mon', revenue: 12000 },
    { day: 'Tue', revenue: 13500 },
    { day: 'Wed', revenue: 11000 },
    { day: 'Thu', revenue: 15000 },
    { day: 'Fri', revenue: 18000 },
    { day: 'Sat', revenue: 22000 },
    { day: 'Sun', revenue: 19000 },
  ],
  monthlyRevenue: [
    { month: 'Jan', revenue: 350000 },
    { month: 'Feb', revenue: 320000 },
    { month: 'Mar', revenue: 380000 },
    { month: 'Apr', revenue: 400000 },
    { month: 'May', revenue: 420000 },
    { month: 'Jun', revenue: 450000 },
  ],
  busPerformance: [
    { bus: 'B-001', trips: 45, revenue: 180000, rating: 4.5 },
    { bus: 'B-002', trips: 38, revenue: 152000, rating: 4.2 },
    { bus: 'B-003', trips: 52, revenue: 208000, rating: 4.7 },
    { bus: 'B-004', trips: 30, revenue: 120000, rating: 4.0 },
    { bus: 'B-005', trips: 48, revenue: 192000, rating: 4.6 },
  ],
  driverPerformance: [
    { driver: 'Ali Ahmed', trips: 120, rating: 4.5, revenue: 480000 },
    { driver: 'Ahmed Khan', trips: 95, rating: 4.2, revenue: 380000 },
    { driver: 'Sara Ali', trips: 150, rating: 4.8, revenue: 600000 },
    { driver: 'Usman Khan', trips: 80, rating: 4.0, revenue: 320000 },
    { driver: 'Bilal Raza', trips: 200, rating: 4.7, revenue: 800000 },
  ],
};

// Company profile data
const companyProfile = {
  name: 'City Transport Co.',
  registration: 'TRP-2023-001',
  email: 'info@citytransport.com',
  phone: '+92 42 1234567',
  address: '123 Main Street, Lahore, Pakistan',
  taxNumber: 'TXN-123456789',
  established: '2020-01-15',
  totalBuses: 12,
  totalDrivers: 8,
  activeSince: '3 years',
};

const ReportsProfileScreen = () => {
  const [activeTab, setActiveTab] = useState('reports'); // reports, profile, settings
  const [reportType, setReportType] = useState('daily'); // daily, weekly, monthly
  const [settings, setSettings] = useState({
    notifications: true,
    emailReports: true,
    lowBusAlert: true,
    maintenanceReminders: true,
    autoGenerateReports: false,
  });
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(companyProfile);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    role: 'manager',
    permissions: ['view'],
  });

  // Staff members
  const [staffMembers, setStaffMembers] = useState([
    { id: '1', name: 'Ali Manager', email: 'ali@company.com', role: 'admin', permissions: ['all'] },
    { id: '2', name: 'Ahmed Dispatcher', email: 'ahmed@company.com', role: 'dispatcher', permissions: ['operations'] },
    { id: '3', name: 'Sara Accountant', email: 'sara@company.com', role: 'accountant', permissions: ['finance'] },
  ]);

  // Calculate stats
  const stats = {
    totalRevenue: mockReports.monthlyRevenue.reduce((sum, item) => sum + item.revenue, 0),
    avgDailyRevenue: Math.round(mockReports.dailyRevenue.reduce((sum, item) => sum + item.revenue, 0) / 7),
    totalTrips: mockReports.busPerformance.reduce((sum, item) => sum + item.trips, 0),
    avgRating: (mockReports.driverPerformance.reduce((sum, item) => sum + item.rating, 0) / mockReports.driverPerformance.length).toFixed(1),
  };

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const handleUpdateProfile = () => {
    Alert.alert('Success', 'Company profile updated successfully');
    setProfileModalVisible(false);
  };

  const handleAddStaff = () => {
    if (!newStaff.name || !newStaff.email) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    const newStaffMember = {
      id: (staffMembers.length + 1).toString(),
      name: newStaff.name,
      email: newStaff.email,
      role: newStaff.role,
      permissions: newStaff.permissions,
    };

    setStaffMembers([...staffMembers, newStaffMember]);
    setNewStaff({ name: '', email: '', role: 'manager', permissions: ['view'] });
    Alert.alert('Success', 'Staff member added successfully');
  };

  const renderBarChart = (data: any[], maxValue: number, color: string) => {
    const chartHeight = 100;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartBars}>
          {data.map((item, index) => {
            const barHeight = (item.revenue / maxValue) * chartHeight;
            return (
              <View key={index} style={styles.barColumn}>
                <View style={[styles.bar, { height: barHeight, backgroundColor: color }]} />
                <Text style={styles.barLabel}>{item.day || item.month}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: color }]} />
            <Text style={styles.legendText}>Revenue (in thousands)</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderReportSection = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
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
          style={[styles.reportTypeButton, reportType === 'weekly' && styles.reportTypeActive]}
          onPress={() => setReportType('weekly')}
        >
          <Text style={[styles.reportTypeText, reportType === 'weekly' && styles.reportTypeTextActive]}>
            Weekly
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
        <View style={styles.quickStatCard}>
          <Text style={styles.quickStatIcon}>💰</Text>
          <Text style={styles.quickStatValue}>₹{stats.totalRevenue.toLocaleString()}</Text>
          <Text style={styles.quickStatLabel}>Total Revenue</Text>
        </View>
        <View style={styles.quickStatCard}>
          <Text style={styles.quickStatIcon}>📊</Text>
          <Text style={styles.quickStatValue}>₹{stats.avgDailyRevenue}</Text>
          <Text style={styles.quickStatLabel}>Avg Daily</Text>
        </View>
        <View style={styles.quickStatCard}>
          <Text style={styles.quickStatIcon}>🚌</Text>
          <Text style={styles.quickStatValue}>{stats.totalTrips}</Text>
          <Text style={styles.quickStatLabel}>Total Trips</Text>
        </View>
        <View style={styles.quickStatCard}>
          <Text style={styles.quickStatIcon}>⭐</Text>
          <Text style={styles.quickStatValue}>{stats.avgRating}</Text>
          <Text style={styles.quickStatLabel}>Avg Rating</Text>
        </View>
      </View>

      {/* Revenue Chart */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Revenue Trend</Text>
        {reportType === 'daily' && renderBarChart(mockReports.dailyRevenue, 25000, '#4A90E2')}
        {reportType === 'monthly' && renderBarChart(mockReports.monthlyRevenue, 500000, '#4CAF50')}
        <TouchableOpacity style={styles.exportButton}>
          <Text style={styles.exportButtonText}>📥 Export as PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Bus Performance */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Bus Performance</Text>
        {mockReports.busPerformance.map((bus, index) => (
          <View key={index} style={styles.performanceItem}>
            <View style={styles.performanceHeader}>
              <Text style={styles.performanceName}>🚌 {bus.bus}</Text>
              <Text style={styles.performanceRating}>⭐ {bus.rating}</Text>
            </View>
            <View style={styles.performanceDetails}>
              <View style={styles.performanceDetail}>
                <Text style={styles.detailLabel}>Trips:</Text>
                <Text style={styles.detailValue}>{bus.trips}</Text>
              </View>
              <View style={styles.performanceDetail}>
                <Text style={styles.detailLabel}>Revenue:</Text>
                <Text style={styles.detailValue}>₹{bus.revenue.toLocaleString()}</Text>
              </View>
              <View style={styles.performanceDetail}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={[styles.detailValue, { color: '#4CAF50' }]}>Active</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Driver Performance */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Driver Performance</Text>
        {mockReports.driverPerformance.map((driver, index) => (
          <View key={index} style={styles.performanceItem}>
            <View style={styles.performanceHeader}>
              <Text style={styles.performanceName}>👤 {driver.driver}</Text>
              <Text style={styles.performanceRating}>⭐ {driver.rating}</Text>
            </View>
            <View style={styles.performanceDetails}>
              <View style={styles.performanceDetail}>
                <Text style={styles.detailLabel}>Trips:</Text>
                <Text style={styles.detailValue}>{driver.trips}</Text>
              </View>
              <View style={styles.performanceDetail}>
                <Text style={styles.detailLabel}>Revenue:</Text>
                <Text style={styles.detailValue}>₹{driver.revenue.toLocaleString()}</Text>
              </View>
              <View style={styles.performanceDetail}>
                <Text style={styles.detailLabel}>Rank:</Text>
                <Text style={[styles.detailValue, { color: index === 0 ? '#FFD700' : '#4A90E2' }]}>
                  #{index + 1}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Custom Report Generator */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Custom Report</Text>
        <View style={styles.customReportForm}>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Start Date:</Text>
            <TouchableOpacity style={styles.dateInput}>
              <Text style={styles.dateInputText}>2024-01-01</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>End Date:</Text>
            <TouchableOpacity style={styles.dateInput}>
              <Text style={styles.dateInputText}>2024-01-31</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Report Type:</Text>
            <TouchableOpacity style={styles.dropdown}>
              <Text style={styles.dropdownText}>Financial Summary</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.generateButton}>
            <Text style={styles.generateButtonText}>Generate Report</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderProfileSection = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Company Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.companyHeader}>
          <View style={styles.companyLogo}>
            <Text style={styles.logoText}>CT</Text>
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{companyInfo.name}</Text>
            <Text style={styles.companyTag}>Transport Service Provider</Text>
          </View>
        </View>

        <View style={styles.profileDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>📧 Email:</Text>
            <Text style={styles.detailValue}>{companyInfo.email}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>📞 Phone:</Text>
            <Text style={styles.detailValue}>{companyInfo.phone}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>🏢 Address:</Text>
            <Text style={styles.detailValue}>{companyInfo.address}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>📝 Registration:</Text>
            <Text style={styles.detailValue}>{companyInfo.registration}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>🧾 Tax Number:</Text>
            <Text style={styles.detailValue}>{companyInfo.taxNumber}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>📅 Established:</Text>
            <Text style={styles.detailValue}>{companyInfo.established}</Text>
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
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Business Statistics</Text>
        <View style={styles.businessStats}>
          <View style={styles.businessStat}>
            <Text style={styles.businessStatIcon}>🚌</Text>
            <Text style={styles.businessStatValue}>{companyInfo.totalBuses}</Text>
            <Text style={styles.businessStatLabel}>Total Buses</Text>
          </View>
          <View style={styles.businessStat}>
            <Text style={styles.businessStatIcon}>👤</Text>
            <Text style={styles.businessStatValue}>{companyInfo.totalDrivers}</Text>
            <Text style={styles.businessStatLabel}>Drivers</Text>
          </View>
          <View style={styles.businessStat}>
            <Text style={styles.businessStatIcon}>⏱️</Text>
            <Text style={styles.businessStatValue}>{companyInfo.activeSince}</Text>
            <Text style={styles.businessStatLabel}>Active Since</Text>
          </View>
          <View style={styles.businessStat}>
            <Text style={styles.businessStatIcon}>⭐</Text>
            <Text style={styles.businessStatValue}>4.5</Text>
            <Text style={styles.businessStatLabel}>Rating</Text>
          </View>
        </View>
      </View>

      {/* Staff Management */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>👥 Staff Management</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => Alert.alert('Add Staff', 'Add new staff member')}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {staffMembers.map((staff) => (
          <View key={staff.id} style={styles.staffCard}>
            <View style={styles.staffInfo}>
              <Text style={styles.staffName}>{staff.name}</Text>
              <Text style={styles.staffRole}>{staff.role.toUpperCase()}</Text>
            </View>
            <Text style={styles.staffEmail}>{staff.email}</Text>
            <View style={styles.staffActions}>
              <TouchableOpacity style={styles.staffActionButton}>
                <Text style={styles.staffActionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.staffActionButton, styles.removeButton]}>
                <Text style={[styles.staffActionText, styles.removeText]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Bank Details */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🏦 Bank Details</Text>
        <View style={styles.bankDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Bank Name:</Text>
            <Text style={styles.detailValue}>Habib Bank Limited</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Account Title:</Text>
            <Text style={styles.detailValue}>City Transport Co.</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Account Number:</Text>
            <Text style={styles.detailValue}>0123456789012</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>IBAN:</Text>
            <Text style={styles.detailValue}>PK36HABB0000123456789012</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit Bank Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderSettingsSection = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Notification Settings */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🔔 Notifications</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Text style={styles.settingDescription}>Receive alerts on your device</Text>
          </View>
          <Switch
            value={settings.notifications}
            onValueChange={() => toggleSetting('notifications')}
            trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Email Reports</Text>
            <Text style={styles.settingDescription}>Daily/weekly reports via email</Text>
          </View>
          <Switch
            value={settings.emailReports}
            onValueChange={() => toggleSetting('emailReports')}
            trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Low Bus Alert</Text>
            <Text style={styles.settingDescription}>Alert when bus count is low</Text>
          </View>
          <Switch
            value={settings.lowBusAlert}
            onValueChange={() => toggleSetting('lowBusAlert')}
            trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Maintenance Reminders</Text>
            <Text style={styles.settingDescription}>Remind for bus maintenance</Text>
          </View>
          <Switch
            value={settings.maintenanceReminders}
            onValueChange={() => toggleSetting('maintenanceReminders')}
            trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto Generate Reports</Text>
            <Text style={styles.settingDescription}>Generate reports automatically</Text>
          </View>
          <Switch
            value={settings.autoGenerateReports}
            onValueChange={() => toggleSetting('autoGenerateReports')}
            trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
          />
        </View>
      </View>

      {/* Business Settings */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>⚙️ Business Settings</Text>

        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Operating Hours:</Text>
          <TouchableOpacity style={styles.settingInput}>
            <Text style={styles.settingInputText}>06:00 AM - 11:00 PM</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Cancellation Policy:</Text>
          <TouchableOpacity style={styles.settingInput}>
            <Text style={styles.settingInputText}>24 hours before departure</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Refund Policy:</Text>
          <TouchableOpacity style={styles.settingInput}>
            <Text style={styles.settingInputText}>90% refund if cancelled 24h before</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Peak Hours:</Text>
          <TouchableOpacity style={styles.settingInput}>
            <Text style={styles.settingInputText}>08:00-10:00 AM, 05:00-08:00 PM</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.saveSettingsButton}>
          <Text style={styles.saveSettingsButtonText}>Save Settings</Text>
        </TouchableOpacity>
      </View>

      {/* App Settings */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>📱 App Settings</Text>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Theme</Text>
          <TouchableOpacity style={styles.themeOption}>
            <Text style={styles.themeOptionText}>Light</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Language</Text>
          <TouchableOpacity style={styles.themeOption}>
            <Text style={styles.themeOptionText}>English</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Currency</Text>
          <TouchableOpacity style={styles.themeOption}>
            <Text style={styles.themeOptionText}>PKR (₹)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>App Version</Text>
          <Text style={styles.settingValue}>1.0.0</Text>
        </View>
      </View>

      {/* Help & Support */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🆘 Help & Support</Text>

        <TouchableOpacity style={styles.helpItem}>
          <Text style={styles.helpItemText}>📚 FAQ & Guides</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.helpItem}>
          <Text style={styles.helpItemText}>📞 Contact Support</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.helpItem}>
          <Text style={styles.helpItemText}>💬 Send Feedback</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.helpItem}>
          <Text style={styles.helpItemText}>📖 Terms & Conditions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.helpItem}>
          <Text style={styles.helpItemText}>🔒 Privacy Policy</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.helpItem, styles.deleteAccount]}>
          <Text style={[styles.helpItemText, styles.deleteAccountText]}>🗑️ Delete Account</Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton}>
        <Text style={styles.logoutButtonText}>🚪 Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );

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
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#1A237E',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#E0E0E0',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#4A90E2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  reportTypeContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    margin: 16,
    marginBottom: 8,
  },
  reportTypeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  reportTypeActive: {
    backgroundColor: '#4A90E2',
  },
  reportTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  reportTypeTextActive: {
    color: '#FFFFFF',
  },
  quickStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  quickStatCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: '1%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickStatIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#666666',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 16,
  },
  chartContainer: {
    marginBottom: 20,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    marginBottom: 20,
  },
  barColumn: {
    alignItems: 'center',
    width: `${100 / 7}%`,
  },
  bar: {
    width: 16,
    borderRadius: 4,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 10,
    color: '#666666',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#666666',
  },
  exportButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  performanceItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  performanceRating: {
    fontSize: 14,
    color: '#FF9800',
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
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  customReportForm: {
    marginTop: 8,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  formLabel: {
    width: 100,
    fontSize: 14,
    color: '#666666',
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#F8F9FA',
  },
  dateInputText: {
    fontSize: 14,
    color: '#333333',
  },
  dropdown: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#F8F9FA',
  },
  dropdownText: {
    fontSize: 14,
    color: '#333333',
  },
  generateButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  companyLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 4,
  },
  companyTag: {
    fontSize: 14,
    color: '#666666',
  },
  profileDetails: {
    marginBottom: 20,
  },
  editProfileButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editProfileButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 20,
  },
  businessStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  businessStat: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 20,
  },
  businessStatIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  businessStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 4,
  },
  businessStatLabel: {
    fontSize: 12,
    color: '#666666',
  },
  addButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  staffCard: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  staffInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  staffRole: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  staffEmail: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  staffActions: {
    flexDirection: 'row',
  },
  staffActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
  },
  staffActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  removeButton: {
    backgroundColor: '#FFEBEE',
  },
  removeText: {
    color: '#F44336',
  },
  bankDetails: {
    marginTop: 8,
  },
  editButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666666',
  },
  settingValue: {
    fontSize: 14,
    color: '#666666',
  },
  settingInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#F8F9FA',
  },
  settingInputText: {
    fontSize: 14,
    color: '#333333',
  },
  saveSettingsButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveSettingsButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  themeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
  },
  themeOptionText: {
    fontSize: 14,
    color: '#333333',
  },
  helpItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  helpItemText: {
    fontSize: 16,
    color: '#333333',
  },
  deleteAccount: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
  deleteAccountText: {
    color: '#F44336',
  },
  logoutButton: {
    backgroundColor: '#F44336',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  cancelButtonText: {
    color: '#666666',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default ReportsProfileScreen;
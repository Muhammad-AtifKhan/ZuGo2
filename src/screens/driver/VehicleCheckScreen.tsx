import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

type VehicleCheckScreenProps = {
  navigation: StackNavigationProp<any>;
  route?: any;
};

interface ChecklistItem {
  id: string;
  title: string;
  checked: boolean;
  description?: string;
  category: 'exterior' | 'interior' | 'mechanical' | 'safety' | 'documents';
}

interface IssueType {
  id: string;
  label: string;
  value: string;
  category: string;
}

interface VehicleCheck {
  id: string;
  driverId: string;
  driverName: string;
  tripId?: string;
  busId: string;
  busNumber: string;
  checkDate: any;
  checkType: 'pre-trip' | 'post-trip' | 'weekly' | 'incident';
  items: ChecklistItem[];
  passed: boolean;
  issues?: VehicleIssue[];
  odometerReading?: number;
  fuelLevel?: number;
  notes?: string;
  completedAt: any;
}

interface VehicleIssue {
  id: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'reported' | 'in-progress' | 'resolved';
  reportedAt: any;
  resolvedAt?: any;
  photos?: string[];
}

const VehicleCheckScreen: React.FC<VehicleCheckScreenProps> = ({ navigation, route }) => {
  const user = auth().currentUser;
  const dutyId = route?.params?.dutyId;
  const tripId = route?.params?.tripId;
  const dutyDetails = route?.params?.dutyDetails;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [busInfo, setBusInfo] = useState<{ id: string; number: string } | null>(null);

  // Check if coming from START DUTY flow
  const [isStartDutyFlow, setIsStartDutyFlow] = useState(!!dutyId);

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', title: 'Fuel Level', checked: false, description: 'Check fuel gauge - should be at least half tank', category: 'mechanical' },
    { id: '2', title: 'Tire Pressure', checked: false, description: 'Check all tires for proper inflation', category: 'exterior' },
    { id: '3', title: 'Lights', checked: false, description: 'Headlights, brake lights, indicators, interior lights', category: 'exterior' },
    { id: '4', title: 'Brakes', checked: false, description: 'Test brake pedal response and emergency brake', category: 'mechanical' },
    { id: '5', title: 'Engine Oil', checked: false, description: 'Check oil level using dipstick', category: 'mechanical' },
    { id: '6', title: 'First Aid Kit', checked: false, description: 'Verify kit is present and fully stocked', category: 'safety' },
    { id: '7', title: 'Fire Extinguisher', checked: false, description: 'Check pressure gauge and expiry date', category: 'safety' },
    { id: '8', title: 'Emergency Tools', checked: false, description: 'Triangle, spare tire, jack, tools', category: 'safety' },
    { id: '9', title: 'Cleanliness', checked: false, description: 'Interior and exterior cleanliness', category: 'interior' },
    { id: '10', title: 'Documents', checked: false, description: 'Registration, insurance, permits, license', category: 'documents' },
  ]);

  const [allChecked, setAllChecked] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [selectedIssueType, setSelectedIssueType] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueSeverity, setIssueSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [odometerReading, setOdometerReading] = useState('');
  const [fuelLevel, setFuelLevel] = useState('');
  const [notes, setNotes] = useState('');

  const [recentChecks, setRecentChecks] = useState<VehicleCheck[]>([]);

  const issueTypes: IssueType[] = [
    { id: '1', label: 'Fuel Issue', value: 'fuel', category: 'mechanical' },
    { id: '2', label: 'Tire Problem', value: 'tire', category: 'exterior' },
    { id: '3', label: 'Brake Problem', value: 'brake', category: 'mechanical' },
    { id: '4', label: 'Engine Issue', value: 'engine', category: 'mechanical' },
    { id: '5', label: 'Electrical Problem', value: 'electrical', category: 'mechanical' },
    { id: '6', label: 'Other Mechanical', value: 'mechanical', category: 'mechanical' },
    { id: '7', label: 'Safety Equipment', value: 'safety', category: 'safety' },
    { id: '8', label: 'Cleanliness', value: 'cleanliness', category: 'interior' },
    { id: '9', label: 'Document Issue', value: 'document', category: 'documents' },
    { id: '10', label: 'Other', value: 'other', category: 'other' },
  ];

  // Fetch driver and bus info
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Get driver info
        const driverDoc = await firestore().collection('drivers').doc(user.uid).get();
        if (driverDoc.exists) {
          const data = driverDoc.data();
          setDriverName(data?.fullName || 'Driver');

          // If bus is assigned
          if (data?.busNumber) {
            setBusInfo({
              id: data?.vehicleAssigned || '',
              number: data?.busNumber || 'B-001',
            });
          }
        }

        // If duty details provided, use that bus
        if (dutyDetails?.busNumber) {
          setBusInfo({
            id: dutyDetails.busId || '',
            number: dutyDetails.busNumber,
          });
        }

        // Fetch recent checks
        const checksSnapshot = await firestore()
          .collection('vehicle_checks')
          .where('driverId', '==', user.uid)
          .orderBy('checkDate', 'desc')
          .limit(5)
          .get();

        const checks: VehicleCheck[] = [];
        checksSnapshot.forEach(doc => {
          const data = doc.data();
          checks.push({
            id: doc.id,
            driverId: data.driverId,
            driverName: data.driverName,
            tripId: data.tripId,
            busId: data.busId,
            busNumber: data.busNumber,
            checkDate: data.checkDate,
            checkType: data.checkType,
            items: data.items,
            passed: data.passed,
            issues: data.issues,
            completedAt: data.completedAt,
          });
        });

        setRecentChecks(checks);
        setLoading(false);
        setRefreshing(false);

      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchData();
  }, [user, dutyDetails]);

  // Toggle checklist item
  const toggleChecklistItem = (id: string) => {
    const updatedChecklist = checklist.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );

    setChecklist(updatedChecklist);

    // Check if all items are checked
    const allCheckedNow = updatedChecklist.every(item => item.checked);
    setAllChecked(allCheckedNow);
  };

  // Handle vehicle OK
  const handleVehicleOK = async () => {
    if (!allChecked) {
      Alert.alert(
        'Incomplete Checklist',
        'Please check all items before marking vehicle as OK.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!busInfo) {
      Alert.alert('Error', 'No bus information available');
      return;
    }

    Alert.alert(
      'Vehicle Check Complete',
      'All vehicle checks passed successfully.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: async () => {
            setSaving(true);

            try {
              // Create vehicle check record
              const checkData = {
                driverId: user?.uid,
                driverName: driverName,
                tripId: tripId || null,
                busId: busInfo.id,
                busNumber: busInfo.number,
                checkDate: firestore.FieldValue.serverTimestamp(),
                checkType: isStartDutyFlow ? 'pre-trip' : 'weekly',
                items: checklist,
                passed: true,
                odometerReading: odometerReading ? parseInt(odometerReading) : null,
                fuelLevel: fuelLevel ? parseInt(fuelLevel) : null,
                notes: notes || null,
                completedAt: firestore.FieldValue.serverTimestamp(),
              };

              const checkRef = await firestore().collection('vehicle_checks').add(checkData);

              // Update bus last check date
              if (busInfo.id) {
                await firestore().collection('buses').doc(busInfo.id).update({
                  lastCheck: firestore.FieldValue.serverTimestamp(),
                  lastCheckId: checkRef.id,
                });
              }

              setSaving(false);

              if (isStartDutyFlow && tripId) {
                // Update trip status to in-progress
                await firestore().collection('trips').doc(tripId).update({
                  status: 'in-progress',
                  vehicleCheckId: checkRef.id,
                  actualStartTime: firestore.FieldValue.serverTimestamp(),
                });

                Alert.alert(
                  'Duty Started',
                  'Vehicle check completed. Your duty has started successfully.',
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.navigate('Route', { tripId })
                    }
                  ]
                );
              } else {
                Alert.alert(
                  'Success',
                  'Vehicle check report submitted successfully.',
                  [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
              }

            } catch (error) {
              console.error('Error saving vehicle check:', error);
              Alert.alert('Error', 'Failed to save vehicle check');
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  // Handle report issue
  const handleReportIssue = () => {
    setShowIssueForm(true);
  };

  // Handle submit issue
  const handleSubmitIssue = async () => {
    if (!selectedIssueType) {
      Alert.alert('Error', 'Please select an issue type.');
      return;
    }

    if (!issueDescription.trim()) {
      Alert.alert('Error', 'Please describe the issue.');
      return;
    }

    if (!busInfo) {
      Alert.alert('Error', 'No bus information available');
      return;
    }

    setIsSubmitting(true);

    try {
      const issueTypeLabel = issueTypes.find(type => type.value === selectedIssueType)?.label;

      // Create issue record
      const issue: VehicleIssue = {
        id: Date.now().toString(),
        type: selectedIssueType,
        description: issueDescription,
        severity: issueSeverity,
        status: 'reported',
        reportedAt: firestore.FieldValue.serverTimestamp() as any,
      };

      // Save to Firebase
      const issueRef = await firestore().collection('vehicle_issues').add({
        busId: busInfo.id,
        busNumber: busInfo.number,
        driverId: user?.uid,
        driverName: driverName,
        tripId: tripId || null,
        ...issue,
        reportedAt: firestore.FieldValue.serverTimestamp(),
      });

      // Update bus status
      await firestore().collection('buses').doc(busInfo.id).update({
        status: issueSeverity === 'critical' || issueSeverity === 'high' ? 'maintenance' : 'active',
        currentIssueId: issueRef.id,
        lastIssueReported: firestore.FieldValue.serverTimestamp(),
      });

      // Create notification for maintenance team
      await firestore().collection('notifications').add({
        type: 'maintenance',
        title: 'Vehicle Issue Reported',
        message: `${issueTypeLabel} issue reported for bus ${busInfo.number} by ${driverName}`,
        busId: busInfo.id,
        busNumber: busInfo.number,
        issueId: issueRef.id,
        severity: issueSeverity,
        timestamp: firestore.FieldValue.serverTimestamp(),
        read: false,
        actionable: true,
      });

      setIsSubmitting(false);
      setShowIssueForm(false);
      setSelectedIssueType('');
      setIssueDescription('');
      setIssueSeverity('medium');

      Alert.alert(
        'Issue Reported',
        `Your ${issueTypeLabel} issue has been reported to the maintenance team. They will contact you shortly.${
          issueSeverity === 'critical' ? '\n\n⚠️ CRITICAL ISSUE: Emergency team notified.' : ''
        }`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (isStartDutyFlow) {
                Alert.alert(
                  'Duty On Hold',
                  'Your duty has been put on hold until the issue is resolved.',
                  [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
              }
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error reporting issue:', error);
      Alert.alert('Error', 'Failed to report issue');
      setIsSubmitting(false);
    }
  };

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Data will auto-refresh
  }, []);

  const getIssueTypeLabel = (value: string) => {
    return issueTypes.find(type => type.value === value)?.label || value;
  };

  const renderChecklistItem = (item: ChecklistItem) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.checklistItem}
        onPress={() => toggleChecklistItem(item.id)}
      >
        <View style={styles.checkboxContainer}>
          <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
            {item.checked && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </View>

        <View style={styles.checklistContent}>
          <Text style={[styles.checklistTitle, item.checked && styles.checkedText]}>
            {item.title}
          </Text>
          {item.description && (
            <Text style={styles.checklistDescription}>
              {item.description}
            </Text>
          )}
        </View>

        <Text style={styles.statusIndicator}>
          {item.checked ? '✅' : '🔘'}
        </Text>
      </TouchableOpacity>
    );
  };

  const checkedCount = checklist.filter(item => item.checked).length;
  const totalCount = checklist.length;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading vehicle check...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1A237E" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔧 VEHICLE CHECK</Text>
        {busInfo && (
          <Text style={styles.busInfo}>
            🚌 {busInfo.number} • Driver: {driverName}
          </Text>
        )}
        {isStartDutyFlow && (
          <Text style={styles.headerSubtitle}>Required before starting duty</Text>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Progress Indicator */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Pre-Trip Inspection</Text>
            <Text style={styles.progressCount}>
              {checkedCount}/{totalCount} completed
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(checkedCount / totalCount) * 100}%` }
              ]}
            />
          </View>

          <Text style={styles.progressNote}>
            Complete all checks before starting duty
          </Text>
        </View>

        {/* Additional Readings */}
        <View style={styles.readingsSection}>
          <View style={styles.readingInput}>
            <Text style={styles.readingLabel}>Odometer (km)</Text>
            <TextInput
              style={styles.readingField}
              value={odometerReading}
              onChangeText={setOdometerReading}
              keyboardType="numeric"
              placeholder="12345"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.readingInput}>
            <Text style={styles.readingLabel}>Fuel Level (%)</Text>
            <TextInput
              style={styles.readingField}
              value={fuelLevel}
              onChangeText={setFuelLevel}
              keyboardType="numeric"
              placeholder="50"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Checklist Section */}
        <View style={styles.checklistSection}>
          <Text style={styles.sectionTitle}>CHECKLIST</Text>
          <View style={styles.checklistContainer}>
            {checklist.map(renderChecklistItem)}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>ADDITIONAL NOTES</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional observations or comments..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.okButton,
              (!allChecked || saving) && styles.disabledButton
            ]}
            onPress={handleVehicleOK}
            disabled={!allChecked || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.okButtonText}>
                ✅ VEHICLE OK
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.issueButton]}
            onPress={handleReportIssue}
            disabled={saving}
          >
            <Text style={styles.issueButtonText}>
              ⚠️ REPORT ISSUE
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Checks */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>RECENT CHECKS</Text>
          <View style={styles.recentCard}>
            {recentChecks.length > 0 ? (
              recentChecks.map((check) => {
                const checkDate = check.checkDate?.toDate?.() || new Date();
                const dateStr = checkDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <View key={check.id} style={styles.recentItem}>
                    <Text style={styles.recentDate}>{dateStr}</Text>
                    <View style={[
                      styles.statusBadge,
                      check.passed ? styles.statusBadgeSuccess : styles.statusBadgeWarning
                    ]}>
                      <Text style={styles.statusBadgeText}>
                        {check.passed ? 'PASSED' : 'ISSUES'}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.noRecentText}>No recent checks found</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Issue Report Modal */}
      <Modal
        visible={showIssueForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowIssueForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚠️ REPORT VEHICLE ISSUE</Text>
              <TouchableOpacity onPress={() => setShowIssueForm(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Issue Type Selection */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Issue Type *</Text>
                <View style={styles.issueTypeGrid}>
                  {issueTypes.map(type => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.issueTypeButton,
                        selectedIssueType === type.value && styles.issueTypeSelected
                      ]}
                      onPress={() => setSelectedIssueType(type.value)}
                    >
                      <Text style={[
                        styles.issueTypeText,
                        selectedIssueType === type.value && styles.issueTypeTextSelected
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Severity Selection */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Severity *</Text>
                <View style={styles.severityGrid}>
                  <TouchableOpacity
                    style={[
                      styles.severityButton,
                      issueSeverity === 'low' && styles.severityLowSelected
                    ]}
                    onPress={() => setIssueSeverity('low')}
                  >
                    <Text style={[
                      styles.severityText,
                      issueSeverity === 'low' && styles.severityTextSelected
                    ]}>LOW</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.severityButton,
                      issueSeverity === 'medium' && styles.severityMediumSelected
                    ]}
                    onPress={() => setIssueSeverity('medium')}
                  >
                    <Text style={[
                      styles.severityText,
                      issueSeverity === 'medium' && styles.severityTextSelected
                    ]}>MEDIUM</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.severityButton,
                      issueSeverity === 'high' && styles.severityHighSelected
                    ]}
                    onPress={() => setIssueSeverity('high')}
                  >
                    <Text style={[
                      styles.severityText,
                      issueSeverity === 'high' && styles.severityTextSelected
                    ]}>HIGH</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.severityButton,
                      issueSeverity === 'critical' && styles.severityCriticalSelected
                    ]}
                    onPress={() => setIssueSeverity('critical')}
                  >
                    <Text style={[
                      styles.severityText,
                      issueSeverity === 'critical' && styles.severityTextSelected
                    ]}>CRITICAL</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Description */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Description *</Text>
                <TextInput
                  style={styles.descriptionInput}
                  placeholder="Describe the issue in detail..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  value={issueDescription}
                  onChangeText={setIssueDescription}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>
                  {issueDescription.length}/500 characters
                </Text>
              </View>

              {/* Additional Info */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Additional Information</Text>
                <View style={styles.infoCard}>
                  <Text style={styles.infoText}>
                    • Your location will be shared with maintenance team
                  </Text>
                  <Text style={styles.infoText}>
                    • Expected response time: 30-60 minutes
                  </Text>
                  <Text style={styles.infoText}>
                    • Emergency contact: +92 300 1234567
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowIssueForm(false)}
              >
                <Text style={styles.cancelButtonText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmitIssue}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>SUBMIT REPORT</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4A90E2',
  },
  header: {
    backgroundColor: '#1A237E',
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  busInfo: {
    fontSize: 14,
    color: '#E3F2FD',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E3F2FD',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  progressSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  progressCount: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressNote: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
  readingsSection: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  readingInput: {
    flex: 1,
  },
  readingLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  readingField: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1A237E',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  checklistSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
  },
  checklistContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checklistContent: {
    flex: 1,
  },
  checklistTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 4,
  },
  checkedText: {
    color: '#666666',
    textDecorationLine: 'line-through',
  },
  checklistDescription: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
  },
  statusIndicator: {
    fontSize: 20,
    marginLeft: 8,
  },
  notesSection: {
    marginTop: 20,
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#1A237E',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 80,
  },
  actionSection: {
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  okButton: {
    backgroundColor: '#4CAF50',
  },
  issueButton: {
    backgroundColor: '#FF9800',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  okButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  issueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recentSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  recentDate: {
    fontSize: 14,
    color: '#1A237E',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeSuccess: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgeWarning: {
    backgroundColor: '#FFF3E0',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  noRecentText: {
    textAlign: 'center',
    color: '#666666',
    padding: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  modalClose: {
    fontSize: 24,
    color: '#666666',
    padding: 4,
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  formSection: {
    marginTop: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 8,
  },
  issueTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  issueTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  issueTypeSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  issueTypeText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  issueTypeTextSelected: {
    color: '#FFFFFF',
  },
  severityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  severityButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    minWidth: '22%',
  },
  severityLowSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  severityMediumSelected: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  severityHighSelected: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  severityCriticalSelected: {
    backgroundColor: '#9C27B0',
    borderColor: '#9C27B0',
  },
  severityText: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '600',
  },
  severityTextSelected: {
    color: '#FFFFFF',
  },
  descriptionInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1A237E',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#1A237E',
    marginBottom: 4,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  submitButton: {
    backgroundColor: '#FF9800',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default VehicleCheckScreen;
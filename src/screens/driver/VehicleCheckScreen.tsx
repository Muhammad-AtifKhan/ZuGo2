import React, { useState } from 'react';
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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';

type VehicleCheckScreenProps = {
  navigation: StackNavigationProp<any>;
  route?: any;
};

interface ChecklistItem {
  id: string;
  title: string;
  checked: boolean;
  description?: string;
}

interface IssueType {
  id: string;
  label: string;
  value: string;
}

const VehicleCheckScreen: React.FC<VehicleCheckScreenProps> = ({ navigation, route }) => {
  const dutyId = route?.params?.dutyId;

  // Check if coming from START DUTY flow
  const [isStartDutyFlow, setIsStartDutyFlow] = useState(!!dutyId);

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', title: 'Fuel Level', checked: false, description: 'Check fuel gauge - should be at least half tank' },
    { id: '2', title: 'Tire Pressure', checked: false, description: 'Check all tires for proper inflation' },
    { id: '3', title: 'Lights', checked: false, description: 'Headlights, brake lights, indicators, interior lights' },
    { id: '4', title: 'Brakes', checked: false, description: 'Test brake pedal response and emergency brake' },
    { id: '5', title: 'Engine Oil', checked: false, description: 'Check oil level using dipstick' },
    { id: '6', title: 'First Aid Kit', checked: false, description: 'Verify kit is present and fully stocked' },
    { id: '7', title: 'Fire Extinguisher', checked: false, description: 'Check pressure gauge and expiry date' },
    { id: '8', title: 'Emergency Tools', checked: false, description: 'Triangle, spare tire, jack, tools' },
    { id: '9', title: 'Cleanliness', checked: false, description: 'Interior and exterior cleanliness' },
    { id: '10', title: 'Documents', checked: false, description: 'Registration, insurance, permits, license' },
  ]);

  const [allChecked, setAllChecked] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [selectedIssueType, setSelectedIssueType] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const issueTypes: IssueType[] = [
    { id: '1', label: 'Fuel Issue', value: 'fuel' },
    { id: '2', label: 'Tire Problem', value: 'tire' },
    { id: '3', label: 'Brake Problem', value: 'brake' },
    { id: '4', label: 'Engine Issue', value: 'engine' },
    { id: '5', label: 'Electrical Problem', value: 'electrical' },
    { id: '6', label: 'Other Mechanical', value: 'mechanical' },
    { id: '7', label: 'Safety Equipment', value: 'safety' },
    { id: '8', label: 'Cleanliness', value: 'cleanliness' },
    { id: '9', label: 'Document Issue', value: 'document' },
    { id: '10', label: 'Other', value: 'other' },
  ];

  const toggleChecklistItem = (id: string) => {
    const updatedChecklist = checklist.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );

    setChecklist(updatedChecklist);

    // Check if all items are checked
    const allCheckedNow = updatedChecklist.every(item => item.checked);
    setAllChecked(allCheckedNow);
  };

  const handleVehicleOK = () => {
    if (!allChecked) {
      Alert.alert(
        'Incomplete Checklist',
        'Please check all items before marking vehicle as OK.',
        [{ text: 'OK' }]
      );
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
          onPress: () => {
            if (isStartDutyFlow) {
              // Navigate to Route screen if coming from START DUTY
              Alert.alert(
                'Duty Started',
                'Vehicle check completed. Your duty has started successfully.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.navigate('Route')
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
          },
        },
      ]
    );
  };

  const handleReportIssue = () => {
    setShowIssueForm(true);
  };

  const handleSubmitIssue = () => {
    if (!selectedIssueType) {
      Alert.alert('Error', 'Please select an issue type.');
      return;
    }

    if (!issueDescription.trim()) {
      Alert.alert('Error', 'Please describe the issue.');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setShowIssueForm(false);
      setSelectedIssueType('');
      setIssueDescription('');

      const issueTypeLabel = issueTypes.find(type => type.value === selectedIssueType)?.label;

      Alert.alert(
        'Issue Reported',
        `Your ${issueTypeLabel} issue has been reported to the maintenance team. They will contact you shortly.`,
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
    }, 1500);
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1A237E" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔧 VEHICLE CHECK</Text>
        {isStartDutyFlow && (
          <Text style={styles.headerSubtitle}>Required before starting duty</Text>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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

        {/* Checklist Section */}
        <View style={styles.checklistSection}>
          <Text style={styles.sectionTitle}>CHECKLIST</Text>
          <View style={styles.checklistContainer}>
            {checklist.map(renderChecklistItem)}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.okButton,
              !allChecked && styles.disabledButton
            ]}
            onPress={handleVehicleOK}
            disabled={!allChecked}
          >
            <Text style={styles.okButtonText}>
              ✅ VEHICLE OK
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.issueButton]}
            onPress={handleReportIssue}
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
            <View style={styles.recentItem}>
              <Text style={styles.recentDate}>Today, 07:30 AM</Text>
              <View style={styles.statusBadgeSuccess}>
                <Text style={styles.statusBadgeText}>PASSED</Text>
              </View>
            </View>
            <View style={styles.recentItem}>
              <Text style={styles.recentDate}>Yesterday, 07:45 AM</Text>
              <View style={styles.statusBadgeWarning}>
                <Text style={styles.statusBadgeText}>MINOR ISSUE</Text>
              </View>
            </View>
            <View style={styles.recentItem}>
              <Text style={styles.recentDate}>15 Mar, 08:00 AM</Text>
              <View style={styles.statusBadgeSuccess}>
                <Text style={styles.statusBadgeText}>PASSED</Text>
              </View>
            </View>
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
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'SUBMITTING...' : 'SUBMIT REPORT'}
                </Text>
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
  statusBadgeSuccess: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeWarning: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
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
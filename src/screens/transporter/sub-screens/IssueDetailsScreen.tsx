import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRoute } from '@react-navigation/native';

const IssueDetailsScreen = () => {
  const route = useRoute<any>();
  const { issueId = 'ISS-001' } = route.params || {};

  const [issue, setIssue] = useState({
    priority: 'High',
    assignedTo: '',
    estimatedFixTime: '2 hours',
    resolutionSteps: {
      diagnosed: false,
      partsOrdered: false,
      repairCompleted: false,
      testingDone: false,
      readyForService: false,
    },
  });

  const issueDetails = {
    reportedBy: 'Ali Ahmed (Driver)',
    bus: 'B-001',
    time: '10:15 AM, 15 March',
    status: 'OPEN',
    description: 'Engine overheating noticed during trip TR-45. Temperature gauge showing high readings. Reduced speed to 40 km/h.',
    location: 'Near University Road',
    gps: '24.8607° N, 67.0011° E',
    landmark: 'Near City Mall',
    impact: ['Current trip affected', '32 passengers on board', 'Possible delay: +20 minutes'],
    actionsTaken: ['Reduced speed', 'Informed passengers', 'Reported to transporter'],
  };

  const toggleResolutionStep = (step: string) => {
    setIssue({
      ...issue,
      resolutionSteps: {
        ...issue.resolutionSteps,
        [step]: !issue.resolutionSteps[step as keyof typeof issue.resolutionSteps],
      },
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.alertEmoji}>🚨</Text>
        <Text style={styles.alertTitle}>HIGH PRIORITY - MECHANICAL</Text>
        <Text style={styles.issueId}>Issue: #{issueId}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DETAILS:</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reported By</Text>
            <Text style={styles.detailValue}>{issueDetails.reportedBy}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Bus</Text>
            <Text style={styles.detailValue}>{issueDetails.bus}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>{issueDetails.time}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>🔴 {issueDetails.status}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DESCRIPTION:</Text>
        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionText}>{issueDetails.description}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>LOCATION:</Text>
        <View style={styles.locationCard}>
          <Text style={styles.locationText}>{issueDetails.location}</Text>
          <Text style={styles.gpsText}>GPS: {issueDetails.gps}</Text>
          <Text style={styles.landmarkText}>Landmark: {issueDetails.landmark}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>IMPACT:</Text>
        <View style={styles.impactCard}>
          {issueDetails.impact.map((item, index) => (
            <View key={index} style={styles.impactItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.impactText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACTIONS TAKEN:</Text>
        <View style={styles.actionsCard}>
          {issueDetails.actionsTaken.map((action, index) => (
            <View key={index} style={styles.actionItem}>
              <Text style={styles.actionNumber}>{index + 1}.</Text>
              <Text style={styles.actionText}>{action}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ASSIGN & PRIORITIZE:</Text>
        <View style={styles.assignCard}>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Assigned To</Text>
            <TextInput
              style={styles.input}
              placeholder="Select technician..."
              value={issue.assignedTo}
              onChangeText={(text) => setIssue({...issue, assignedTo: text})}
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Priority</Text>
            <View style={styles.priorityOptions}>
              {['High', 'Medium', 'Low'].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.priorityOption,
                    issue.priority === level && styles.prioritySelected,
                  ]}
                  onPress={() => setIssue({...issue, priority: level})}
                >
                  <Text style={[
                    styles.priorityText,
                    issue.priority === level && styles.priorityTextSelected,
                  ]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Estimated Fix Time</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 2 hours"
              value={issue.estimatedFixTime}
              onChangeText={(text) => setIssue({...issue, estimatedFixTime: text})}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>RESOLUTION CHECKLIST:</Text>
        <View style={styles.checklistCard}>
          {Object.entries(issue.resolutionSteps).map(([step, completed]) => (
            <TouchableOpacity
              key={step}
              style={styles.checklistItem}
              onPress={() => toggleResolutionStep(step)}
            >
              <Text style={styles.checkbox}>{completed ? '✓' : '□'}</Text>
              <Text style={[
                styles.checklistText,
                completed && styles.checklistTextCompleted,
              ]}>
                {step.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionButton, styles.updateButton]}>
          <Text style={styles.actionButtonText}>UPDATE STATUS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.assignButton]}>
          <Text style={styles.actionButtonText}>ASSIGN</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.resolveButton]}>
          <Text style={styles.actionButtonText}>MARK RESOLVED</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.escalateButton]}>
          <Text style={styles.actionButtonText}>ESCALATE</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
  },
  header: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  alertEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  issueId: {
    fontSize: 14,
    color: '#FFCDD2',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
  },
  detailValue: {
    fontSize: 14,
    color: '#1A237E',
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  descriptionCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  descriptionText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  locationCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  locationText: {
    fontSize: 16,
    color: '#0D47A1',
    fontWeight: '600',
    marginBottom: 4,
  },
  gpsText: {
    fontSize: 14,
    color: '#1976D2',
    marginBottom: 4,
  },
  landmarkText: {
    fontSize: 14,
    color: '#1976D2',
  },
  impactCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  impactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    color: '#F44336',
    marginRight: 8,
    marginTop: 2,
  },
  impactText: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  actionsCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionNumber: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginRight: 8,
    width: 20,
  },
  actionText: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  assignCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputRow: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  priorityOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityOption: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    alignItems: 'center',
  },
  prioritySelected: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  priorityText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '600',
  },
  priorityTextSelected: {
    color: '#FFFFFF',
  },
  checklistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  checkbox: {
    fontSize: 20,
    color: '#666666',
    marginRight: 12,
    width: 24,
  },
  checklistText: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  checklistTextCompleted: {
    color: '#4CAF50',
    textDecorationLine: 'line-through',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    width: '48%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  updateButton: {
    backgroundColor: '#4A90E2',
  },
  assignButton: {
    backgroundColor: '#2196F3',
  },
  resolveButton: {
    backgroundColor: '#4CAF50',
  },
  escalateButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default IssueDetailsScreen;
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

const GenerateReportScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const [reportType, setReportType] = useState('Daily Performance Report');
  const [date, setDate] = useState('15 March 2024');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GENERATE REPORT</Text>
        <Text style={styles.subtitle}>REPORT TYPE: {reportType}</Text>
        <Text style={styles.subtitle}>DATE: {date}</Text>
      </View>

      <View style={styles.reportPreview}>
        <Text style={styles.previewTitle}>📊 DAILY PERFORMANCE REPORT</Text>
        <Text style={styles.previewDate}>Date: 15 March 2024</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUMMARY:</Text>
          <Text style={styles.bullet}>• Total Trips: 45</Text>
          <Text style={styles.bullet}>• Completed: 20</Text>
          <Text style={styles.bullet}>• Active: 12</Text>
          <Text style={styles.bullet}>• Scheduled: 13</Text>
          <Text style={styles.bullet}>• Total Revenue: $2,500</Text>
          <Text style={styles.bullet}>• Total Passengers: 1,200</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TOP PERFORMERS:</Text>
          <Text style={styles.bullet}>1. Ali Ahmed - $450 revenue</Text>
          <Text style={styles.bullet}>2. Sara Khan - $380 revenue</Text>
          <Text style={styles.bullet}>3. Ahmed Raza - $320 revenue</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ISSUES REPORTED:</Text>
          <Text style={styles.bullet}>• 2 mechanical issues</Text>
          <Text style={styles.bullet}>• 1 passenger complaint</Text>
          <Text style={styles.bullet}>• 3 delay reports</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECOMMENDATIONS:</Text>
          <Text style={styles.bullet}>• Increase frequency on Route RT-005</Text>
          <Text style={styles.bullet}>• Schedule maintenance for B-004</Text>
          <Text style={styles.bullet}>• Review driver assignments</Text>
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formTitle}>Report Options</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Report Type</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[styles.radioButton, reportType === 'Daily' && styles.radioSelected]}
              onPress={() => setReportType('Daily')}
            >
              <Text style={styles.radioText}>Daily</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioButton, reportType === 'Weekly' && styles.radioSelected]}
              onPress={() => setReportType('Weekly')}
            >
              <Text style={styles.radioText}>Weekly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioButton, reportType === 'Monthly' && styles.radioSelected]}
              onPress={() => setReportType('Monthly')}
            >
              <Text style={styles.radioText}>Monthly</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Format</Text>
          <View style={styles.checkboxGroup}>
            <TouchableOpacity style={styles.checkbox}>
              <Text style={styles.checkboxText}>📊 Include Charts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.checkbox}>
              <Text style={styles.checkboxText}>📈 Include Graphs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.checkbox}>
              <Text style={styles.checkboxText}>📋 Detailed Breakdown</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionButton, styles.generateButton]}>
          <Text style={styles.actionButtonText}>GENERATE PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.emailButton]}>
          <Text style={styles.actionButtonText}>SEND VIA EMAIL</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.saveButton]}>
          <Text style={styles.actionButtonText}>SAVE DRAFT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.cancelButton]}>
          <Text style={styles.actionButtonText}>CANCEL</Text>
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
    backgroundColor: '#1A237E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9FA8DA',
    marginBottom: 4,
  },
  reportPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 8,
    textAlign: 'center',
  },
  previewDate: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
    marginLeft: 8,
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radioButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    alignItems: 'center',
  },
  radioSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  radioText: {
    color: '#666666',
  },
  checkboxGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  checkbox: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  checkboxText: {
    fontSize: 12,
    color: '#666666',
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
  generateButton: {
    backgroundColor: '#4CAF50',
  },
  emailButton: {
    backgroundColor: '#2196F3',
  },
  saveButton: {
    backgroundColor: '#FF9800',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default GenerateReportScreen;
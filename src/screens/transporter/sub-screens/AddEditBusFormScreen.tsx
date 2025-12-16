import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

const AddEditBusFormScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { busId } = route.params || {};
  const isEdit = !!busId;

  const [busData, setBusData] = useState({
    busNumber: busId ? 'B-001' : '',
    registrationNo: busId ? 'ABC-123' : '',
    model: busId ? 'Toyota Coaster' : '',
    year: busId ? '2022' : '',
    capacity: busId ? '40' : '',
    fuelType: busId ? 'Diesel' : '',
    color: busId ? 'White' : '',
    engineNumber: busId ? 'EN-2022-001' : '',
    chassisNumber: busId ? 'CH-2022-001' : '',
    insuranceExpiry: busId ? '15/06/2024' : '',
    fitnessExpiry: busId ? '15/12/2024' : '',
    lastService: busId ? '10/03/2024' : '',
    nextService: busId ? '24/03/2024' : '',
    status: busId ? 'Active' : 'Active',
    documentsVerified: true,
  });

  const handleInputChange = (field: string, value: string) => {
    setBusData({ ...busData, [field]: value });
  };

  const handleSave = () => {
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{isEdit ? 'EDIT BUS' : 'ADD NEW BUS'}</Text>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>BASIC INFORMATION:</Text>

        <View style={styles.inputRow}>
          <Text style={styles.label}>Bus Number *</Text>
          <TextInput
            style={styles.input}
            value={busData.busNumber}
            onChangeText={(text) => handleInputChange('busNumber', text)}
            placeholder="B-001"
          />
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.label}>Registration No *</Text>
          <TextInput
            style={styles.input}
            value={busData.registrationNo}
            onChangeText={(text) => handleInputChange('registrationNo', text)}
            placeholder="ABC-123"
          />
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.label}>Model *</Text>
          <TextInput
            style={styles.input}
            value={busData.model}
            onChangeText={(text) => handleInputChange('model', text)}
            placeholder="Toyota Coaster"
          />
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.label}>Year *</Text>
          <TextInput
            style={styles.input}
            value={busData.year}
            onChangeText={(text) => handleInputChange('year', text)}
            placeholder="2022"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.label}>Capacity *</Text>
          <TextInput
            style={styles.input}
            value={busData.capacity}
            onChangeText={(text) => handleInputChange('capacity', text)}
            placeholder="40 passengers"
          />
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.label}>Fuel Type *</Text>
          <TextInput
            style={styles.input}
            value={busData.fuelType}
            onChangeText={(text) => handleInputChange('fuelType', text)}
            placeholder="Diesel"
          />
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.label}>Color</Text>
          <TextInput
            style={styles.input}
            value={busData.color}
            onChangeText={(text) => handleInputChange('color', text)}
            placeholder="White"
          />
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>TECHNICAL DETAILS:</Text>

        <View style={styles.inputRow}>
          <Text style={styles.label}>Engine Number</Text>
          <TextInput
            style={styles.input}
            value={busData.engineNumber}
            onChangeText={(text) => handleInputChange('engineNumber', text)}
            placeholder="EN-2022-001"
          />
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.label}>Chassis Number</Text>
          <TextInput
            style={styles.input}
            value={busData.chassisNumber}
            onChangeText={(text) => handleInputChange('chassisNumber', text)}
            placeholder="CH-2022-001"
          />
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.label}>Insurance Expiry</Text>
          <TextInput
            style={styles.input}
            value={busData.insuranceExpiry}
            onChangeText={(text) => handleInputChange('insuranceExpiry', text)}
            placeholder="15/06/2024"
          />
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.label}>Fitness Expiry</Text>
          <TextInput
            style={styles.input}
            value={busData.fitnessExpiry}
            onChangeText={(text) => handleInputChange('fitnessExpiry', text)}
            placeholder="15/12/2024"
          />
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.label}>Last Service</Text>
          <TextInput
            style={styles.input}
            value={busData.lastService}
            onChangeText={(text) => handleInputChange('lastService', text)}
            placeholder="10/03/2024"
          />
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.label}>Next Service</Text>
          <TextInput
            style={styles.input}
            value={busData.nextService}
            onChangeText={(text) => handleInputChange('nextService', text)}
            placeholder="24/03/2024"
          />
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>DOCUMENTS:</Text>

        <View style={styles.documentRow}>
          <Text style={styles.documentLabel}>Registration Certificate</Text>
          <TouchableOpacity style={styles.uploadButton}>
            <Text style={styles.uploadButtonText}>Upload</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.documentRow}>
          <Text style={styles.documentLabel}>Insurance Document</Text>
          <TouchableOpacity style={styles.uploadButton}>
            <Text style={styles.uploadButtonText}>Upload</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.documentRow}>
          <Text style={styles.documentLabel}>Fitness Certificate</Text>
          <TouchableOpacity style={styles.uploadButton}>
            <Text style={styles.uploadButtonText}>Upload</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.checkboxRow}>
          <Switch
            value={busData.documentsVerified}
            onValueChange={(value) => handleInputChange('documentsVerified', value.toString())}
          />
          <Text style={styles.checkboxLabel}>Verified all documents</Text>
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>INITIAL ASSIGNMENT:</Text>

        <View style={styles.inputRow}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusOptions}>
            <TouchableOpacity
              style={[styles.statusOption, busData.status === 'Active' && styles.statusSelected]}
              onPress={() => handleInputChange('status', 'Active')}
            >
              <Text style={[styles.statusText, busData.status === 'Active' && styles.statusTextSelected]}>Active</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusOption, busData.status === 'Maintenance' && styles.statusSelected]}
              onPress={() => handleInputChange('status', 'Maintenance')}
            >
              <Text style={[styles.statusText, busData.status === 'Maintenance' && styles.statusTextSelected]}>Maintenance</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusOption, busData.status === 'Inactive' && styles.statusSelected]}
              onPress={() => handleInputChange('status', 'Inactive')}
            >
              <Text style={[styles.statusText, busData.status === 'Inactive' && styles.statusTextSelected]}>Inactive</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.label}>Assign Driver</Text>
          <TextInput
            style={styles.input}
            placeholder="Select driver..."
          />
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.label}>Assign Route</Text>
          <TextInput
            style={styles.input}
            placeholder="Select route..."
          />
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
          <Text style={styles.buttonText}>SAVE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>CANCEL</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 20,
    textAlign: 'center',
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 12,
  },
  inputRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 6,
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
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  documentLabel: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  uploadButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
  },
  statusOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusOption: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    alignItems: 'center',
  },
  statusSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  statusText: {
    color: '#666666',
    fontSize: 14,
  },
  statusTextSelected: {
    color: '#FFFFFF',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AddEditBusFormScreen;
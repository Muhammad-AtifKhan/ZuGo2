// src/screens/transporter/subscreens/AddBusScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Types
import { Bus, BusStatus } from '../../../types/fleet.types';

// Constants
import { COLORS, SIZES, SHADOWS } from '../../../constants/theme';
import { BUS_STATUS, BUS_STATUS_CONFIG } from '../../../constants/status';

const AddBusScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { mode, bus, transporterId: routeTransporterId } = route.params as {
    mode: 'add' | 'edit';
    bus?: Bus;
    transporterId?: string;
  };

  const [loading, setLoading] = useState(false);

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Status selection modal
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [formData, setFormData] = useState({
    busNumber: '',
    registrationNumber: '',
    make: '',
    model: '',
    year: '',
    capacity: '',
    fuelType: 'diesel',
    color: '',
    busType: 'standard',
    insuranceNumber: '',
    insuranceExpiry: '',
    fitnessExpiry: '',
    assignedDriverId: '',
    status: BUS_STATUS.AVAILABLE as BusStatus, // ✅ Updated default
  });

  const user = auth().currentUser;
  const effectiveTransporterId = routeTransporterId || user?.uid;

  // Debounce ref for duplicate check
  const duplicateCheckTimeout = useRef<NodeJS.Timeout>();

  // Update field helper
  const updateField = useCallback((key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  // Load existing bus data if in edit mode
  useEffect(() => {
    if (mode === 'edit' && bus) {
      setFormData({
        busNumber: bus.busNumber || '',
        registrationNumber: bus.registrationNumber || '',
        make: bus.make || '',
        model: bus.model || '',
        year: bus.year?.toString() || '',
        capacity: bus.capacity?.toString() || '',
        fuelType: bus.fuelType || 'diesel',
        color: bus.color || '',
        busType: bus.busType || 'standard',
        insuranceNumber: bus.insuranceNumber || '',
        insuranceExpiry: bus.insuranceExpiry || '',
        fitnessExpiry: bus.fitnessExpiry || '',
        assignedDriverId: bus.assignedDriverId || '',
        status: bus.status || BUS_STATUS.AVAILABLE, // ✅ Preserve existing or default
      });
    }
  }, [mode, bus]);

  // Bus Types
  const busTypes = [
    { id: 'standard', label: 'Standard', icon: '🚌' },
    { id: 'ac', label: 'AC', icon: '❄️' },
    { id: 'luxury', label: 'Luxury', icon: '✨' },
    { id: 'sleeper', label: 'Sleeper', icon: '🛏️' },
    { id: 'minibus', label: 'Mini Bus', icon: '🚐' },
  ];

  // Fuel Types
  const fuelTypes = [
    { id: 'diesel', label: 'Diesel', icon: '⛽' },
    { id: 'petrol', label: 'Petrol', icon: '⛽' },
    { id: 'cng', label: 'CNG', icon: '🔥' },
    { id: 'electric', label: 'Electric', icon: '⚡' },
  ];

  // ✅ Bus Status Options (using centralized config)
  const busStatusOptions = [
    {
      id: BUS_STATUS.AVAILABLE,
      ...BUS_STATUS_CONFIG[BUS_STATUS.AVAILABLE]
    },
    {
      id: BUS_STATUS.MAINTENANCE,
      ...BUS_STATUS_CONFIG[BUS_STATUS.MAINTENANCE]
    },
    {
      id: BUS_STATUS.INACTIVE,
      ...BUS_STATUS_CONFIG[BUS_STATUS.INACTIVE]
    },
  ];
  // Note: 'on_trip' is not selectable manually - it's auto-set when trip starts

  // ========== DATE PICKER FUNCTIONS ==========
  const handleDatePress = (field: string) => {
    setCurrentDateField(field);
    const dateValue = formData[field as keyof typeof formData];

    if (dateValue && typeof dateValue === 'string') {
      const parsedDate = new Date(dateValue);
      if (!isNaN(parsedDate.getTime())) {
        setSelectedDate(parsedDate);
      } else {
        setSelectedDate(new Date());
      }
    } else {
      setSelectedDate(new Date());
    }
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, date: Date | undefined) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (date && !isNaN(date.getTime())) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0];
      updateField(currentDateField, formattedDate);
    }
  };

  const handleAndroidDateConfirm = () => {
    const formattedDate = selectedDate.toISOString().split('T')[0];
    updateField(currentDateField, formattedDate);
    setShowDatePicker(false);
  };

  // Format registration number (ABC-123)
  const formatRegistrationNumber = (text: string) => {
    let cleaned = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleaned.length > 3) {
      const letters = cleaned.substring(0, 3);
      const numbers = cleaned.substring(3, 7);
      return `${letters}-${numbers}`;
    }
    return cleaned;
  };

  const handleBusNumberChange = (text: string) => {
    updateField('busNumber', text.toUpperCase());
  };

  const handleRegistrationChange = (text: string) => {
    updateField('registrationNumber', formatRegistrationNumber(text));
  };

  // Case-insensitive duplicate check with debounce
  const checkDuplicateBus = useCallback(async (): Promise<boolean> => {
    if (!effectiveTransporterId) return true;

    const registrationNumber = formData.registrationNumber.trim().toUpperCase();
    if (!registrationNumber) return true;

    try {
      const existingBus = await firestore()
        .collection('buses')
        .where('transporterId', '==', effectiveTransporterId)
        .where('registrationNumber', '==', registrationNumber)
        .where('isDeleted', '==', false)
        .limit(1)
        .get();

      if (!existingBus.empty) {
        if (mode === 'edit' && bus?.id) {
          const isSameBus = existingBus.docs.some(doc => doc.id === bus.id);
          if (!isSameBus) {
            Alert.alert('Error', 'A bus with this registration number already exists');
            return false;
          }
        } else if (mode === 'add') {
          Alert.alert('Error', 'A bus with this registration number already exists');
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error checking duplicate:', error);
      return true;
    }
  }, [effectiveTransporterId, formData.registrationNumber, mode, bus]);

  // Debounced duplicate check
  useEffect(() => {
    if (duplicateCheckTimeout.current) {
      clearTimeout(duplicateCheckTimeout.current);
    }

    if (formData.registrationNumber.length >= 7) {
      duplicateCheckTimeout.current = setTimeout(() => {
        checkDuplicateBus();
      }, 500);
    }

    return () => {
      if (duplicateCheckTimeout.current) {
        clearTimeout(duplicateCheckTimeout.current);
      }
    };
  }, [formData.registrationNumber, checkDuplicateBus]);

  // ========== FORM VALIDATION ==========
  const validateForm = (): boolean => {
    if (!formData.busNumber.trim()) {
      Alert.alert('Error', 'Please enter bus number');
      return false;
    }

    if (!formData.registrationNumber.trim()) {
      Alert.alert('Error', 'Please enter registration number');
      return false;
    }

    const regRegex = /^[A-Z]{3}-\d{3,4}$/i;
    if (!regRegex.test(formData.registrationNumber)) {
      Alert.alert('Error', 'Registration number must be in format: ABC-123 or ABC-1234');
      return false;
    }

    if (!formData.capacity.trim()) {
      Alert.alert('Error', 'Please enter seating capacity');
      return false;
    }

    const capacityNum = parseInt(formData.capacity);
    if (isNaN(capacityNum) || capacityNum < 10 || capacityNum > 80) {
      Alert.alert('Error', 'Capacity must be between 10 and 80 seats');
      return false;
    }

    if (formData.year) {
      const currentYear = new Date().getFullYear();
      const yearNum = parseInt(formData.year);
      if (isNaN(yearNum) || yearNum < 1990 || yearNum > currentYear) {
        Alert.alert('Error', `Year must be between 1990 and ${currentYear}`);
        return false;
      }
    }

    return true;
  };

  // ========== HANDLE SUBMIT ==========
  const handleSubmit = async () => {
    if (loading) return;

    if (!validateForm()) return;

    if (!user || !effectiveTransporterId) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    const transporterId = effectiveTransporterId;
    const isUnique = await checkDuplicateBus();
    if (!isUnique) return;

    setLoading(true);

    try {
      const normalizedRegistration = formData.registrationNumber.trim().toUpperCase();

      const busData = {
        busNumber: formData.busNumber.trim(),
        registrationNumber: normalizedRegistration,
        make: formData.make.trim() || null,
        model: formData.model.trim() || null,
        year: formData.year ? parseInt(formData.year) : null,
        capacity: parseInt(formData.capacity),
        fuelType: formData.fuelType,
        color: formData.color.trim() || null,
        busType: formData.busType,
        status: formData.status, // ✅ Now includes 'available', 'maintenance', 'inactive'
        insuranceNumber: formData.insuranceNumber.trim() || null,
        insuranceExpiry: formData.insuranceExpiry || null,
        fitnessExpiry: formData.fitnessExpiry || null,
        assignedDriverId: formData.assignedDriverId || null,
        currentTripId: null, // ✅ Initialize as null
        transporterId: transporterId,
        isDeleted: false,
        searchKeywords: [
          formData.busNumber.trim().toLowerCase(),
          normalizedRegistration.toLowerCase(),
          formData.make.trim().toLowerCase(),
          formData.model.trim().toLowerCase(),
        ],
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      if (mode === 'add') {
        const busRef = await firestore().collection('buses').add({
          ...busData,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

        const transporterRef = firestore().collection('transporters').doc(transporterId);
        const transporterDoc = await transporterRef.get();
        if (transporterDoc.exists) {
          await transporterRef.update({
            busesCount: firestore.FieldValue.increment(1),
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
        } else {
          await transporterRef.set({
            transporterId,
            busesCount: 1,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
        }

        Alert.alert('Success', 'Bus added successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        if (!bus?.id) throw new Error('Bus ID not found');

        await firestore()
          .collection('buses')
          .doc(bus.id)
          .update(busData);

        Alert.alert('Success', 'Bus updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      console.error('Error saving bus:', error);
      const message = error instanceof Error ? error.message : 'Failed to save bus. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  // Get current status display
  const currentStatusConfig = busStatusOptions.find(s => s.id === formData.status) || busStatusOptions[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {mode === 'add' ? 'Add New Bus' : 'Edit Bus Details'}
          </Text>
          <View style={styles.headerRight} />
        </View>

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingOverlayText}>Saving bus...</Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Basic Information Section */}
          <Text style={styles.sectionTitle}>🚌 Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bus Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="BUS-001"
              value={formData.busNumber}
              onChangeText={handleBusNumberChange}
              autoCapitalize="characters"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Registration Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="ABC-123"
              value={formData.registrationNumber}
              onChangeText={handleRegistrationChange}
              autoCapitalize="characters"
              maxLength={8}
              editable={!loading}
            />
            <Text style={styles.inputNote}>Format: ABC-123 or ABC-1234 (auto-uppercase)</Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Make</Text>
              <TextInput
                style={styles.input}
                placeholder="Toyota"
                value={formData.make}
                onChangeText={(text) => updateField('make', text)}
                editable={!loading}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Model</Text>
              <TextInput
                style={styles.input}
                placeholder="Coaster"
                value={formData.model}
                onChangeText={(text) => updateField('model', text)}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Year</Text>
              <TextInput
                style={styles.input}
                placeholder={`1990-${new Date().getFullYear()}`}
                value={formData.year}
                onChangeText={(text) => updateField('year', text)}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Seating Capacity *</Text>
              <TextInput
                style={styles.input}
                placeholder="10-80 seats"
                value={formData.capacity}
                onChangeText={(text) => updateField('capacity', text)}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>
          </View>

          {/* Bus Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bus Type</Text>
            <View style={styles.optionsContainer}>
              {busTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.optionButton,
                    formData.busType === type.id && styles.optionButtonSelected
                  ]}
                  onPress={() => updateField('busType', type.id)}
                  disabled={loading}
                >
                  <Text style={styles.optionIcon}>{type.icon}</Text>
                  <Text style={[
                    styles.optionLabel,
                    formData.busType === type.id && styles.optionLabelSelected
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ✅ Bus Status Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bus Status *</Text>
            <TouchableOpacity
              style={styles.statusSelector}
              onPress={() => setShowStatusModal(true)}
              disabled={loading}
            >
              <View style={styles.statusSelectorContent}>
                <Text style={[styles.statusDot, { backgroundColor: currentStatusConfig.color }]} />
                <Text style={styles.statusSelectorText}>
                  {currentStatusConfig.icon} {currentStatusConfig.label}
                </Text>
              </View>
              <Text style={styles.chevron}>▼</Text>
            </TouchableOpacity>
            <Text style={styles.inputNote}>
              Note: 'On Trip' status is automatically set when bus is assigned to an active trip
            </Text>
          </View>

          {/* Specifications Section */}
          <Text style={styles.sectionTitle}>⚙️ Specifications</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fuel Type</Text>
            <View style={styles.optionsContainer}>
              {fuelTypes.map((fuel) => (
                <TouchableOpacity
                  key={fuel.id}
                  style={[
                    styles.optionButton,
                    formData.fuelType === fuel.id && styles.optionButtonSelected
                  ]}
                  onPress={() => updateField('fuelType', fuel.id)}
                  disabled={loading}
                >
                  <Text style={styles.optionIcon}>{fuel.icon}</Text>
                  <Text style={[
                    styles.optionLabel,
                    formData.fuelType === fuel.id && styles.optionLabelSelected
                  ]}>
                    {fuel.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Color</Text>
            <TextInput
              style={styles.input}
              placeholder="White"
              value={formData.color}
              onChangeText={(text) => updateField('color', text)}
              editable={!loading}
            />
          </View>

          {/* Documents Section */}
          <Text style={styles.sectionTitle}>📄 Documents</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Insurance Number</Text>
            <TextInput
              style={styles.input}
              placeholder="INS-123456"
              value={formData.insuranceNumber}
              onChangeText={(text) => updateField('insuranceNumber', text)}
              editable={!loading}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Insurance Expiry</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => handleDatePress('insuranceExpiry')}
                disabled={loading}
              >
                <Text style={formData.insuranceExpiry ? styles.dateSelectedText : styles.datePlaceholderText}>
                  {formData.insuranceExpiry || 'Select date'}
                </Text>
                <Text style={styles.calendarIcon}>📅</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Fitness Expiry</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => handleDatePress('fitnessExpiry')}
                disabled={loading}
              >
                <Text style={formData.fitnessExpiry ? styles.dateSelectedText : styles.datePlaceholderText}>
                  {formData.fitnessExpiry || 'Select date'}
                </Text>
                <Text style={styles.calendarIcon}>📅</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Expiry Info */}
          {(formData.insuranceExpiry || formData.fitnessExpiry) && (
            <View style={styles.expiryInfo}>
              <Text style={styles.expiryInfoTitle}>📅 Document Expiry Tracking</Text>
              <Text style={styles.expiryInfoText}>
                • System will automatically check expiry dates{'\n'}
                • Warning shown 30 days before expiry{'\n'}
                • Expired documents will flag bus as inactive
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === 'add' ? 'Add Bus' : 'Update Bus'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.modalClose}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
              {Platform.OS === 'android' && (
                <View style={styles.androidButtons}>
                  <TouchableOpacity
                    style={styles.androidButtonCancel}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.androidButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.androidButtonConfirm}
                    onPress={handleAndroidDateConfirm}
                  >
                    <Text style={[styles.androidButtonText, styles.confirmButtonText]}>OK</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* ✅ Status Selection Modal */}
      {showStatusModal && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showStatusModal}
          onRequestClose={() => setShowStatusModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Bus Status</Text>
                <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                  <Text style={styles.modalClose}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.statusModalContent}>
                {busStatusOptions.map((status) => (
                  <TouchableOpacity
                    key={status.id}
                    style={[
                      styles.statusOption,
                      formData.status === status.id && styles.statusOptionSelected
                    ]}
                    onPress={() => {
                      updateField('status', status.id);
                      setShowStatusModal(false);
                    }}
                  >
                    <View style={[styles.statusOptionDot, { backgroundColor: status.color }]} />
                    <Text style={styles.statusOptionIcon}>{status.icon}</Text>
                    <Text style={styles.statusOptionLabel}>{status.label}</Text>
                    {formData.status === status.id && (
                      <Text style={styles.statusOptionCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
                <Text style={styles.statusModalNote}>
                  Note: 'On Trip' status cannot be set manually. It is automatically applied when the bus starts a trip.
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.lg,
    backgroundColor: COLORS.primary,
  },
  backButton: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerRight: {
    width: 50,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingOverlayText: {
    color: COLORS.white,
    fontSize: 16,
    marginTop: SIZES.sm,
  },
  formContainer: {
    padding: SIZES.md,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: SIZES.xl,
    marginBottom: SIZES.md,
  },
  inputGroup: {
    marginBottom: SIZES.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    padding: SIZES.sm,
    fontSize: 16,
    backgroundColor: COLORS.white,
    color: COLORS.text,
  },
  inputNote: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    margin: 4,
    backgroundColor: COLORS.white,
    minWidth: 100,
  },
  optionButtonSelected: {
    backgroundColor: COLORS.infoLight,
    borderColor: COLORS.secondary,
  },
  optionIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  optionLabel: {
    fontSize: 12,
    color: COLORS.text,
  },
  optionLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Status Selector Styles
  statusSelector: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    padding: SIZES.sm,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SIZES.xs,
  },
  statusSelectorText: {
    fontSize: 16,
    color: COLORS.text,
  },
  chevron: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  statusModalContent: {
    padding: SIZES.md,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statusOptionSelected: {
    backgroundColor: COLORS.infoLight,
  },
  statusOptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SIZES.sm,
  },
  statusOptionIcon: {
    fontSize: 20,
    marginRight: SIZES.sm,
  },
  statusOptionLabel: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  statusOptionCheck: {
    fontSize: 18,
    color: COLORS.success,
    fontWeight: 'bold',
  },
  statusModalNote: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
    padding: SIZES.md,
    textAlign: 'center',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    padding: SIZES.sm,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateSelectedText: {
    fontSize: 16,
    color: COLORS.text,
  },
  datePlaceholderText: {
    fontSize: 16,
    color: COLORS.textLighter,
  },
  calendarIcon: {
    fontSize: 20,
    color: COLORS.secondary,
  },
  expiryInfo: {
    backgroundColor: '#FFF3E0',
    padding: SIZES.md,
    borderRadius: SIZES.xs,
    marginTop: SIZES.md,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB300',
  },
  expiryInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: SIZES.xs,
  },
  expiryInfoText: {
    fontSize: 12,
    color: '#5D4037',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: SIZES.xxxl,
    marginBottom: SIZES.xxxl,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.xs,
    alignItems: 'center',
    marginHorizontal: SIZES.xs,
  },
  cancelButton: {
    backgroundColor: COLORS.greyLight,
  },
  submitButton: {
    backgroundColor: COLORS.secondary,
  },
  buttonDisabled: {
    backgroundColor: COLORS.grey,
  },
  cancelButtonText: {
    color: COLORS.textLight,
    fontWeight: '600',
    fontSize: 16,
  },
  submitButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.lg,
    borderTopRightRadius: SIZES.lg,
    paddingBottom: SIZES.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalClose: {
    fontSize: 16,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  androidButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SIZES.md,
    paddingTop: SIZES.sm,
  },
  androidButtonCancel: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    marginRight: SIZES.sm,
  },
  androidButtonConfirm: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.secondary,
    borderRadius: SIZES.xs,
  },
  androidButtonText: {
    fontSize: 16,
    color: COLORS.text,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default AddBusScreen;
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  FlatList,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

// Mock data
const mockRoutes = [
  { id: '1', code: 'RT-001', name: 'Downtown Express', distance: '15km', duration: '45min' },
  { id: '2', code: 'RT-002', name: 'University Shuttle', distance: '12km', duration: '35min' },
  { id: '3', code: 'RT-003', name: 'Mall Route', distance: '20km', duration: '60min' },
];

const mockBuses = [
  { id: '1', number: 'B-001', capacity: 40, status: 'available' },
  { id: '2', number: 'B-002', capacity: 35, status: 'available' },
  { id: '3', number: 'B-003', capacity: 45, status: 'available' },
  { id: '4', number: 'B-004', capacity: 30, status: 'maintenance' },
  { id: '5', number: 'B-005', capacity: 50, status: 'available' },
];

const mockDrivers = [
  { id: '1', name: 'Ali Ahmed', status: 'available' },
  { id: '2', name: 'Ahmed Khan', status: 'available' },
  { id: '3', name: 'Sara Ali', status: 'on-duty' },
  { id: '4', name: 'Usman Khan', status: 'available' },
  { id: '5', name: 'Bilal Raza', status: 'offline' },
];

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ScheduleTripScreen = ({ navigation, route }: any) => {
  const mode = route.params?.mode || 'add';
  const existingTrip = route.params?.trip || null;

  const [step, setStep] = useState(1); // 1: Route, 2: Schedule, 3: Assign, 4: Confirm

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Time picker states
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentTimeField, setCurrentTimeField] = useState('');

  const [formData, setFormData] = useState({
    routeId: existingTrip?.routeId || '',
    busId: existingTrip?.busId || '',
    driverId: existingTrip?.driverId || '',
    departureTime: existingTrip?.departureTime || '08:00',
    arrivalTime: existingTrip?.arrivalTime || '',
    selectedDays: existingTrip?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    startDate: existingTrip?.startDate || '',
    endDate: existingTrip?.endDate || '',
    repeatType: existingTrip?.repeatType || 'weekdays', // daily, weekdays, weekly, custom
    fare: existingTrip?.fare || '50',
  });

  // ========== DATE PICKER FUNCTIONS ==========
  const handleDatePress = (field: string) => {
    setCurrentDateField(field);
    if (formData[field]) {
      setSelectedDate(new Date(formData[field]));
    } else {
      setSelectedDate(new Date());
    }
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, date: Date | undefined) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0];

      if (currentDateField === 'startDate') {
        setFormData({...formData, startDate: formattedDate});
      } else if (currentDateField === 'endDate') {
        setFormData({...formData, endDate: formattedDate});
      }
    }
  };

  const handleAndroidDateConfirm = () => {
    const formattedDate = selectedDate.toISOString().split('T')[0];

    if (currentDateField === 'startDate') {
      setFormData({...formData, startDate: formattedDate});
    } else if (currentDateField === 'endDate') {
      setFormData({...formData, endDate: formattedDate});
    }

    setShowDatePicker(false);
  };

  // ========== TIME PICKER FUNCTIONS ==========
  const handleTimePress = (field: string) => {
    setCurrentTimeField(field);

    // Parse existing time if available
    if (formData[field]) {
      const timeStr = formData[field];
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      setSelectedDate(date);
    } else {
      setSelectedDate(new Date());
    }

    setShowTimePicker(true);
  };

  const handleTimeChange = (event: any, date: Date | undefined) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (date) {
      setSelectedDate(date);
      const formattedTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

      if (currentTimeField === 'departureTime') {
        setFormData({...formData, departureTime: formattedTime});
      } else if (currentTimeField === 'arrivalTime') {
        setFormData({...formData, arrivalTime: formattedTime});
      }
    }
  };

  const handleAndroidTimeConfirm = () => {
    const formattedTime = `${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}`;

    if (currentTimeField === 'departureTime') {
      setFormData({...formData, departureTime: formattedTime});
    } else if (currentTimeField === 'arrivalTime') {
      setFormData({...formData, arrivalTime: formattedTime});
    }

    setShowTimePicker(false);
  };

  // ========== FORM NAVIGATION FUNCTIONS ==========
  const handleNextStep = () => {
    if (step === 1 && !formData.routeId) {
      Alert.alert('Error', 'Please select a route');
      return;
    }
    if (step === 2 && !formData.departureTime) {
      Alert.alert('Error', 'Please select departure time');
      return;
    }
    if (step === 3 && (!formData.busId || !formData.driverId)) {
      Alert.alert('Error', 'Please select both bus and driver');
      return;
    }

    if (step < 4) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = () => {
    Alert.alert(
      'Confirm Schedule',
      'Are you sure you want to schedule this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Alert.alert(
              'Success',
              'Trip scheduled successfully!',
              [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack()
                },
                {
                  text: 'View Schedule',
                  onPress: () => {
                    navigation.navigate('OperationsMain');
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const toggleDaySelection = (day: string) => {
    if (formData.selectedDays.includes(day)) {
      setFormData({
        ...formData,
        selectedDays: formData.selectedDays.filter(d => d !== day)
      });
    } else {
      setFormData({
        ...formData,
        selectedDays: [...formData.selectedDays, day]
      });
    }
  };

  // ========== RENDER FUNCTIONS ==========
  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Select Route</Text>
      <FlatList
        data={mockRoutes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.routeCard,
              formData.routeId === item.id && styles.selectedCard
            ]}
            onPress={() => setFormData({...formData, routeId: item.id})}
          >
            <View style={styles.routeHeader}>
              <Text style={styles.routeCode}>{item.code}</Text>
              <Text style={styles.routeFare}>₹50</Text>
            </View>
            <Text style={styles.routeName}>{item.name}</Text>
            <View style={styles.routeDetails}>
              <Text style={styles.routeDetail}>📏 {item.distance}</Text>
              <Text style={styles.routeDetail}>⏱️ {item.duration}</Text>
              <Text style={styles.routeDetail}>💰 ₹50 per passenger</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Schedule Details</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Departure Time</Text>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => handleTimePress('departureTime')}
        >
          <Text style={formData.departureTime ? styles.dateSelectedText : styles.datePlaceholderText}>
            {formData.departureTime || 'Select time'}
          </Text>
          <Text style={styles.calendarIcon}>⏰</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Repeat Pattern</Text>
        <View style={styles.repeatOptions}>
          {['daily', 'weekdays', 'weekends', 'weekly', 'custom'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.repeatButton,
                formData.repeatType === type && styles.repeatButtonSelected
              ]}
              onPress={() => setFormData({...formData, repeatType: type})}
            >
              <Text style={[
                styles.repeatText,
                formData.repeatType === type && styles.repeatTextSelected
              ]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {formData.repeatType === 'custom' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Select Days</Text>
          <View style={styles.daysContainer}>
            {daysOfWeek.map((day) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  formData.selectedDays.includes(day) && styles.dayButtonSelected
                ]}
                onPress={() => toggleDaySelection(day)}
              >
                <Text style={[
                  styles.dayButtonText,
                  formData.selectedDays.includes(day) && styles.dayButtonTextSelected
                ]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Start Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => handleDatePress('startDate')}
          >
            <Text style={formData.startDate ? styles.dateSelectedText : styles.datePlaceholderText}>
              {formData.startDate || 'Select date'}
            </Text>
            <Text style={styles.calendarIcon}>📅</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>End Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => handleDatePress('endDate')}
          >
            <Text style={formData.endDate ? styles.dateSelectedText : styles.datePlaceholderText}>
              {formData.endDate || 'Select date'}
            </Text>
            <Text style={styles.calendarIcon}>📅</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Fare per Passenger (₹)</Text>
        <TextInput
          style={styles.input}
          placeholder="50"
          value={formData.fare}
          onChangeText={(text) => setFormData({...formData, fare: text})}
          keyboardType="numeric"
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Assign Resources</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Select Bus</Text>
        <FlatList
          data={mockBuses.filter(bus => bus.status === 'available')}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.resourceCard,
                formData.busId === item.id && styles.selectedResourceCard
              ]}
              onPress={() => setFormData({...formData, busId: item.id})}
            >
              <Text style={styles.resourceIcon}>🚌</Text>
              <Text style={styles.resourceName}>{item.number}</Text>
              <Text style={styles.resourceDetail}>{item.capacity} seats</Text>
              <Text style={[
                styles.resourceStatus,
                item.status === 'available' ? styles.availableStatus : styles.unavailableStatus
              ]}>
                {item.status}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Select Driver</Text>
        <FlatList
          data={mockDrivers.filter(driver => driver.status === 'available')}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.resourceCard,
                formData.driverId === item.id && styles.selectedResourceCard
              ]}
              onPress={() => setFormData({...formData, driverId: item.id})}
            >
              <Text style={styles.resourceIcon}>👤</Text>
              <Text style={styles.resourceName}>{item.name}</Text>
              <Text style={[
                styles.resourceStatus,
                item.status === 'available' ? styles.availableStatus : styles.onDutyStatus
              ]}>
                {item.status}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={styles.previewCard}>
        <Text style={styles.previewTitle}>Schedule Preview</Text>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Route:</Text>
          <Text style={styles.previewValue}>
            {mockRoutes.find(r => r.id === formData.routeId)?.name || 'Not selected'}
          </Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Time:</Text>
          <Text style={styles.previewValue}>{formData.departureTime}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Days:</Text>
          <Text style={styles.previewValue}>{formData.selectedDays.join(', ')}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Fare:</Text>
          <Text style={styles.previewValue}>₹{formData.fare}</Text>
        </View>
        {formData.startDate && (
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Start Date:</Text>
            <Text style={styles.previewValue}>{formData.startDate}</Text>
          </View>
        )}
        {formData.endDate && (
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>End Date:</Text>
            <Text style={styles.previewValue}>{formData.endDate}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View>
      <Text style={styles.stepTitle}>Confirmation</Text>

      <View style={styles.confirmationCard}>
        <Text style={styles.confirmationTitle}>Trip Details</Text>

        <View style={styles.confirmationDetail}>
          <Text style={styles.confirmationLabel}>Route:</Text>
          <Text style={styles.confirmationValue}>
            {mockRoutes.find(r => r.id === formData.routeId)?.name}
          </Text>
        </View>

        <View style={styles.confirmationDetail}>
          <Text style={styles.confirmationLabel}>Bus:</Text>
          <Text style={styles.confirmationValue}>
            {mockBuses.find(b => b.id === formData.busId)?.number}
          </Text>
        </View>

        <View style={styles.confirmationDetail}>
          <Text style={styles.confirmationLabel}>Driver:</Text>
          <Text style={styles.confirmationValue}>
            {mockDrivers.find(d => d.id === formData.driverId)?.name}
          </Text>
        </View>

        <View style={styles.confirmationDetail}>
          <Text style={styles.confirmationLabel}>Time:</Text>
          <Text style={styles.confirmationValue}>{formData.departureTime}</Text>
        </View>

        <View style={styles.confirmationDetail}>
          <Text style={styles.confirmationLabel}>Days:</Text>
          <Text style={styles.confirmationValue}>{formData.selectedDays.join(', ')}</Text>
        </View>

        <View style={styles.confirmationDetail}>
          <Text style={styles.confirmationLabel}>Start Date:</Text>
          <Text style={styles.confirmationValue}>{formData.startDate || 'Not set'}</Text>
        </View>

        <View style={styles.confirmationDetail}>
          <Text style={styles.confirmationLabel}>End Date:</Text>
          <Text style={styles.confirmationValue}>{formData.endDate || 'Not set'}</Text>
        </View>

        <View style={styles.confirmationDetail}>
          <Text style={styles.confirmationLabel}>Fare:</Text>
          <Text style={styles.confirmationValue}>₹{formData.fare} per passenger</Text>
        </View>

        <View style={styles.confirmationDetail}>
          <Text style={styles.confirmationLabel}>Schedule Type:</Text>
          <Text style={styles.confirmationValue}>{formData.repeatType}</Text>
        </View>

        <View style={styles.revenueEstimate}>
          <Text style={styles.revenueTitle}>Estimated Revenue</Text>
          <Text style={styles.revenueValue}>₹2,500 per day</Text>
          <Text style={styles.revenueSubtext}>Based on 50 passengers at ₹{formData.fare} each</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevStep}>
          <Text style={styles.backButton}>{step === 1 ? '←' : '← Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {mode === 'add' ? 'Schedule Trip' : 'Edit Trip'}
        </Text>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>Step {step}/4</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / 4) * 100}%` }]} />
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {step === 1 && renderStep1()}
        {step === 2 && (
          <ScrollView showsVerticalScrollIndicator={false}>
            {renderStep2()}
          </ScrollView>
        )}
        {step === 3 && (
          <ScrollView showsVerticalScrollIndicator={false}>
            {renderStep3()}
          </ScrollView>
        )}
        {step === 4 && (
          <ScrollView showsVerticalScrollIndicator={false}>
            {renderStep4()}
          </ScrollView>
        )}
      </View>

      {/* Date Picker Modal for iOS */}
      {showDatePicker && Platform.OS === 'ios' && (
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
                display="spinner"
                onChange={handleDateChange}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Time Picker Modal for iOS */}
      {showTimePicker && Platform.OS === 'ios' && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showTimePicker}
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Time</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.modalClose}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android Date Picker */}
      {showDatePicker && Platform.OS === 'android' && (
        <View style={styles.androidPickerContainer}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
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
        </View>
      )}

      {/* Android Time Picker */}
      {showTimePicker && Platform.OS === 'android' && (
        <View style={styles.androidPickerContainer}>
          <DateTimePicker
            value={selectedDate}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
          <View style={styles.androidButtons}>
            <TouchableOpacity
              style={styles.androidButtonCancel}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={styles.androidButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.androidButtonConfirm}
              onPress={handleAndroidTimeConfirm}
            >
              <Text style={[styles.androidButtonText, styles.confirmButtonText]}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.nextButton]}
          onPress={handleNextStep}
        >
          <Text style={styles.nextButtonText}>
            {step === 4 ? 'Confirm Schedule' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#1A237E',
  },
  backButton: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  stepText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 20,
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedCard: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A237E',
  },
  routeFare: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  routeName: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 12,
  },
  routeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeDetail: {
    fontSize: 12,
    color: '#666666',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateSelectedText: {
    fontSize: 16,
    color: '#333333',
  },
  datePlaceholderText: {
    fontSize: 16,
    color: '#999999',
  },
  calendarIcon: {
    fontSize: 20,
    color: '#4A90E2',
  },
  repeatOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  repeatButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    margin: 4,
    backgroundColor: '#FFFFFF',
  },
  repeatButtonSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  repeatText: {
    fontSize: 14,
    color: '#333333',
  },
  repeatTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: '14%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  dayButtonSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  dayButtonTextSelected: {
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
  },
  resourceCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedResourceCard: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
  },
  resourceIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  resourceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 4,
  },
  resourceDetail: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  resourceStatus: {
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  availableStatus: {
    backgroundColor: '#E8F5E8',
    color: '#4CAF50',
  },
  unavailableStatus: {
    backgroundColor: '#FFEBEE',
    color: '#F44336',
  },
  onDutyStatus: {
    backgroundColor: '#FFF3E0',
    color: '#FF9800',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: '#666666',
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  confirmationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmationDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  confirmationLabel: {
    fontSize: 16,
    color: '#666666',
  },
  confirmationValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  revenueEstimate: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  revenueTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 8,
  },
  revenueValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 4,
  },
  revenueSubtext: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  actionButtons: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: '#4A90E2',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  modalClose: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
  // Android picker styles
  androidPickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    zIndex: 1000,
  },
  androidButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  androidButtonCancel: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
  },
  androidButtonConfirm: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4A90E2',
    borderRadius: 6,
  },
  androidButtonText: {
    fontSize: 16,
    color: '#333333',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default ScheduleTripScreen;
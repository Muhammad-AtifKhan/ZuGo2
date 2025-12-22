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
  Image,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';

const AddDriverScreen = ({ navigation, route }: any) => {
  const mode = route.params?.mode || 'add';
  const existingDriver = route.params?.driver || null;

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Document images state
  const [driverDocuments, setDriverDocuments] = useState({
    cnicFront: null,
    cnicBack: null,
    license: null,
    photo: null,
  });

  const [formData, setFormData] = useState({
    fullName: existingDriver?.name || '',
    contactNumber: existingDriver?.contact || '',
    email: existingDriver?.email || '',
    cnic: existingDriver?.cnic || '',
    licenseNumber: existingDriver?.license || '',
    licenseType: existingDriver?.licenseType || 'heavy',
    licenseExpiry: existingDriver?.licenseExpiry || '',
    address: existingDriver?.address || '',
    emergencyContact: existingDriver?.emergencyContact || '',
    joiningDate: existingDriver?.joiningDate || '',
    salary: existingDriver?.salary || '',
    employmentType: existingDriver?.employmentType || 'fulltime',
  });

  const licenseTypes = [
    { id: 'light', label: 'Light Vehicle', icon: '🚗' },
    { id: 'heavy', label: 'Heavy Vehicle', icon: '🚌' },
    { id: 'both', label: 'Both', icon: '🚙' },
  ];

  const employmentTypes = [
    { id: 'fulltime', label: 'Full-time', icon: '👔' },
    { id: 'parttime', label: 'Part-time', icon: '⏰' },
    { id: 'contract', label: 'Contract', icon: '📝' },
  ];

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

      if (currentDateField === 'licenseExpiry') {
        setFormData({...formData, licenseExpiry: formattedDate});
      } else if (currentDateField === 'joiningDate') {
        setFormData({...formData, joiningDate: formattedDate});
      }
    }
  };

  const handleAndroidDateConfirm = () => {
    const formattedDate = selectedDate.toISOString().split('T')[0];

    if (currentDateField === 'licenseExpiry') {
      setFormData({...formData, licenseExpiry: formattedDate});
    } else if (currentDateField === 'joiningDate') {
      setFormData({...formData, joiningDate: formattedDate});
    }

    setShowDatePicker(false);
  };

  // ========== IMAGE PICKER FUNCTIONS ==========
  const showImagePickerOptions = (docType: string) => {
    Alert.alert(
      "Select Document",
      "Choose document source",
      [
        {
          text: "Camera",
          onPress: () => takePhoto(docType)
        },
        {
          text: "Gallery",
          onPress: () => pickImageFromGallery(docType)
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  const takePhoto = async (docType: string) => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
      saveToPhotos: true,
    };

    launchCamera(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Camera error');
      } else if (response.assets && response.assets[0]) {
        const imageUri = response.assets[0].uri;

        if (imageUri) {
          setDriverDocuments(prev => ({
            ...prev,
            [docType]: imageUri
          }));
          Alert.alert('Success', 'Document captured successfully!');
        }
      }
    });
  };

  const pickImageFromGallery = async (docType: string) => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
      selectionLimit: 1,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled gallery');
      } else if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Gallery error');
      } else if (response.assets && response.assets[0]) {
        const imageUri = response.assets[0].uri;

        if (imageUri) {
          setDriverDocuments(prev => ({
            ...prev,
            [docType]: imageUri
          }));
          Alert.alert('Success', 'Document selected successfully!');
        }
      }
    });
  };

  const removeDocument = (docType: string) => {
    Alert.alert(
      "Remove Document",
      "Are you sure you want to remove this document?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setDriverDocuments(prev => ({
              ...prev,
              [docType]: null
            }));
          }
        }
      ]
    );
  };

  // ========== DOCUMENT PREVIEW RENDER ==========
  const renderDocumentPreview = (docType: string, label: string) => {
    const imageUri = driverDocuments[docType];

    if (imageUri) {
      return (
        <TouchableOpacity
          style={styles.documentPreviewContainer}
          onPress={() => showImagePickerOptions(docType)}
          onLongPress={() => removeDocument(docType)}
        >
          <Image
            source={{ uri: imageUri }}
            style={styles.documentPreview}
            resizeMode="cover"
          />
          <View style={styles.documentOverlay}>
            <Text style={styles.documentLabel}>{label}</Text>
            <TouchableOpacity
              style={styles.removeDocButton}
              onPress={() => removeDocument(docType)}
            >
              <Text style={styles.removeDocButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.documentButton}
        onPress={() => showImagePickerOptions(docType)}
      >
        <Text style={styles.documentIcon}>📄</Text>
        <Text style={styles.documentText}>{label}</Text>
        <Text style={styles.documentSubText}>Tap to upload</Text>
      </TouchableOpacity>
    );
  };

  // ========== FORM SUBMISSION ==========
  const handleSubmit = () => {
    // Validation
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Please enter full name');
      return;
    }
    if (!formData.contactNumber.trim()) {
      Alert.alert('Error', 'Please enter contact number');
      return;
    }
    if (!formData.cnic.trim()) {
      Alert.alert('Error', 'Please enter CNIC number');
      return;
    }
    if (!formData.licenseNumber.trim()) {
      Alert.alert('Error', 'Please enter license number');
      return;
    }

    const finalData = {
      ...formData,
      documents: driverDocuments
    };

    Alert.alert(
      mode === 'add' ? 'Add Driver' : 'Update Driver',
      mode === 'add'
        ? 'Are you sure you want to add this driver?'
        : 'Are you sure you want to update driver details?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Alert.alert(
              'Success',
              mode === 'add' ? 'Driver added successfully!' : 'Driver updated successfully!',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    console.log('Driver Data:', finalData);
                    navigation.goBack();
                  }
                },
                {
                  text: 'Assign Bus',
                  onPress: () => {
                    Alert.alert('Assign Bus', 'Redirecting to bus assignment...');
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {mode === 'add' ? 'Add New Driver' : 'Edit Driver Details'}
          </Text>
          <View style={styles.headerRight} />
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Personal Information */}
          <Text style={styles.sectionTitle}>👤 Personal Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ali Ahmed"
              value={formData.fullName}
              onChangeText={(text) => setFormData({...formData, fullName: text})}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Contact Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="+92 300 1234567"
                value={formData.contactNumber}
                onChangeText={(text) => setFormData({...formData, contactNumber: text})}
                keyboardType="phone-pad"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="driver@email.com"
                value={formData.email}
                onChangeText={(text) => setFormData({...formData, email: text})}
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CNIC Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="42301-1234567-8"
              value={formData.cnic}
              onChangeText={(text) => setFormData({...formData, cnic: text})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="House #, Street, City"
              value={formData.address}
              onChangeText={(text) => setFormData({...formData, address: text})}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Emergency Contact</Text>
            <TextInput
              style={styles.input}
              placeholder="+92 300 9876543"
              value={formData.emergencyContact}
              onChangeText={(text) => setFormData({...formData, emergencyContact: text})}
              keyboardType="phone-pad"
            />
          </View>

          {/* License Information */}
          <Text style={styles.sectionTitle}>📄 License Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>License Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="LHR-123456"
              value={formData.licenseNumber}
              onChangeText={(text) => setFormData({...formData, licenseNumber: text})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>License Type</Text>
            <View style={styles.optionsContainer}>
              {licenseTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.optionButton,
                    formData.licenseType === type.id && styles.optionButtonSelected
                  ]}
                  onPress={() => setFormData({...formData, licenseType: type.id})}
                >
                  <Text style={styles.optionIcon}>{type.icon}</Text>
                  <Text style={[
                    styles.optionLabel,
                    formData.licenseType === type.id && styles.optionLabelSelected
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>License Expiry Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => handleDatePress('licenseExpiry')}
            >
              <Text style={formData.licenseExpiry ? styles.dateSelectedText : styles.datePlaceholderText}>
                {formData.licenseExpiry || 'Select date'}
              </Text>
              <Text style={styles.calendarIcon}>📅</Text>
            </TouchableOpacity>
          </View>

          {/* Employment Information */}
          <Text style={styles.sectionTitle}>💼 Employment Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Joining Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => handleDatePress('joiningDate')}
            >
              <Text style={formData.joiningDate ? styles.dateSelectedText : styles.datePlaceholderText}>
                {formData.joiningDate || 'Select date'}
              </Text>
              <Text style={styles.calendarIcon}>📅</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Monthly Salary (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="45000"
                value={formData.salary}
                onChangeText={(text) => setFormData({...formData, salary: text})}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Employment Type</Text>
              <View style={styles.employmentOptions}>
                {employmentTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.employmentButton,
                      formData.employmentType === type.id && styles.employmentButtonSelected
                    ]}
                    onPress={() => setFormData({...formData, employmentType: type.id})}
                  >
                    <Text style={[
                      styles.employmentLabel,
                      formData.employmentType === type.id && styles.employmentLabelSelected
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Document Upload */}
          <Text style={styles.sectionTitle}>📎 Upload Documents</Text>
          <View style={styles.documentUploadContainer}>
            {renderDocumentPreview('cnicFront', 'CNIC Front')}
            {renderDocumentPreview('cnicBack', 'CNIC Back')}
            {renderDocumentPreview('license', 'License')}
            {renderDocumentPreview('photo', 'Photo')}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.submitButton]}
              onPress={handleSubmit}
            >
              <Text style={styles.submitButtonText}>
                {mode === 'add' ? 'Add Driver' : 'Update Driver'}
              </Text>
            </TouchableOpacity>
          </View>
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

        {/* Android Date Picker */}
        {showDatePicker && Platform.OS === 'android' && (
          <View style={styles.androidDatePickerContainer}>
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    flexGrow: 1,
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
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 24,
  },
  formContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A237E',
    marginTop: 24,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 4,
    backgroundColor: '#FFFFFF',
    minWidth: 120,
  },
  optionButtonSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  optionLabel: {
    fontSize: 14,
    color: '#333333',
  },
  optionLabelSelected: {
    color: '#1A237E',
    fontWeight: '600',
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
  employmentOptions: {
    flexDirection: 'row',
  },
  employmentButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    paddingVertical: 8,
    marginHorizontal: 2,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  employmentButtonSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  employmentLabel: {
    fontSize: 12,
    color: '#666666',
  },
  employmentLabelSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  documentUploadContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  documentButton: {
    width: '48%',
    aspectRatio: 1.5,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#F8F9FA',
    padding: 10,
  },
  documentIcon: {
    fontSize: 32,
    marginBottom: 8,
    color: '#666666',
  },
  documentText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 4,
  },
  documentSubText: {
    fontSize: 10,
    color: '#999999',
    textAlign: 'center',
  },
  documentPreviewContainer: {
    width: '48%',
    aspectRatio: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  documentPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  documentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  removeDocButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeDocButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 32,
    marginBottom: 40,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
  },
  cancelButtonText: {
    color: '#666666',
    fontWeight: '600',
    fontSize: 16,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
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
  // Android date picker styles
  androidDatePickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
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

export default AddDriverScreen;
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

const AddBusScreen = ({ navigation, route }: any) => {
  const mode = route.params?.mode || 'add';
  const existingBus = route.params?.bus || null;

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Image states - Ab sirf URI store karenge
  const [busImages, setBusImages] = useState({
    frontView: null,
    backView: null,
    interior: null,
    documents: null,
  });

  const [formData, setFormData] = useState({
    busNumber: existingBus?.number || '',
    registrationNumber: existingBus?.registration || '',
    make: existingBus?.make || '',
    model: existingBus?.model || '',
    year: existingBus?.year || '',
    capacity: existingBus?.capacity || '',
    fuelType: existingBus?.fuelType || 'diesel',
    color: existingBus?.color || '',
    insuranceNumber: existingBus?.insuranceNumber || '',
    insuranceExpiry: existingBus?.insuranceExpiry || '',
    fitnessExpiry: existingBus?.fitnessExpiry || '',
  });

  const fuelTypes = [
    { id: 'diesel', label: 'Diesel', icon: '⛽' },
    { id: 'petrol', label: 'Petrol', icon: '⛽' },
    { id: 'cng', label: 'CNG', icon: '🔥' },
    { id: 'electric', label: 'Electric', icon: '⚡' },
  ];

  // ========== DATE PICKER FUNCTIONS ==========
  const handleDatePress = (field: string) => {
    setCurrentDateField(field);
    if (formData[field]) {
      setSelectedDate(new Date(formData[field]));
    } else {
      setSelectedDate(new Date());
    }

    if (Platform.OS === 'ios') {
      setShowDatePicker(true);
    } else {
      setShowDatePicker(true);
    }
  };

  const handleDateChange = (event: any, date: Date | undefined) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0];

      if (currentDateField === 'insuranceExpiry') {
        setFormData({...formData, insuranceExpiry: formattedDate});
      } else if (currentDateField === 'fitnessExpiry') {
        setFormData({...formData, fitnessExpiry: formattedDate});
      }
    }
  };

  const handleAndroidDateConfirm = () => {
    const formattedDate = selectedDate.toISOString().split('T')[0];

    if (currentDateField === 'insuranceExpiry') {
      setFormData({...formData, insuranceExpiry: formattedDate});
    } else if (currentDateField === 'fitnessExpiry') {
      setFormData({...formData, fitnessExpiry: formattedDate});
    }

    setShowDatePicker(false);
  };

  // ========== IMAGE PICKER FUNCTIONS ==========
  const showImagePickerOptions = (imageType: string) => {
    Alert.alert(
      "Select Image",
      "Choose image source",
      [
        {
          text: "Camera",
          onPress: () => takePhoto(imageType)
        },
        {
          text: "Gallery",
          onPress: () => pickImageFromGallery(imageType)
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  // ✅ UPDATED: takePhoto function
  const takePhoto = async (imageType: string) => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
      saveToPhotos: true,
    };

    launchCamera(options, (response) => {
      console.log('Camera Response:', response);

      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Camera error');
      } else if (response.assets && response.assets[0]) {
        const imageUri = response.assets[0].uri;
        console.log('Image URI:', imageUri);

        if (imageUri) {
          setBusImages(prev => ({
            ...prev,
            [imageType]: imageUri
          }));
          Alert.alert('Success', 'Photo captured successfully!');
        }
      }
    });
  };

  // ✅ UPDATED: pickImageFromGallery function
  const pickImageFromGallery = async (imageType: string) => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
      selectionLimit: 1,
    };

    launchImageLibrary(options, (response) => {
      console.log('Gallery Response:', response);

      if (response.didCancel) {
        console.log('User cancelled gallery');
      } else if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Gallery error');
      } else if (response.assets && response.assets[0]) {
        const imageUri = response.assets[0].uri;
        console.log('Selected Image URI:', imageUri);

        if (imageUri) {
          setBusImages(prev => ({
            ...prev,
            [imageType]: imageUri
          }));
          Alert.alert('Success', 'Photo selected successfully!');
        }
      }
    });
  };

  const removeImage = (imageType: string) => {
    Alert.alert(
      "Remove Image",
      "Are you sure you want to remove this image?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setBusImages(prev => ({
              ...prev,
              [imageType]: null
            }));
          }
        }
      ]
    );
  };

  // ✅ UPDATED: renderImagePreview function
  const renderImagePreview = (imageType: string, label: string) => {
    const imageUri = busImages[imageType];

    if (imageUri) {
      return (
        <TouchableOpacity
          style={styles.imagePreviewContainer}
          onPress={() => showImagePickerOptions(imageType)}
          onLongPress={() => removeImage(imageType)}
        >
          <Image
            source={{ uri: imageUri }}
            style={styles.imagePreview}
            resizeMode="cover"
            onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
          />
          <View style={styles.imageOverlay}>
            <Text style={styles.imageLabel}>{label}</Text>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeImage(imageType)}
            >
              <Text style={styles.removeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.photoUploadButton}
        onPress={() => showImagePickerOptions(imageType)}
      >
        <Text style={styles.photoUploadIcon}>📷</Text>
        <Text style={styles.photoUploadText}>{label}</Text>
        <Text style={styles.photoUploadSubText}>Tap to upload</Text>
      </TouchableOpacity>
    );
  };

  // ========== FORM SUBMISSION ==========
  const handleSubmit = () => {
    if (!formData.busNumber.trim()) {
      Alert.alert('Error', 'Please enter bus number');
      return;
    }
    if (!formData.registrationNumber.trim()) {
      Alert.alert('Error', 'Please enter registration number');
      return;
    }
    if (!formData.capacity.trim()) {
      Alert.alert('Error', 'Please enter seating capacity');
      return;
    }

    const finalData = {
      ...formData,
      images: busImages
    };

    Alert.alert(
      mode === 'add' ? 'Add Bus' : 'Update Bus',
      mode === 'add'
        ? 'Are you sure you want to add this bus?'
        : 'Are you sure you want to update bus details?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Alert.alert(
              'Success',
              mode === 'add' ? 'Bus added successfully!' : 'Bus updated successfully!',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    console.log('Form Data:', finalData);
                    navigation.goBack();
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
            {mode === 'add' ? 'Add New Bus' : 'Edit Bus Details'}
          </Text>
          <View style={styles.headerRight} />
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Basic Information Section */}
          <Text style={styles.sectionTitle}>🚌 Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bus Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="B-001"
              value={formData.busNumber}
              onChangeText={(text) => setFormData({...formData, busNumber: text})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Registration Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="ABC-123"
              value={formData.registrationNumber}
              onChangeText={(text) => setFormData({...formData, registrationNumber: text})}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Make</Text>
              <TextInput
                style={styles.input}
                placeholder="Toyota"
                value={formData.make}
                onChangeText={(text) => setFormData({...formData, make: text})}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Model</Text>
              <TextInput
                style={styles.input}
                placeholder="Coaster"
                value={formData.model}
                onChangeText={(text) => setFormData({...formData, model: text})}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Year</Text>
              <TextInput
                style={styles.input}
                placeholder="2022"
                value={formData.year}
                onChangeText={(text) => setFormData({...formData, year: text})}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Seating Capacity *</Text>
              <TextInput
                style={styles.input}
                placeholder="40"
                value={formData.capacity}
                onChangeText={(text) => setFormData({...formData, capacity: text})}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Specifications Section */}
          <Text style={styles.sectionTitle}>⚙️ Specifications</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fuel Type</Text>
            <View style={styles.fuelTypesContainer}>
              {fuelTypes.map((fuel) => (
                <TouchableOpacity
                  key={fuel.id}
                  style={[
                    styles.fuelTypeButton,
                    formData.fuelType === fuel.id && styles.fuelTypeButtonSelected
                  ]}
                  onPress={() => setFormData({...formData, fuelType: fuel.id})}
                >
                  <Text style={styles.fuelTypeIcon}>{fuel.icon}</Text>
                  <Text style={[
                    styles.fuelTypeLabel,
                    formData.fuelType === fuel.id && styles.fuelTypeLabelSelected
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
              onChangeText={(text) => setFormData({...formData, color: text})}
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
              onChangeText={(text) => setFormData({...formData, insuranceNumber: text})}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Insurance Expiry</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => handleDatePress('insuranceExpiry')}
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
              >
                <Text style={formData.fitnessExpiry ? styles.dateSelectedText : styles.datePlaceholderText}>
                  {formData.fitnessExpiry || 'Select date'}
                </Text>
                <Text style={styles.calendarIcon}>📅</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Photo Upload Section */}
          <Text style={styles.sectionTitle}>📸 Photos</Text>
          <View style={styles.photoUploadContainer}>
            {renderImagePreview('frontView', 'Front View')}
            {renderImagePreview('backView', 'Back View')}
            {renderImagePreview('interior', 'Interior')}
            {renderImagePreview('documents', 'Documents')}
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
                {mode === 'add' ? 'Add Bus' : 'Update Bus'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Picker Modal */}
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
                  minimumDate={new Date()}
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
              minimumDate={new Date()}
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
  row: {
    flexDirection: 'row',
  },
  fuelTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  fuelTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 4,
    backgroundColor: '#FFFFFF',
    minWidth: 100,
  },
  fuelTypeButtonSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
  },
  fuelTypeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  fuelTypeLabel: {
    fontSize: 14,
    color: '#333333',
  },
  fuelTypeLabelSelected: {
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
  photoUploadContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoUploadButton: {
    width: '48%',
    aspectRatio: 1,
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
  photoUploadIcon: {
    fontSize: 32,
    marginBottom: 8,
    color: '#666666',
  },
  photoUploadText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 4,
  },
  photoUploadSubText: {
    fontSize: 10,
    color: '#999999',
    textAlign: 'center',
  },
  imagePreviewContainer: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  imageOverlay: {
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
  imageLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
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

export default AddBusScreen;
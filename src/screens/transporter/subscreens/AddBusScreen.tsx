// src/screens/transporter/subscreens/AddBusScreen.tsx
import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// Types
import { Bus } from '../../../types/fleet.types';

// Constants
import { COLORS, SIZES, SHADOWS } from '../../../constants/theme';

const AddBusScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { mode, bus, transporterId } = route.params as {
    mode: 'add' | 'edit';
    bus?: Bus;
    transporterId?: string;
  };

  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Image states - Ab URIs store karenge
  const [busImages, setBusImages] = useState({
    frontView: null as string | null,
    backView: null as string | null,
    interior: null as string | null,
    documents: null as string | null,
  });

  // Uploaded image URLs (Firebase Storage se)
  const [uploadedImageUrls, setUploadedImageUrls] = useState({
    frontView: '',
    backView: '',
    interior: '',
    documents: '',
  });

  const [formData, setFormData] = useState({
    busNumber: '',
    registrationNumber: '',
    make: '',
    model: '',
    year: '',
    capacity: '',
    fuelType: 'diesel',
    color: '',
    insuranceNumber: '',
    insuranceExpiry: '',
    fitnessExpiry: '',
  });

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
        insuranceNumber: bus.insuranceNumber || '',
        insuranceExpiry: bus.insuranceExpiry || '',
        fitnessExpiry: bus.fitnessExpiry || '',
      });

      // Load existing image URLs
      if (bus.images) {
        setUploadedImageUrls({
          frontView: bus.images.frontView || '',
          backView: bus.images.backView || '',
          interior: bus.images.interior || '',
          documents: bus.images.documents || '',
        });
      }
    }
  }, [mode, bus]);

  const fuelTypes = [
    { id: 'diesel', label: 'Diesel', icon: '⛽' },
    { id: 'petrol', label: 'Petrol', icon: '⛽' },
    { id: 'cng', label: 'CNG', icon: '🔥' },
    { id: 'electric', label: 'Electric', icon: '⚡' },
  ];

  const user = auth().currentUser;

  // ========== DATE PICKER FUNCTIONS ==========
  const handleDatePress = (field: string) => {
    setCurrentDateField(field);
    if (formData[field as keyof typeof formData]) {
      setSelectedDate(new Date(formData[field as keyof typeof formData] as string));
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

  // 📸 Upload image to Firebase Storage
  const uploadImageToStorage = async (imageUri: string, imageType: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const filename = `buses/${user.uid}/${Date.now()}_${imageType}.jpg`;
      const reference = storage().ref(filename);

      console.log('Uploading image:', filename);

      // Upload file
      await reference.putFile(imageUri);

      // Get download URL
      const downloadUrl = await reference.getDownloadURL();
      console.log('Image uploaded:', downloadUrl);

      return downloadUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const takePhoto = (imageType: string) => {
    const options = {
      mediaType: 'photo' as const,
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
          setBusImages(prev => ({
            ...prev,
            [imageType]: imageUri
          }));
          Alert.alert('Success', 'Photo captured successfully!');
        }
      }
    });
  };

  const pickImageFromGallery = (imageType: string) => {
    const options = {
      mediaType: 'photo' as const,
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
            setUploadedImageUrls(prev => ({
              ...prev,
              [imageType]: ''
            }));
          }
        }
      ]
    );
  };

  const renderImagePreview = (imageType: string, label: string) => {
    // Pehle local URI check karo, phir uploaded URL
    const imageUri = busImages[imageType as keyof typeof busImages] ||
                    uploadedImageUrls[imageType as keyof typeof uploadedImageUrls];

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

  // ========== FORM VALIDATION ==========
  const validateForm = () => {
    if (!formData.busNumber.trim()) {
      Alert.alert('Error', 'Please enter bus number');
      return false;
    }
    if (!formData.registrationNumber.trim()) {
      Alert.alert('Error', 'Please enter registration number');
      return false;
    }
    if (!formData.capacity.trim()) {
      Alert.alert('Error', 'Please enter seating capacity');
      return false;
    }
    const capacityNum = parseInt(formData.capacity);
    if (isNaN(capacityNum) || capacityNum <= 0) {
      Alert.alert('Error', 'Please enter valid capacity');
      return false;
    }
    return true;
  };

  // ========== UPLOAD ALL IMAGES ==========
  const uploadAllImages = async (): Promise<any> => {
    const imageUrls: any = {};
    const uploadPromises = [];

    for (const [key, uri] of Object.entries(busImages)) {
      if (uri) {
        uploadPromises.push(
          uploadImageToStorage(uri, key).then(url => {
            if (url) imageUrls[key] = url;
          })
        );
      }
    }

    if (uploadPromises.length > 0) {
      setUploadingImages(true);
      await Promise.all(uploadPromises);
      setUploadingImages(false);
    }

    return imageUrls;
  };

  // ========== HANDLE SUBMIT ==========
  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setLoading(true);

    try {
      // Upload images first
      const imageUrls = await uploadAllImages();

      // Prepare bus data
      const busData = {
        busNumber: formData.busNumber.trim(),
        registrationNumber: formData.registrationNumber.trim(),
        make: formData.make.trim(),
        model: formData.model.trim(),
        year: formData.year ? parseInt(formData.year) : null,
        capacity: parseInt(formData.capacity),
        fuelType: formData.fuelType,
        color: formData.color.trim(),
        status: 'active',
        insuranceNumber: formData.insuranceNumber.trim(),
        insuranceExpiry: formData.insuranceExpiry,
        fitnessExpiry: formData.fitnessExpiry,
        images: imageUrls,
        transporterId: user.uid,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      if (mode === 'add') {
        // Add new bus
        await firestore()
          .collection('buses')
          .add({
            ...busData,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });

        Alert.alert('Success', 'Bus added successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Update existing bus
        await firestore()
          .collection('buses')
          .doc(bus?.id)
          .update(busData);

        Alert.alert('Success', 'Bus updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error saving bus:', error);
      Alert.alert('Error', 'Failed to save bus. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
        {(loading || uploadingImages) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingOverlayText}>
              {uploadingImages ? 'Uploading images...' : 'Saving bus...'}
            </Text>
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
              placeholder="B-001"
              value={formData.busNumber}
              onChangeText={(text) => setFormData({...formData, busNumber: text})}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Registration Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="ABC-123"
              value={formData.registrationNumber}
              onChangeText={(text) => setFormData({...formData, registrationNumber: text})}
              editable={!loading}
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
                editable={!loading}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Model</Text>
              <TextInput
                style={styles.input}
                placeholder="Coaster"
                value={formData.model}
                onChangeText={(text) => setFormData({...formData, model: text})}
                editable={!loading}
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
                editable={!loading}
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
                editable={!loading}
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
                  disabled={loading}
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
              onChangeText={(text) => setFormData({...formData, insuranceNumber: text})}
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
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.submitButton]}
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
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    margin: 4,
    backgroundColor: COLORS.white,
    minWidth: 100,
  },
  fuelTypeButtonSelected: {
    backgroundColor: COLORS.infoLight,
    borderColor: COLORS.secondary,
  },
  fuelTypeIcon: {
    fontSize: 20,
    marginRight: SIZES.xs,
  },
  fuelTypeLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  fuelTypeLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
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
  photoUploadContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoUploadButton: {
    width: '48%',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.sm,
    backgroundColor: COLORS.background,
    padding: SIZES.sm,
  },
  photoUploadIcon: {
    fontSize: 32,
    marginBottom: SIZES.xs,
    color: COLORS.textLight,
  },
  photoUploadText: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 2,
  },
  photoUploadSubText: {
    fontSize: 10,
    color: COLORS.textLighter,
    textAlign: 'center',
  },
  imagePreviewContainer: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: SIZES.md,
    overflow: 'hidden',
    marginBottom: SIZES.sm,
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.background,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: SIZES.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imageLabel: {
    color: COLORS.white,
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
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
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
  // Modal styles
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
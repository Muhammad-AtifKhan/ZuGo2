// src/screens/transporter/subscreens/AddBusScreen.tsx - COMPLETE FIXED VERSION
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
import ImageResizer from 'react-native-image-resizer'; // Optional: for image compression

// Types
import { Bus } from '../../../types/fleet.types';

// Constants
import { COLORS, SIZES, SHADOWS } from '../../../constants/theme';

const AddBusScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { mode, bus, transporterId: routeTransporterId } = route.params as {
    mode: 'add' | 'edit';
    bus?: Bus;
    transporterId?: string;
  };

  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // ✅ FIX: Single source of truth for images - removed busImages + uploadedImageUrls duplication
  const [images, setImages] = useState({
    frontView: '',
    backView: '',
    interior: '',
    documents: '',
  });

  // Track which images are new and need uploading
  const [newImageUris, setNewImageUris] = useState<Record<string, string>>({});

  // ✅ FIX: Update field helper
  const updateField = useCallback((key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

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
  });

  const user = auth().currentUser;
  const effectiveTransporterId = routeTransporterId || user?.uid;

  // Debounce ref for duplicate check
  const duplicateCheckTimeout = useRef<NodeJS.Timeout>();

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
      });

      // Load existing image URLs
      if (bus.images) {
        setImages({
          frontView: bus.images.frontView || '',
          backView: bus.images.backView || '',
          interior: bus.images.interior || '',
          documents: bus.images.documents || '',
        });
      }
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

  // ✅ FIX: Delete image from Firebase Storage
  const deleteImageFromStorage = useCallback(async (imageUrl: string): Promise<void> => {
    if (!imageUrl) return;

    try {
      const ref = storage().refFromURL(imageUrl);
      await ref.delete();
      console.log('✅ Image deleted from storage:', imageUrl);
    } catch (error) {
      // Don't throw error if image doesn't exist
      if (error.code !== 'storage/object-not-found') {
        console.error('Error deleting image:', error);
      }
    }
  }, []);

  // ========== DATE PICKER FUNCTIONS ==========
  const handleDatePress = (field: string) => {
    setCurrentDateField(field);
    const dateValue = formData[field as keyof typeof formData];

    // ✅ FIX: Safe date parsing
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

  // ✅ FIX: Optional image compression before upload
  const compressImage = async (imageUri: string): Promise<string> => {
    try {
      // If you have react-native-image-resizer installed
      // const compressed = await ImageResizer.createResizedImage(
      //   imageUri,
      //   800,
      //   800,
      //   'JPEG',
      //   80
      // );
      // return compressed.uri;

      // Fallback: return original
      return imageUri;
    } catch (error) {
      console.error('Image compression error:', error);
      return imageUri;
    }
  };

  // ✅ FIX: Upload image with timestamp to avoid overwrites
  const uploadImageToStorage = async (imageUri: string, imageType: string, busId?: string): Promise<string | null> => {
    if (!user) return null;

    try {
      // Compress image first (optional)
      const compressedUri = await compressImage(imageUri);

      const busIdentifier = busId || 'new';
      // ✅ FIX: Add timestamp to avoid overwriting
      const timestamp = Date.now();
      const filename = `buses/${user.uid}/${busIdentifier}/${imageType}_${timestamp}.jpg`;
      const reference = storage().ref(filename);

      console.log('Uploading image:', filename);

      await reference.putFile(compressedUri);
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

    launchCamera(options, async (response) => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Camera error');
      } else if (response.assets && response.assets[0]) {
        const imageUri = response.assets[0].uri;
        if (imageUri) {
          // Store local URI for preview
          setImages(prev => ({
            ...prev,
            [imageType]: imageUri
          }));
          // Track as new image
          setNewImageUris(prev => ({
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

    launchImageLibrary(options, async (response) => {
      if (response.didCancel) {
        console.log('User cancelled gallery');
      } else if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Gallery error');
      } else if (response.assets && response.assets[0]) {
        const imageUri = response.assets[0].uri;
        if (imageUri) {
          setImages(prev => ({
            ...prev,
            [imageType]: imageUri
          }));
          setNewImageUris(prev => ({
            ...prev,
            [imageType]: imageUri
          }));
          Alert.alert('Success', 'Photo selected successfully!');
        }
      }
    });
  };

  // ✅ FIX: Proper removeImage with storage deletion
  const removeImage = useCallback(async (imageType: string) => {
    const existingUrl = images[imageType as keyof typeof images];
    const isNewImage = newImageUris[imageType];

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
          onPress: async () => {
            // Delete from storage if it's an existing URL (not a local URI)
            if (existingUrl && !isNewImage && existingUrl.startsWith('http')) {
              await deleteImageFromStorage(existingUrl);
            }

            // Update state
            setImages(prev => ({
              ...prev,
              [imageType]: ''
            }));

            // Remove from new images tracking
            setNewImageUris(prev => {
              const newState = { ...prev };
              delete newState[imageType];
              return newState;
            });
          }
        }
      ]
    );
  }, [images, newImageUris, deleteImageFromStorage]);

  const renderImagePreview = (imageType: string, label: string) => {
    const imageUri = images[imageType as keyof typeof images];

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

  // ✅ FIX: Case-insensitive duplicate check with debounce
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

  // ✅ FIX: Debounced duplicate check
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

    // ✅ FIX: Case-insensitive regex
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

  // ========== UPLOAD ALL IMAGES ==========
  const uploadAllImages = async (busId?: string): Promise<Record<string, string>> => {
    const imageUrls: Record<string, string> = {};
    const uploadPromises: Promise<void>[] = [];
    let completedUploads = 0;
    const totalUploads = Object.keys(newImageUris).length;

    // Keep existing URLs that are not being replaced
    for (const [key, value] of Object.entries(images)) {
      if (value && !newImageUris[key]) {
        imageUrls[key] = value;
      }
    }

    // Upload new images
    for (const [key, uri] of Object.entries(newImageUris)) {
      if (uri) {
        uploadPromises.push(
          uploadImageToStorage(uri, key, busId).then(url => {
            if (url) {
              imageUrls[key] = url;
              completedUploads++;
              setUploadProgress((completedUploads / totalUploads) * 100);
            }
          })
        );
      }
    }

    if (uploadPromises.length > 0) {
      setUploadingImages(true);
      setUploadProgress(0);

      try {
        await Promise.all(uploadPromises);
      } catch (error) {
        console.error('Upload error:', error);
        throw error;
      } finally {
        setUploadingImages(false);
        setUploadProgress(0);
      }
    }

    return imageUrls;
  };

  // ========== HANDLE SUBMIT ==========
  const handleSubmit = async () => {
    // ✅ FIX: Loading lock
    if (loading) return;

    if (!validateForm()) return;

    if (!user || !effectiveTransporterId) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    // ✅ FIX: Use consistent transporterId
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
        status: 'active',
        insuranceNumber: formData.insuranceNumber.trim() || null,
        insuranceExpiry: formData.insuranceExpiry || null,
        fitnessExpiry: formData.fitnessExpiry || null,
        assignedDriverId: formData.assignedDriverId || null,
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

      let busId = bus?.id;

      if (mode === 'add') {
        // Create bus document
        const busRef = await firestore().collection('buses').add({
          ...busData,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

        busId = busRef.id;

        // Upload images
        const imageUrls = await uploadAllImages(busId);

        // Update bus with image URLs
        await busRef.update({ images: imageUrls });

        // Update transporter's bus count
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
        // Update existing bus
        if (!bus?.id) throw new Error('Bus ID not found');

        // Upload new images
        const newImageUrls = await uploadAllImages(bus.id);

        // ✅ FIX: Properly merge images (don't lose removed ones)
        const finalImages = {
          frontView: newImageUrls.frontView || (images.frontView && !newImageUris.frontView ? images.frontView : ''),
          backView: newImageUrls.backView || (images.backView && !newImageUris.backView ? images.backView : ''),
          interior: newImageUrls.interior || (images.interior && !newImageUris.interior ? images.interior : ''),
          documents: newImageUrls.documents || (images.documents && !newImageUris.documents ? images.documents : ''),
        };

        await firestore()
          .collection('buses')
          .doc(bus.id)
          .update({
            ...busData,
            images: finalImages,
          });

        Alert.alert('Success', 'Bus updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      console.error('Error saving bus:', error);
      // ✅ FIX: Better error message
      const message = error instanceof Error ? error.message : 'Failed to save bus. Please try again.';
      Alert.alert('Error', message);
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
              {uploadingImages ? `Uploading images... ${Math.round(uploadProgress)}%` : 'Saving bus...'}
            </Text>
            {uploadingImages && uploadProgress > 0 && (
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
              </View>
            )}
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

          {/* Photo Upload Section */}
          <Text style={styles.sectionTitle}>📸 Photos</Text>
          <Text style={styles.imageNote}>
            Upload clear photos of the bus from different angles
            {'\n'}💡 Long press to remove image
          </Text>

          <View style={styles.photoUploadContainer}>
            {renderImagePreview('frontView', 'Front View')}
            {renderImagePreview('backView', 'Back View')}
            {renderImagePreview('interior', 'Interior')}
            {renderImagePreview('documents', 'Documents')}
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
  progressBarContainer: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginTop: SIZES.sm,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 2,
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
  imageNote: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: SIZES.md,
    fontStyle: 'italic',
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
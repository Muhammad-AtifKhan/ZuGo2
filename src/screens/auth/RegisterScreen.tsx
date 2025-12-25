// RegisterScreen.tsx - UPDATED WITH FIREBASE
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore'; // Optional: For storing user data

interface RegisterScreenProps {
  navigation: any;
}

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [userType, setUserType] = useState<'passenger' | 'driver' | 'transporter'>('passenger');
  const [loading, setLoading] = useState(false);

  // Validate email format
  const isValidEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Validate phone number
  const isValidPhone = (phone: string) => {
    const re = /^[0-9]{10,15}$/;
    return re.test(phone);
  };

  const handleRegister = async () => {
    // Validation
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (phone && !isValidPhone(phone)) {
      Alert.alert('Error', 'Please enter a valid phone number (10-15 digits)');
      return;
    }

    setLoading(true);

    try {
      // 1. Create user in Firebase Authentication
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // 2. Send email verification (optional)
      await user.sendEmailVerification();

      // 3. Store additional user data in Firestore (optional but recommended)
      try {
        await firestore()
          .collection('users')
          .doc(user.uid)
          .set({
            uid: user.uid,
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim() || '',
            userType: userType,
            emailVerified: false,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
        
        console.log('User data saved to Firestore');
      } catch (firestoreError) {
        console.warn('Could not save to Firestore:', firestoreError);
        // Firestore error shouldn't stop registration
      }

      // 4. Show success message
      Alert.alert(
        'Registration Successful! 🎉',
        'Your account has been created successfully!\n\nPlease check your email to verify your account.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to login screen
              navigation.navigate('Login', { registeredEmail: email });
            }
          }
        ]
      );

      // Reset form
      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setPhone('');
      setUserType('passenger');

    } catch (error: any) {
      // Handle specific Firebase errors
      let errorMessage = 'Registration failed. Please try again.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered. Please login or use a different email.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'The email address is not valid.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled. Please contact support.';
          break;
        case 'auth/weak-password':
          errorMessage = 'The password is too weak. Please use a stronger password.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        default:
          errorMessage = error.message || 'An unknown error occurred.';
      }

      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const UserTypeButton = ({ type, label }: { type: 'passenger' | 'driver' | 'transporter', label: string }) => (
    <TouchableOpacity
      style={[
        styles.userTypeButton,
        userType === type && styles.userTypeButtonActive
      ]}
      onPress={() => setUserType(type)}
      disabled={loading}
    >
      <Text style={[
        styles.userTypeText,
        userType === type && styles.userTypeTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join City Transport Management System</Text>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput 
            placeholder="Enter your full name" 
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            editable={!loading}
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput 
            placeholder="Enter your email" 
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput 
            placeholder="Enter phone number (optional)" 
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!loading}
          />

          <Text style={styles.label}>Password *</Text>
          <TextInput 
            placeholder="Create password (min. 6 characters)" 
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <Text style={styles.label}>Confirm Password *</Text>
          <TextInput 
            placeholder="Confirm your password" 
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!loading}
          />

          <Text style={styles.label}>Account Type *</Text>
          <View style={styles.userTypeContainer}>
            <UserTypeButton type="passenger" label="Passenger" />
            <UserTypeButton type="driver" label="Driver" />
            <UserTypeButton type="transporter" label="Transporter" />
          </View>

          <Text style={styles.userTypeDescription}>
            {userType === 'passenger' && 'Book rides and travel around the city'}
            {userType === 'driver' && 'Provide rides and earn money'}
            {userType === 'transporter' && 'Manage fleet and drivers'}
          </Text>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By creating an account, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>{' '}
              and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>

          <TouchableOpacity 
            onPress={() => navigation.navigate('Login')}
            disabled={loading}
          >
            <Text style={styles.link}>
              Already have an account? <Text style={styles.linkBold}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Benefits of Registration:</Text>
          <Text style={styles.infoItem}>✓ Book rides instantly</Text>
          <Text style={styles.infoItem}>✓ Track your rides</Text>
          <Text style={styles.infoItem}>✓ Multiple payment options</Text>
          <Text style={styles.infoItem}>✓ 24/7 customer support</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0A7AFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  userTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  userTypeButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  userTypeButtonActive: {
    backgroundColor: '#0A7AFF',
    borderColor: '#0A7AFF',
  },
  userTypeText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  userTypeTextActive: {
    color: '#fff',
  },
  userTypeDescription: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0A7AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#a0c8ff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  termsContainer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0A7AFF',
  },
  termsText: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    color: '#0A7AFF',
    fontWeight: '600',
  },
  link: {
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 15,
  },
  linkBold: {
    color: '#0A7AFF',
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  infoItem: {
    color: '#555',
    marginBottom: 6,
    fontSize: 14,
  },
});
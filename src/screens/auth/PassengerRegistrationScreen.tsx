// src/screens/auth/PassengerRegistrationScreen.tsx - FIREBASE INTEGRATED
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

type StackParamList = {
  PassengerRegistration: undefined;
  OTPVerification: { phone: string; role: string };
  Login: undefined;
  Home: undefined;
};

type NavigationProp = NativeStackNavigationProp<StackParamList>;

type RouteParams = { role?: 'passenger' | 'driver' | 'transporter' };

export default function PassengerRegistrationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const params = route.params as RouteParams;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'passenger' | 'driver' | 'transporter'>(
    params?.role || 'passenger'
  );

  const handleChange = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhone = (phone: string) => /^[0-9]{10,15}$/.test(phone.replace(/\D/g, ''));
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.startsWith('0') ? `+92${cleaned.substring(1)}` : `+${cleaned}`;
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return Alert.alert('Error', 'Enter full name');
    if (!formData.email.trim() || !isValidEmail(formData.email)) return Alert.alert('Error', 'Enter valid email');
    if (!formData.phone.trim() || !isValidPhone(formData.phone)) return Alert.alert('Error', 'Enter valid phone');
    if (!formData.password || formData.password.length < 6) return Alert.alert('Error', 'Password too short');
    if (formData.password !== formData.confirmPassword) return Alert.alert('Error', 'Passwords do not match');
    if (!termsAccepted) return Alert.alert('Error', 'Accept terms & conditions');

    setLoading(true);
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(formData.email.trim().toLowerCase(), formData.password);
      const user = userCredential.user;
      await user.updateProfile({ displayName: formData.name.trim() });
      await user.sendEmailVerification();

      const formattedPhone = formatPhoneNumber(formData.phone);
      await firestore().collection('users').doc(user.uid).set({
        uid: user.uid,
        fullName: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formattedPhone,
        phoneLocal: formData.phone.trim(),
        userType: selectedRole,
        emailVerified: false,
        profileComplete: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
        status: 'active',
      });

      Alert.alert(
        'Registration Successful! 🎉',
        `Your ${selectedRole} account has been created! Verification email sent to ${formData.email}`,
        [
          {
            text: 'Login Now',
            onPress: () => {
              setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
              setTermsAccepted(false);
              navigation.reset({ index: 0, routes: [{ name: 'Login', params: { preFilledEmail: formData.email } }] });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Registration Error:', error);
      let message = 'Registration failed. Try again.';
      switch (error.code) {
        case 'auth/email-already-in-use': message = 'Email already registered'; break;
        case 'auth/invalid-email': message = 'Invalid email'; break;
        case 'auth/weak-password': message = 'Weak password'; break;
        case 'auth/network-request-failed': message = 'Network error'; break;
      }
      Alert.alert('Registration Failed', message);
    } finally { setLoading(false); }
  };

  const handleOTPVerification = () => Alert.alert('Phone Verification', 'Coming soon!', [{ text: 'OK' }]);

  const roleBadges = {
    passenger: { color: '#4285f4', label: 'Passenger', emoji: '🧑‍💼' },
    driver: { color: '#fbbc04', label: 'Driver', emoji: '🚗' },
    transporter: { color: '#ea4335', label: 'Transporter', emoji: '🏢' },
  };
  const currentRole = roleBadges[selectedRole];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={[styles.roleBadge, { backgroundColor: currentRole.color }]}>
              <Text style={styles.roleEmoji}>{currentRole.emoji}</Text>
              <Text style={styles.roleLabel}>{currentRole.label} Registration</Text>
            </View>
            <Text style={styles.title}>Create Your Account</Text>
            <Text style={styles.subtitle}>Fill in your details to get started as a {currentRole.label.toLowerCase()}</Text>
            <View style={styles.firebaseIndicator}>
              <Text style={styles.firebaseIndicatorText}>🔒 Secure Firebase Registration</Text>
            </View>
          </View>

          <View style={styles.form}>
            {['name','email','phone','password','confirmPassword'].map((field,index) => (
              <View style={styles.inputGroup} key={index}>
                <Text style={styles.label}>{field === 'name' ? 'Full Name' : field === 'email' ? 'Email Address' : field === 'phone' ? 'Phone Number' : field === 'password' ? 'Password' : 'Confirm Password'} *</Text>
                <TextInput
                  style={styles.input}
                  placeholder={field==='name'?'John Doe':field==='email'?'john@example.com':field==='phone'?'03XX XXXXXXX':field==='password'?'At least 6 characters':'Re-enter your password'}
                  value={formData[field as keyof typeof formData]}
                  onChangeText={value=>handleChange(field,value)}
                  keyboardType={field==='email'?'email-address':field==='phone'?'phone-pad':'default'}
                  autoCapitalize={field==='name'?'words':'none'}
                  secureTextEntry={field==='password'||field==='confirmPassword'}
                  editable={!loading}
                />
                {(field==='email'||field==='phone'||field==='password') && <Text style={styles.inputNote}>
                  {field==='email'?"We'll send verification to this email":field==='phone'?"Pakistani format: 03XX-XXXXXXX":"Use a strong password with letters, numbers, and symbols"}
                </Text>}
              </View>
            ))}

            <TouchableOpacity style={styles.termsContainer} onPress={()=>setTermsAccepted(!termsAccepted)} activeOpacity={0.7} disabled={loading}>
              <View style={styles.checkbox}>{termsAccepted && <View style={styles.checkboxInner} />}</View>
              <Text style={styles.termsText}>I agree to the <Text style={styles.termsLink}>Terms & Conditions</Text> and <Text style={styles.termsLink}>Privacy Policy</Text></Text>
            </TouchableOpacity>

            <View style={styles.firebaseInfo}>
              <Text style={styles.firebaseInfoTitle}>🔐 Firebase Security</Text>
              <Text style={styles.firebaseInfoText}>• Email verification required{'\n'}• Secure password encryption{'\n'}• Real-time data sync{'\n'}• Encrypted user data storage</Text>
            </View>

            <TouchableOpacity style={[styles.registerButton, loading&&styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF"/> : <Text style={styles.registerButtonText}>Create {currentRole.label} Account</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.otpButton} onPress={handleOTPVerification} disabled={loading}>
              <Text style={styles.otpButtonText}>📱 Verify Phone Number (Optional)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginLink} onPress={()=>navigation.navigate('Login')} disabled={loading}>
              <Text style={styles.loginText}>Already have an account? <Text style={styles.loginBold}>Login</Text></Text>
            </TouchableOpacity>
          </View>

          <View style={styles.roleInfo}>
            <Text style={styles.roleInfoTitle}>About {currentRole.label} Account:</Text>
            {selectedRole==='passenger' && <Text style={styles.roleInfoText}>• Book rides across the city{'\n'}• Track your rides in real-time{'\n'}• Multiple payment options{'\n'}• Ride history and receipts{'\n'}• 24/7 customer support</Text>}
            {selectedRole==='driver' && <Text style={styles.roleInfoText}>• Accept ride requests{'\n'}• Earn money on your schedule{'\n'}• Track your earnings{'\n'}• Get passenger ratings{'\n'}• Flexible working hours</Text>}
            {selectedRole==='transporter' && <Text style={styles.roleInfoText}>• Manage fleet of vehicles{'\n'}• Monitor driver performance{'\n'}• Track business analytics{'\n'}• Manage payments{'\n'}• Scale your transport business</Text>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#fff'},
  scrollContainer:{flexGrow:1,padding:24},
  header:{marginBottom:32,alignItems:'center'},
  roleBadge:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:8,borderRadius:20,marginBottom:16},
  roleEmoji:{fontSize:20,marginRight:8},
  roleLabel:{color:'#fff',fontSize:14,fontWeight:'bold'},
  title:{fontSize:28,fontWeight:'bold',color:'#202124',marginBottom:8,textAlign:'center'},
  subtitle:{fontSize:16,color:'#5f6368',textAlign:'center',marginBottom:12},
  firebaseIndicator:{backgroundColor:'#FFA000',paddingHorizontal:12,paddingVertical:6,borderRadius:16},
  firebaseIndicatorText:{color:'#fff',fontSize:12,fontWeight:'600'},
  form:{marginBottom:24},
  inputGroup:{marginBottom:20},
  label:{fontSize:14,fontWeight:'600',color:'#202124',marginBottom:8},
  input:{borderWidth:1,borderColor:'#DADCE0',borderRadius:8,paddingHorizontal:16,paddingVertical:12,fontSize:16,color:'#202124',backgroundColor:'#fff'},
  inputNote:{fontSize:12,color:'#5f6368',marginTop:4,fontStyle:'italic'},
  termsContainer:{flexDirection:'row',alignItems:'flex-start',marginBottom:24},
  checkbox:{width:20,height:20,bhorderWidth:2,borderColor:'#1a73e8',borderRadius:4,marginRight:12,justifyContent:'center',alignItems:'center'},
  checkboxInner:{width:12,height:12,backgroundColor:'#1a73e8',borderRadius:2},
  termsText:{flex:1,fontSize:14,color:'#5f6368',lineHeight:20},
  termsLink:{color:'#1a73e8',fontWeight:'600'},
  firebaseInfo:{backgroundColor:'#E8F0FE',padding:16,borderRadius:8,marginBottom:24,borderLeftWidth:4,borderLeftColor:'#1a73e8'},
  firebaseInfoTitle:{fontSize:14,fontWeight:'bold',color:'#1a73e8',marginBottom:8},
  firebaseInfoText:{fontSize:12,color:'#1a73e8',lineHeight:18},
  registerButton:{backgroundColor:'#1a73e8',paddingVertical:16,borderRadius:8,alignItems:'center',marginBottom:12},
  buttonDisabled:{backgroundColor:'#6c8bc7'},
  registerButtonText:{color:'#fff',fontSize:18,fontWeight:'600'},
  otpButton:{backgroundColor:'#34A853',paddingVertical:12,borderRadius:8,alignItems:'center',marginBottom:24},
  otpButtonText:{color:'#fff',fontSize:14,fontWeight:'600'},
  loginLink:{alignItems:'center'},
  loginText:{fontSize:16,color:'#5f6368'},
  loginBold:{color:'#1a73e8',fontWeight:'600'},
  roleInfo:{backgroundColor:'#F8F9FA',padding:20,borderRadius:12,borderWidth:1,borderColor:'#E8EAED'},
  roleInfoTitle:{fontSize:16,fontWeight:'bold',color:'#202124',marginBottom:12},
  roleInfoText:{fontSize:14,color:'#5f6368',lineHeight:22},
});
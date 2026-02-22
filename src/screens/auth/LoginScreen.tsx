// src/screens/auth/LoginScreen.tsx - FIREBASE + ROLE INTEGRATED
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

type RootStackParamList = {
  Home: undefined;
  RoleSelection: undefined;
  ForgotPassword: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!credentials.email.trim()) return Alert.alert('Error', 'Enter your email');
    if (!credentials.password) return Alert.alert('Error', 'Enter your password');

    setLoading(true);
    try {
      const email = credentials.email.trim().toLowerCase();
      const userCredential = await auth().signInWithEmailAndPassword(email, credentials.password);
      const user = userCredential.user;

      const userDoc = await firestore().collection('users').doc(user.uid).get();
      if (!userDoc.exists) throw new Error('User data not found');

      const userData = userDoc.data();
      const role = userData?.userType || 'passenger';

      if (!user.emailVerified) {
        Alert.alert('Verify Email', 'Please verify your email before continuing.');
        return;
      }

      // Navigate to Home (or role-specific screen if needed)
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (error: any) {
      console.error('Login error:', error);
      let msg = 'Login failed. Please try again.';
      switch (error.code) {
        case 'auth/user-not-found': msg = 'No account found with this email.'; break;
        case 'auth/wrong-password': msg = 'Incorrect password.'; break;
        case 'auth/invalid-email': msg = 'Invalid email address.'; break;
        case 'auth/user-disabled': msg = 'This account has been disabled.'; break;
        case 'auth/too-many-requests': msg = 'Too many failed attempts. Try later.'; break;
        case 'auth/network-request-failed': msg = 'Network error. Check your connection.'; break;
      }
      Alert.alert('Login Failed', msg);
    } finally { setLoading(false); }
  };

  const handleForgotPassword = () => {
    if (!credentials.email.trim()) return Alert.alert('Email Required', 'Enter your email first');
    const email = credentials.email.trim();
    Alert.alert('Reset Password', `Send password reset link to ${email}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          try {
            await auth().sendPasswordResetEmail(email);
            Alert.alert('Email Sent', 'Password reset link has been sent.');
          } catch (error) {
            Alert.alert('Error', 'Failed to send reset email. Check email address.');
          }
        },
      },
    ]);
  };

  const handleRegister = () => navigation.navigate('RoleSelection');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={styles.keyboardAvoid}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={credentials.email}
                onChangeText={value => setCredentials(prev => ({ ...prev, email: value }))}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={credentials.password}
                onChangeText={value => setCredentials(prev => ({ ...prev, password: value }))}
                secureTextEntry
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>

            <TouchableOpacity style={styles.forgotContainer} onPress={handleForgotPassword} disabled={loading}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.loginButton, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small"/> : <Text style={styles.loginButtonText}>Sign In</Text>}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.registerSection}>
              <Text style={styles.registerText}>Don't have an account?</Text>
              <TouchableOpacity onPress={handleRegister} disabled={loading}><Text style={styles.registerLink}> Sign Up</Text></TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>Select your role during registration</Text>
            <View style={styles.roleIcons}>
              <View style={styles.roleIcon}><Text style={styles.roleEmoji}>🧑‍💼</Text><Text style={styles.roleText}>Passenger</Text></View>
              <View style={styles.roleIcon}><Text style={styles.roleEmoji}>🚗</Text><Text style={styles.roleText}>Driver</Text></View>
              <View style={styles.roleIcon}><Text style={styles.roleEmoji}>🏢</Text><Text style={styles.roleText}>Transporter</Text></View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#fff'},
  keyboardAvoid:{flex:1},
  scrollContainer:{flexGrow:1,padding:24,justifyContent:'center'},
  header:{marginBottom:48,alignItems:'center'},
  title:{fontSize:32,fontWeight:'bold',color:'#202124',marginBottom:8,textAlign:'center'},
  subtitle:{fontSize:16,color:'#5f6368',textAlign:'center'},
  form:{marginBottom:32},
  inputGroup:{marginBottom:20},
  label:{fontSize:14,fontWeight:'600',color:'#202124',marginBottom:8},
  input:{borderWidth:1,borderColor:'#DADCE0',borderRadius:8,paddingHorizontal:16,paddingVertical:12,fontSize:16,color:'#202124',backgroundColor:'#fff'},
  forgotContainer:{alignSelf:'flex-end',marginBottom:32},
  forgotText:{fontSize:14,color:'#1a73e8',fontWeight:'600'},
  loginButton:{backgroundColor:'#1a73e8',paddingVertical:16,borderRadius:8,alignItems:'center',marginBottom:24},
  buttonDisabled:{backgroundColor:'#6c8bc7'},
  loginButtonText:{color:'#fff',fontSize:18,fontWeight:'600'},
  dividerContainer:{flexDirection:'row',alignItems:'center',marginBottom:24},
  divider:{flex:1,height:1,backgroundColor:'#DADCE0'},
  dividerText:{marginHorizontal:16,color:'#5f6368',fontSize:14},
  registerSection:{flexDirection:'row',justifyContent:'center'},
  registerText:{fontSize:16,color:'#5f6368'},
  registerLink:{fontSize:16,color:'#1a73e8',fontWeight:'bold'},
  infoContainer:{backgroundColor:'#F8F9FA',padding:20,borderRadius:12,alignItems:'center'},
  infoText:{fontSize:14,color:'#5f6368',marginBottom:16,textAlign:'center'},
  roleIcons:{flexDirection:'row',justifyContent:'space-around',width:'100%'},
  roleIcon:{alignItems:'center'},
  roleEmoji:{fontSize:24,marginBottom:4},
  roleText:{fontSize:12,color:'#5f6368',fontWeight:'500'},
});
import React, { createContext, useEffect, useState } from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { safeSignOut } from '../utils/safeAuth';

interface AuthContextType {
  user: any;
  loading: boolean;
  userRole: string | null;
  isEmailVerified: boolean;
  isAdminVerified: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userRole: null,
  isEmailVerified: false,
  isAdminVerified: false,
  refreshUser: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isAdminVerified, setIsAdminVerified] = useState(false);

  const fetchUserRoleAndStatus = async (currentUser: any) => {
    if (!currentUser) {
      setUserRole(null);
      setIsEmailVerified(false);
      setIsAdminVerified(false);
      return;
    }

    try {
      if (!auth().currentUser || auth().currentUser.uid !== currentUser.uid) {
        return;
      }

      await currentUser.reload();
      const emailVerified = currentUser.emailVerified;
      setIsEmailVerified(emailVerified);

      // ✅ Fetch user document from Firestore
      let userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();

      // Retry up to 5 times with 1-second delay if document is not found (fixes signup race condition)
      if (!userDoc.exists) {
        for (let i = 0; i < 5; i++) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          userDoc = await firestore()
            .collection('users')
            .doc(currentUser.uid)
            .get();
          if (userDoc.exists) {
            break;
          }
        }
      }

      if (userDoc.exists) {
        const userType = userDoc.data()?.userType?.toLowerCase?.() ?? null;
        setUserRole(userType);

        // ✅ For transporter, check admin verification
        if (userType === 'transporter' && auth().currentUser) {
          const transporterDoc = await firestore()
            .collection('transporters')
            .doc(currentUser.uid)
            .get();

          if (transporterDoc.exists) {
            const isVerified = transporterDoc.data()?.isVerified === true;
            setIsAdminVerified(isVerified);
          } else {
            setIsAdminVerified(false);
          }
        } else {
          // For passenger/driver, no admin verification needed
          setIsAdminVerified(true);
        }
      } else {
        setUserRole(null);
        setIsAdminVerified(false);
      }
    } catch (error: any) {
      if (error?.code === 'firestore/permission-denied' && !auth().currentUser) {
        return;
      }
      console.error('Error fetching user role:', error);
      setUserRole(null);
      setIsEmailVerified(false);
      setIsAdminVerified(false);
    }
  };

  const refreshUser = async () => {
    if (user) {
      await fetchUserRoleAndStatus(user);
    }
  };

  const logout = async () => {
    try {
      await safeSignOut();
      setUser(null);
      setUserRole(null);
      setIsEmailVerified(false);
      setIsAdminVerified(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const loadingRef = React.useRef(loading);
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        if (loadingRef.current) {
          await fetchUserRoleAndStatus(currentUser);
          setLoading(false);
        } else {
          fetchUserRoleAndStatus(currentUser);
        }
      } else {
        setUserRole(null);
        setIsEmailVerified(false);
        setIsAdminVerified(false);
        setLoading(false);
      }
    });

    return subscriber;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        userRole,
        isEmailVerified,
        isAdminVerified,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
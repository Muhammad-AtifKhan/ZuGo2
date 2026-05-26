// admin-panel/src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import type { User } from 'firebase/auth';  // ✅ Use 'type' import for User
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const SUPER_ADMIN_EMAILS = new Set([
  'atifkhanniazi181@gmail.com',
  'atifkhanniazi186@gmail.com',
]);

interface AdminProfile {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  status: string;
  fullName?: string;
}

const buildAdminProfile = (
  uid: string,
  email: string,
  adminData: Record<string, unknown>,
): AdminProfile => ({
  id: uid,
  email: email || String(adminData.email || ''),
  role: String(adminData.role || 'admin'),
  permissions: Array.isArray(adminData.permissions)
    ? (adminData.permissions as string[])
    : ['all'],
  status: String(adminData.status || 'active'),
  fullName: String(adminData.fullName || adminData.name || 'Admin'),
});

/** Firestore rules require admins/{uid} to read transporters collection. */
export const ensureAdminFirestoreRecord = async (
  uid: string,
  email: string | null,
): Promise<boolean> => {
  const adminDocRef = doc(db, 'admins', uid);
  const adminDoc = await getDoc(adminDocRef);
  if (adminDoc.exists()) {
    return true;
  }

  const normalizedEmail = email?.trim().toLowerCase() || '';
  if (!SUPER_ADMIN_EMAILS.has(normalizedEmail)) {
    return false;
  }

  await setDoc(
    adminDocRef,
    {
      role: 'super_admin',
      status: 'active',
      email: normalizedEmail,
      fullName: 'Super Admin',
      permissions: ['all'],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return true;
};

interface AuthContextType {
  user: User | null;  // ✅ Now User type is properly imported
  adminProfile: AdminProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  logout: () => Promise<void>;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  adminProfile: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  hasPermission: () => false,
  logout: async () => {},
  authError: null,
  login: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const syncAdminDocForUid = async (
    uid: string,
    email: string,
    adminData: Record<string, unknown>,
  ) => {
    const adminDocRef = doc(db, 'admins', uid);
    await setDoc(
      adminDocRef,
      {
        ...adminData,
        email,
        status: adminData.status || 'active',
        permissions: adminData.permissions || ['all'],
        role: adminData.role || 'admin',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  // Function to fetch admin profile from Firestore
  const fetchAdminProfile = async (uid: string, email: string | null) => {
    const normalizedEmail = email?.trim().toLowerCase() || '';

    try {
      const adminDocRef = doc(db, 'admins', uid);
      const adminDoc = await getDoc(adminDocRef);

      if (adminDoc.exists()) {
        const profile = buildAdminProfile(
          uid,
          normalizedEmail,
          adminDoc.data() as Record<string, unknown>,
        );
        // #region agent log
        fetch('http://127.0.0.1:7545/ingest/7bdbec54-17dc-451f-83dc-46f414750d97',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0f7e3c'},body:JSON.stringify({sessionId:'0f7e3c',location:'AuthContext.tsx:fetchAdminProfile',message:'admin found by uid',data:{uidPrefix:uid.slice(0,8),status:profile.status},timestamp:Date.now(),hypothesisId:'H-A',runId:'login-fix'})}).catch(()=>{});
        // #endregion
        return profile;
      }

      if (normalizedEmail) {
        const emailQuery = query(
          collection(db, 'admins'),
          where('email', '==', normalizedEmail),
          limit(1),
        );
        const emailSnap = await getDocs(emailQuery);

        if (!emailSnap.empty) {
          const matched = emailSnap.docs[0].data() as Record<string, unknown>;
          await syncAdminDocForUid(uid, normalizedEmail, matched);
          const profile = buildAdminProfile(uid, normalizedEmail, matched);
          // #region agent log
          fetch('http://127.0.0.1:7545/ingest/7bdbec54-17dc-451f-83dc-46f414750d97',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0f7e3c'},body:JSON.stringify({sessionId:'0f7e3c',location:'AuthContext.tsx:fetchAdminProfile',message:'admin found by email query',data:{uidPrefix:uid.slice(0,8),matchedDocId:emailSnap.docs[0].id.slice(0,8)},timestamp:Date.now(),hypothesisId:'H-B',runId:'login-fix'})}).catch(()=>{});
          // #endregion
          return profile;
        }
      }

      if (SUPER_ADMIN_EMAILS.has(normalizedEmail)) {
        await ensureAdminFirestoreRecord(uid, email);
        const profile = buildAdminProfile(uid, normalizedEmail, {
          role: 'super_admin',
          permissions: ['all'],
          status: 'active',
          fullName: 'Super Admin',
        });
        // #region agent log
        fetch('http://127.0.0.1:7545/ingest/7bdbec54-17dc-451f-83dc-46f414750d97',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0f7e3c'},body:JSON.stringify({sessionId:'0f7e3c',location:'AuthContext.tsx:fetchAdminProfile',message:'super admin bootstrap',data:{uidPrefix:uid.slice(0,8)},timestamp:Date.now(),hypothesisId:'H-C',runId:'login-fix'})}).catch(()=>{});
        // #endregion
        return profile;
      }

      // #region agent log
      fetch('http://127.0.0.1:7545/ingest/7bdbec54-17dc-451f-83dc-46f414750d97',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0f7e3c'},body:JSON.stringify({sessionId:'0f7e3c',location:'AuthContext.tsx:fetchAdminProfile',message:'no admin profile',data:{uidPrefix:uid.slice(0,8),emailDomain:normalizedEmail.split('@')[1]||''},timestamp:Date.now(),hypothesisId:'H-D',runId:'login-fix'})}).catch(()=>{});
      // #endregion
      return null;
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      // #region agent log
      fetch('http://127.0.0.1:7545/ingest/7bdbec54-17dc-451f-83dc-46f414750d97',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0f7e3c'},body:JSON.stringify({sessionId:'0f7e3c',location:'AuthContext.tsx:fetchAdminProfile:catch',message:'fetchAdminProfile error',data:{uidPrefix:uid.slice(0,8)},timestamp:Date.now(),hypothesisId:'H-E',runId:'login-fix'})}).catch(()=>{});
      // #endregion
      return null;
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch admin profile
      const profile = await fetchAdminProfile(user.uid, user.email);

      if (!profile) {
        await signOut(auth);
        throw new Error(
          `You are not authorized as admin. Create Firestore document admins/${user.uid} with status "active", or use an email already listed in the admins collection. Your Auth UID starts with: ${user.uid.slice(0, 8)}…`,
        );
      }

      if (profile.status !== 'active') {
        await signOut(auth);
        throw new Error('Your admin account is not active. Please contact support.');
      }

      setAdminProfile(profile);
      setUser(user);
      setAuthError(null);

    } catch (error: any) {
      console.error('Login error:', error);
      let message = 'Login failed. Please try again.';

      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email format.';
      } else if (error.message) {
        message = error.message;
      }

      setAuthError(message);
      throw new Error(message);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setAdminProfile(null);
      setAuthError(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Check if user has specific permission
  const hasPermission = (permission: string) => {
    if (!isAdmin || !adminProfile) return false;
    if (adminProfile.permissions.includes('all')) return true;
    return adminProfile.permissions.includes(permission);
  };

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);

      if (user) {
        const profile = await fetchAdminProfile(user.uid, user.email);

        if (profile && profile.status === 'active') {
          setAdminProfile(profile);
          setUser(user);
          setAuthError(null);
        } else if (profile && profile.status !== 'active') {
          setAdminProfile(null);
          setUser(null);
          setAuthError('Your admin account is not active. Please contact support.');
          await signOut(auth);
        } else {
          setAdminProfile(null);
          setUser(null);
          const normalized = user.email?.toLowerCase() || '';
          if (!SUPER_ADMIN_EMAILS.has(normalized)) {
            setAuthError('This account does not have admin panel access.');
            await signOut(auth);
          }
        }
      } else {
        setAdminProfile(null);
        setUser(null);
        setAuthError(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = Boolean(user && adminProfile && adminProfile.status === 'active');
  const isSuperAdmin = isAdmin && adminProfile?.role === 'super_admin';

  return (
    <AuthContext.Provider value={{
      user,
      adminProfile,
      loading,
      isAdmin,
      isSuperAdmin,
      hasPermission,
      logout,
      authError,
      login,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
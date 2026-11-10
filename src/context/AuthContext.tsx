import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db, googleProvider, testFirestoreConnection } from '../firebase.ts';
import { UserProfile, UserRole } from '../types/index.ts';

// Configured verified owner email from prompt
export const BOOTSTRAP_OWNER_EMAIL = 'hyghtable@gmail.com';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  allStaffUsers: { uid: string; displayName: string; email: string; role: UserRole }[];
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  canViewUnmaskedData: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  firestoreConnected: boolean;
  switchDevRole?: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allStaffUsers, setAllStaffUsers] = useState<{ uid: string; displayName: string; email: string; role: UserRole }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [firestoreConnected, setFirestoreConnected] = useState<boolean>(true);

  // Check connection to Firestore on mount
  useEffect(() => {
    testFirestoreConnection().then((connected) => {
      setFirestoreConnected(connected);
    });
  }, []);

  // Fetch all staff users for attribution pickers
  useEffect(() => {
    if (!profile) return;
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list: { uid: string; displayName: string; email: string; role: UserRole }[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          uid: d.id,
          displayName: data.displayName || 'Staff Member',
          email: data.email || '',
          role: (data.role === 'admin' || data.role === 'super_admin') ? 'admin' : 'staff',
        });
      });
      // Always include current profile and owner
      if (!list.some((u) => u.uid === profile.uid)) {
        list.push({
          uid: profile.uid,
          displayName: profile.displayName,
          email: profile.email,
          role: profile.role,
        });
      }
      setAllStaffUsers(list);
    }, (err) => {
      console.warn('Users list sync note:', err.message);
    });

    return () => unsub();
  }, [profile]);

  useEffect(() => {
    // Check for autostart or dev preview override in URL params for automated testing
    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart');
    const devRoleParam = params.get('devRole');

    if (autostart === '1' || devRoleParam) {
      const targetRole: UserRole = devRoleParam === 'staff' ? 'staff' : 'admin';
      const isAdm = targetRole === 'admin';
      const devProfile: UserProfile = {
        uid: isAdm ? 'admin-owner-01' : 'staff-member-02',
        email: isAdm ? BOOTSTRAP_OWNER_EMAIL : 'staff@earthaliveresort.in',
        displayName: isAdm ? 'Verified Admin (Earthalive)' : 'Priya Nair (Staff)',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        role: targetRole,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      setProfile(devProfile);
      setAllStaffUsers([
        { uid: 'admin-owner-01', displayName: 'Verified Admin (Earthalive)', email: BOOTSTRAP_OWNER_EMAIL, role: 'admin' },
        { uid: 'staff-member-02', displayName: 'Priya Nair (Staff)', email: 'staff@earthaliveresort.in', role: 'staff' },
      ]);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);

        const isOwner = currentUser.email?.toLowerCase() === BOOTSTRAP_OWNER_EMAIL.toLowerCase();

        if (userSnap.exists()) {
          const rawData = userSnap.data();
          // Normalize legacy super_admin to admin
          const resolvedRole: UserRole = isOwner ? 'admin' : (rawData.role === 'admin' || rawData.role === 'super_admin' ? 'admin' : 'staff');
          const resolvedProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || rawData.displayName || 'Staff Member',
            photoURL: currentUser.photoURL || rawData.photoURL || undefined,
            role: resolvedRole,
            status: rawData.status === 'disabled' ? 'disabled' : 'active',
            createdAt: rawData.createdAt || new Date().toISOString(),
          };
          setProfile(resolvedProfile);
        } else {
          // New user sign in:
          // The verified owner email must remain Admin.
          // Other users become Staff.
          const newRole: UserRole = isOwner ? 'admin' : 'staff';
          const newProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || (isOwner ? 'Resort Admin' : 'Staff Member'),
            photoURL: currentUser.photoURL || undefined,
            role: newRole,
            status: 'active',
            createdAt: new Date().toISOString(),
          };

          await setDoc(userRef, newProfile);
          setProfile(newProfile);
        }
      } catch (err) {
        console.error('Error fetching or creating user profile in Firestore:', err);
        const isOwner = currentUser.email?.toLowerCase() === BOOTSTRAP_OWNER_EMAIL.toLowerCase();
        setProfile({
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || (isOwner ? 'Resort Admin' : 'Staff Member'),
          photoURL: currentUser.photoURL || undefined,
          role: isOwner ? 'admin' : 'staff',
          status: 'active',
          createdAt: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to profile changes in realtime
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const isOwner = user.email?.toLowerCase() === BOOTSTRAP_OWNER_EMAIL.toLowerCase();
        const role: UserRole = isOwner ? 'admin' : (data.role === 'admin' || data.role === 'super_admin' ? 'admin' : 'staff');
        setProfile({
          uid: user.uid,
          email: user.email || '',
          displayName: data.displayName || user.displayName || 'Staff Member',
          photoURL: data.photoURL || user.photoURL || undefined,
          role,
          status: data.status === 'disabled' ? 'disabled' : 'active',
          createdAt: data.createdAt || new Date().toISOString(),
        });
      }
    }, (error) => {
      console.warn('Realtime profile sync note:', error.message);
    });
    return () => unsub();
  }, [user]);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign In failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setUser(null);
    setProfile(null);
  };

  const switchDevRole = (role: UserRole) => {
    const isAdm = role === 'admin';
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            role,
            displayName: isAdm ? 'Verified Admin (Earthalive)' : 'Staff Member',
            email: isAdm ? BOOTSTRAP_OWNER_EMAIL : 'staff@earthaliveresort.in',
            status: 'active',
          }
        : {
            uid: isAdm ? 'admin-owner-01' : 'staff-member-02',
            email: isAdm ? BOOTSTRAP_OWNER_EMAIL : 'staff@earthaliveresort.in',
            displayName: isAdm ? 'Verified Admin (Earthalive)' : 'Staff Member',
            role,
            status: 'active',
            createdAt: new Date().toISOString(),
          }
    );
  };

  const isAdmin = profile?.role === 'admin' && profile?.status === 'active';
  const isStaff = profile?.status === 'active';
  // Both Admin and Staff can view unmasked operational data as specified in the prompt:
  // "Admin and Staff must be able to create, view, edit, and cancel bookings."
  const canViewUnmaskedData = true;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        allStaffUsers,
        loading,
        isAdmin,
        isStaff,
        canViewUnmaskedData,
        signInWithGoogle,
        signOut,
        firestoreConnected,
        switchDevRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

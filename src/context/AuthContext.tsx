import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  logoutUser,
  subscribeToAuthChanges
} from '../services/authService';
import {
  setActiveRole,
  setActiveEmployeeProfile,
  clearActiveEmployeeProfile
} from '../services/employeeService';
import { UserRole } from '../types/expense';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User>;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  signUpWithEmail: (email: string, password: string, displayName?: string, role?: UserRole) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Fetch user profile from Firestore
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const role: UserRole =
              data.role ||
              (currentUser.email?.includes('auditor') || currentUser.email?.includes('finance')
                ? 'finance'
                : 'employee');
            const name = data.displayName || currentUser.displayName || (role === 'finance' ? 'Frank Castle' : 'Alice Walker');

            setActiveRole(role);
            setActiveEmployeeProfile({
              id: currentUser.uid,
              orgId: data.orgId || 'org_acme',
              identity: {
                email: currentUser.email || '',
                name,
              },
              role: role,
              department: data.department || (role === 'finance' ? 'Finance & Audit' : 'Engineering'),
              grade: data.grade || (role === 'finance' ? 'Finance Officer' : 'L4'),
              homeCity: data.homeCity || 'Bengaluru',
            });
          } else {
            // New user registered: provision default profile
            const isFinance =
              currentUser.email?.includes('auditor') || currentUser.email?.includes('finance');
            const role: UserRole = isFinance ? 'finance' : 'employee';
            const name = currentUser.displayName || (isFinance ? 'Frank Castle' : 'Alice Walker');
            const profile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: name,
              role: role,
              orgId: 'org_acme',
              department: isFinance ? 'Finance & Audit' : 'Engineering',
              grade: isFinance ? 'Finance Officer' : 'L4',
              homeCity: 'Bengaluru',
              createdAt: new Date().toISOString(),
            };

            await setDoc(doc(db, 'users', currentUser.uid), profile);
            await setDoc(doc(db, 'orgs', 'org_acme', 'employees', currentUser.uid), {
              id: currentUser.uid,
              orgId: 'org_acme',
              identity: { email: currentUser.email || '', name },
              role: role,
              department: profile.department,
              grade: profile.grade,
              homeCity: profile.homeCity,
            });

            setActiveRole(role);
            setActiveEmployeeProfile({
              id: currentUser.uid,
              orgId: 'org_acme',
              identity: { email: currentUser.email || '', name },
              role: role,
              department: profile.department,
              grade: profile.grade,
              homeCity: profile.homeCity,
            });
          }
        } catch (e) {
          console.warn('Error syncing auth profile with Firestore:', e);
        }
      } else {
        clearActiveEmployeeProfile();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    clearActiveEmployeeProfile();
    await logoutUser();
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle: loginWithGoogle,
    signInWithEmail: loginWithEmail,
    signUpWithEmail: registerWithEmail,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

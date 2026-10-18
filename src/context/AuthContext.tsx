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
    // Failsafe timer: NEVER block the entire application on auth initialization for more than 400ms
    const failsafeTimer = setTimeout(() => {
      setLoading(false);
    }, 400);

    const unsubscribe = subscribeToAuthChanges(async (currentUser) => {
      clearTimeout(failsafeTimer);
      setUser(currentUser);

      if (currentUser) {
        // 1. Immediately provision active profile so the app loads with 0ms UI delay
        const isFinance =
          currentUser.email?.includes('auditor') || currentUser.email?.includes('finance');
        const role: UserRole = isFinance ? 'finance' : 'employee';
        const name = currentUser.displayName || (isFinance ? 'Frank Castle' : 'Alice Walker');

        setActiveRole(role);
        setActiveEmployeeProfile({
          id: currentUser.uid,
          orgId: 'org_acme',
          identity: {
            email: currentUser.email || '',
            name,
          },
          role: role,
          department: isFinance ? 'Finance & Audit' : 'Engineering',
          grade: isFinance ? 'Finance Officer' : 'L4',
          homeCity: 'Bengaluru',
        });

        // Immediately unblock the UI!
        setLoading(false);

        // 2. Fetch/provision Firestore profile asynchronously in background without blocking
        (async () => {
          try {
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Firestore timeout')), 2000)
            );
            const userDocPromise = getDoc(doc(db, 'users', currentUser.uid));
            const userDoc = (await Promise.race([userDocPromise, timeoutPromise])) as any;

            if (userDoc?.exists?.()) {
              const data = userDoc.data();
              const remoteRole: UserRole =
                data.role ||
                (currentUser.email?.includes('auditor') || currentUser.email?.includes('finance')
                  ? 'finance'
                  : 'employee');
              const remoteName = data.displayName || currentUser.displayName || (remoteRole === 'finance' ? 'Frank Castle' : 'Alice Walker');

              setActiveRole(remoteRole);
              setActiveEmployeeProfile({
                id: currentUser.uid,
                orgId: data.orgId || 'org_acme',
                identity: {
                  email: currentUser.email || '',
                  name: remoteName,
                },
                role: remoteRole,
                department: data.department || (remoteRole === 'finance' ? 'Finance & Audit' : 'Engineering'),
                grade: data.grade || (remoteRole === 'finance' ? 'Finance Officer' : 'L4'),
                homeCity: data.homeCity || 'Bengaluru',
              });
            } else {
              // New user registration profile in background
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

              setDoc(doc(db, 'users', currentUser.uid), profile).catch(() => {});
              setDoc(doc(db, 'orgs', 'org_acme', 'employees', currentUser.uid), {
                id: currentUser.uid,
                orgId: 'org_acme',
                identity: { email: currentUser.email || '', name },
                role: role,
                department: profile.department,
                grade: profile.grade,
                homeCity: profile.homeCity,
              }).catch(() => {});
            }
          } catch (e) {
            // Background sync error - non-critical, user is already active
          }
        })();
      } else {
        clearActiveEmployeeProfile();
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(failsafeTimer);
      unsubscribe();
    };
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

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Mail, User as UserIcon, LogIn, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { UserRole } from '../types/expense';
import { setActiveRole, setActiveEmployee } from '../services/employeeService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('employee');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('employee@keepr.com');
  const [password, setPassword] = useState('KeeprEmployee2026!');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const { handleRoleChange } = useWorkspace();

  const handleRoleApply = (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'finance') {
      setEmail('auditor@keepr.com');
      setPassword('KeeprAuditor2026!');
      setActiveRole('finance');
      setActiveEmployee('3OcwLiDA6vURaNXWvXXv8ZONgQs2');
    } else {
      setEmail('employee@keepr.com');
      setPassword('KeeprEmployee2026!');
      setActiveRole('employee');
      setActiveEmployee('pXmBbGDnDwTsrErsGuad8r4Gz4S2');
    }
  };

  const handleQuickRoleEnter = async (role: UserRole) => {
    setError(null);
    setLoading(true);
    try {
      const targetEmail = role === 'finance' ? 'auditor@keepr.com' : 'employee@keepr.com';
      const targetPass = role === 'finance' ? 'KeeprAuditor2026!' : 'KeeprEmployee2026!';
      if (role === 'finance') {
        setActiveRole('finance');
        handleRoleChange('finance');
      } else {
        setActiveRole('employee');
        handleRoleChange('employee');
      }
      await signInWithEmail(targetEmail, targetPass);
      onClose();
    } catch (err: any) {
      console.warn('Quick login notice:', err);
      if (role === 'finance') {
        handleRoleChange('finance');
      } else {
        handleRoleChange('employee');
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, displayName);
      }

      if (selectedRole === 'finance') {
        setActiveRole('finance');
        handleRoleChange('finance');
      } else {
        setActiveRole('employee');
        handleRoleChange('employee');
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      // Prompt user to select Google account and wait for authentication
      await signInWithGoogle();

      // Apply clearance role and route to portal only after successful sign-in
      if (selectedRole === 'finance') {
        setActiveRole('finance');
        handleRoleChange('finance');
      } else {
        setActiveRole('employee');
        handleRoleChange('employee');
      }
      onClose();
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setError(err?.message || 'Google sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.96, y: 14, filter: 'blur(8px)' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative w-full max-w-[400px] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden p-5 transition-colors"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shadow-2xs">
                  <img src="/abstract.png" alt="Keepr Logo" className="w-4 h-4 object-contain" />
                </div>
                <div>
                  <span className="font-heading font-bold text-sm text-slate-900 block leading-tight">
                    Keepr Workspace
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono-code leading-none block">
                    Zero-Knowledge Auth
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Mode Switcher */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-[11px]">
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setError(null); }}
                    className={`px-2 py-0.5 font-semibold rounded-md transition-all cursor-pointer ${
                      mode === 'signin' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setError(null); }}
                    className={`px-2 py-0.5 font-semibold rounded-md transition-all cursor-pointer ${
                      mode === 'signup' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Register
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modern Sliding Role Selector */}
            <div className="relative bg-slate-100/90 p-1 rounded-xl flex items-center border border-slate-200/80 mb-2.5">
              <div
                className={`absolute top-1 bottom-1 rounded-lg bg-white shadow-xs border border-slate-200/60 transition-all duration-200 ease-out ${
                  selectedRole === 'employee' ? 'left-1 w-[calc(50%-4px)]' : 'left-[calc(50%+1px)] w-[calc(50%-4px)]'
                }`}
              />
              <button
                type="button"
                onClick={() => handleRoleApply('employee')}
                className={`relative z-10 flex-1 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  selectedRole === 'employee' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserIcon className={`w-3.5 h-3.5 ${selectedRole === 'employee' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Employee</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleApply('finance')}
                className={`relative z-10 flex-1 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  selectedRole === 'finance' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className={`w-3.5 h-3.5 ${selectedRole === 'finance' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Auditor</span>
              </button>
            </div>

            {/* Quick 1-Click Persona Bar */}
            <div className="flex items-center justify-between px-2.5 py-1.5 mb-3 bg-slate-50 rounded-lg border border-slate-200/70 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-600 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate font-mono-code text-[10.5px]">
                  {selectedRole === 'finance'
                    ? 'auditor@keepr.com • KeeprAuditor2026!'
                    : 'employee@keepr.com • KeeprEmployee2026!'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleQuickRoleEnter(selectedRole)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 shrink-0 cursor-pointer"
              >
                <span>1-Click Sign In</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="flex items-start gap-2 p-2 mb-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500 mt-0.5" />
                <span className="text-[11px] leading-tight">{error}</span>
              </div>
            )}

            {/* Google Sign-in */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-medium shadow-2xs transition-colors disabled:opacity-50 cursor-pointer mb-2.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative flex items-center justify-center my-2">
              <div className="w-full border-t border-slate-200" />
              <span className="absolute bg-white px-2 text-[10px] text-slate-400 font-mono-code uppercase">
                Or Email
              </span>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-2">
              {mode === 'signup' && (
                <div>
                  <div className="relative">
                    <UserIcon className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Work Email"
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </motion.div>

      )}
    </AnimatePresence>
  );
};


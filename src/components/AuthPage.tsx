import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  Mail,
  User as UserIcon,
  LogIn,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/expense';
import { setActiveRole, setActiveEmployee } from '../services/employeeService';

interface AuthPageProps {
  onBackToLanding: () => void;
  onLoginSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onBackToLanding,
  onLoginSuccess,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('employee');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('alice.walker@acme.com');
  const [password, setPassword] = useState('password123');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  const handleRoleApply = (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'finance') {
      setEmail('frank.castle@acme.com');
      setActiveRole('finance');
      setActiveEmployee('emp_106');
    } else {
      setEmail('alice.walker@acme.com');
      setActiveRole('employee');
      setActiveEmployee('emp_101');
    }
  };

  const handleQuickRoleEnter = (role: UserRole) => {
    if (role === 'finance') {
      setActiveRole('finance');
      setActiveEmployee('emp_106');
    } else {
      setActiveRole('employee');
      setActiveEmployee('emp_101');
    }
    onLoginSuccess();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (selectedRole === 'finance') {
        setActiveRole('finance');
        setActiveEmployee('emp_106');
      } else {
        setActiveRole('employee');
        setActiveEmployee('emp_101');
      }

      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, displayName);
      }
      onLoginSuccess();
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
      if (selectedRole === 'finance') {
        setActiveRole('finance');
        setActiveEmployee('emp_106');
      } else {
        setActiveRole('employee');
        setActiveEmployee('emp_101');
      }
      await signInWithGoogle();
      onLoginSuccess();
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestDemo = () => {
    handleQuickRoleEnter(selectedRole);
  };

  return (
    <div
      className="h-screen max-h-screen overflow-hidden bg-cover bg-center bg-no-repeat flex flex-col justify-between relative selection:bg-slate-900 selection:text-white"
      style={{ backgroundImage: "url('/bg.jpg')" }}
    >
      {/* Top Header */}
      <motion.header
        initial={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 max-w-5xl w-full mx-auto px-4 py-3 flex items-center justify-between"
      >
        <button
          onClick={onBackToLanding}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 bg-white/90 hover:bg-white border border-slate-200 px-3 py-1.5 rounded-full transition-all shadow-2xs backdrop-blur-md cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-700" />
          <span>Back to Overview</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono-code text-slate-600 bg-white/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Audit Enclave v2.4
          </span>
        </div>
      </motion.header>

      {/* Main Center Auth Container - Ultra compact & fits any viewport */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-2 my-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16, filter: 'blur(12px)' }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="w-full max-w-[410px] bg-white/95 backdrop-blur-2xl border border-white/90 rounded-2xl shadow-xl overflow-hidden p-5 sm:p-6"
        >
          {/* Top Brand & Mode Switcher Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-2xs shrink-0">
                <img src="/abstract.png" alt="Keepr Logo" className="w-5 h-5 object-contain" />
              </div>
              <div>
                <span className="font-heading font-bold text-base text-slate-900 tracking-tight leading-none block">
                  Keepr
                </span>
                <span className="text-[10px] text-slate-500 font-mono-code leading-none block mt-0.5">
                  Corporate Ingestion
                </span>
              </div>
            </div>

            {/* Segmented Mode Switcher */}
            <div className="flex bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/80 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className={`px-2.5 py-1 font-semibold rounded-md transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className={`px-2.5 py-1 font-semibold rounded-md transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Register
              </button>
            </div>
          </div>

          {/* Modern Segmented Role Slider */}
          <div className="relative bg-slate-100/90 p-1 rounded-xl flex items-center border border-slate-200/80 mb-2.5">
            {/* Sliding background indicator */}
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
              <UserIcon
                className={`w-3.5 h-3.5 transition-colors ${
                  selectedRole === 'employee' ? 'text-blue-600' : 'text-slate-400'
                }`}
              />
              <span>Employee</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleApply('finance')}
              className={`relative z-10 flex-1 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                selectedRole === 'finance' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck
                className={`w-3.5 h-3.5 transition-colors ${
                  selectedRole === 'finance' ? 'text-indigo-600' : 'text-slate-400'
                }`}
              />
              <span>Finance Auditor</span>
            </button>
          </div>

          {/* Persona Helper & 1-Click Fast Enter */}
          <div className="flex items-center justify-between px-2.5 py-1.5 mb-3 bg-slate-50 rounded-lg border border-slate-200/70 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-600 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">
                {selectedRole === 'finance'
                  ? 'Frank Castle (Finance Auditor)'
                  : 'Alice Walker (Employee • emp_101)'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleQuickRoleEnter(selectedRole)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 shrink-0 cursor-pointer"
            >
              <span>1-Click In</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-2 p-2.5 mb-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500 mt-0.5" />
              <span className="text-[11px] leading-tight">{error}</span>
            </div>
          )}

          {/* Google Sign-in */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-medium shadow-2xs transition-colors disabled:opacity-50 cursor-pointer mb-2.5"
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

          <div className="relative flex items-center justify-center my-2.5">
            <div className="w-full border-t border-slate-200" />
            <span className="absolute bg-white px-2.5 text-[10px] text-slate-400 font-mono-code uppercase tracking-wider">
              Or Work Email
            </span>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-2.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1 font-mono-code">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1 font-mono-code">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1 font-mono-code">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{mode === 'signin' ? 'Sign In to Workspace' : 'Create Protected Account'}</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Bypass */}
          <div className="mt-3 pt-2.5 border-t border-slate-200 text-center">
            <button
              onClick={handleGuestDemo}
              className="text-[11px] text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1 cursor-pointer font-medium hover:underline"
            >
              <span>Explore full workspace as guest preview</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-3 text-center text-[11px] text-slate-600">
        <span className="inline-block px-3 py-1 rounded-full bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-2xs">
          Protected by bank-grade zero-knowledge encryption enclave.
        </span>
      </footer>
    </div>
  );
};


import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    onLoginSuccess();
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat flex flex-col justify-between relative selection:bg-[#0F172A] selection:text-white"
      style={{ backgroundImage: "url('/bg.jpg')" }}
    >
      {/* Top Header with Blur Appear */}
      <motion.header
        initial={{ opacity: 0, y: -16, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between"
      >
        <button
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-[#0F172A] bg-white/90 hover:bg-white border border-[#E2E8F0] px-4 py-2 rounded-full transition-all shadow-md backdrop-blur-md cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#0F172A]" />
          <span>Back to Overview</span>
        </button>
      </motion.header>

      {/* Main Center Auth Container with Blur Appear */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20, filter: 'blur(16px)' }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="w-full max-w-md bg-white/95 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8"
        >
          {/* Top Logo inside Auth Card */}
          <div className="flex flex-col items-center justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shadow-xs mb-2.5">
              <img src="/abstract.png" alt="Keepr Logo" className="w-9 h-9 object-contain" />
            </div>
            <span className="font-heading font-semibold text-2xl text-[#0F172A] tracking-tight">Keepr</span>
          </div>

          {/* Header text */}
          <div className="text-center mb-6">
            <h1 className="font-heading font-semibold text-xl text-[#0F172A] tracking-tight">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-[13px] text-[#76777D] mt-1">
              {mode === 'signin'
                ? 'Sign in to access your assets, warranties & encrypted vault.'
                : 'Start tracking warranties and safeguarding return deadlines today.'}
            </p>

            {/* Role Selection Slider */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-1.5 rounded-2xl mt-4 mb-3 text-left">
              <div className="px-2 py-0.5 text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#64748B]">
                Select Workspace Persona
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => handleRoleApply('employee')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedRole === 'employee'
                      ? 'bg-white text-[#0F172A] shadow-xs border border-[#E2E8F0]'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>Employee</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleApply('finance')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedRole === 'finance'
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Finance Auditor</span>
                </button>
              </div>
              <p className="px-2 pt-1.5 pb-0.5 text-[11px] text-[#64748B]">
                {selectedRole === 'employee'
                  ? 'Submit receipts, track allowances, and monitor reimbursement progress.'
                  : 'Audit review queue, inspect all claims, manage policies & generate reports.'}
              </p>
            </div>

            {/* Quick 1-Click Role Login */}
            <button
              type="button"
              onClick={() => {
                if (selectedRole === 'finance') {
                  setActiveRole('finance');
                  setActiveEmployee('emp_106');
                } else {
                  setActiveRole('employee');
                  setActiveEmployee('emp_101');
                }
                onLoginSuccess();
              }}
              className="w-full mb-3 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Enter as {selectedRole === 'finance' ? 'Finance Auditor (Frank)' : 'Employee (Alice)'}</span>
            </button>

            {/* Mode Switcher Pills */}
            <div className="flex bg-[#F1F5F9] p-1 rounded-xl mt-2 border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-[#76777D] hover:text-[#0F172A]'
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
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-[#76777D] hover:text-[#0F172A]'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 mb-4 text-xs bg-red-50 text-red-700 border border-red-200 rounded-2xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-in */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white hover:bg-[#F9F9FB] border border-[#E2E8F0] text-[#0F172A] rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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

          <div className="relative flex items-center justify-center my-4">
            <div className="w-full border-t border-[#E2E8F0]" />
            <span className="absolute bg-white px-3 text-[11px] text-[#94A3B8] font-mono-code">
              OR EMAIL
            </span>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-semibold text-[#45464D] uppercase tracking-wider mb-1 font-mono-code">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-[#94A3B8]" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full pl-9 pr-3 py-2 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:bg-white transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-[#45464D] uppercase tracking-wider mb-1 font-mono-code">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-[#94A3B8]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@keepr.ai"
                  className="w-full pl-9 pr-3 py-2 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#45464D] uppercase tracking-wider mb-1 font-mono-code">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[#94A3B8]" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:bg-white transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{mode === 'signin' ? 'Sign In to Dashboard' : 'Create Protected Account'}</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Bypass Button */}
          <div className="mt-5 pt-4 border-t border-[#E2E8F0] text-center">
            <button
              onClick={handleGuestDemo}
              className="w-full py-2 bg-[#F9F9FB] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Explore as Guest (Instant Access)</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#76777D]" />
            </button>
          </div>
        </motion.div>
      </main>

      {/* Footer with Blur Appear */}
      <motion.footer
        initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
        className="relative z-10 py-6 text-center text-xs text-[#0F172A]"
      >
        <span className="inline-block px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-[#E2E8F0] shadow-xs font-medium">
          Protected by bank-grade zero-knowledge encryption enclave.
        </span>
      </motion.footer>
    </div>
  );
};

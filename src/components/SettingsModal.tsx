import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Bell,
  Sparkles,
  Shield,
  CreditCard,
  Database,
  Check,
  Coins,
} from 'lucide-react';
import { useCurrency, SupportedCurrency } from '../context/CurrencyContext';
import { MinimalSelect } from './ui/MinimalSelect';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR (₹) · Indian Rupee' },
  { value: 'USD', label: 'USD ($) · US Dollar' },
  { value: 'EUR', label: 'EUR (€) · Euro' },
  { value: 'GBP', label: 'GBP (£) · British Pound' },
  { value: 'CAD', label: 'CAD ($) · Canadian Dollar' },
  { value: 'AUD', label: 'AUD ($) · Australian Dollar' },
  { value: 'JPY', label: 'JPY (¥) · Japanese Yen' },
];

const REMINDER_OPTIONS = [
  { value: '3 days before', label: '3 days before deadline' },
  { value: '5 days before', label: '5 days before deadline' },
  { value: '7 days before', label: '7 days before deadline' },
  { value: '14 days before', label: '14 days before deadline' },
  { value: '30 days (1 month) before', label: '30 days (1 month) before deadline' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { currency, setCurrency } = useCurrency();
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>(currency);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [returnReminders, setReturnReminders] = useState(() => {
    try {
      const savedBuffer = localStorage.getItem('keepr_reminder_buffer');
      if (savedBuffer) return savedBuffer;
    } catch (e) {
      console.error(e);
    }
    return '30 days (1 month) before';
  });
  const [saved, setSaved] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('khanasifshamshul@gmail.com');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState<string | null>(null);

  const handleSendTestEmail = async () => {
    if (!testEmailAddress.trim()) {
      setTestEmailStatus('⚠️ Please enter your recipient email address first.');
      return;
    }

    setIsSendingTestEmail(true);
    setTestEmailStatus(null);
    try {
      const res = await fetch('/api/warranty/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: testEmailAddress.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestEmailStatus(`✅ Email sent to ${testEmailAddress.trim()} via Nodemailer SMTP!`);
      } else {
        setTestEmailStatus(`❌ ${data.error || 'Failed to send'}`);
      }
    } catch (err: any) {
      setTestEmailStatus('❌ Network error sending test email');
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleSave = () => {
    setCurrency(selectedCurrency);
    try {
      localStorage.setItem('keepr_reminder_buffer', returnReminders);
    } catch (e) {
      console.error(e);
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, y: 16, filter: 'blur(8px)' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="bg-white rounded-2xl max-w-lg w-full border border-[#E2E8F0] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FAFAFC]">
              <h3 className="font-semibold text-[15px] text-[#0F172A]">Keepr Settings</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#76777D] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-[13px]">
              {/* Account Profile */}
              <div className="space-y-3">
                <h4 className="font-mono-code text-[11px] uppercase tracking-wider text-[#76777D] font-semibold">
                  Profile & Organization
                </h4>
                <div className="flex items-center gap-3 p-3.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-semibold text-sm">
                    KP
                  </div>
                  <div>
                    <p className="font-medium text-[#0F172A]">Workspace Enclave</p>
                    <p className="text-[12px] text-[#76777D]">Protected Purchase & Invoice Data</p>
                  </div>
                </div>
              </div>

              {/* Currency & Financial Preferences */}
              <div className="space-y-3">
                <h4 className="font-mono-code text-[11px] uppercase tracking-wider text-[#76777D] font-semibold flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-[#0F172A]" />
                  Financial Defaults & Regional Currency
                </h4>
                <div className="p-3.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl space-y-2">
                  <label className="block text-[#45464D] text-xs font-medium">
                    Default Workspace Display Currency
                  </label>
                  <MinimalSelect
                    value={selectedCurrency}
                    onChange={(val) => setSelectedCurrency(val as SupportedCurrency)}
                    options={CURRENCY_OPTIONS}
                    fullWidth
                  />
                  <p className="text-[11px] text-[#76777D]">
                    All dashboard totals, invoices, expenses, and analytics will format in {selectedCurrency}.
                  </p>
                </div>
              </div>

              {/* Notification Deadlines */}
              <div className="space-y-3">
                <h4 className="font-mono-code text-[11px] uppercase tracking-wider text-[#76777D] font-semibold flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#0F172A]" />
                  Alerts & Deadlines
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl">
                    <div>
                      <p className="font-medium text-[#0F172A]">Email & In-App Alerts</p>
                      <p className="text-[12px] text-[#76777D]">Receive digests on closing return windows & warranty expiries</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                      className="rounded-md border-[#CBD5E1] text-[#0F172A] focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl space-y-2">
                    <label className="block text-[#45464D] text-xs font-medium">
                      Warranty & Return Expiry Alert Buffer
                    </label>
                    <MinimalSelect
                      value={returnReminders}
                      onChange={(val) => setReturnReminders(val)}
                      options={REMINDER_OPTIONS}
                      fullWidth
                    />
                  </div>
                </div>
              </div>

          {/* AI Ingestion Engine */}
          <div className="space-y-2">
            <h4 className="font-mono-code text-[11px] uppercase tracking-wider text-[#76777D] font-semibold">
              AI Intelligence
            </h4>
            <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#0F172A]" />
                <div>
                  <p className="font-medium text-[#0F172A]">Gemini 3.6 Flash Model</p>
                  <p className="text-[11px] text-[#76777D]">Active backend OCR & Purchase Parser</p>
                </div>
              </div>
              <span className="font-mono-code text-[10px] bg-[#ECFDF5] text-[#065F46] px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">
                Connected
              </span>
            </div>
          </div>

          {/* LangChain + Nodemailer Email Intelligence */}
          <div className="space-y-2">
            <h4 className="font-mono-code text-[11px] uppercase tracking-wider text-[#76777D] font-semibold">
              LangChain & Nodemailer SMTP Email Alerts
            </h4>
            <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-3">
              <div>
                <p className="font-medium text-[#0F172A] text-xs">Automated Expiry Email Engine</p>
                <p className="text-[11px] text-[#76777D]">Powered by LangChain LLM & Nodemailer SMTP Transport</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="Enter recipient email address..."
                  className="flex-1 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
                <button
                  onClick={handleSendTestEmail}
                  disabled={isSendingTestEmail}
                  className="px-3 py-1.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isSendingTestEmail ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Send Test Email</span>
                  )}
                </button>
              </div>

              {testEmailStatus && (
                <p className="text-[11px] font-mono-code pt-1 border-t border-[#E2E8F0]">
                  {testEmailStatus}
                </p>
              )}
            </div>
          </div>
        </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#E2E8F0] flex justify-end items-center gap-2 bg-white">
              <button
                onClick={onClose}
                className="px-3.5 py-2 text-[12px] font-medium text-[#45464D] hover:bg-[#F9F9FB] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-[#0F172A] text-white text-[12px] font-medium rounded-xl hover:bg-[#1E293B] flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {saved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                <span>{saved ? 'Saved!' : 'Save Preferences'}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

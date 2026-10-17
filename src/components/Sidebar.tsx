import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  HelpCircle,
  Sparkles,
  LogOut,
  Globe,
  User as UserIcon,
  Receipt,
  PlusCircle,
  Briefcase,
  Shield,
  BookOpen,
  Sliders,
  Download,
  Layers,
  PieChart,
  ChevronDown,
  ChevronUp,
  Users,
  FileText,
} from 'lucide-react';
import { ActiveView } from '../types';
import { UserRole } from '../types/expense';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  riskCount: number;
  openScanner: () => void;
  openSettings?: () => void;
  openAuthModal?: () => void;
  onNavigateToLanding?: () => void;
  userRole?: UserRole;
}

interface NavItem {
  id: ActiveView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  riskCount,
  openScanner,
  openSettings,
  openAuthModal,
  onNavigateToLanding,
  userRole = 'employee',
}) => {
  const { user, logout } = useAuth();

  // Legacy items grouped inside "Manage" dropdown
  const manageItems: Array<{ id: ActiveView; label: string; badge?: string }> = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'purchases', label: 'Purchases' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'create-invoice', label: 'Create Invoice' },
    { id: 'warranties', label: 'Warranties' },
    { id: 'returns', label: 'Returns', badge: riskCount > 0 ? `${riskCount}` : undefined },
    { id: 'vault', label: 'Vault' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'timeline', label: 'Timeline' },
  ];

  const isManageItemActive = manageItems.some((item) => item.id === activeView);
  const [isManageOpen, setIsManageOpen] = useState<boolean>(true);

  // Corporate Expense Reimbursement items
  const employeeNavItems: NavItem[] = [
    { id: 'my-expenses', label: 'My Expenses', icon: Receipt },
    { id: 'submit-expense', label: 'Submit Claim', icon: PlusCircle },
    { id: 'my-caps', label: 'My Allowances', icon: PieChart },
    { id: 'trips', label: 'Trips & Travel', icon: Briefcase },
  ];

  const financeNavItems: NavItem[] = [
    {
      id: 'review-queue',
      label: 'Review Queue',
      icon: Shield,
      badge: riskCount > 0 ? `${riskCount}` : undefined,
    },
    { id: 'all-expenses', label: 'All Claims', icon: Layers },
    { id: 'policy-studio', label: 'Policy Section', icon: BookOpen },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'simulator', label: 'Policy Simulator', icon: Sliders },
    { id: 'export-view', label: 'Exports & ERP', icon: Download },
  ];

  const navItems: NavItem[] =
    userRole === 'finance' || userRole === 'admin'
      ? financeNavItems
      : employeeNavItems;

  return (
    <motion.aside
      initial={{ opacity: 0, x: -24, filter: 'blur(10px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="hidden md:flex flex-col bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl h-full w-64 p-3.5 shrink-0 z-20 select-none shadow-sm overflow-y-auto"
    >
      {/* Brand Header */}
      <div
        className={`px-3 mb-4 flex items-center justify-between ${
          onNavigateToLanding ? 'cursor-pointer hover:opacity-85 transition-opacity' : ''
        }`}
        onClick={onNavigateToLanding}
        title={onNavigateToLanding ? 'Return to Landing Page' : undefined}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 shadow-xs border border-[#E2E8F0] bg-white flex items-center justify-center">
            <img src="/abstract.png" alt="Keepr Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="font-semibold text-base text-[#0F172A] tracking-tight leading-none flex items-center gap-1.5">
              <span>Keepr</span>
              <span className="text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold uppercase">
                Auditor
              </span>
            </h2>
            <p className="font-mono-code text-[10px] text-[#76777D] uppercase tracking-wider mt-1 truncate">
              Corporate Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Main Auditor Navigation */}
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#F1F5F9] text-[#0F172A] shadow-xs font-semibold'
                  : 'text-[#45464D] hover:text-[#0F172A] hover:bg-[#F9F9FB]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-[#76777D]'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="font-mono-code text-[10px] px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#991B1B] font-semibold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Manage Section (Dropdown Accordion with Curved Tree-line Connector) */}
      <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
        <button
          onClick={() => setIsManageOpen(!isManageOpen)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer ${
            isManageItemActive
              ? 'text-indigo-900 bg-indigo-50/50'
              : 'text-[#334155] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Manage</span>
          </div>
          {isManageOpen ? (
            <ChevronUp className="w-4 h-4 text-[#94A3B8]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
          )}
        </button>

        {isManageOpen && (
          <div className="relative mt-1">
            {/* Continuous vertical trunk line connecting to the last branch */}
            <div className="absolute left-[20px] top-0 bottom-4 w-px bg-slate-300 pointer-events-none" />

            <div className="space-y-0.5">
              {manageItems.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <div key={item.id} className="relative flex items-center h-8">
                    {/* Curved branch line connecting trunk to item */}
                    <span
                      className="absolute left-[20px] top-0 h-4 w-3.5 border-l border-b border-slate-300 rounded-bl-[7px] pointer-events-none"
                      aria-hidden="true"
                    />

                    <button
                      onClick={() => setActiveView(item.id)}
                      className={`w-full flex items-center justify-between pl-10 pr-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isActive
                          ? 'text-indigo-700 bg-indigo-50 font-semibold'
                          : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="font-mono-code text-[10px] px-1.5 py-0.2 rounded-full bg-[#FEE2E2] text-[#991B1B] font-semibold">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Quick Ingestion Box */}
      <div className="p-3 my-2.5 bg-[#F9F9FB] rounded-2xl border border-[#E2E8F0]">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="font-mono-code text-[10px] uppercase tracking-wider text-[#76777D] font-semibold">
            Deterministic Auditor
          </span>
        </div>
        <p className="text-[11px] text-[#45464D] mb-2 leading-snug">
          Submit receipt for instant policy evaluation & ledger audit.
        </p>
        <button
          onClick={() => setActiveView('submit-expense')}
          className="w-full py-2 px-3 bg-[#0F172A] text-white hover:bg-[#1E293B] rounded-xl text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
        >
          <span>Submit New Claim</span>
        </button>
      </div>

      {/* Footer Navigation */}
      {onNavigateToLanding && (
        <div className="pt-2 border-t border-[#E2E8F0]">
          <button
            onClick={onNavigateToLanding}
            className="w-full flex items-center gap-3 px-3 py-1.5 rounded-xl text-[12px] font-medium text-[#45464D] hover:text-[#0F172A] hover:bg-[#F9F9FB] transition-all cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#76777D]" />
            <span>Landing Overview</span>
          </button>
        </div>
      )}

      {/* User profile capsule */}
      <div className="mt-2 pt-2 border-t border-[#E2E8F0] flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-xs font-semibold shrink-0 shadow-2xs overflow-hidden border border-[#E2E8F0] relative">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            ) : user?.displayName ? (
              <span>{user.displayName.slice(0, 2).toUpperCase()}</span>
            ) : (
              <UserIcon className="w-4 h-4 text-white/90" />
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[12px] font-medium text-[#0F172A] leading-none truncate">
              {user?.displayName || 'Acme Employee'}
            </span>
            <span className="text-[10px] font-mono-code text-[#76777D] mt-0.5 truncate">
              {user?.email || 'employee@acme.com'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => {
              if (openSettings) {
                openSettings();
              } else {
                setActiveView('settings');
              }
            }}
            className="p-1.5 text-[#76777D] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              logout();
              if (onNavigateToLanding) onNavigateToLanding();
            }}
            className="p-1.5 text-[#76777D] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.aside>
  );
};

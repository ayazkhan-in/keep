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
  LayoutDashboard,
  ShoppingBag,
  FileSpreadsheet,
  FilePlus2,
  ShieldCheck,
  RotateCcw,
  Vault,
  BarChart3,
  Clock,
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
  const manageItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
    { id: 'invoices', label: 'Invoices', icon: FileSpreadsheet },
    { id: 'create-invoice', label: 'Create Invoice', icon: FilePlus2 },
    { id: 'warranties', label: 'Warranties', icon: ShieldCheck },
    { id: 'returns', label: 'Returns', icon: RotateCcw, badge: riskCount > 0 ? `${riskCount}` : undefined },
    { id: 'vault', label: 'Vault', icon: Vault },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'timeline', label: 'Timeline', icon: Clock },
  ];

  const isManageItemActive = manageItems.some((item) => item.id === activeView);
  const [isManageOpen, setIsManageOpen] = useState<boolean>(false);

  // Corporate Expense Reimbursement items
  const employeeNavItems: NavItem[] = [
    { id: 'my-expenses', label: 'My Expenses', icon: Receipt },
    { id: 'submit-expense', label: 'Submit Claim', icon: PlusCircle },
    { id: 'my-caps', label: 'My Allowances', icon: PieChart },
    { id: 'employee-policies', label: 'Company Policies', icon: BookOpen },
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
      className="hidden md:flex flex-col bg-[#FFFFFF] dark:bg-[#0D1217] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl h-full w-64 p-3.5 shrink-0 z-20 select-none shadow-sm overflow-y-auto transition-colors"
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
          <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 shadow-xs border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#151B22] flex items-center justify-center">
            <img src="/abstract.png" alt="Keepr Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="font-semibold text-base text-[#0F172A] dark:text-white tracking-tight leading-none flex items-center gap-1.5">
              <span>Keepr</span>
              <span className="text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold uppercase border border-emerald-200/50 dark:border-emerald-800/50">
                {userRole === 'finance' || userRole === 'admin' ? 'Auditor' : 'Employee'}
              </span>
            </h2>
            <p className="font-mono-code text-[10px] text-[#76777D] dark:text-[#94A3B8] uppercase tracking-wider mt-1 truncate">
              {userRole === 'finance' || userRole === 'admin' ? 'Corporate Intelligence' : 'Expense & Reimbursements'}
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
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 shadow-xs font-semibold'
                  : 'text-[#45464D] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F9F9FB] dark:hover:bg-[#151B22]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#76777D] dark:text-[#94A3B8]'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="font-mono-code text-[10px] px-2 py-0.5 rounded-full bg-[#FEE2E2] dark:bg-red-950/60 text-[#991B1B] dark:text-red-400 font-semibold border border-transparent dark:border-red-900/40">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Manage Section (Only for finance auditor / admin, NOT employee) */}
      {(userRole === 'finance' || userRole === 'admin') && (
        <div className="mt-2 pt-2 border-t border-[#F1F5F9] dark:border-[#1E293B]">
          <button
            onClick={() => setIsManageOpen(!isManageOpen)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition-all cursor-pointer ${
              isManageItemActive
                ? 'text-emerald-900 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/40 font-semibold'
                : 'text-[#45464D] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F9F9FB] dark:hover:bg-[#151B22]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Manage Tools</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform duration-200 ${isManageOpen ? 'rotate-180' : ''}`} />
          </button>

          {isManageOpen && (
            <div className="space-y-0.5 mt-1">
              {manageItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 shadow-xs font-semibold'
                        : 'text-[#45464D] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F9F9FB] dark:hover:bg-[#151B22]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#76777D] dark:text-[#94A3B8]'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="font-mono-code text-[10px] px-2 py-0.5 rounded-full bg-[#FEE2E2] dark:bg-red-950/60 text-[#991B1B] dark:text-red-400 font-semibold border border-transparent dark:border-red-900/40">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* Quick Ingestion Box */}
      <div className="p-3 my-2.5 bg-[#F9F9FB] dark:bg-[#151B22] rounded-2xl border border-[#E2E8F0] dark:border-[#212C36]">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="font-mono-code text-[10px] uppercase tracking-wider text-[#76777D] dark:text-[#94A3B8] font-semibold">
            Deterministic Auditor
          </span>
        </div>
        <p className="text-[11px] text-[#45464D] dark:text-[#94A3B8] mb-2 leading-snug">
          Submit receipt for instant policy evaluation & ledger audit.
        </p>
        <button
          onClick={() => setActiveView('submit-expense')}
          className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
        >
          <span>Submit New Claim</span>
        </button>
      </div>

      {/* Footer Navigation */}
      {onNavigateToLanding && (
        <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
          <button
            onClick={onNavigateToLanding}
            className="w-full flex items-center gap-3 px-3 py-1.5 rounded-xl text-[12px] font-medium text-[#45464D] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F9F9FB] dark:hover:bg-[#151B22] transition-all cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#76777D] dark:text-[#94A3B8]" />
            <span>Landing Overview</span>
          </button>
        </div>
      )}

      {/* User profile capsule */}
      <div className="mt-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-semibold shrink-0 shadow-2xs overflow-hidden border border-[#E2E8F0] dark:border-[#1E293B] relative">
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
            <span className="text-[12px] font-medium text-[#0F172A] dark:text-white leading-none truncate">
              {user?.displayName || 'Acme Employee'}
            </span>
            <span className="text-[10px] font-mono-code text-[#76777D] dark:text-[#94A3B8] mt-0.5 truncate">
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
            className="p-1.5 text-[#76777D] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#151B22] rounded-lg transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              logout();
              if (onNavigateToLanding) onNavigateToLanding();
            }}
            className="p-1.5 text-[#76777D] dark:text-[#94A3B8] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.aside>

  );
};

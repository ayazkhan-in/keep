import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bell,
  Settings,
  Plus,
  Scan,
  Menu,
  X,
  ShieldAlert,
  CheckCircle2,
  FileText,
  Sparkles,
  User as UserIcon,
  LogOut,
  LogIn,
  ExternalLink,
  LayoutDashboard,
  ShoppingBag,
  ShieldCheck,
  RotateCcw,
  Vault,
  BarChart3,
  Clock,
  Bot,
  FileSpreadsheet,
  FilePlus2,
  Receipt,
  PlusCircle,
  PieChart,
  Briefcase,
  Shield,
  Layers,
  BookOpen,
  Users,
  Sliders,
  Download,
  Sun,
  Moon,
} from 'lucide-react';
import { ActiveView } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserRole } from '../types/expense';

interface TopBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  openCommandPalette: () => void;
  openScanner: () => void;
  openAIChat: () => void;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  openSettings: () => void;
  riskCount: number;
  dbConnected?: boolean;
  openAuthModal: () => void;
  onNavigateToLanding?: () => void;
  userRole?: UserRole;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  setSearchQuery,
  openCommandPalette,
  openScanner,
  openAIChat,
  activeView,
  setActiveView,
  openSettings,
  riskCount,
  dbConnected = true,
  openAuthModal,
  onNavigateToLanding,
  userRole = 'employee',
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  interface TopBarNavItem {
    id: ActiveView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }

  const employeeNavItems: TopBarNavItem[] = [
    { id: 'my-expenses', label: 'My Expenses', icon: Receipt },
    { id: 'submit-expense', label: 'Submit Claim', icon: PlusCircle },
    { id: 'my-caps', label: 'My Allowances', icon: PieChart },
    { id: 'trips', label: 'Trips & Travel', icon: Briefcase },
  ];

  const financeNavItems: TopBarNavItem[] = [
    { id: 'review-queue', label: 'Review Queue', icon: Shield, badge: riskCount > 0 ? `${riskCount}` : undefined },
    { id: 'all-expenses', label: 'All Claims', icon: Layers },
    { id: 'policy-studio', label: 'Policy Section', icon: BookOpen },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'simulator', label: 'Policy Simulator', icon: Sliders },
    { id: 'export-view', label: 'Exports & ERP', icon: Download },
  ];

  const roleNavItems: TopBarNavItem[] =
    userRole === 'finance' || userRole === 'admin'
      ? financeNavItems
      : employeeNavItems;

  const manageItems: TopBarNavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
    { id: 'invoices', label: 'Invoices', icon: FileSpreadsheet },
    { id: 'create-invoice', label: 'Create Invoice', icon: FilePlus2 },
    { id: 'warranties', label: 'Warranties', icon: ShieldCheck },
    { id: 'returns', label: 'Returns', icon: RotateCcw, badge: riskCount > 0 ? `${riskCount} Expiring` : undefined },
    { id: 'vault', label: 'Document Vault', icon: Vault },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'timeline', label: 'Timeline', icon: Clock },
  ];

  return (
    <motion.header
      initial={{ opacity: 0, y: -16, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="bg-[#FFFFFF] dark:bg-[#0D1217] border-b border-[#E2E8F0] dark:border-[#1E293B] flex justify-between items-center w-full px-3 sm:px-4 md:px-6 h-14 sm:h-16 shrink-0 z-30 sticky top-0 rounded-t-xl sm:rounded-t-2xl transition-colors"
    >
      {/* Left side: Mobile Toggle / Brand / Search */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-1.5 text-[#45464D] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] cursor-pointer transition-colors"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Mobile Brand */}
        <div
          className={`md:hidden flex items-center gap-2 shrink-0 ${onNavigateToLanding ? 'cursor-pointer' : ''}`}
          onClick={onNavigateToLanding}
        >
          <img src="/abstract.png" alt="Keepr Logo" className="w-6 h-6 object-contain" />
          <span className="font-semibold text-base text-[#0F172A] dark:text-white tracking-tight">Keepr</span>
        </div>

        {/* Mobile Search Button */}
        <button
          onClick={openCommandPalette}
          className="md:hidden p-1.5 text-[#76777D] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] rounded-lg cursor-pointer transition-colors ml-auto sm:ml-2"
          aria-label="Search items"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Desktop Global Search */}
        <div className="hidden md:flex items-center w-full max-w-md relative">
          <Search className="absolute left-3.5 text-[#94A3B8] w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expenses, merchants, policies (⌘K)..."
            onClick={openCommandPalette}
            className="w-full pl-9 pr-14 py-2 bg-[#F9F9FB] dark:bg-[#151B22] border border-[#E2E8F0] dark:border-[#212C36] rounded-xl text-[13px] text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-[#151B22] transition-colors placeholder:text-[#94A3B8] dark:placeholder:text-[#64748B] h-9.5 shadow-2xs"
          />
          <div className="absolute right-2.5 flex items-center">
            <kbd className="font-mono-code text-[10px] bg-[#FFFFFF] dark:bg-[#1E293B] px-2 py-0.5 rounded-full text-[#76777D] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#334155] shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Firebase Firestore Status Green Dot with Hover Tooltip */}
        <div className="relative group flex items-center justify-center cursor-pointer p-1.5">
          <span
            className={`w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-125 ${
              dbConnected ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-1.5 px-2.5 py-1 bg-[#0F172A] dark:bg-black text-white text-[11px] font-mono-code rounded-lg whitespace-nowrap shadow-xl pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-150 border border-transparent dark:border-[#1E293B]">
            <span className={`w-1.5 h-1.5 rounded-full ${dbConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span>{dbConnected ? 'Firestore Connected' : 'Offline Cache'}</span>
          </div>
        </div>

        {/* Ask Keepr AI Assistant */}
        <button
          onClick={openAIChat}
          className="p-2 sm:px-3 sm:py-2 bg-[#F9F9FB] dark:bg-[#151B22] border border-[#E2E8F0] dark:border-[#212C36] hover:border-emerald-500 dark:hover:border-emerald-500 text-[#0F172A] dark:text-[#F1F5F9] rounded-xl text-xs sm:text-[13px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          title="Ask Keepr AI Assistant"
        >
          <Sparkles className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>

        {/* Add / Scan CTA */}
        <button
          onClick={openScanner}
          className="p-2 sm:px-3.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-[13px] font-medium transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          title="Scan Receipt"
        >
          <Scan className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">Add Receipt</span>
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 bg-[#F9F9FB] dark:bg-[#151B22] border border-[#E2E8F0] dark:border-[#212C36] hover:border-emerald-500 dark:hover:border-emerald-500 text-[#0F172A] dark:text-[#F1F5F9] rounded-xl text-xs sm:text-[13px] font-medium transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-emerald-600" />
          )}
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-[#76777D] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] rounded-xl transition-colors relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {riskCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-[#0D1217]" />
            )}
          </button>

          {/* Notifications Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -8, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.96, y: -8, filter: 'blur(8px)' }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#11161B] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl shadow-xl py-2 z-50 overflow-hidden"
              >
                <div className="px-3.5 py-2.5 border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between">
                  <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#76777D] dark:text-[#94A3B8] font-medium">
                    Active Alerts ({riskCount + 2})
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline font-medium">
                    Mark all read
                  </span>
                </div>
                <div className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B] max-h-72 overflow-y-auto">
                  <div
                    onClick={() => {
                      setActiveView('returns');
                      setShowNotifications(false);
                    }}
                    className="p-3.5 hover:bg-[#F9F9FB] dark:hover:bg-[#182026] cursor-pointer transition-colors flex gap-2.5 items-start"
                  >
                    <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[12px] font-medium text-[#0F172A] dark:text-[#F1F5F9]">
                        MacBook Pro Return Window: 3 Days Left
                      </p>
                      <p className="text-[11px] text-[#76777D] dark:text-[#94A3B8]">
                        Apple Store · Best Buy Order #W99281
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setActiveView('warranties');
                      setShowNotifications(false);
                    }}
                    className="p-3.5 hover:bg-[#F9F9FB] dark:hover:bg-[#182026] cursor-pointer transition-colors flex gap-2.5 items-start"
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[12px] font-medium text-[#0F172A] dark:text-[#F1F5F9]">
                        Sony A7IV Warranty Expiry
                      </p>
                      <p className="text-[11px] text-[#76777D] dark:text-[#94A3B8]">
                        Manufacturer 1-Year Limited expires Nov 2
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setActiveView('vault');
                      setShowNotifications(false);
                    }}
                    className="p-3.5 hover:bg-[#F9F9FB] dark:hover:bg-[#182026] cursor-pointer transition-colors flex gap-2.5 items-start"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[12px] font-medium text-[#0F172A] dark:text-[#F1F5F9]">
                        2 Receipts Automatically Parsed
                      </p>
                      <p className="text-[11px] text-[#76777D] dark:text-[#94A3B8]">
                        Herman Miller and Breville invoices stored in Vault
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Navigation & Actions Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, filter: 'blur(8px)' }}
            animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
            exit={{ opacity: 0, height: 0, filter: 'blur(8px)' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="md:hidden fixed inset-x-0 top-14 sm:top-16 bottom-0 bg-white/95 dark:bg-[#0D1217]/95 backdrop-blur-2xl z-40 p-4 flex flex-col border-t border-[#E2E8F0] dark:border-[#1E293B] overflow-y-auto max-h-[calc(100dvh-3.5rem)] shadow-2xl justify-between"
          >
            {/* Nav items list */}
            <div className="space-y-3">
              <div>
                <p className="px-3 py-1 text-[11px] font-mono-code uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold">
                  {userRole === 'finance' || userRole === 'admin' ? 'Auditor Console' : 'Employee Portal'}
                </p>
                <div className="space-y-1 mt-1">
                  {roleNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveView(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                            : 'text-[#45464D] dark:text-[#94A3B8] hover:bg-[#F9F9FB] dark:hover:bg-[#151B22] hover:text-[#0F172A] dark:hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#76777D] dark:text-[#94A3B8]'}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Manage Section (Only for finance auditor / admin) */}
              {(userRole === 'finance' || userRole === 'admin') && (
                <div className="pt-2 border-t border-[#F1F5F9] dark:border-[#1E293B]">
                  <p className="px-3 py-1 text-[11px] font-mono-code uppercase tracking-wider text-[#94A3B8] font-semibold">
                    Manage
                  </p>
                  <div className="space-y-1 mt-1">
                    {manageItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeView === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveView(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-semibold'
                              : 'text-[#475569] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#151B22] hover:text-[#0F172A] dark:hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#94A3B8]'}`} />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="text-[10px] font-mono-code font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions & Account */}
            <div className="pt-4 mt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    openScanner();
                    setMobileMenuOpen(false);
                  }}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span>Scan Receipt</span>
                </button>
                <button
                  onClick={() => {
                    openAIChat();
                    setMobileMenuOpen(false);
                  }}
                  className="py-2.5 px-3 bg-[#F9F9FB] dark:bg-[#151B22] border border-[#E2E8F0] dark:border-[#212C36] text-[#0F172A] dark:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Ask AI</span>
                </button>
              </div>

              {onNavigateToLanding && (
                <button
                  onClick={() => {
                    onNavigateToLanding();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 px-3 text-xs text-[#76777D] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F9F9FB] dark:hover:bg-[#151B22] rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Back to Landing Overview</span>
                </button>
              )}

              {/* User capsule */}
              <div className="flex items-center justify-between p-2.5 bg-[#F9F9FB] dark:bg-[#151B22] border border-[#E2E8F0] dark:border-[#212C36] rounded-xl mt-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {user?.displayName
                      ? user.displayName.slice(0, 2).toUpperCase()
                      : user?.email
                      ? user.email.slice(0, 2).toUpperCase()
                      : 'KP'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#0F172A] dark:text-white truncate">
                      {user?.displayName || 'User Account'}
                    </p>
                    <p className="text-[10px] text-[#76777D] dark:text-[#94A3B8] font-mono-code truncate">
                      {user?.email || 'Protected Enclave'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                    if (onNavigateToLanding) onNavigateToLanding();
                  }}
                  className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.header>
  );
};

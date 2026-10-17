import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { PurchasesView } from './components/PurchasesView';
import { WarrantiesView } from './components/WarrantiesView';
import { ReturnsView } from './components/ReturnsView';
import { VaultView } from './components/VaultView';
import { AnalyticsView } from './components/AnalyticsView';
import { TimelineView } from './components/TimelineView';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { PurchaseDetailModal } from './components/PurchaseDetailModal';
import { AIClaimModal } from './components/AIClaimModal';
import { CommandPalette } from './components/CommandPalette';
import { SettingsModal } from './components/SettingsModal';
import { AIChatDrawer } from './components/AIChatDrawer';
import { AuthModal } from './components/AuthModal';
import { CreateInvoiceView } from './components/CreateInvoiceView';
import { InvoicesView } from './components/InvoicesView';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { useAuth } from './context/AuthContext';
import { ActiveView, PurchaseItem, AIActionItem, Invoice, InvoiceStatus } from './types';
import { INITIAL_PURCHASES, INITIAL_ACTIONS } from './data/mockData';
import { INITIAL_INVOICES } from './data/mockInvoices';
import {
  subscribePurchases,
  addPurchaseToDb,
  deletePurchaseFromDb,
  seedPurchasesIfEmpty
} from './services/purchaseService';
import {
  subscribeInvoices,
  addInvoiceToDb,
  updateInvoiceInDb,
  deleteInvoiceFromDb,
  seedInvoicesIfEmpty
} from './services/invoiceService';
import { UserRole } from './types/expense';
import { ExpenseHeader } from './components/expense/ExpenseHeader';
import { MyExpensesView } from './components/expense/MyExpensesView';
import { SubmitExpenseView } from './components/expense/SubmitExpenseView';
import { MyCapsView } from './components/expense/MyCapsView';
import { TripsView } from './components/expense/TripsView';
import { ReviewQueueView } from './components/expense/ReviewQueueView';
import { AllClaimsView } from './components/expense/AllClaimsView';
import { PolicyStudioView } from './components/expense/PolicyStudioView';
import { EmployeesView } from './components/expense/EmployeesView';
import { ReportsView } from './components/expense/ReportsView';
import { SimulatorView } from './components/expense/SimulatorView';
import { ExportView } from './components/expense/ExportView';
import { getAllExpenses, saveAllExpenses, replayLedger } from './services/expenseService';
import { SYNTHETIC_EXPENSES } from './data/syntheticClaims';
import { getActiveRole, setActiveRole } from './services/employeeService';

type AppRoute = 'landing' | 'auth' | 'app';

export function App() {
  const { user, loading } = useAuth();

  // Route state: default to 'landing', check pathname first, then fallback to hash
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/auth' || hash === '#auth') return 'auth';
      if (path === '/app' || hash === '#app') return 'app';
    }
    return 'landing';
  });

  const navigateTo = (route: AppRoute) => {
    setCurrentRoute(route);
    if (typeof window !== 'undefined') {
      const targetPath = route === 'landing' ? '/' : `/${route}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  };

  useEffect(() => {
    const handleRouteChange = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/auth' || hash === '#auth') setCurrentRoute('auth');
      else if (path === '/app' || hash === '#app') setCurrentRoute('app');
      else setCurrentRoute('landing');
    };

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  // Remember sign-in session: automatically restore app route when authenticated
  useEffect(() => {
    if (!loading && user) {
      if (currentRoute !== 'app') {
        setCurrentRoute('app');
        if (typeof window !== 'undefined' && window.location.pathname !== '/app') {
          window.history.replaceState(null, '', '/app');
        }
      }
    }
  }, [user, loading]);

  const [currentRole, setCurrentRole] = useState<UserRole>(() => getActiveRole());
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    return getActiveRole() === 'finance' ? 'review-queue' : 'my-expenses';
  });

  // Auto-seed synthetic claims if storage is empty
  useEffect(() => {
    try {
      const existing = getAllExpenses();
      if (!existing || existing.length === 0) {
        saveAllExpenses(SYNTHETIC_EXPENSES);
        replayLedger(SYNTHETIC_EXPENSES);
      }
    } catch (err) {
      console.warn('Expense seeding notice:', err);
    }
  }, []);

  const handleRoleChange = (role: UserRole) => {
    setActiveRole(role);
    setCurrentRole(role);
    if (role === 'finance') {
      if (
        activeView === 'my-expenses' ||
        activeView === 'my-caps' ||
        activeView === 'submit-expense' ||
        activeView === 'trips'
      ) {
        setActiveView('review-queue');
      }
    } else if (role === 'employee') {
      if (
        activeView === 'review-queue' ||
        activeView === 'all-expenses' ||
        activeView === 'policy-studio' ||
        activeView === 'simulator' ||
        activeView === 'export-view' ||
        activeView === 'employees' ||
        activeView === 'reports'
      ) {
        setActiveView('my-expenses');
      }
    }
  };
  const [purchases, setPurchases] = useState<PurchaseItem[]>(() => {
    try {
      const saved = localStorage.getItem('keepr_purchases_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_PURCHASES;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const saved = localStorage.getItem('keepr_invoices_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_INVOICES;
  });
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const [actions, setActions] = useState<AIActionItem[]>(INITIAL_ACTIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseItem | null>(null);
  const [dbConnected, setDbConnected] = useState<boolean>(true);

  const [claimModalState, setClaimModalState] = useState<{
    isOpen: boolean;
    purchase: PurchaseItem | null;
    mode: 'warranty_claim' | 'return_request';
  }>({
    isOpen: false,
    purchase: null,
    mode: 'warranty_claim',
  });

  // Subscribe to real-time Firestore database updates (user-scoped)
  useEffect(() => {
    const userId = user?.uid;
    seedPurchasesIfEmpty(INITIAL_PURCHASES, userId);
    seedInvoicesIfEmpty(INITIAL_INVOICES, userId);

    const unsubscribePurchases = subscribePurchases(
      (items) => {
        if (items && items.length > 0) {
          setPurchases(items);
        }
        setDbConnected(true);
      },
      (_error) => {
        setDbConnected(false);
      },
      userId
    );

    const unsubscribeInvoices = subscribeInvoices(
      (items) => {
        if (items && items.length > 0) {
          setInvoices(items);
        }
      },
      (err) => {
        console.warn('Invoices sync error:', err);
      },
      userId
    );

    return () => {
      unsubscribePurchases();
      unsubscribeInvoices();
    };
  }, [user?.uid]);

  // Persist purchases locally as fallback cache
  useEffect(() => {
    try {
      localStorage.setItem('keepr_purchases_v1', JSON.stringify(purchases));
    } catch (e) {
      console.error(e);
    }
  }, [purchases]);

  // Persist invoices locally as fallback cache
  useEffect(() => {
    try {
      localStorage.setItem('keepr_invoices_v1', JSON.stringify(invoices));
    } catch (e) {
      console.error(e);
    }
  }, [invoices]);

  // Global keyboard shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAddPurchase = async (newPurchase: PurchaseItem) => {
    setPurchases((prev) => [newPurchase, ...prev]);
    try {
      await addPurchaseToDb(newPurchase, user?.uid);
    } catch (err) {
      console.warn('Failed to sync new purchase to Firestore (using local state):', err);
    }

    // Automatically send an instant email alert if product has a deadline within user preference threshold
    if (newPurchase.warranty?.hasWarranty || newPurchase.returnWindow?.hasReturn) {
      try {
        const expiryStr = newPurchase.warranty?.expiryDate || newPurchase.returnWindow?.deadlineDate;
        let actualDaysLeft = 30;
        if (expiryStr) {
          const expiryDate = new Date(expiryStr);
          const diffMs = expiryDate.getTime() - Date.now();
          actualDaysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        }

        // Get saved reminder threshold from Settings (default 30 days / 1 month)
        const savedBufferText = localStorage.getItem('keepr_reminder_buffer') || '30 days';
        const bufferDays = parseInt(savedBufferText, 10) || 30;

        // Only dispatch alert if product is within the user's alert preference window
        if (actualDaysLeft <= bufferDays) {
          const recipientEmail = user?.email || 'khanasifshamshul@gmail.com';
          fetch('/api/warranty/send-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              purchase: newPurchase,
              recipientEmail: recipientEmail,
              daysLeft: actualDaysLeft,
            }),
          }).catch((e) => console.warn('Instant warranty/return email alert notice:', e.message));
        } else {
          console.log(`[Keepr Alert System] Item added with ${actualDaysLeft} days remaining. Exceeds current alert threshold (${bufferDays} days). Alert scheduled for threshold.`);
        }
      } catch (e) {
        console.warn('Failed to trigger instant email:', e);
      }
    }
  };

  const handleDeletePurchase = async (id: string) => {
    setPurchases((prev) => prev.filter((p) => p.id !== id));
    try {
      await deletePurchaseFromDb(id, user?.uid);
    } catch (err) {
      console.warn('Failed to delete purchase from Firestore (using local state):', err);
    }
  };

  const handleSaveInvoice = async (invoice: Invoice) => {
    setInvoices((prev) => {
      const exists = prev.some((i) => i.id === invoice.id);
      if (exists) {
        return prev.map((i) => (i.id === invoice.id ? invoice : i));
      }
      return [invoice, ...prev];
    });
    setEditingInvoice(null);
    try {
      await addInvoiceToDb(invoice, user?.uid);
    } catch (err) {
      console.warn('Failed to sync invoice to Firestore (using local state):', err);
    }
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setActiveView('create-invoice');
  };

  const handleDuplicateInvoice = (invoice: Invoice) => {
    const duplicated: Invoice = {
      ...invoice,
      id: `inv-${Date.now()}`,
      invoiceNumber: `${invoice.invoiceNumber}-COPY`,
      status: 'draft',
      issueDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    handleSaveInvoice(duplicated);
  };

  const handleDeleteInvoice = async (id: string) => {
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    try {
      await deleteInvoiceFromDb(id, user?.uid);
    } catch (err) {
      console.warn('Failed to delete invoice from Firestore:', err);
    }
  };

  const handleUpdateInvoiceStatus = async (id: string, status: InvoiceStatus) => {
    setInvoices((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status, updatedAt: new Date().toISOString() } : i))
    );
    try {
      await updateInvoiceInDb(id, { status, updatedAt: new Date().toISOString() }, user?.uid);
    } catch (err) {
      console.warn('Failed to update invoice status in Firestore:', err);
    }
  };

  const handleTriggerClaim = (purchase: PurchaseItem) => {
    setClaimModalState({
      isOpen: true,
      purchase,
      mode: 'warranty_claim',
    });
  };

  const handleTriggerReturn = (purchase: PurchaseItem) => {
    setClaimModalState({
      isOpen: true,
      purchase,
      mode: 'return_request',
    });
  };

  // Calculate closing return windows count for badge
  const riskCount = purchases.filter(
    (p) => p.returnWindow.hasReturn && p.returnWindow.status === 'expiring_soon'
  ).length;

  // ROUTE 0: Auth Loading State (Restoring Saved Session)
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0F172A] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="font-mono-code text-xs text-slate-400">Authenticating Keepr Session...</p>
        </div>
      </div>
    );
  }

  // ROUTE 1: Landing Page (Default)
  if (currentRoute === 'landing') {
    return (
      <LandingPage
        onNavigateToAuth={() => navigateTo('auth')}
        onNavigateToApp={() => navigateTo('app')}
      />
    );
  }

  // ROUTE 2: Auth Page
  if (currentRoute === 'auth') {
    return (
      <AuthPage
        onBackToLanding={() => navigateTo('landing')}
        onLoginSuccess={() => navigateTo('app')}
      />
    );
  }

  // ROUTE 3: Main Dashboard App
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, filter: 'blur(12px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="flex h-[100dvh] w-full text-[#1A1C1D] overflow-hidden font-sans p-1.5 sm:p-2.5 md:p-3.5 gap-2 md:gap-3.5 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/bg.jpg')" }}
    >
      {/* Floating Left Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        riskCount={riskCount}
        openScanner={() => setIsScannerOpen(true)}
        openSettings={() => setIsSettingsOpen(true)}
        openAuthModal={() => setIsAuthModalOpen(true)}
        onNavigateToLanding={() => navigateTo('landing')}
        userRole={currentRole}
      />

      {/* Main Content Area (Floating Panel) */}
      <motion.div
        initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
        className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white rounded-xl sm:rounded-2xl border border-[#E2E8F0] shadow-sm"
      >
        {/* Top Bar */}
        <TopBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          openCommandPalette={() => setIsCommandPaletteOpen(true)}
          openScanner={() => setIsScannerOpen(true)}
          openAIChat={() => setIsAIChatOpen(true)}
          activeView={activeView}
          setActiveView={setActiveView}
          openSettings={() => setIsSettingsOpen(true)}
          riskCount={riskCount}
          dbConnected={dbConnected}
          openAuthModal={() => setIsAuthModalOpen(true)}
          onNavigateToLanding={() => navigateTo('landing')}
          userRole={currentRole}
        />

        {/* Corporate Expense Header */}
        <ExpenseHeader
          currentRole={currentRole}
          onRoleChange={handleRoleChange}
        />

        {/* Viewport Screen with smooth scrolling & blur transition between tabs */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-7 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              {/* Auditor Views */}
              {activeView === 'my-expenses' && (
                <MyExpensesView
                  onOpenSubmit={() => setActiveView('submit-expense')}
                />
              )}
              {activeView === 'submit-expense' && (
                <SubmitExpenseView
                  onSuccess={() => setActiveView('my-expenses')}
                />
              )}
              {activeView === 'my-caps' && (
                <MyCapsView
                  onOpenSubmit={() => setActiveView('submit-expense')}
                />
              )}
              {activeView === 'trips' && (
                <TripsView
                  onSelectExpense={() => {}}
                />
              )}
              {activeView === 'review-queue' && (
                <ReviewQueueView
                  initialTab="exceptions"
                />
              )}
              {activeView === 'all-expenses' && (
                <AllClaimsView />
              )}
              {activeView === 'policy-studio' && (
                <PolicyStudioView />
              )}
              {activeView === 'employees' && (
                <EmployeesView />
              )}
              {activeView === 'reports' && (
                <ReportsView />
              )}
              {activeView === 'simulator' && (
                <SimulatorView />
              )}
              {activeView === 'export-view' && (
                <ExportView />
              )}

              {/* Manage Views */}
              {activeView === 'dashboard' && (
                <DashboardView
                  purchases={purchases}
                  actions={actions}
                  setActiveView={setActiveView}
                  openScanner={() => setIsScannerOpen(true)}
                  onSelectPurchase={(item) => setSelectedPurchase(item)}
                  onTriggerClaim={handleTriggerClaim}
                  onTriggerReturn={handleTriggerReturn}
                />
              )}

              {activeView === 'purchases' && (
                <PurchasesView
                  purchases={purchases}
                  openScanner={() => setIsScannerOpen(true)}
                  onSelectPurchase={(item) => setSelectedPurchase(item)}
                  onDeletePurchase={handleDeletePurchase}
                  onTriggerClaim={handleTriggerClaim}
                  onTriggerReturn={handleTriggerReturn}
                />
              )}

              {activeView === 'warranties' && (
                <WarrantiesView
                  purchases={purchases}
                  onSelectPurchase={(item) => setSelectedPurchase(item)}
                  onTriggerClaim={handleTriggerClaim}
                  onTriggerReturn={handleTriggerReturn}
                />
              )}

              {activeView === 'returns' && (
                <ReturnsView
                  purchases={purchases}
                  onSelectPurchase={(item) => setSelectedPurchase(item)}
                  onTriggerReturn={handleTriggerReturn}
                />
              )}

              {activeView === 'vault' && (
                <VaultView
                  purchases={purchases}
                  openScanner={() => setIsScannerOpen(true)}
                  onSelectPurchase={(item) => setSelectedPurchase(item)}
                  onDeletePurchase={handleDeletePurchase}
                />
              )}

              {activeView === 'analytics' && (
                <AnalyticsView
                  purchases={purchases}
                  onSelectPurchase={(item) => setSelectedPurchase(item)}
                />
              )}

              {activeView === 'timeline' && (
                <TimelineView
                  purchases={purchases}
                  onSelectPurchase={(item) => setSelectedPurchase(item)}
                  onTriggerClaim={handleTriggerClaim}
                  onTriggerReturn={handleTriggerReturn}
                />
              )}

              {activeView === 'invoices' && (
                <InvoicesView
                  invoices={invoices}
                  setActiveView={setActiveView}
                  onEditInvoice={handleEditInvoice}
                  onDuplicateInvoice={handleDuplicateInvoice}
                  onDeleteInvoice={handleDeleteInvoice}
                  onUpdateStatus={handleUpdateInvoiceStatus}
                />
              )}

              {activeView === 'create-invoice' && (
                <CreateInvoiceView
                  onSaveInvoice={handleSaveInvoice}
                  setActiveView={setActiveView}
                  initialInvoice={editingInvoice}
                />
              )}

              {activeView === 'settings' && (
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 max-w-2xl">
                  <h2 className="text-xl font-semibold text-[#0F172A]">Application Settings</h2>
                  <p className="text-[13px] text-[#76777D] mt-1 mb-6">
                    Manage preferences, default currency, and AI scanning parameters.
                  </p>
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="px-4 py-2 bg-[#0F172A] text-white rounded text-[13px] font-medium"
                  >
                    Open Detailed Preferences
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>

      {/* Interactive Modals */}
      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSavePurchase={handleAddPurchase}
      />

      <PurchaseDetailModal
        purchase={selectedPurchase}
        isOpen={Boolean(selectedPurchase)}
        onClose={() => setSelectedPurchase(null)}
        onDelete={handleDeletePurchase}
        onTriggerClaim={handleTriggerClaim}
        onTriggerReturn={handleTriggerReturn}
      />

      <AIClaimModal
        isOpen={claimModalState.isOpen}
        onClose={() =>
          setClaimModalState({ isOpen: false, purchase: null, mode: 'warranty_claim' })
        }
        purchase={claimModalState.purchase}
        mode={claimModalState.mode}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        purchases={purchases}
        setActiveView={setActiveView}
        onSelectPurchase={(item) => setSelectedPurchase(item)}
        openScanner={() => setIsScannerOpen(true)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <AIChatDrawer
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        purchases={purchases}
        onSelectPurchase={(item) => setSelectedPurchase(item)}
        onTriggerClaim={handleTriggerClaim}
        onTriggerReturn={handleTriggerReturn}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </motion.div>
  );
}

export default App;

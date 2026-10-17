import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ActiveView,
  PurchaseItem,
  AIActionItem,
  Invoice,
  InvoiceStatus,
} from '../types';
import { UserRole } from '../types/expense';
import { INITIAL_PURCHASES, INITIAL_ACTIONS } from '../data/mockData';
import { INITIAL_INVOICES } from '../data/mockInvoices';
import {
  subscribePurchases,
  addPurchaseToDb,
  deletePurchaseFromDb,
  seedPurchasesIfEmpty,
} from '../services/purchaseService';
import {
  subscribeInvoices,
  addInvoiceToDb,
  updateInvoiceInDb,
  deleteInvoiceFromDb,
  seedInvoicesIfEmpty,
} from '../services/invoiceService';
import { getAllExpenses, saveAllExpenses, replayLedger } from '../services/expenseService';
import { SYNTHETIC_EXPENSES } from '../data/syntheticClaims';
import { getActiveRole, setActiveRole } from '../services/employeeService';
import { useAuth } from './AuthContext';
import { getPathToView, VIEW_TO_PATH, ROUTES } from '../routes/routeConfig';

interface ClaimModalState {
  isOpen: boolean;
  purchase: PurchaseItem | null;
  mode: 'warranty_claim' | 'return_request';
}

interface WorkspaceContextType {
  // Purchases & Invoices
  purchases: PurchaseItem[];
  setPurchases: React.Dispatch<React.SetStateAction<PurchaseItem[]>>;
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  actions: AIActionItem[];
  setActions: React.Dispatch<React.SetStateAction<AIActionItem[]>>;
  editingInvoice: Invoice | null;
  setEditingInvoice: (inv: Invoice | null) => void;
  dbConnected: boolean;
  riskCount: number;

  // Search & Filtering
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Modals
  isScannerOpen: boolean;
  setIsScannerOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isAIChatOpen: boolean;
  setIsAIChatOpen: (open: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  selectedPurchase: PurchaseItem | null;
  setSelectedPurchase: (p: PurchaseItem | null) => void;
  claimModalState: ClaimModalState;
  setClaimModalState: React.Dispatch<React.SetStateAction<ClaimModalState>>;

  // Role & Navigation
  currentRole: UserRole;
  handleRoleChange: (role: UserRole) => void;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;

  // Domain Actions
  handleAddPurchase: (item: PurchaseItem) => Promise<void>;
  handleDeletePurchase: (id: string) => Promise<void>;
  handleTriggerClaim: (item: PurchaseItem) => void;
  handleTriggerReturn: (item: PurchaseItem) => void;
  handleSaveInvoice: (inv: Invoice) => Promise<void>;
  handleEditInvoice: (inv: Invoice) => void;
  handleDuplicateInvoice: (inv: Invoice) => void;
  handleDeleteInvoice: (id: string) => Promise<void>;
  handleUpdateInvoiceStatus: (id: string, status: InvoiceStatus) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Role state initialized from storage
  const [currentRole, setCurrentRole] = useState<UserRole>(() => getActiveRole());

  // Derive active view automatically from current URL
  const activeView = useMemo(() => getPathToView(location.pathname), [location.pathname]);

  // Navigate to corresponding route when setActiveView is called
  const setActiveView = (view: ActiveView) => {
    const targetPath = VIEW_TO_PATH[view] || ROUTES.EMPLOYEE.EXPENSES;
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setActiveRole(role);
    setCurrentRole(role);
    if (role === 'finance' || role === 'admin') {
      navigate(ROUTES.AUDITOR.REVIEW_QUEUE);
    } else {
      navigate(ROUTES.EMPLOYEE.EXPENSES);
    }
  };

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

  // Purchases state & local cache
  const [purchases, setPurchases] = useState<PurchaseItem[]>(() => {
    try {
      const saved = localStorage.getItem('keepr_purchases_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_PURCHASES;
  });

  // Invoices state & local cache
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

  const [claimModalState, setClaimModalState] = useState<ClaimModalState>({
    isOpen: false,
    purchase: null,
    mode: 'warranty_claim',
  });

  // Subscribe to real-time Firestore updates
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

  // Persist purchases fallback cache
  useEffect(() => {
    try {
      localStorage.setItem('keepr_purchases_v1', JSON.stringify(purchases));
    } catch (e) {
      console.error(e);
    }
  }, [purchases]);

  // Persist invoices fallback cache
  useEffect(() => {
    try {
      localStorage.setItem('keepr_invoices_v1', JSON.stringify(invoices));
    } catch (e) {
      console.error(e);
    }
  }, [invoices]);

  // Global Command Palette shortcut (Cmd+K / Ctrl+K)
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

    if (newPurchase.warranty?.hasWarranty || newPurchase.returnWindow?.hasReturn) {
      try {
        const expiryStr = newPurchase.warranty?.expiryDate || newPurchase.returnWindow?.deadlineDate;
        let actualDaysLeft = 30;
        if (expiryStr) {
          const expiryDate = new Date(expiryStr);
          const diffMs = expiryDate.getTime() - Date.now();
          actualDaysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        }

        const savedBufferText = localStorage.getItem('keepr_reminder_buffer') || '30 days';
        const bufferDays = parseInt(savedBufferText, 10) || 30;

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
    navigate(ROUTES.AUDITOR.MANAGE_CREATE_INVOICE);
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

  const riskCount = purchases.filter(
    (p) => p.returnWindow.hasReturn && p.returnWindow.status === 'expiring_soon'
  ).length;

  return (
    <WorkspaceContext.Provider
      value={{
        purchases,
        setPurchases,
        invoices,
        setInvoices,
        actions,
        setActions,
        editingInvoice,
        setEditingInvoice,
        dbConnected,
        riskCount,
        searchQuery,
        setSearchQuery,
        isScannerOpen,
        setIsScannerOpen,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isSettingsOpen,
        setIsSettingsOpen,
        isAIChatOpen,
        setIsAIChatOpen,
        isAuthModalOpen,
        setIsAuthModalOpen,
        selectedPurchase,
        setSelectedPurchase,
        claimModalState,
        setClaimModalState,
        currentRole,
        handleRoleChange,
        activeView,
        setActiveView,
        handleAddPurchase,
        handleDeletePurchase,
        handleTriggerClaim,
        handleTriggerReturn,
        handleSaveInvoice,
        handleEditInvoice,
        handleDuplicateInvoice,
        handleDeleteInvoice,
        handleUpdateInvoiceStatus,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

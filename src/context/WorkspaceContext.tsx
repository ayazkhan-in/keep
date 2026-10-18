import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ActiveView,
  PurchaseItem,
  AIActionItem,
  Invoice,
  InvoiceStatus,
} from '../types';
import { UserRole } from '../types/expense';
import { INITIAL_ACTIONS } from '../data/mockData';
import {
  subscribePurchases,
  addPurchaseToDb,
  deletePurchaseFromDb,
} from '../services/purchaseService';
import {
  subscribeInvoices,
  addInvoiceToDb,
  updateInvoiceInDb,
  deleteInvoiceFromDb,
} from '../services/invoiceService';
import { getActiveRole, setActiveRole } from '../services/employeeService';
import { useAuth } from './AuthContext';
import { getPathToView, VIEW_TO_PATH, ROUTES } from '../routes/routeConfig';

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

  // Role & Navigation
  currentRole: UserRole;
  handleRoleChange: (role: UserRole) => void;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;

  // Domain Actions
  handleAddPurchase: (item: PurchaseItem) => Promise<void>;
  handleDeletePurchase: (id: string) => Promise<void>;
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

  // Role state initialized from route context or tab session storage
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase();
      if (p.startsWith('/auditor')) {
        setActiveRole('finance');
        return 'finance';
      }
      if (p.startsWith('/employee')) {
        setActiveRole('employee');
        return 'employee';
      }
    }
    return getActiveRole();
  });

  // Keep role in sync with active portal route
  useEffect(() => {
    const p = location.pathname.toLowerCase();
    if (p.startsWith('/auditor')) {
      if (currentRole !== 'finance' && currentRole !== 'admin') {
        setCurrentRole('finance');
        setActiveRole('finance');
      }
    } else if (p.startsWith('/employee')) {
      if (currentRole !== 'employee') {
        setCurrentRole('employee');
        setActiveRole('employee');
      }
    }
  }, [location.pathname, currentRole]);

  // Derive active view automatically from current URL
  const activeView = useMemo(() => getPathToView(location.pathname), [location.pathname]);

  // Navigate to corresponding route when setActiveView is called
  const setActiveView = useCallback((view: ActiveView) => {
    const targetPath = VIEW_TO_PATH[view] || ROUTES.EMPLOYEE.EXPENSES;
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  }, [location.pathname, navigate]);

  const handleRoleChange = useCallback((role: UserRole) => {
    setActiveRole(role);
    setCurrentRole(role);
    if (role === 'finance' || role === 'admin') {
      navigate(ROUTES.AUDITOR.REVIEW_QUEUE);
    } else {
      navigate(ROUTES.EMPLOYEE.EXPENSES);
    }
  }, [navigate]);

  // Purchases state & local cache
  const [purchases, setPurchases] = useState<PurchaseItem[]>(() => {
    try {
      const saved = localStorage.getItem('keepr_purchases_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Invoices state & local cache
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const saved = localStorage.getItem('keepr_invoices_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
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

  // Subscribe to real-time Firestore updates for purchases and invoices
  useEffect(() => {
    const userId = user?.uid;

    const unsubscribePurchases = subscribePurchases(
      (items) => {
        setPurchases(items || []);
        setDbConnected(true);
      },
      (_error) => {
        setDbConnected(false);
      },
      userId
    );

    const unsubscribeInvoices = subscribeInvoices(
      (items) => {
        setInvoices(items || []);
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

  const handleAddPurchase = useCallback(async (newPurchase: PurchaseItem) => {
    setPurchases((prev) => [newPurchase, ...prev]);
    try {
      await addPurchaseToDb(newPurchase, user?.uid);
    } catch (err) {
      console.warn('Failed to sync new purchase to Firestore (using local state):', err);
    }

    if (newPurchase.notes?.includes('FLAGGED') || newPurchase.notes?.includes('EXCEEDED')) {
      try {
        const recipientEmail = user?.email || 'khanasifshamshul@gmail.com';
        fetch('/api/expense/send-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            purchase: newPurchase,
            recipientEmail: recipientEmail,
            policyViolation: newPurchase.notes,
          }),
        }).catch((e) => console.warn('Instant expense policy violation alert notice:', e.message));
      } catch (e) {
        console.warn('Failed to trigger instant expense email:', e);
      }
    }
  }, [user?.uid, user?.email]);

  const handleDeletePurchase = useCallback(async (id: string) => {
    setPurchases((prev) => prev.filter((p) => p.id !== id));
    try {
      await deletePurchaseFromDb(id, user?.uid);
    } catch (err) {
      console.warn('Failed to delete purchase from Firestore (using local state):', err);
    }
  }, [user?.uid]);

  const handleSaveInvoice = useCallback(async (invoice: Invoice) => {
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
  }, [user?.uid]);

  const handleEditInvoice = useCallback((invoice: Invoice) => {
    setEditingInvoice(invoice);
    navigate(ROUTES.AUDITOR.MANAGE_CREATE_INVOICE);
  }, [navigate]);

  const handleDuplicateInvoice = useCallback((invoice: Invoice) => {
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
  }, [handleSaveInvoice]);

  const handleDeleteInvoice = useCallback(async (id: string) => {
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    try {
      await deleteInvoiceFromDb(id, user?.uid);
    } catch (err) {
      console.warn('Failed to delete invoice from Firestore:', err);
    }
  }, [user?.uid]);

  const handleUpdateInvoiceStatus = useCallback(async (id: string, status: InvoiceStatus) => {
    setInvoices((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status, updatedAt: new Date().toISOString() } : i))
    );
    try {
      await updateInvoiceInDb(id, { status, updatedAt: new Date().toISOString() }, user?.uid);
    } catch (err) {
      console.warn('Failed to update invoice status in Firestore:', err);
    }
  }, [user?.uid]);

  const riskCount = useMemo(() => purchases.filter(
    (p) => p.notes?.includes('FLAGGED') || p.notes?.includes('EXCEEDED') || p.notes?.includes('ALERT')
  ).length, [purchases]);

  const contextValue = useMemo(() => ({
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
    currentRole,
    handleRoleChange,
    activeView,
    setActiveView,
    handleAddPurchase,
    handleDeletePurchase,
    handleSaveInvoice,
    handleEditInvoice,
    handleDuplicateInvoice,
    handleDeleteInvoice,
    handleUpdateInvoiceStatus,
  }), [
    purchases,
    invoices,
    actions,
    editingInvoice,
    dbConnected,
    riskCount,
    searchQuery,
    isScannerOpen,
    isCommandPaletteOpen,
    isSettingsOpen,
    isAIChatOpen,
    isAuthModalOpen,
    selectedPurchase,
    currentRole,
    handleRoleChange,
    activeView,
    setActiveView,
    handleAddPurchase,
    handleDeletePurchase,
    handleSaveInvoice,
    handleEditInvoice,
    handleDuplicateInvoice,
    handleDeleteInvoice,
    handleUpdateInvoiceStatus,
  ]);

  return (
    <WorkspaceContext.Provider value={contextValue}>
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

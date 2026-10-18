import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ReceiptScannerModal } from '../components/ReceiptScannerModal';
import { PurchaseDetailModal } from '../components/PurchaseDetailModal';
import { CommandPalette } from '../components/CommandPalette';
import { SettingsModal } from '../components/SettingsModal';
import { AIChatDrawer } from '../components/AIChatDrawer';
import { AuthModal } from '../components/AuthModal';
import { EmployeeBottomNav } from '../components/expense/EmployeeBottomNav';
import { useWorkspace } from '../context/WorkspaceContext';
import { ROUTES } from '../routes/routeConfig';

interface WorkspaceLayoutProps {
  portal: 'auditor' | 'employee';
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({ portal }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    purchases,
    actions,
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
    dbConnected,
    riskCount,
    currentRole,
    handleRoleChange,
    activeView,
    setActiveView,
    handleAddPurchase,
    handleDeletePurchase,
  } = useWorkspace();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, filter: 'blur(12px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="flex h-[100dvh] w-full text-[#1A1C1D] overflow-hidden font-sans p-1.5 sm:p-2.5 md:p-3.5 gap-2 md:gap-3.5 bg-cover bg-center bg-no-repeat bg-[#F8F9FA]"
      style={{ backgroundImage: "url('/bg.jpg')" }}
    >
      {/* Left Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        riskCount={riskCount}
        openScanner={() => setIsScannerOpen(true)}
        openSettings={() => setIsSettingsOpen(true)}
        openAuthModal={() => setIsAuthModalOpen(true)}
        onNavigateToLanding={() => navigate(ROUTES.HOME)}
        userRole={currentRole}
      />

      {/* Main Content Area */}
      <motion.div
        initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
        className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white rounded-xl sm:rounded-2xl border border-[#E2E8F0] shadow-sm relative"
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
          onNavigateToLanding={() => navigate(ROUTES.HOME)}
          userRole={currentRole}
        />

        {/* Viewport Screen */}
        <main className={`flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-7 max-w-7xl w-full mx-auto ${portal === 'employee' ? 'pb-24 md:pb-6' : ''}`}>
          <ErrorBoundary onReset={() => setActiveView(portal === 'auditor' ? 'review-queue' : 'my-expenses')}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </ErrorBoundary>
        </main>
      </motion.div>

      {/* Interactive Global Modals */}
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
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Floating Bottom Navbar for Employee Mobile Navigation */}
      {portal === 'employee' && <EmployeeBottomNav />}
    </motion.div>
  );
};

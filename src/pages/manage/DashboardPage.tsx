import React from 'react';
import { DashboardView } from '../../components/DashboardView';
import { useWorkspace } from '../../context/WorkspaceContext';

export const DashboardPage: React.FC = () => {
  const {
    purchases,
    actions,
    setActiveView,
    setIsScannerOpen,
    setSelectedPurchase,
    handleTriggerClaim,
    handleTriggerReturn,
  } = useWorkspace();

  return (
    <DashboardView
      purchases={purchases}
      actions={actions}
      setActiveView={setActiveView}
      openScanner={() => setIsScannerOpen(true)}
      onSelectPurchase={(item) => setSelectedPurchase(item)}
      onTriggerClaim={handleTriggerClaim}
      onTriggerReturn={handleTriggerReturn}
    />
  );
};

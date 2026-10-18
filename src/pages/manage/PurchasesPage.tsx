import React from 'react';
import { PurchasesView } from '../../components/PurchasesView';
import { useWorkspace } from '../../context/WorkspaceContext';

export const PurchasesPage: React.FC = () => {
  const {
    purchases,
    setIsScannerOpen,
    setSelectedPurchase,
    handleDeletePurchase,
  } = useWorkspace();

  return (
    <PurchasesView
      purchases={purchases}
      openScanner={() => setIsScannerOpen(true)}
      onSelectPurchase={(item) => setSelectedPurchase(item)}
      onDeletePurchase={handleDeletePurchase}
    />
  );
};

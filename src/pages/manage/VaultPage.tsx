import React from 'react';
import { VaultView } from '../../components/VaultView';
import { useWorkspace } from '../../context/WorkspaceContext';

export const VaultPage: React.FC = () => {
  const {
    purchases,
    setIsScannerOpen,
    setSelectedPurchase,
    handleDeletePurchase,
  } = useWorkspace();

  return (
    <VaultView
      purchases={purchases}
      openScanner={() => setIsScannerOpen(true)}
      onSelectPurchase={(item) => setSelectedPurchase(item)}
      onDeletePurchase={handleDeletePurchase}
    />
  );
};

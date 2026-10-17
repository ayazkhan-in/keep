import React from 'react';
import { WarrantiesView } from '../../components/WarrantiesView';
import { useWorkspace } from '../../context/WorkspaceContext';

export const WarrantiesPage: React.FC = () => {
  const {
    purchases,
    setSelectedPurchase,
    handleTriggerClaim,
    handleTriggerReturn,
  } = useWorkspace();

  return (
    <WarrantiesView
      purchases={purchases}
      onSelectPurchase={(item) => setSelectedPurchase(item)}
      onTriggerClaim={handleTriggerClaim}
      onTriggerReturn={handleTriggerReturn}
    />
  );
};

import React from 'react';
import { ReturnsView } from '../../components/ReturnsView';
import { useWorkspace } from '../../context/WorkspaceContext';

export const ReturnsPage: React.FC = () => {
  const {
    purchases,
    setSelectedPurchase,
    handleTriggerReturn,
  } = useWorkspace();

  return (
    <ReturnsView
      purchases={purchases}
      onSelectPurchase={(item) => setSelectedPurchase(item)}
      onTriggerReturn={handleTriggerReturn}
    />
  );
};

import React from 'react';
import { TimelineView } from '../../components/TimelineView';
import { useWorkspace } from '../../context/WorkspaceContext';

export const TimelinePage: React.FC = () => {
  const {
    purchases,
    setSelectedPurchase,
    handleTriggerClaim,
    handleTriggerReturn,
  } = useWorkspace();

  return (
    <TimelineView
      purchases={purchases}
      onSelectPurchase={(item) => setSelectedPurchase(item)}
      onTriggerClaim={handleTriggerClaim}
      onTriggerReturn={handleTriggerReturn}
    />
  );
};

import React from 'react';
import { TimelineView } from '../../components/TimelineView';
import { useWorkspace } from '../../context/WorkspaceContext';

export const TimelinePage: React.FC = () => {
  const {
    purchases,
    setSelectedPurchase,
  } = useWorkspace();

  return (
    <TimelineView
      purchases={purchases}
      onSelectPurchase={(item) => setSelectedPurchase(item)}
    />
  );
};

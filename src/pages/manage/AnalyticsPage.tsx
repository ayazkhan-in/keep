import React from 'react';
import { AnalyticsView } from '../../components/AnalyticsView';
import { useWorkspace } from '../../context/WorkspaceContext';

export const AnalyticsPage: React.FC = () => {
  const { purchases, setSelectedPurchase } = useWorkspace();

  return (
    <AnalyticsView
      purchases={purchases}
      onSelectPurchase={(item) => setSelectedPurchase(item)}
    />
  );
};

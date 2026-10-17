import React from 'react';
import { CreateInvoiceView } from '../../components/CreateInvoiceView';
import { useWorkspace } from '../../context/WorkspaceContext';

export const CreateInvoicePage: React.FC = () => {
  const {
    handleSaveInvoice,
    setActiveView,
    editingInvoice,
  } = useWorkspace();

  return (
    <CreateInvoiceView
      onSaveInvoice={handleSaveInvoice}
      setActiveView={setActiveView}
      initialInvoice={editingInvoice}
    />
  );
};

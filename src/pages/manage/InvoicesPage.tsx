import React from 'react';
import { InvoicesView } from '../../components/InvoicesView';
import { useWorkspace } from '../../context/WorkspaceContext';

export const InvoicesPage: React.FC = () => {
  const {
    invoices,
    setActiveView,
    handleEditInvoice,
    handleDuplicateInvoice,
    handleDeleteInvoice,
    handleUpdateInvoiceStatus,
  } = useWorkspace();

  return (
    <InvoicesView
      invoices={invoices}
      setActiveView={setActiveView}
      onEditInvoice={handleEditInvoice}
      onDuplicateInvoice={handleDuplicateInvoice}
      onDeleteInvoice={handleDeleteInvoice}
      onUpdateStatus={handleUpdateInvoiceStatus}
    />
  );
};

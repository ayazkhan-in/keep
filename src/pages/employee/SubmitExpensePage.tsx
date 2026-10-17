import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SubmitExpenseView } from '../../components/expense/SubmitExpenseView';
import { ROUTES } from '../../routes/routeConfig';

export const SubmitExpensePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <SubmitExpenseView
      onSuccess={() => navigate(ROUTES.EMPLOYEE.EXPENSES)}
      onCancel={() => navigate(ROUTES.EMPLOYEE.EXPENSES)}
    />
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MyExpensesView } from '../../components/expense/MyExpensesView';
import { ROUTES } from '../../routes/routeConfig';

export const MyExpensesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <MyExpensesView
      onOpenSubmit={() => navigate(ROUTES.EMPLOYEE.SUBMIT)}
    />
  );
};

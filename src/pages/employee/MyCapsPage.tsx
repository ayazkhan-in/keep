import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MyCapsView } from '../../components/expense/MyCapsView';
import { ROUTES } from '../../routes/routeConfig';

export const MyCapsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <MyCapsView
      onOpenSubmit={() => navigate(ROUTES.EMPLOYEE.SUBMIT)}
    />
  );
};

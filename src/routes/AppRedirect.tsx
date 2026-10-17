import React from 'react';
import { Navigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { getDefaultPortalRoute } from './routeConfig';

export const AppRedirect: React.FC = () => {
  const { currentRole } = useWorkspace();
  const target = getDefaultPortalRoute(currentRole);

  return <Navigate to={target} replace />;
};

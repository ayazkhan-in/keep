import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { AppRoutes } from './routes/AppRoutes';

export function App() {
  return (
    <BrowserRouter>
      <WorkspaceProvider>
        <AppRoutes />
      </WorkspaceProvider>
    </BrowserRouter>
  );
}

export default App;

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'sonner';
import { store } from './store/store';
import { TenantProvider, useTenant } from './context/TenantContext';
import LoginView from './components/LoginView';
import ProtectedRoute from './components/ProtectedRoute';
import AdminView from './components/admin/AdminView';
import SuperAdminView from './components/superadmin/SuperAdminView';
import MyAdminView from './components/myadmin/MyAdminView';
import DisplayView from './components/front-end/DisplayView';
import FeedTest from './components/front-end/FeedTest';
import './styles/main.scss';

function AdminRoute() {
  const { isSuperAdmin } = useTenant();
  return (
    <ProtectedRoute>
      {isSuperAdmin ? <SuperAdminView /> : <AdminView />}
    </ProtectedRoute>
  );
}

function MyAdminRoute() {
  return (
    <ProtectedRoute>
      <MyAdminView />
    </ProtectedRoute>
  );
}

// Main App Component
function App() {
  return (
    <Provider store={store}>
      <TenantProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="App">
            <Routes>
              <Route path="/login" element={<LoginView />} />
              <Route path="/" element={<DisplayView />} />
              <Route path="/test" element={<FeedTest />} />
              <Route path="/admin" element={<AdminRoute />} />
              <Route path="/my-izi" element={<MyAdminRoute />} />
              <Route path="/:tenantId" element={<AdminRoute />} />
              <Route path="/:tenantId/admin" element={<AdminRoute />} />
            </Routes>
            <Toaster
              position="bottom-right"
              richColors
              closeButton
              duration={4000}
            />
          </div>
        </Router>
      </TenantProvider>
    </Provider>
  );
}

export default App;

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'sonner';
import { store } from './store/store';
import LoginView from './components/LoginView';
import ProtectedRoute from './components/ProtectedRoute';
import AdminView from './components/AdminView';
import DisplayView from './components/DisplayView';
import './styles/main.scss';

// Main App Component
function App() {
  return (
    <Provider store={store}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="App">
          <Routes>
            <Route path="/login" element={<LoginView />} />
            <Route path="/" element={<DisplayView />} />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminView />
              </ProtectedRoute>
            } />
          </Routes>
          <Toaster 
            position="bottom-right"
            richColors
            closeButton
            duration={4000}
          />
        </div>
      </Router>
    </Provider>
  );
}

export default App;

import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { Toaster } from "sonner";
import { store } from "./store/store";
import { TenantProvider, useTenant } from "./context/TenantContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import LoginView from "./components/LoginView";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminView from "./components/admin/AdminView";
import SuperAdminView from "./components/superadmin/SuperAdminView";
import MyAdminView from "./components/myadmin/MyAdminView";
import DisplayView from "./components/front-end/DisplayView";
import PlaylistPreviewView from "./components/front-end/PlaylistPreviewView";
import SlidePreviewPage from "./components/front-end/SlidePreviewPage";
import FeedTest from "./components/front-end/FeedTest";
import "./styles/main.scss";
import DisclaimerModal, {
  hasAcceptedDisclaimer,
} from "./components/admin/DisclaimerModal";

function AdminRoute() {
  const { isSuperAdmin } = useTenant();
  // Disclaimer state
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(
    hasAcceptedDisclaimer,
  );

  return (
    <ProtectedRoute>
      {!disclaimerAccepted && (
        <DisclaimerModal onAccept={() => setDisclaimerAccepted(true)} />
      )}
      {isSuperAdmin ? <SuperAdminView /> : <AdminView />}
    </ProtectedRoute>
  );
}

function MyAdminRoute() {
  // Disclaimer state
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(
    hasAcceptedDisclaimer,
  );
  return (
    <ProtectedRoute>
      {!disclaimerAccepted && (
        <DisclaimerModal onAccept={() => setDisclaimerAccepted(true)} />
      )}
      <MyAdminView />
    </ProtectedRoute>
  );
}

// Main App Component
function App() {
  return (
    <Provider store={store}>
      <ConfirmProvider>
      <TenantProvider>
        <Router
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <div className="App">
            <Routes>
              <Route path="/login" element={<LoginView />} />
              <Route path="/" element={<DisplayView />} />
              <Route path="/test" element={<FeedTest />} />
              <Route path="/admin" element={<AdminRoute />} />
              <Route path="/my-izi" element={<MyAdminRoute />} />
              <Route
                path="/preview/:tenantId"
                element={<PlaylistPreviewView />}
              />
              <Route
                path="/preview/:tenantId/slide/:slideId"
                element={<SlidePreviewPage />}
              />
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
      </ConfirmProvider>
    </Provider>
  );
}

export default App;

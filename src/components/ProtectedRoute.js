import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { useTenant } from '../context/TenantContext';

function ProtectedRoute({ children }) {
  const { tenantId, isSuperAdmin, isMyAdmin } = useTenant();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [tenantExists, setTenantExists] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      const email = firebaseUser.email || '';

      // Always verify the tenant exists when in tenant mode
      if (tenantId) {
        try {
          const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
          if (!tenantDoc.exists()) {
            setTenantExists(false);
            setLoading(false);
            return;
          }

          // Dunepebbler staff get access to any existing tenant
          if (email.endsWith('@dunepebbler.nl')) {
            setAuthorized(true);
            setLoading(false);
            return;
          }

          const data = tenantDoc.data();
          const authorizedUsers = data.authorizedUsers || [];
          const isAuthorized = authorizedUsers.some((u) =>
            typeof u === 'string' ? u === email : u.email === email
          );
          setAuthorized(isAuthorized);
        } catch (error) {
          console.error('Error checking tenant authorization:', error);
          setAuthorized(false);
        }
        setLoading(false);
        return;
      }

      // Dunepebbler staff always have full access outside tenant mode
      if (email.endsWith('@dunepebbler.nl')) {
        setAuthorized(true);
        setLoading(false);
        return;
      }

      // /my-izi: any logged-in user can access — tenant filtering happens inside MyAdminView
      if (isMyAdmin) {
        setAuthorized(true);
        setLoading(false);
        return;
      }

      // Super admin mode (www.izi-casting.com): @dunepebbler.nl or config/superadmin authorizedUsers
      if (isSuperAdmin) {
        try {
          const superDoc = await getDoc(doc(db, 'config', 'superadmin'));
          const allowed = superDoc.data()?.authorizedUsers || [];
          setAuthorized(allowed.includes(email));
        } catch (error) {
          console.error('Error checking super admin authorization:', error);
          setAuthorized(false);
        }
        setLoading(false);
        return;
      }

      setAuthorized(false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tenantId, isSuperAdmin, isMyAdmin]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(window.location.pathname)}`} replace />;
  }

  if (!tenantExists) {
    return (
      <div className="access-denied">
        <h2>Tenant niet gevonden</h2>
        <p>De omgeving <strong>{tenantId}</strong> bestaat niet.</p>
        <p>Controleer de URL of neem contact op met <a href="mailto:info@dunepebbler.nl">info@dunepebbler.nl</a>.</p>
        <button onClick={() => window.history.back()} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          ← Terug
        </button>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="access-denied">
        <h2>Geen toegang</h2>
        <p>Je account ({user.email}) heeft geen toegang tot deze omgeving.</p>
        <p>Neem contact op met <a href="mailto:info@dunepebbler.nl">info@dunepebbler.nl</a> om toegang te krijgen.</p>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;

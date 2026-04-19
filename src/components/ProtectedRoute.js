import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { useTenant } from '../context/TenantContext';

function ProtectedRoute({ children }) {
  const { tenantId, isSuperAdmin } = useTenant();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      const email = firebaseUser.email || '';

      // Dunepebbler staff always have full access
      if (email.endsWith('@dunepebbler.nl')) {
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

      // Tenant mode: check authorizedUsers on the tenant document
      if (tenantId) {
        try {
          const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
          if (tenantDoc.exists()) {
            const data = tenantDoc.data();
            const authorizedUsers = data.authorizedUsers || [];
            const isAuthorized = authorizedUsers.some((u) =>
              typeof u === 'string' ? u === email : u.email === email
            );
            setAuthorized(isAuthorized);
          } else {
            setAuthorized(false);
          }
        } catch (error) {
          console.error('Error checking tenant authorization:', error);
          setAuthorized(false);
        }
      } else {
        setAuthorized(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [tenantId, isSuperAdmin]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
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

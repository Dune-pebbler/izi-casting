import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🛡️ ProtectedRoute: Setting up auth state listener...');
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🛡️ ProtectedRoute: Auth state changed:', user ? {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        isAuthenticated: true
      } : { isAuthenticated: false });
      setUser(user);
      setLoading(false);
    });
    return () => {
      console.log('🛡️ ProtectedRoute: Cleaning up auth state listener');
      unsubscribe();
    };
  }, []);

  if (loading) {
    console.log('🛡️ ProtectedRoute: Still loading...');
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    console.log('🛡️ ProtectedRoute: No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('🛡️ ProtectedRoute: User authenticated, rendering protected content');
  return children;
}

export default ProtectedRoute;

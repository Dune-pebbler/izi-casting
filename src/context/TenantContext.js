import React, { createContext, useContext, useMemo } from 'react';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const value = useMemo(() => {
    const pathname = window.location.pathname;

    // Super admin: /admin
    if (pathname === '/admin') {
      return { tenantId: null, isSuperAdmin: true };
    }

    // Customer portal: /my-izi
    if (pathname === '/my-izi') {
      return { tenantId: null, isSuperAdmin: false, isMyAdmin: true };
    }

    // Tenant admin: /:tenantId (any first path segment that isn't reserved)
    const match = pathname.match(/^\/([a-zA-Z0-9_-]+)/);
    if (match && !['login', 'test', 'my-izi'].includes(match[1])) {
      return { tenantId: match[1], isSuperAdmin: false, isMyAdmin: false };
    }

    // Root / or anything else (display view)
    return { tenantId: null, isSuperAdmin: false };
  }, []);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

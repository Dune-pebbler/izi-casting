import React, { createContext, useContext, useMemo } from 'react';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const value = useMemo(() => {
    const hostname = window.location.hostname;

    // Super admin mode: root domain (no subdomain, or www)
    if (hostname === 'izi-casting.com' || hostname === 'www.izi-casting.com') {
      return { tenantId: null, isSuperAdmin: true };
    }

    // Subdomain: bakkerij.izi-casting.com → tenantId = "bakkerij"
    const match = hostname.match(/^([^.]+)\.izi-casting\.com$/);
    if (match) {
      return { tenantId: match[1], isSuperAdmin: false };
    }

    // localhost: if REACT_APP_TENANT_ID is set, use that tenant
    // otherwise behave as super admin (for local development of the dashboard)
    const tenantId = process.env.REACT_APP_TENANT_ID;
    if (tenantId) {
      return { tenantId, isSuperAdmin: false };
    }
    return { tenantId: null, isSuperAdmin: true };
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

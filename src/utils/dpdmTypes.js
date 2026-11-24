// DPDM (pdm-dunepebbler) slide types. These are exclusively available to the
// Dune Pebbler tenant — not via a superadmin toggle alone, because tenants
// without a slideTypes config get every type by default. The server proxy
// (api/dpdm/[endpoint].js) enforces the same restriction independently.
//
// Locally the tenant id can be overridden with REACT_APP_DPDM_TENANT_ID,
// since the local Firebase project has no "dunepebbler" tenant.
export const DPDM_TENANT_ID = (
  process.env.REACT_APP_DPDM_TENANT_ID || "dunepebbler"
).trim();

// All 3 layouts share one tenant slideTypes flag.
export const DPDM_GATE_KEY = "dpdm";

export const DPDM_SOURCES = {
  "dpdm-updates": {
    endpoint: "updates",
    label: "DPDM - Updates",
    title: "Updates gepland",
    emptyText: "Geen updates gepland",
  },
  "dpdm-ssl": {
    endpoint: "ssl-errors",
    label: "DPDM - SSL-fouten",
    title: "SSL-fouten",
    emptyText: "Geen SSL-fouten",
  },
  "dpdm-uptime": {
    endpoint: "uptime-errors",
    label: "DPDM - Uptime-fouten",
    title: "Uptime-fouten",
    emptyText: "Alle websites zijn online",
  },
};

export const DPDM_LAYOUTS = Object.keys(DPDM_SOURCES);

export function isDpdmLayout(layout) {
  return DPDM_LAYOUTS.includes(layout);
}

export function isDpdmTenant(tenantId) {
  return !!tenantId && tenantId === DPDM_TENANT_ID;
}

// False only for a DPDM layout on any tenant other than the DPDM tenant.
export function isLayoutAllowedForTenant(layout, tenantId) {
  return !isDpdmLayout(layout) || isDpdmTenant(tenantId);
}

import { getAdminDb, getAdminAuth } from './firebaseAdmin.js';

// DPDM (pdm-dunepebbler) slides are exclusively for the Dune Pebbler tenant.
// Locally the tenant id can be overridden (DPDM_TENANT_ID) because the local
// Firebase project has no "dunepebbler" tenant.
export function getDpdmTenantId() {
  return (process.env.DPDM_TENANT_ID || 'dunepebbler').trim();
}

export function getDpdmConfig() {
  const baseUrl = (process.env.DPDM_API_URL || '').trim().replace(/\/+$/, '');
  const token = (process.env.DPDM_API_TOKEN || '').trim();
  return { baseUrl, token };
}

// Public slug → upstream path on the DPDM API.
export const DPDM_ENDPOINTS = {
  updates: '/api/updates',
  'ssl-errors': '/api/domain/ssl-errors',
  'uptime-errors': '/api/domain/uptime-errors',
};

const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function extractBearerToken(req) {
  const header = req.headers?.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function listIncludesEmail(list, email) {
  return (list || []).some((u) =>
    (typeof u === 'string' ? u : u?.email || '').toLowerCase() === email,
  );
}

/**
 * A request is allowed when it comes from either:
 *  - a signed-in admin (Firebase ID token) who is Dune Pebbler staff, a
 *    superadmin, or an authorized user of the DPDM tenant — mirrors
 *    isAuthorized() in firestore.rules; used by the preview pages.
 *  - a display device (X-Device-Id) that is paired to the DPDM tenant.
 */
export async function isDpdmRequestAllowed(req) {
  const tenantId = getDpdmTenantId();
  const db = getAdminDb();

  const idToken = extractBearerToken(req);
  if (idToken) {
    let decoded;
    try {
      decoded = await getAdminAuth().verifyIdToken(idToken);
    } catch {
      decoded = null;
    }
    const email = (decoded?.email || '').toLowerCase();
    if (email) {
      if (/@dunepebbler\.nl$/.test(email)) return true;

      const [superSnap, tenantSnap] = await Promise.all([
        db.doc('config/superadmin').get(),
        db.doc(`tenants/${tenantId}`).get(),
      ]);
      if (listIncludesEmail(superSnap.data()?.authorizedUsers, email)) return true;
      if (listIncludesEmail(tenantSnap.data()?.authorizedUsers, email)) return true;
    }
  }

  const deviceId = req.headers?.['x-device-id'];
  if (typeof deviceId === 'string' && DEVICE_ID_PATTERN.test(deviceId)) {
    const deviceSnap = await db.doc(`devices/${deviceId}`).get();
    const device = deviceSnap.exists ? deviceSnap.data() : null;
    if (device?.isPaired === true && device?.tenantId === tenantId) return true;
  }

  return false;
}

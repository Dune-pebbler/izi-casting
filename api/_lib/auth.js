import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from './firebaseAdmin.js';
import { AuthError } from './errors.js';

export { AuthError };

function hashToken(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function extractBearerToken(req) {
  const header = req.headers?.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Validates the Authorization: Bearer <token> header against the
 * apiKeys collection group and returns the tenant it belongs to.
 * The tenant is derived from the matched document's own path, so a
 * key can never resolve to any tenant other than the one it was
 * issued for.
 */
export async function authenticateRequest(req) {
  const token = extractBearerToken(req);
  if (!token) throw new AuthError();

  const hash = hashToken(token);

  const snapshot = await getAdminDb()
    .collectionGroup('apiKeys')
    .where('hash', '==', hash)
    .limit(1)
    .get();

  if (snapshot.empty) throw new AuthError();

  const keyDoc = snapshot.docs[0];
  const keyData = keyDoc.data();
  if (keyData.active === false) throw new AuthError();

  const tenantRef = keyDoc.ref.parent.parent;
  if (!tenantRef) throw new AuthError();

  keyDoc.ref.update({ lastUsedAt: FieldValue.serverTimestamp() }).catch(() => {});

  return { tenantId: tenantRef.id, tenantRef };
}

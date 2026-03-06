import { doc, collection } from 'firebase/firestore';
import { ref } from 'firebase/storage';

/**
 * Returns a Firestore document reference scoped to a tenant.
 * Example: tenantDoc(db, 'bakkerij', 'display', 'content')
 *   → doc at tenants/bakkerij/display/content
 */
export function tenantDoc(db, tenantId, ...pathSegments) {
  return doc(db, 'tenants', tenantId, ...pathSegments);
}

/**
 * Returns a Firestore collection reference scoped to a tenant.
 * Example: tenantCollection(db, 'bakkerij', 'devices')
 *   → collection at tenants/bakkerij/devices
 */
export function tenantCollection(db, tenantId, collectionPath) {
  return collection(db, 'tenants', tenantId, collectionPath);
}

/**
 * Returns a Firebase Storage ref scoped to a tenant.
 * Example: tenantStorageRef(storage, 'bakkerij', 'slides/img.jpg')
 *   → ref at tenants/bakkerij/slides/img.jpg
 */
export function tenantStorageRef(storage, tenantId, path) {
  return ref(storage, `tenants/${tenantId}/${path}`);
}

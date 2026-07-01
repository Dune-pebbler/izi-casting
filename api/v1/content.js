import { getAdminDb } from '../_lib/firebaseAdmin.js';
import { authenticateRequest } from '../_lib/auth.js';
import { AuthError } from '../_lib/errors.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tenantId } = await authenticateRequest(req);

    const snap = await getAdminDb()
      .doc(`tenants/${tenantId}/display/content`)
      .get();

    const playlists = (snap.exists ? snap.data()?.playlists : []) || [];

    return res.status(200).json({
      playlists: playlists.map((playlist) => ({
        id: playlist.id,
        name: playlist.name,
        isEnabled: playlist.isEnabled !== false,
        slides: (playlist.slides || []).map((slide) => ({
          id: slide.id,
          name: slide.name,
          isVisible: slide.isVisible !== false,
        })),
      })),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('GET /api/v1/content failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

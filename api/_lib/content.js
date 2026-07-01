import { getAdminDb } from './firebaseAdmin.js';
import { NotFoundError } from './errors.js';

/**
 * Runs `mutate` inside a transaction against the tenant's
 * `display/content` document, so concurrent API calls (or an API
 * call racing an admin editing in the UI) can't clobber each other's
 * writes the way the plain client-side setDoc(..., { merge: true })
 * does today.
 *
 * `mutate(playlists)` must mutate/return the full playlists array.
 */
export async function withPlaylistsTransaction(tenantId, mutate) {
  const db = getAdminDb();
  const ref = db.doc(`tenants/${tenantId}/display/content`);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const playlists = (snap.exists ? snap.data()?.playlists : []) || [];

    const result = mutate(playlists);

    tx.set(ref, { playlists: result.playlists }, { merge: true });
    return result;
  });
}

export function findPlaylist(playlists, playlistId) {
  const playlist = playlists.find((p) => String(p.id) === String(playlistId));
  if (!playlist) throw new NotFoundError('Playlist not found');
  return playlist;
}

export function findSlide(playlist, slideId) {
  const slide = (playlist.slides || []).find(
    (s) => String(s.id) === String(slideId),
  );
  if (!slide) throw new NotFoundError('Slide not found');
  return slide;
}

import { getDoc, getDocs, query, where } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { tenantDoc, tenantCollection } from "./tenantPaths";

// All image URLs a single slide references (main image, backgrounds,
// gallery images and QR sub-slide backgrounds).
export const getSlideImageUrls = (slide) => {
  if (!slide) return [];
  return [
    slide.imageUrl,
    slide.countdownBgImage,
    slide.weatherLeftBgImage,
    ...(slide.images || []).map((image) => image.url),
    ...(slide.qrTextSlides || []).map((qrSlide) => qrSlide.bgImage),
  ].filter(Boolean);
};

// A trash item is either a single slide (legacy, no `type`) or a whole
// playlist (`type: "playlist"`) that holds its slides.
export const isPlaylistTrashItem = (item) => item?.type === "playlist";

export const getTrashItemSlides = (item) =>
  isPlaylistTrashItem(item) ? item.playlist?.slides || [] : [item];

export const getTrashItemImageUrls = (item) => [
  ...new Set(getTrashItemSlides(item).flatMap(getSlideImageUrls)),
];

const isTenantStorageUrl = (url, tenantId) =>
  typeof url === "string" &&
  url.includes("firebasestorage.googleapis.com") &&
  decodeURIComponent(url).includes(`tenants/${tenantId}/`);

/**
 * Deletes images from Storage, but only when it is safe:
 * - not used by any slide in any playlist (read fresh from Firestore),
 * - not used by any trash item that stays in the trash,
 * - not part of the media library (the library owns those files; unused
 *   ones are cleaned up there via the "ongebruikt" filter),
 * - stored in this tenant's Firebase Storage (never external URLs).
 */
export const deleteImagesIfUnused = async ({
  db,
  storage,
  tenantId,
  candidateUrls,
  excludeTrashIds = [],
}) => {
  const candidates = [...new Set(candidateUrls)].filter((url) =>
    isTenantStorageUrl(url, tenantId),
  );
  if (candidates.length === 0) return;

  const [contentSnap, trashSnap] = await Promise.all([
    getDoc(tenantDoc(db, tenantId, "display", "content")),
    getDocs(tenantCollection(db, tenantId, "trash")),
  ]);

  const usedUrls = new Set();
  const playlists = (contentSnap.exists() && contentSnap.data().playlists) || [];
  playlists.forEach((playlist) =>
    (playlist.slides || []).forEach((slide) =>
      getSlideImageUrls(slide).forEach((url) => usedUrls.add(url)),
    ),
  );
  trashSnap.docs
    .filter((trashDoc) => !excludeTrashIds.includes(trashDoc.id))
    .forEach((trashDoc) =>
      getTrashItemImageUrls(trashDoc.data()).forEach((url) =>
        usedUrls.add(url),
      ),
    );

  for (const url of candidates) {
    if (usedUrls.has(url)) continue;

    try {
      const librarySnap = await getDocs(
        query(
          tenantCollection(db, tenantId, "mediaLibrary"),
          where("url", "==", url),
        ),
      );
      if (!librarySnap.empty) continue;

      await deleteObject(ref(storage, url));
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  }
};

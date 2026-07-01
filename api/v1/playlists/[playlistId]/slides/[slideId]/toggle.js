import { authenticateRequest } from "../../../../../_lib/auth.js";
import {
  withPlaylistsTransaction,
  findPlaylist,
  findSlide,
} from "../../../../../_lib/content.js";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { tenantId } = await authenticateRequest(req);
    const { playlistId, slideId } = req.query;
    const desired = req.body?.visible;

    const result = await withPlaylistsTransaction(tenantId, (playlists) => {
      const playlist = findPlaylist(playlists, playlistId);
      const slide = findSlide(playlist, slideId);
      slide.isVisible =
        typeof desired === "boolean" ? desired : !(slide.isVisible !== false);
      return { playlists, slide };
    });

    return res.status(200).json({
      message: `The slide has been toggled to ${result.slide.isVisible}`,
    });
  } catch (err) {
    const status = err.status || 500;
    if (status === 500)
      console.error("PATCH .../slides/[slideId]/toggle failed:", err);
    return res
      .status(status)
      .json({ error: status === 500 ? "Internal server error" : err.message });
  }
}

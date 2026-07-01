import { authenticateRequest } from "../../../_lib/auth.js";
import {
  withPlaylistsTransaction,
  findPlaylist,
} from "../../../_lib/content.js";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { tenantId } = await authenticateRequest(req);
    const { playlistId } = req.query;
    const desired = req.body?.enabled;

    const result = await withPlaylistsTransaction(tenantId, (playlists) => {
      const playlist = findPlaylist(playlists, playlistId);
      playlist.isEnabled =
        typeof desired === "boolean"
          ? desired
          : !(playlist.isEnabled !== false);
      return { playlists, playlist };
    });

    return res.status(200).json({
      message: `The playlist has been toggled to ${result.playlist.isEnabled}`,
    });
  } catch (err) {
    const status = err.status || 500;
    if (status === 500)
      console.error("PATCH /api/v1/playlists/[playlistId]/toggle failed:", err);
    return res
      .status(status)
      .json({ error: status === 500 ? "Internal server error" : err.message });
  }
}

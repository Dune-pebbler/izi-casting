import { useState, useEffect, useRef } from "react";
import {
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  runTransaction,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../../firebase";
import { toast } from "sonner";
import { useTenant } from "../../context/TenantContext";
import { tenantDoc, tenantStorageRef } from "../../utils/tenantPaths";
import { hideExpiredCountdownSlides } from "../../utils/countdownUtils";

// Custom hook for playlist management
export const usePlaylistManager = () => {
  const { tenantId } = useTenant();
  const [playlists, setPlaylists] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  // Refs so save guards also work inside the snapshot listener's closure.
  const hasLoadedRef = useRef(false);
  // Number of playlists last confirmed by the Firestore server.
  const serverPlaylistCountRef = useRef(0);

  // Load playlists from Firestore
  useEffect(() => {
    const displayDocRef = tenantDoc(db, tenantId, "display", "content");

    const unsubscribe = onSnapshot(
      displayDocRef,
      { includeMetadataChanges: true },
      (doc) => {
        // A snapshot from the local cache (e.g. offline or slow connection) can
        // claim the document is empty. Never treat that as the real content,
        // otherwise the next save would overwrite every playlist.
        if (doc.metadata.fromCache) return;

        if (!doc.metadata.hasPendingWrites) {
          serverPlaylistCountRef.current = doc.exists()
            ? (doc.data().playlists || []).length
            : 0;
        }
        hasLoadedRef.current = true;

        if (doc.exists()) {
          const data = doc.data();
          if (data.playlists) {
            // Migrate existing playlists to include new properties and recalculate duration
            const migratedPlaylists = data.playlists.map((playlist) => {
              const recalculatedDuration = calculatePlaylistDuration(
                playlist.slides || [],
              );

              return {
                ...playlist,
                isEnabled: playlist.isEnabled !== false, // Default to true if not set
                repeatCount: playlist.repeatCount || 1,
                totalDuration: recalculatedDuration, // Always recalculate with new logic
              };
            });

            const { playlists: finalPlaylists, changed } =
              hideExpiredCountdownSlides(migratedPlaylists);
            setPlaylists(finalPlaylists);
            if (changed) {
              // Errors are already reported via toast in savePlaylistsToFirebase.
              savePlaylistsToFirebase(finalPlaylists).catch(() => {});
            }
          } else if (data.slides) {
            // Migrate old single playlist structure to new multiple playlists structure
            const defaultPlaylist = {
              id: "default",
              name: "Default Playlist",
              slides: data.slides || [],
              isEnabled: true,
              repeatCount: 1,
              totalDuration: calculatePlaylistDuration(data.slides || []),
            };
            setPlaylists([defaultPlaylist]);
          } else {
            setPlaylists([]);
          }
        } else {
          setPlaylists([]);
        }
        setHasLoaded(true);
      },
    );

    return () => unsubscribe();
  }, [tenantId]);

  const calculatePlaylistDuration = (slides) => {
    return slides.reduce((total, slide) => {
      const isVisible = slide.isVisible !== false;
      return isVisible ? total + (slide.duration || 5) : total;
    }, 0);
  };

  const formatDuration = (seconds) => {
    if (seconds > 60) {
      const minuten = Math.floor(seconds / 60);
      const seconden = seconds % 60;
      return `${minuten}m ${seconden}s`;
    }
    return `${seconds}s`;
  };

  const saveStats = async (playlistsToSave) => {
    const enabledPlaylists = playlistsToSave.filter((p) => p.isEnabled !== false);
    let slides = 0;
    let duration = 0;
    enabledPlaylists.forEach((p) => {
      (p.slides || []).forEach((slide) => {
        if (slide.isVisible !== false) {
          slides++;
          duration += slide.duration || 5;
        }
      });
    });
    await setDoc(
      doc(db, "tenants", tenantId),
      { stats: { playlists: enabledPlaylists.length, slides, duration } },
      { merge: true },
    );
  };

  const savePlaylistsToFirebase = async (
    playlistsToSave,
    { allowedRemovals = 0 } = {},
  ) => {
    // Safety net: only a deliberate delete may lower the playlist count (by at
    // most `allowedRemovals`), and
    // never write before the real content has been loaded.
    if (!hasLoadedRef.current) {
      const error = new Error("Playlists zijn nog niet geladen, probeer het opnieuw.");
      toast.error(error.message);
      throw error;
    }
    if (
      playlistsToSave.length <
      serverPlaylistCountRef.current - allowedRemovals
    ) {
      const error = new Error(
        `Opslaan geblokkeerd: dit zou ${serverPlaylistCountRef.current - playlistsToSave.length} playlist(s) verwijderen. Herlaad de pagina en probeer het opnieuw.`,
      );
      console.error(error.message, {
        serverCount: serverPlaylistCountRef.current,
        newCount: playlistsToSave.length,
      });
      toast.error(error.message);
      throw error;
    }

    try {
      const displayDocRef = tenantDoc(db, tenantId, "display", "content");
      await setDoc(
        displayDocRef,
        { playlists: playlistsToSave },
        { merge: true },
      );

      await saveStats(playlistsToSave);
    } catch (error) {
      console.error("Error saving playlists to Firebase:", error);
      toast.error("Error saving changes: " + error.message);
      throw error;
    }
  };

  const addPlaylist = async () => {
    if (!hasLoadedRef.current) {
      toast.error("Playlists zijn nog niet geladen, probeer het opnieuw.");
      return null;
    }

    try {
      // Append inside a transaction so we always build on what is actually
      // stored in Firestore, not on (possibly stale or empty) local state.
      const displayDocRef = tenantDoc(db, tenantId, "display", "content");
      const { newPlaylist, updatedPlaylists } = await runTransaction(
        db,
        async (transaction) => {
          const snap = await transaction.get(displayDocRef);
          const currentPlaylists =
            (snap.exists() && snap.data().playlists) || [];
          const newPlaylist = {
            id: `playlist_${Date.now()}`,
            name: `Afspeellijst ${currentPlaylists.length + 1}`,
            slides: [],
            isEnabled: false,
            repeatCount: 1,
            totalDuration: 0,
          };
          const updatedPlaylists = [...currentPlaylists, newPlaylist];
          transaction.set(
            displayDocRef,
            { playlists: updatedPlaylists },
            { merge: true },
          );
          return { newPlaylist, updatedPlaylists };
        },
      );

      await saveStats(updatedPlaylists);
      toast.success("Playlist added successfully!");
      return newPlaylist.id; // Return the new playlist ID
    } catch (error) {
      console.error("Error adding playlist:", error);
      toast.error("Error adding playlist: " + error.message);
      return null;
    }
  };

  const removePlaylist = async (playlistId) => {
    const playlistToRemove = playlists.find(
      (playlist) => playlist.id === playlistId,
    );
    const playlistName = playlistToRemove?.name || "Playlist";

    // Show loading toast
    const loadingToast = toast.loading(`Deleting ${playlistName}...`);

    try {
      // Delete all images from storage if they exist
      if (playlistToRemove && playlistToRemove.slides) {
        for (const slide of playlistToRemove.slides) {
          if (slide.imageUrl && slide.imageName) {
            try {
              const imageRef = tenantStorageRef(
                storage,
                tenantId,
                `slides/${slide.imageName}`,
              );
              await deleteObject(imageRef);
            } catch (error) {
              console.error("Error deleting image:", error);
            }
          }
        }
      }

      const updatedPlaylists = playlists.filter(
        (playlist) => playlist.id !== playlistId,
      );
      setPlaylists(updatedPlaylists);
      await savePlaylistsToFirebase(updatedPlaylists, { allowedRemovals: 1 });

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success(`${playlistName} deleted successfully!`);
    } catch (error) {
      console.error("Error deleting playlist:", error);

      // Dismiss loading toast and show error
      toast.dismiss(loadingToast);
      toast.error(`Error deleting ${playlistName}: ` + error.message);
    }
  };

  const updatePlaylistName = async (playlistId, newName) => {
    const updatedPlaylists = playlists.map((playlist) =>
      playlist.id === playlistId ? { ...playlist, name: newName } : playlist,
    );
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
  };

  const updatePlaylistRepeatCount = async (playlistId, repeatCount) => {
    const updatedPlaylists = playlists.map((playlist) =>
      playlist.id === playlistId ? { ...playlist, repeatCount } : playlist,
    );
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
  };

  const togglePlaylistEnabled = async (playlistId) => {
    const updatedPlaylists = playlists.map((playlist) =>
      playlist.id === playlistId
        ? { ...playlist, isEnabled: !playlist.isEnabled }
        : playlist,
    );
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
  };

  const copyPlaylist = async (playlistToCopy) => {
    // Create a deep copy of the playlist with new IDs for all slides
    const copiedPlaylist = {
      ...playlistToCopy,
      id: `playlist_${Date.now()}`,
      name: `${playlistToCopy.name} (Copy)`,
      isEnabled: false, // Disable copied playlist by default
      slides: playlistToCopy.slides.map((slide) => ({
        ...slide,
        id: Date.now() + Math.random(), // Ensure unique ID
        name: `${slide.name} (Copy)`,
        isVisible: false, // Disable all copied slides by default
      })),
    };

    const updatedPlaylists = [...playlists, copiedPlaylist];
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
    toast.success("Playlist copied successfully! (Disabled by default)");
  };

  const reorderPlaylists = async (newPlaylists) => {
    setPlaylists(newPlaylists);
    await savePlaylistsToFirebase(newPlaylists);
  };

  const updatePlaylistMusic = async (playlistId, musicConfig) => {
    const updatedPlaylists = playlists.map((playlist) =>
      playlist.id === playlistId
        ? { ...playlist, backgroundMusic: musicConfig }
        : playlist,
    );
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
  };

  return {
    playlists,
    hasLoaded,
    setPlaylists,
    addPlaylist,
    removePlaylist,
    updatePlaylistName,
    updatePlaylistRepeatCount,
    togglePlaylistEnabled,
    copyPlaylist,
    reorderPlaylists,
    calculatePlaylistDuration,
    formatDuration,
    savePlaylistsToFirebase,
    updatePlaylistMusic,
  };
};

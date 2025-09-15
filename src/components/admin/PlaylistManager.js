import { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { toast } from 'sonner';

// Custom hook for playlist management
export const usePlaylistManager = () => {
  const [playlists, setPlaylists] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load playlists from Firestore
  useEffect(() => {
    const displayDocRef = doc(db, 'display', 'content');
    
    const unsubscribe = onSnapshot(displayDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.playlists) {
          // Migrate existing playlists to include new properties and recalculate duration
          const migratedPlaylists = data.playlists.map(playlist => {
            const recalculatedDuration = calculatePlaylistDuration(playlist.slides || []);
            
            return {
              ...playlist,
              isEnabled: playlist.isEnabled !== false, // Default to true if not set
              repeatCount: playlist.repeatCount || 1,
              totalDuration: recalculatedDuration // Always recalculate with new logic
            };
          });
          setPlaylists(migratedPlaylists);
        } else if (data.slides) {
          // Migrate old single playlist structure to new multiple playlists structure
          const defaultPlaylist = {
            id: 'default',
            name: 'Default Playlist',
            slides: data.slides || [],
            isEnabled: true,
            repeatCount: 1,
            totalDuration: calculatePlaylistDuration(data.slides || [])
          };
          setPlaylists([defaultPlaylist]);
        } else {
          setPlaylists([]);
        }
      } else {
        setPlaylists([]);
      }
      setHasLoaded(true);
    });

    return () => unsubscribe();
  }, []);


  const calculatePlaylistDuration = (slides) => {
    const totalDuration = slides.reduce((total, slide) => {
      const slideDuration = slide.duration || 5;
      const isVisible = slide.isVisible !== false; // Default to true if not set
      
      // Only add duration if slide is visible
      if (isVisible) {
        return total + slideDuration;
      } else {
        return total;
      }
    }, 0);
    
    return totalDuration;
  };

  const savePlaylistsToFirebase = async (playlistsToSave) => {
    try {
      const displayDocRef = doc(db, 'display', 'content');
      console.log('Saving playlists to Firebase:', playlistsToSave.map(p => ({ id: p.id, slideCount: p.slides.length })));
      await setDoc(displayDocRef, { playlists: playlistsToSave }, { merge: true });
      console.log('Playlists saved to Firebase successfully');
      toast.success('Changes saved successfully!');
    } catch (error) {
      console.error('Error saving playlists to Firebase:', error);
      toast.error('Error saving changes: ' + error.message);
      throw error;
    }
  };

  const addPlaylist = async () => {
    const newPlaylist = {
      id: `playlist_${Date.now()}`,
      name: `Afspeellijst ${playlists.length + 1}`,
      slides: [],
      isEnabled: true,
      repeatCount: 1,
      totalDuration: 0
    };
    const updatedPlaylists = [...playlists, newPlaylist];
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
    toast.success('Playlist added successfully!');
    return newPlaylist.id; // Return the new playlist ID
  };

  const removePlaylist = async (playlistId) => {
    const playlistToRemove = playlists.find(playlist => playlist.id === playlistId);
    const playlistName = playlistToRemove?.name || 'Playlist';
    
    // Show loading toast
    const loadingToast = toast.loading(`Deleting ${playlistName}...`);

    try {
      // Delete all images from storage if they exist
      if (playlistToRemove && playlistToRemove.slides) {
        for (const slide of playlistToRemove.slides) {
          if (slide.imageUrl && slide.imageName) {
            try {
              const imageRef = ref(storage, `slides/${slide.imageName}`);
              await deleteObject(imageRef);
            } catch (error) {
              console.error('Error deleting image:', error);
            }
          }
        }
      }
      
      const updatedPlaylists = playlists.filter(playlist => playlist.id !== playlistId);
      setPlaylists(updatedPlaylists);
      await savePlaylistsToFirebase(updatedPlaylists);
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success(`${playlistName} deleted successfully!`);
    } catch (error) {
      console.error('Error deleting playlist:', error);
      
      // Dismiss loading toast and show error
      toast.dismiss(loadingToast);
      toast.error(`Error deleting ${playlistName}: ` + error.message);
    }
  };

  const updatePlaylistName = async (playlistId, newName) => {
    const updatedPlaylists = playlists.map(playlist => 
      playlist.id === playlistId ? { ...playlist, name: newName } : playlist
    );
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
  };

  const updatePlaylistRepeatCount = async (playlistId, repeatCount) => {
    const updatedPlaylists = playlists.map(playlist => 
      playlist.id === playlistId 
        ? { ...playlist, repeatCount }
        : playlist
    );
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
  };

  const togglePlaylistEnabled = async (playlistId) => {
    const updatedPlaylists = playlists.map(playlist => 
      playlist.id === playlistId ? { ...playlist, isEnabled: !playlist.isEnabled } : playlist
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
      slides: playlistToCopy.slides.map(slide => ({
        ...slide,
        id: Date.now() + Math.random(), // Ensure unique ID
        name: `${slide.name} (Copy)`,
        isVisible: false // Disable all copied slides by default
      }))
    };
    
    const updatedPlaylists = [...playlists, copiedPlaylist];
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
    toast.success('Playlist copied successfully! (Disabled by default)');
  };

  const reorderPlaylists = async (newPlaylists) => {
    setPlaylists(newPlaylists);
    await savePlaylistsToFirebase(newPlaylists);
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
    savePlaylistsToFirebase
  };
};

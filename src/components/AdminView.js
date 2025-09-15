import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { sanitizeHTMLContent } from '../utils/sanitize';
import { GripVertical, Copy, Trash2, Eye, EyeOff, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setDeviceToDelete, clearDeviceToDelete, setIsSidebarCollapsed } from '../store/slices/deviceSlice';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SlideList from './admin/SlideList';
import EditModal from './admin/EditModal';
import Sidebar from './admin/sidebar/Sidebar';

function AdminView() {
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [modalText, setModalText] = useState('');
  const [modalTinyMCEContent, setModalTinyMCEContent] = useState('');
  const [imagePosition, setImagePosition] = useState('center'); // Default position
  const [slideLayout, setSlideLayout] = useState('side-by-side'); // 'side-by-side', 'image-only', 'text-over-image'
  const [modalSlideName, setModalSlideName] = useState('');
  const [modalSlideDuration, setModalSlideDuration] = useState(5);
  const [modalShowBar, setModalShowBar] = useState(true);
  const [editingPlaylistNameId, setEditingPlaylistNameId] = useState(null);
  const [editingPlaylistName, setEditingPlaylistName] = useState('');
  const [expandedPlaylists, setExpandedPlaylists] = useState(new Set());
  const [currentEditingPlaylistId, setCurrentEditingPlaylistId] = useState(null);
  const [editingPlaylistRepeatCount, setEditingPlaylistRepeatCount] = useState(1);
  const [editingPlaylistRepeatCountId, setEditingPlaylistRepeatCountId] = useState(null);
  const [playlistToDelete, setPlaylistToDelete] = useState(null);
  
  // Redux hooks
  const dispatch = useAppDispatch();
  const deviceToDelete = useAppSelector((state) => state.device.deviceToDelete);
  const isSidebarCollapsed = useAppSelector((state) => state.device.isSidebarCollapsed);

  // Toggle sidebar collapse
  const toggleSidebarCollapse = () => {
    dispatch(setIsSidebarCollapsed(!isSidebarCollapsed));
  };

  // Load playlists from Firestore
  useEffect(() => {
    const displayDocRef = doc(db, 'display', 'content');
    
    const unsubscribe = onSnapshot(displayDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.playlists) {
          // Migrate existing playlists to include new properties
          const migratedPlaylists = data.playlists.map(playlist => ({
            ...playlist,
            isEnabled: playlist.isEnabled !== false, // Default to true if not set
            repeatCount: playlist.repeatCount || 1,
            totalDuration: playlist.totalDuration || calculatePlaylistDuration(playlist.slides || [])
          }));
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

  const confirmDeletePlaylist = (playlist) => {
    setPlaylistToDelete(playlist);
  };

  const handleDeletePlaylist = async () => {
    if (playlistToDelete) {
      await removePlaylist(playlistToDelete.id);
      setPlaylistToDelete(null);
    }
  };

  const updatePlaylistName = async (playlistId, newName) => {
    const updatedPlaylists = playlists.map(playlist => 
      playlist.id === playlistId ? { ...playlist, name: newName } : playlist
    );
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
  };

  const startEditingPlaylistName = (playlistId, currentName) => {
    setEditingPlaylistNameId(playlistId);
    setEditingPlaylistName(currentName);
  };

  const savePlaylistName = async () => {
    if (editingPlaylistNameId && editingPlaylistName.trim()) {
      await updatePlaylistName(editingPlaylistNameId, editingPlaylistName.trim());
    }
    setEditingPlaylistNameId(null);
    setEditingPlaylistName('');
  };

  const cancelEditingPlaylistName = () => {
    setEditingPlaylistNameId(null);
    setEditingPlaylistName('');
  };

  const handlePlaylistNameKeyPress = (e) => {
    if (e.key === 'Enter') {
      savePlaylistName();
    } else if (e.key === 'Escape') {
      cancelEditingPlaylistName();
    }
  };

  const startEditingPlaylistRepeatCount = (playlistId, currentRepeatCount) => {
    setEditingPlaylistRepeatCountId(playlistId);
    setEditingPlaylistRepeatCount(currentRepeatCount || 1);
  };

  const savePlaylistRepeatCount = async () => {
    if (editingPlaylistRepeatCountId && editingPlaylistRepeatCount > 0) {
      const updatedPlaylists = playlists.map(playlist => 
        playlist.id === editingPlaylistRepeatCountId 
          ? { ...playlist, repeatCount: editingPlaylistRepeatCount }
          : playlist
      );
      setPlaylists(updatedPlaylists);
      await savePlaylistsToFirebase(updatedPlaylists);
    }
    setEditingPlaylistRepeatCountId(null);
    setEditingPlaylistRepeatCount(1);
  };

  const cancelEditingPlaylistRepeatCount = () => {
    setEditingPlaylistRepeatCountId(null);
    setEditingPlaylistRepeatCount(1);
  };

  const handlePlaylistRepeatCountKeyPress = (e) => {
    if (e.key === 'Enter') {
      savePlaylistRepeatCount();
    } else if (e.key === 'Escape') {
      cancelEditingPlaylistRepeatCount();
    }
  };

  const togglePlaylistExpansion = (playlistId) => {
    const newExpanded = new Set(expandedPlaylists);
    if (newExpanded.has(playlistId)) {
      newExpanded.delete(playlistId);
    } else {
      newExpanded.add(playlistId);
    }
    setExpandedPlaylists(newExpanded);
  };

  const isPlaylistExpanded = (playlistId) => {
    return expandedPlaylists.has(playlistId);
  };

  const addSlide = async (playlistId) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    const newSlide = {
      id: Date.now(),
      name: `Slide ${playlist.slides.length + 1}`,
      type: 'text', // 'text' or 'image'
      text: '',
      imageUrl: '',
      imageName: '',
      imagePosition: 'center',
      layout: 'side-by-side', // 'side-by-side', 'image-only', 'text-over-image'
      isVisible: true,
      showBar: true
    };
    
    const updatedPlaylists = playlists.map(p => {
      if (p.id === playlistId) {
        const newSlides = [...p.slides, newSlide];
        const totalDuration = calculatePlaylistDuration(newSlides);
        return { ...p, slides: newSlides, totalDuration };
      }
      return p;
    });
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
    toast.success('Slide added successfully!');
  };

  const copySlide = async (slideToCopy, playlistId) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    // Create a deep copy of the slide with a new ID
    const copiedSlide = {
      ...slideToCopy,
      id: Date.now(),
      name: `${slideToCopy.name} (Copy)`,
      isVisible: true
    };
    
    const updatedPlaylists = playlists.map(p => {
      if (p.id === playlistId) {
        const newSlides = [...p.slides, copiedSlide];
        const totalDuration = calculatePlaylistDuration(newSlides);
        return { ...p, slides: newSlides, totalDuration };
      }
      return p;
    });
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
    toast.success('Slide copied successfully!');
  };

  const copyPlaylist = async (playlistToCopy) => {
    // Create a deep copy of the playlist with new IDs for all slides
    const copiedPlaylist = {
      ...playlistToCopy,
      id: `playlist_${Date.now()}`,
      name: `${playlistToCopy.name} (Copy)`,
      slides: playlistToCopy.slides.map(slide => ({
        ...slide,
        id: Date.now() + Math.random(), // Ensure unique ID
        name: `${slide.name} (Copy)`
      }))
    };
    
    const updatedPlaylists = [...playlists, copiedPlaylist];
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
    toast.success('Playlist copied successfully!');
  };

  const deleteSlide = async (slideId, playlistId) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    const slideToDelete = playlist.slides.find(s => s.id === slideId);
    const slideName = slideToDelete?.name || 'Slide';

    // Show loading toast
    const loadingToast = toast.loading(`Deleting ${slideName}...`);

    try {
      // Delete image from storage if it exists
      if (slideToDelete && slideToDelete.imageUrl && slideToDelete.imageName) {
        try {
          const imageRef = ref(storage, `slides/${slideToDelete.imageName}`);
          await deleteObject(imageRef);
        } catch (error) {
          console.error('Error deleting image:', error);
        }
      }
      
      const updatedPlaylists = playlists.map(p => 
        p.id === playlistId 
          ? { ...p, slides: p.slides.filter(s => s.id !== slideId) }
          : p
      );
      setPlaylists(updatedPlaylists);
      await savePlaylistsToFirebase(updatedPlaylists);
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success(`${slideName} deleted successfully!`);
      
      closeEditModal();
    } catch (error) {
      console.error('Error deleting slide:', error);
      
      // Dismiss loading toast and show error
      toast.dismiss(loadingToast);
      toast.error(`Error deleting ${slideName}: ` + error.message);
    }
  };

  const openEditModal = (slide, playlistId) => {
    setEditingSlide(slide);
    setCurrentEditingPlaylistId(playlistId);
    setModalText(slide.text || '');
    setModalTinyMCEContent(slide.tinyMCEContent || slide.text || '');
    setModalImageUrl(slide.imageUrl || '');
    setImagePosition(slide.imagePosition || 'center');
    setSlideLayout(slide.layout || 'side-by-side');
    setModalSlideName(slide.name || '');
    setModalSlideDuration(slide.duration || 5);
    setModalShowBar(slide.showBar !== false); // Default to true if not set
  };

  const closeEditModal = () => {
    setEditingSlide(null);
    setCurrentEditingPlaylistId(null);
    setModalText('');
    setModalTinyMCEContent('');
    setModalImageUrl('');
    setImagePosition('center');
    setSlideLayout('side-by-side');
    setModalSlideName('');
    setModalSlideDuration(5);
    setModalShowBar(true);
  };

  const handlePositionChange = (position) => {
    setImagePosition(position);
  };

  const handleSlideNameChange = (name) => {
    setModalSlideName(name);
  };

  const handleContentChange = (content) => {
    console.log('Content changed:', content);
    setModalTinyMCEContent(content);
  };

  const handleModalImageUpload = async (file) => {
    // If file is null, clear the image
    if (!file) {
      setModalImageUrl('');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Image file size must be less than 5MB.');
      return;
    }

    setUploadingImage(true);
    
    // Show loading toast
    const loadingToast = toast.loading('Uploading image...');
    
    try {
      // Create a unique filename
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `slides/${fileName}`);

      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      setModalImageUrl(downloadURL);
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      
      // Dismiss loading toast and show error
      toast.dismiss(loadingToast);
      toast.error('Error uploading image: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const saveModalChanges = async () => {
    console.log('saveModalChanges called');
    console.log('editingSlide:', editingSlide);
    console.log('currentEditingPlaylistId:', currentEditingPlaylistId);
    console.log('modalTinyMCEContent:', modalTinyMCEContent);
    console.log('modalSlideName:', modalSlideName);
    console.log('modalSlideDuration:', modalSlideDuration);
    console.log('modalImageUrl:', modalImageUrl);
    console.log('imagePosition:', imagePosition);
    console.log('slideLayout:', slideLayout);
    
    if (!editingSlide || !currentEditingPlaylistId) {
      console.log('Early return - missing editingSlide or currentEditingPlaylistId');
      return;
    }

    const updatedPlaylists = playlists.map(playlist => {
      if (playlist.id === currentEditingPlaylistId) {
        const updatedSlides = playlist.slides.map(slide => {
          if (slide.id === editingSlide.id) {
            const updatedSlide = {
              ...slide,
              name: modalSlideName,
              text: sanitizeHTMLContent(modalTinyMCEContent),
              tinyMCEContent: modalTinyMCEContent,
              imageUrl: modalImageUrl,
              type: modalImageUrl ? 'image' : 'text',
              imagePosition: imagePosition,
              layout: slideLayout,
              duration: modalSlideDuration === '' ? 5 : modalSlideDuration,
              showBar: modalShowBar
            };
            console.log('Updated slide with duration:', updatedSlide.duration);
            console.log('Updated slide:', updatedSlide);
            return updatedSlide;
          }
          return slide;
        });
        const totalDuration = calculatePlaylistDuration(updatedSlides);
        return { ...playlist, slides: updatedSlides, totalDuration };
      }
      return playlist;
    });

    console.log('Updated playlists:', updatedPlaylists);
    setPlaylists(updatedPlaylists);
    
    // Show loading toast
    const loadingToast = toast.loading('Saving slide changes...');
    
    // Immediately save to Firebase
    try {
      const displayDocRef = doc(db, 'display', 'content');
      console.log('Saving to Firebase...');
      await setDoc(displayDocRef, { playlists: updatedPlaylists }, { merge: true });
      console.log('Modal changes saved to Firebase successfully');
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success('Slide saved successfully!');
      
      // Close the modal after successful save
      closeEditModal();
    } catch (error) {
      console.error('Error saving modal changes to Firebase:', error);
      
      // Dismiss loading toast and show error
      toast.dismiss(loadingToast);
      toast.error('Error saving slide: ' + error.message);
    }
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

  const updateSlideText = async (playlistId, slideId, text) => {
    const updatedPlaylists = playlists.map(playlist => {
      if (playlist.id === playlistId) {
        const updatedSlides = playlist.slides.map(slide => 
          slide.id === slideId ? { ...slide, text } : slide
        );
        return { ...playlist, slides: updatedSlides };
      }
      return playlist;
    });
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
  };

  const updateSlideType = async (playlistId, slideId, type) => {
    const updatedPlaylists = playlists.map(playlist => {
      if (playlist.id === playlistId) {
        const updatedSlides = playlist.slides.map(slide => 
          slide.id === slideId ? { 
            ...slide, 
            type, 
            text: type === 'image' ? '' : slide.text, 
            imageUrl: type === 'text' ? '' : slide.imageUrl,
            imagePosition: type === 'image' ? (slide.imagePosition || 'center') : slide.imagePosition
          } : slide
        );
        return { ...playlist, slides: updatedSlides };
      }
      return playlist;
    });
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
  };

  const removeSlide = async (playlistId, slideId) => {
    const playlist = playlists.find(p => p.id === playlistId);
    const slideToRemove = playlist?.slides.find(slide => slide.id === slideId);
    const slideName = slideToRemove?.name || 'Slide';
    
    // Show loading toast
    const loadingToast = toast.loading(`Removing ${slideName}...`);

    try {
      // Delete image from storage if it exists
      if (slideToRemove && slideToRemove.imageUrl && slideToRemove.imageName) {
        try {
          const imageRef = ref(storage, `slides/${slideToRemove.imageName}`);
          await deleteObject(imageRef);
        } catch (error) {
          console.error('Error deleting image:', error);
        }
      }
      
      const updatedPlaylists = playlists.map(playlist => {
        if (playlist.id === playlistId) {
          const newSlides = playlist.slides.filter(slide => slide.id !== slideId);
          const totalDuration = calculatePlaylistDuration(newSlides);
          return { ...playlist, slides: newSlides, totalDuration };
        }
        return playlist;
      });
      setPlaylists(updatedPlaylists);
      await savePlaylistsToFirebase(updatedPlaylists);
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success(`${slideName} removed successfully!`);
    } catch (error) {
      console.error('Error removing slide:', error);
      
      // Dismiss loading toast and show error
      toast.dismiss(loadingToast);
      toast.error(`Error removing ${slideName}: ` + error.message);
    }
  };

  const toggleSlideVisibility = async (playlistId, slideId) => {
    const updatedPlaylists = playlists.map(playlist => {
      if (playlist.id === playlistId) {
        const updatedSlides = playlist.slides.map(slide => 
          slide.id === slideId ? { ...slide, isVisible: !slide.isVisible } : slide
        );
        return { ...playlist, slides: updatedSlides };
      }
      return playlist;
    });
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

  const handleImageUpload = async (playlistId, slideId, file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Image file size must be less than 5MB.');
      return;
    }

    setUploadingImage(true);
    
    // Show loading toast
    const loadingToast = toast.loading('Uploading image...');
    
    try {
      // Create a unique filename
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `slides/${fileName}`);

      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update the slide with the image URL
      const updatedPlaylists = playlists.map(playlist => {
        if (playlist.id === playlistId) {
          const updatedSlides = playlist.slides.map(slide => 
            slide.id === slideId ? { 
              ...slide, 
              imageUrl: downloadURL, 
              imageName: fileName,
              type: 'image',
              imagePosition: slide.imagePosition || 'center' // Preserve existing position or set default
            } : slide
          );
          return { ...playlist, slides: updatedSlides };
        }
        return playlist;
      });
      setPlaylists(updatedPlaylists);
      await savePlaylistsToFirebase(updatedPlaylists);
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      
      // Dismiss loading toast and show error
      toast.dismiss(loadingToast);
      toast.error('Error uploading image: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = async (playlistId, slideId) => {
    const playlist = playlists.find(p => p.id === playlistId);
    const slide = playlist?.slides.find(slide => slide.id === slideId);
    
    if (slide && slide.imageUrl && slide.imageName) {
      // Show loading toast
      const loadingToast = toast.loading('Removing image...');
      
      try {
        const imageRef = ref(storage, `slides/${slide.imageName}`);
        await deleteObject(imageRef);
        
        const updatedPlaylists = playlists.map(playlist => {
          if (playlist.id === playlistId) {
            const updatedSlides = playlist.slides.map(s => 
              s.id === slideId ? { ...s, imageUrl: '', imageName: '', type: 'text' } : s
            );
            return { ...playlist, slides: updatedSlides };
          }
          return playlist;
        });
        setPlaylists(updatedPlaylists);
        await savePlaylistsToFirebase(updatedPlaylists);
        
        // Dismiss loading toast and show success
        toast.dismiss(loadingToast);
        toast.success('Image removed successfully!');
      } catch (error) {
        console.error('Error removing image:', error);
        
        // Dismiss loading toast and show error
        toast.dismiss(loadingToast);
        toast.error('Error removing image: ' + error.message);
      }
    }
  };

  const reorderSlides = async (playlistId, newSlides) => {
    const updatedPlaylists = playlists.map(playlist => {
      if (playlist.id === playlistId) {
        const totalDuration = newSlides.reduce((total, slide) => total + (slide.duration || 5), 0);
        return { ...playlist, slides: newSlides, totalDuration };
      }
      return playlist;
    });
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
  };

  const calculatePlaylistDuration = (slides) => {
    return slides.reduce((total, slide) => total + (slide.duration || 5), 0);
  };

  const reorderPlaylists = async (newPlaylists) => {
    setPlaylists(newPlaylists);
    await savePlaylistsToFirebase(newPlaylists);
  };

  const deleteDevice = async (deviceId) => {
    try {
      // Instead of deleting the device document, set both isPaired and isLinked to false
      // This allows the display to detect the change and go back to pairing mode
      await setDoc(doc(db, 'devices', deviceId), {
        isPaired: false,
        isLinked: false,
        unpairedAt: new Date().toISOString()
      }, { merge: true });
      
      dispatch(clearDeviceToDelete());
      toast.success('Apparaat succesvol ontkoppeld');
    } catch (error) {
      console.error('Error removing device:', error);
      toast.error('Fout bij het ontkoppelen van apparaat');
    }
  };

  const savePlaylists = async () => {
    setIsLoading(true);
    
    // Show loading toast
    const loadingToast = toast.loading('Saving playlists...');
    
    try {
      const displayDocRef = doc(db, 'display', 'content');
      console.log('Saving playlists to Firebase:', playlists.map(p => ({ id: p.id, slideCount: p.slides.length })));
      await setDoc(displayDocRef, { playlists }, { merge: true });
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success('Playlists saved successfully!');
    } catch (error) {
      console.error('Error saving playlists:', error);
      
      // Dismiss loading toast and show error
      toast.dismiss(loadingToast);
      toast.error('Error saving playlists: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // SortablePlaylistHeader component
  const SortablePlaylistHeader = ({ playlist, index }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: playlist.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div 
        ref={setNodeRef}
        style={style}
        className={`admin-content-wrapper ${isDragging ? 'dragging' : ''} ${isPlaylistExpanded(playlist.id) ? 'expanded' : ''}`}
      >
        <div className="playlist-header" onClick={() => togglePlaylistExpansion(playlist.id)}>
          <div className="playlist-header-left">
            <div className="playlist-drag-handle" {...attributes} {...listeners}>
              <GripVertical size={18} />
            </div>
            {editingPlaylistNameId === playlist.id ? (
              <input
                type="text"
                value={editingPlaylistName}
                onChange={(e) => setEditingPlaylistName(e.target.value)}
                onBlur={savePlaylistName}
                onKeyPress={handlePlaylistNameKeyPress}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                className="playlist-title-input"
              />
            ) : (
              <h2 className="playlist-title" onClick={(e) => {
                e.stopPropagation();
                startEditingPlaylistName(playlist.id, playlist.name);
              }}>
                {playlist.name}
              </h2>
            )}
          </div>
          <div className="playlist-actions" onClick={(e) => e.stopPropagation()}>
            <div className="playlist-info">
              <div className="playlist-duration">
                <span className="duration-label">Total:</span>
                <span className="duration-value">{playlist.totalDuration || calculatePlaylistDuration(playlist.slides)}s</span>
              </div>
              <div className="playlist-repeat-count">
                <span className="repeat-label">×</span>
                {editingPlaylistRepeatCountId === playlist.id ? (
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editingPlaylistRepeatCount}
                    onChange={(e) => setEditingPlaylistRepeatCount(parseInt(e.target.value) || 1)}
                    onBlur={savePlaylistRepeatCount}
                    onKeyPress={handlePlaylistRepeatCountKeyPress}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="repeat-count-input"
                  />
                ) : (
                  <span 
                    className="repeat-count-display"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditingPlaylistRepeatCount(playlist.id, playlist.repeatCount || 1);
                    }}
                  >
                    {playlist.repeatCount || 1}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlaylistEnabled(playlist.id);
              }}
              className={`playlist-toggle-btn ${playlist.isEnabled !== false ? 'enabled' : 'disabled'}`}
              title={playlist.isEnabled !== false ? 'Disable playlist' : 'Enable playlist'}
            >
              {playlist.isEnabled !== false ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyPlaylist(playlist);
              }}
              className="copy-playlist-btn"
              title="Copy playlist"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                confirmDeletePlaylist(playlist);
              }}
              className="delete-playlist-btn"
              title="Delete playlist"
            >
              <Trash2 size={16} />
            </button>
            <div className="playlist-expand-icon">
              <svg 
                className={`expand-arrow ${isPlaylistExpanded(playlist.id) ? 'expanded' : ''}`}
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <polyline points="6,9 12,15 18,9"></polyline>
              </svg>
            </div>
          </div>
        </div>

        {/* Collapsible Slides Container */}
        <div className={`playlist-slides-container ${isPlaylistExpanded(playlist.id) ? 'expanded' : ''}`}>
          <SlideList 
            slides={playlist.slides}
            onEditSlide={(slide) => openEditModal(slide, playlist.id)}
            onUpdateSlideType={(slideId, type) => updateSlideType(playlist.id, slideId, type)}
            onToggleSlideVisibility={(slideId) => toggleSlideVisibility(playlist.id, slideId)}
            onRemoveSlide={(slideId) => removeSlide(playlist.id, slideId)}
            onImageUpload={(slideId, file) => handleImageUpload(playlist.id, slideId, file)}
            onRemoveImage={(slideId) => removeImage(playlist.id, slideId)}
            uploadingImage={uploadingImage}
            onCopySlide={(slide) => copySlide(slide, playlist.id)}
            onReorderSlides={(newSlides) => reorderSlides(playlist.id, newSlides)}
            onAddSlide={() => addSlide(playlist.id)}
          />
        </div>
      </div>
    );
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const playlistIds = useMemo(() => playlists.map(playlist => playlist.id), [playlists]);

  const handlePlaylistDragEnd = useCallback((event) => {
    const { active, over } = event;
    console.log('Playlist drag end:', { active, over });

    if (active.id !== over?.id) {
      const oldIndex = playlists.findIndex(playlist => playlist.id === active.id);
      const newIndex = playlists.findIndex(playlist => playlist.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newPlaylists = arrayMove(playlists, oldIndex, newIndex);
        reorderPlaylists(newPlaylists);
      }
    }
  }, [playlists, reorderPlaylists]);

  const handlePlaylistDragStart = useCallback((event) => {
    console.log('Playlist drag start:', event);
  }, []);

  return (
    <div className={`admin-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Fixed Left Sidebar */}
      <Sidebar 
        setDeviceToDelete={(device) => dispatch(setDeviceToDelete(device))}
        deleteDevice={deleteDevice}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      {/* Main Content Area */}
      <div className="admin-main-content">
        {/* Add Playlist Button */}
        <div className="admin-header-section">
          <h1 className="admin-header">Afspeellijsten ({playlists.length})</h1>
        </div>

        {/* Playlists */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handlePlaylistDragEnd}
          onDragStart={handlePlaylistDragStart}
        >
          <SortableContext
            items={playlistIds}
            strategy={verticalListSortingStrategy}
          >
            {playlists.map((playlist, index) => (
              <SortablePlaylistHeader
                key={playlist.id}
                playlist={playlist}
                index={index}
              />
            ))}
          </SortableContext>
          
          {/* Add Playlist Button */}
          <div className="add-playlist-button" onClick={addPlaylist}>
            <div className="add-playlist-content">
              <Plus size={24} />
              <span>Add Playlist</span>
            </div>
          </div>
        </DndContext>
      </div>

      {/* Edit Modal */}
      {editingSlide && (
        <EditModal
          slide={editingSlide}
          modalImageUrl={modalImageUrl}
          modalTinyMCEContent={modalTinyMCEContent}
          imagePosition={imagePosition}
          slideLayout={slideLayout}
          uploadingImage={uploadingImage}
          slideName={modalSlideName}
          slideDuration={modalSlideDuration}
          showBar={modalShowBar}
          onClose={closeEditModal}
          onSave={saveModalChanges}
          onDelete={() => deleteSlide(editingSlide.id, currentEditingPlaylistId)}
          onImageUpload={handleModalImageUpload}
          onPositionChange={handlePositionChange}
          onLayoutChange={setSlideLayout}
          onContentChange={handleContentChange}
          onSlideNameChange={handleSlideNameChange}
          onDurationChange={setModalSlideDuration}
          onShowBarChange={setModalShowBar}
        />
      )}

      {/* Unpair Confirmation Modal */}
      {deviceToDelete && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <h3>Apparaat ontkoppelen</h3>
            <p>
              Weet je zeker dat je <strong>{deviceToDelete.customName || `Display ${deviceToDelete.id.substring(0, 8)}`}</strong> wilt ontkoppelen?
            </p>
            <p className="delete-warning">
              Dit apparaat zal niet meer gekoppeld zijn en moet opnieuw gekoppeld worden om content te tonen.
            </p>
            <div className="delete-modal-actions">
              <button
                onClick={() => dispatch(clearDeviceToDelete())}
                className="btn btn-secondary"
              >
                Annuleren
              </button>
              <button
                onClick={() => deleteDevice(deviceToDelete.id)}
                className="btn btn-danger"
              >
                Ontkoppelen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Playlist Deletion Confirmation Modal */}
      {playlistToDelete && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <h3>Playlist verwijderen</h3>
            <p>
              Weet je zeker dat je <strong>{playlistToDelete.name}</strong> wilt verwijderen?
            </p>
            <p className="delete-warning">
              Deze actie kan niet ongedaan worden gemaakt. Alle slides en afbeeldingen in deze playlist zullen permanent worden verwijderd.
            </p>
            <div className="delete-modal-actions">
              <button
                onClick={() => setPlaylistToDelete(null)}
                className="btn btn-secondary"
              >
                Annuleren
              </button>
              <button
                onClick={handleDeletePlaylist}
                className="btn btn-danger"
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminView;

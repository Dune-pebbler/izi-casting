import React, { useState, useMemo, useEffect } from 'react';
import { doc, setDoc, getDoc, addDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { sanitizeHTMLContent } from '../../utils/sanitize';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setDeviceToDelete, clearDeviceToDelete, setIsSidebarCollapsed } from '../../store/slices/deviceSlice';
import { usePlaylistManager } from './PlaylistManager';
import PlaylistList from './PlaylistList';
import EditModal from './slide-edit/EditModal';
import MoveSlideModal from './MoveSlideModal';
import ImageLibraryModal from './modal/ImageLibraryModal';
import Sidebar from './sidebar/Sidebar';
import { Monitor, Clock, X, Settings } from 'lucide-react';

function AdminView() {
  // Playlist management hook
  const {
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
  } = usePlaylistManager();

  // Modal and editing state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [modalTinyMCEContent, setModalTinyMCEContent] = useState('');
  const [imagePosition, setImagePosition] = useState('center');
  const [slideLayout, setSlideLayout] = useState('side-by-side');
  const [modalSlideName, setModalSlideName] = useState('');
  const [modalSlideDuration, setModalSlideDuration] = useState(5);
  const [modalShowBar, setModalShowBar] = useState(true);
  const [modalVideoUrl, setModalVideoUrl] = useState('');
  const [modalImageSide, setModalImageSide] = useState('left');
  const [modalSlideTransition, setModalSlideTransition] = useState('fade');
  const [modalTeletekstChannel, setModalTeletekstChannel] = useState('101');
  const [modalTeletekstTheme, setModalTeletekstTheme] = useState('classic');
  const [currentEditingPlaylistId, setCurrentEditingPlaylistId] = useState(null);
  const [slideToDelete, setSlideToDelete] = useState(null);
  const [defaultSlideTransition, setDefaultSlideTransition] = useState('fade');
  const [enabledFonts, setEnabledFonts] = useState([]);

  // Playlist editing state
  const [editingPlaylistNameId, setEditingPlaylistNameId] = useState(null);
  const [editingPlaylistName, setEditingPlaylistName] = useState('');
  const [expandedPlaylists, setExpandedPlaylists] = useState(new Set());
  const [editingPlaylistRepeatCount, setEditingPlaylistRepeatCount] = useState(1);
  const [editingPlaylistRepeatCountId, setEditingPlaylistRepeatCountId] = useState(null);
  const [playlistToDelete, setPlaylistToDelete] = useState(null);
  
  // Move slide modal state
  const [moveSlideModalOpen, setMoveSlideModalOpen] = useState(false);
  const [slideToMove, setSlideToMove] = useState(null);
  const [currentPlaylistId, setCurrentPlaylistId] = useState(null);

  // Image library modal state
  const [imageLibraryModalOpen, setImageLibraryModalOpen] = useState(false);
  
  // Redux hooks
  const dispatch = useAppDispatch();
  const deviceToDelete = useAppSelector((state) => state.device.deviceToDelete);
  const isSidebarCollapsed = useAppSelector((state) => state.device.isSidebarCollapsed);

  // Load default slide transition and enabled fonts from settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, "display", "settings"));
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          setDefaultSlideTransition(settings.defaultSlideTransition || 'fade');
          setEnabledFonts(settings.enabledFonts || []);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };

    loadSettings();
  }, []);

  // Calculate total statistics across all playlists
  const totalStats = useMemo(() => {
    let totalSlides = 0;
    let activeSlides = 0;
    let totalDuration = 0;

    playlists.forEach(playlist => {
      const isPlaylistEnabled = playlist.isEnabled !== false;
      
      if (playlist.slides && isPlaylistEnabled) {
        const playlistSlides = playlist.slides.length;
        const playlistActiveSlides = playlist.slides.filter(slide => slide.isVisible !== false).length;
        const playlistDuration = calculatePlaylistDuration(playlist.slides);
        
        totalSlides += playlistSlides;
        activeSlides += playlistActiveSlides;
        totalDuration += playlistDuration;
      }
    });

    return { totalSlides, activeSlides, totalDuration };
  }, [playlists, calculatePlaylistDuration]);

  // Toggle sidebar collapse
  const toggleSidebarCollapse = () => {
    dispatch(setIsSidebarCollapsed(!isSidebarCollapsed));
  };

  // Playlist editing handlers
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
      await updatePlaylistRepeatCount(editingPlaylistRepeatCountId, editingPlaylistRepeatCount);
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

  const handleAddPlaylist = async () => {
    const newPlaylistId = await addPlaylist();
    if (newPlaylistId) {
      // Automatically expand the newly created playlist
      const newExpanded = new Set(expandedPlaylists);
      newExpanded.add(newPlaylistId);
      setExpandedPlaylists(newExpanded);
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

  // Slide management handlers
  const addSlide = async (playlistId) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    // Fetch the latest settings (default transition and enabled fonts)
    let currentDefaultTransition = defaultSlideTransition;
    let currentEnabledFonts = enabledFonts;
    try {
      const settingsDoc = await getDoc(doc(db, "display", "settings"));
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        currentDefaultTransition = settings.defaultSlideTransition || 'fade';
        currentEnabledFonts = settings.enabledFonts || [];
        setDefaultSlideTransition(currentDefaultTransition);
        setEnabledFonts(currentEnabledFonts);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }

    const newSlide = {
      id: Date.now(),
      name: `Slide ${playlist.slides.length + 1}`,
      type: 'text',
      text: '',
      imageUrl: '',
      imageName: '',
      imagePosition: 'center',
      layout: 'side-by-side',
      isVisible: false,
      showBar: true,
      transition: currentDefaultTransition
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

    const copiedSlide = {
      ...slideToCopy,
      id: Date.now(),
      name: `${slideToCopy.name} (Copy)`,
      isVisible: false // Disable copied slide by default
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
    toast.success('Slide copied successfully! (Disabled by default)');
  };

  const deleteSlide = async (slideId, playlistId) => {
    console.log('deleteSlide called with:', { slideId, playlistId });
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) {
      console.log('Playlist not found');
      return;
    }

    const slideToDelete = playlist.slides.find(s => s.id === slideId);
    console.log('Slide to delete found:', slideToDelete);
    const slideName = slideToDelete?.name || 'Slide';

    const loadingToast = toast.loading(`Deleting ${slideName}...`);

    try {
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
      
      toast.dismiss(loadingToast);
      toast.success(`${slideName} deleted successfully!`);
      
      closeEditModal();
    } catch (error) {
      console.error('Error deleting slide:', error);
      toast.dismiss(loadingToast);
      toast.error(`Error deleting ${slideName}: ` + error.message);
    }
  };

  const openEditModal = (slide, playlistId) => {
    setEditingSlide(slide);
    setCurrentEditingPlaylistId(playlistId);
    setModalTinyMCEContent(slide.tinyMCEContent || slide.text || '');
    setModalImageUrl(slide.imageUrl || '');
    setImagePosition(slide.imagePosition || 'center');
    setSlideLayout(slide.layout || 'side-by-side');
    setModalSlideName(slide.name || '');
    setModalSlideDuration(slide.duration || 5);
    setModalShowBar(slide.showBar !== false);
    setModalVideoUrl(slide.videoUrl || '');
    setModalImageSide(slide.imageSide || 'left');
    setModalSlideTransition(slide.transition || 'fade');
    setModalTeletekstChannel(slide.teletekstChannel || '101');
    setModalTeletekstTheme(slide.teletekstTheme || 'classic');
  };

  const closeEditModal = () => {
    setEditingSlide(null);
    setCurrentEditingPlaylistId(null);
    setModalTinyMCEContent('');
    setModalImageUrl('');
    setImagePosition('center');
    setSlideLayout('side-by-side');
    setModalSlideName('');
    setModalSlideDuration(5);
    setModalShowBar(true);
    setModalTeletekstChannel('101');
  };

  const handleContentChange = (content) => {
    setModalTinyMCEContent(content);
  };

  const handleModalImageUpload = async (file) => {
    if (!file) {
      setModalImageUrl('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Selecteer een geldig afbeeldingsbestand.');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Afbeelding moet kleiner zijn dan 5MB.');
      return;
    }

    setUploadingImage(true);
    const loadingToast = toast.loading('Afbeelding uploaden...');

    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `slides/${fileName}`);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Get image dimensions
      const img = new Image();
      const dimensionsPromise = new Promise((resolve) => {
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
          resolve({ width: null, height: null });
        };
      });
      img.src = downloadURL;
      const { width, height } = await dimensionsPromise;

      // Save to media library
      await addDoc(collection(db, 'mediaLibrary'), {
        name: file.name,
        url: downloadURL,
        storagePath: `slides/${fileName}`,
        size: file.size,
        type: file.type,
        width,
        height,
        uploadedAt: new Date()
      });

      setModalImageUrl(downloadURL);

      toast.dismiss(loadingToast);
      toast.success('Afbeelding succesvol geüpload!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.dismiss(loadingToast);
      toast.error('Fout bij uploaden: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSelectImageFromLibrary = (image) => {
    setModalImageUrl(image.url);
    toast.success('Afbeelding geselecteerd uit bibliotheek');
  };

  const handleOpenImageLibrary = () => {
    setImageLibraryModalOpen(true);
  };

  const saveModalChanges = async () => {
    if (!editingSlide || !currentEditingPlaylistId) {
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
              videoUrl: modalVideoUrl,
              teletekstChannel: modalTeletekstChannel,
              teletekstTheme: modalTeletekstTheme,
              type: slideLayout === 'teletekst' ? 'teletekst' : (modalVideoUrl ? 'video' : (modalImageUrl ? 'image' : 'text')),
              imagePosition: imagePosition,
              imageSide: modalImageSide,
              layout: slideLayout,
              duration: modalSlideDuration === '' ? 5 : modalSlideDuration,
              showBar: modalShowBar,
              transition: modalSlideTransition
            };

            // Debug logging for slide updates
            console.log("💾 Saving slide with data:", {
              id: updatedSlide.id,
              name: updatedSlide.name,
              type: updatedSlide.type,
              layout: updatedSlide.layout,
              hasVideoUrl: !!updatedSlide.videoUrl,
              videoUrl: updatedSlide.videoUrl,
              hasImageUrl: !!updatedSlide.imageUrl,
              hasText: !!updatedSlide.text,
              isVisible: updatedSlide.isVisible
            });
            return updatedSlide;
          }
          return slide;
        });
        const totalDuration = calculatePlaylistDuration(updatedSlides);
        return { ...playlist, slides: updatedSlides, totalDuration };
      }
      return playlist;
    });

    setPlaylists(updatedPlaylists);
    
    const loadingToast = toast.loading('Saving slide changes...');
    
    try {
      const displayDocRef = doc(db, 'display', 'content');
      await setDoc(displayDocRef, { playlists: updatedPlaylists }, { merge: true });
      
      toast.dismiss(loadingToast);
      toast.success('Slide saved successfully!');
      
      closeEditModal();
    } catch (error) {
      console.error('Error saving modal changes to Firebase:', error);
      toast.dismiss(loadingToast);
      toast.error('Error saving slide: ' + error.message);
    }
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
    
    const loadingToast = toast.loading(`Removing ${slideName}...`);

    try {
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
      
      toast.dismiss(loadingToast);
      toast.success(`${slideName} removed successfully!`);
    } catch (error) {
      console.error('Error removing slide:', error);
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

  const handleImageUpload = async (playlistId, slideId, file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecteer een geldig afbeeldingsbestand.');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Afbeelding moet kleiner zijn dan 5MB.');
      return;
    }

    setUploadingImage(true);
    const loadingToast = toast.loading('Afbeelding uploaden...');
    
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `slides/${fileName}`);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const updatedPlaylists = playlists.map(playlist => {
        if (playlist.id === playlistId) {
          const updatedSlides = playlist.slides.map(slide => 
            slide.id === slideId ? { 
              ...slide, 
              imageUrl: downloadURL, 
              imageName: fileName,
              type: 'image',
              imagePosition: slide.imagePosition || 'center'
            } : slide
          );
          return { ...playlist, slides: updatedSlides };
        }
        return playlist;
      });
      setPlaylists(updatedPlaylists);
      await savePlaylistsToFirebase(updatedPlaylists);

      toast.dismiss(loadingToast);
      toast.success('Afbeelding succesvol geüpload!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.dismiss(loadingToast);
      toast.error('Fout bij uploaden: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = async (playlistId, slideId) => {
    const playlist = playlists.find(p => p.id === playlistId);
    const slide = playlist?.slides.find(slide => slide.id === slideId);

    if (slide && slide.imageUrl && slide.imageName) {
      const loadingToast = toast.loading('Afbeelding verwijderen...');

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

        toast.dismiss(loadingToast);
        toast.success('Afbeelding succesvol verwijderd!');
      } catch (error) {
        console.error('Error removing image:', error);
        toast.dismiss(loadingToast);
        toast.error('Fout bij verwijderen: ' + error.message);
      }
    }
  };

  const reorderSlides = async (playlistId, newSlides) => {
    const updatedPlaylists = playlists.map(playlist => {
      if (playlist.id === playlistId) {
        const totalDuration = calculatePlaylistDuration(newSlides);
        return { ...playlist, slides: newSlides, totalDuration };
      }
      return playlist;
    });
    setPlaylists(updatedPlaylists);
    await savePlaylistsToFirebase(updatedPlaylists);
  };

  const deleteDevice = async (deviceId) => {
    try {
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

  // Move slide functionality
  const openMoveSlideModal = (slide, playlistId) => {
    setSlideToMove(slide);
    setCurrentPlaylistId(playlistId);
    setMoveSlideModalOpen(true);
  };

  const closeMoveSlideModal = () => {
    setMoveSlideModalOpen(false);
    setSlideToMove(null);
    setCurrentPlaylistId(null);
  };

  const moveSlide = async (slide, fromPlaylistId, toPlaylistId) => {
    if (!slide || !fromPlaylistId || !toPlaylistId) return;

    const loadingToast = toast.loading(`Moving "${slide.name}"...`);

    try {
      // Remove slide from source playlist
      const updatedPlaylists = playlists.map(playlist => {
        if (playlist.id === fromPlaylistId) {
          const newSlides = playlist.slides.filter(s => s.id !== slide.id);
          const totalDuration = calculatePlaylistDuration(newSlides);
          return { ...playlist, slides: newSlides, totalDuration };
        }
        if (playlist.id === toPlaylistId) {
          const newSlides = [...playlist.slides, slide];
          const totalDuration = calculatePlaylistDuration(newSlides);
          return { ...playlist, slides: newSlides, totalDuration };
        }
        return playlist;
      });

      setPlaylists(updatedPlaylists);
      await savePlaylistsToFirebase(updatedPlaylists);
      
      toast.dismiss(loadingToast);
      toast.success(`"${slide.name}" moved successfully!`);
    } catch (error) {
      console.error('Error moving slide:', error);
      toast.dismiss(loadingToast);
      toast.error(`Error moving "${slide.name}": ` + error.message);
    }
  };

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
        <div className="admin-header-section">
          <div className="admin-header-content">
            <h1 className="admin-header">Afspeellijsten</h1>
            <div className="admin-stats">
              <div className="admin-slide-count">
                <span className="admin-stat-value">
                  <Monitor size={20} />
                  <span>{totalStats.activeSlides}/{totalStats.totalSlides}</span>
                </span>
              </div>
              <div className="admin-duration">
                <span className="admin-stat-value">
                  <Clock size={20} />
                  <span>{totalStats.totalDuration}s</span>
                </span>
              </div>
            </div>
            <button
              className="admin-settings-btn"
              onClick={toggleSidebarCollapse}
              title={isSidebarCollapsed ? "Open settings" : "Close settings"}
            >
              <Settings size={24} />
            </button>
          </div>
        </div>

        <PlaylistList
          playlists={playlists}
          expandedPlaylists={expandedPlaylists}
          onToggleExpansion={togglePlaylistExpansion}
          onAddPlaylist={handleAddPlaylist}
          onReorderPlaylists={reorderPlaylists}
          onUpdatePlaylistName={updatePlaylistName}
          onUpdatePlaylistRepeatCount={updatePlaylistRepeatCount}
          onTogglePlaylistEnabled={togglePlaylistEnabled}
          onCopyPlaylist={copyPlaylist}
          onConfirmDeletePlaylist={confirmDeletePlaylist}
          onEditSlide={openEditModal}
          onUpdateSlideType={updateSlideType}
          onToggleSlideVisibility={toggleSlideVisibility}
          onRemoveSlide={removeSlide}
          onImageUpload={handleImageUpload}
          onRemoveImage={removeImage}
          onCopySlide={copySlide}
          onReorderSlides={reorderSlides}
          onAddSlide={addSlide}
          onMoveSlide={openMoveSlideModal}
          uploadingImage={uploadingImage}
          calculatePlaylistDuration={calculatePlaylistDuration}
          editingPlaylistNameId={editingPlaylistNameId}
          editingPlaylistName={editingPlaylistName}
          onStartEditingPlaylistName={startEditingPlaylistName}
          onSavePlaylistName={savePlaylistName}
          onCancelEditingPlaylistName={cancelEditingPlaylistName}
          onPlaylistNameKeyPress={handlePlaylistNameKeyPress}
          editingPlaylistRepeatCountId={editingPlaylistRepeatCountId}
          editingPlaylistRepeatCount={editingPlaylistRepeatCount}
          onStartEditingPlaylistRepeatCount={startEditingPlaylistRepeatCount}
          onSavePlaylistRepeatCount={savePlaylistRepeatCount}
          onCancelEditingPlaylistRepeatCount={cancelEditingPlaylistRepeatCount}
          onPlaylistRepeatCountKeyPress={handlePlaylistRepeatCountKeyPress}
        />
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
          onDelete={() => setSlideToDelete({ slide: editingSlide, playlistId: currentEditingPlaylistId })}
          onImageUpload={handleModalImageUpload}
          onPositionChange={setImagePosition}
          onLayoutChange={setSlideLayout}
          onContentChange={handleContentChange}
          onSlideNameChange={setModalSlideName}
          onDurationChange={setModalSlideDuration}
          onShowBarChange={setModalShowBar}
          videoUrl={modalVideoUrl}
          onVideoUrlChange={setModalVideoUrl}
          imageSide={modalImageSide}
          onImageSideChange={setModalImageSide}
          slideTransition={modalSlideTransition}
          onTransitionChange={setModalSlideTransition}
          enabledFonts={enabledFonts}
          teletekstChannel={modalTeletekstChannel}
          teletekstTheme={modalTeletekstTheme}
          onTeletekstChannelChange={setModalTeletekstChannel}
          onTeletekstThemeChange={setModalTeletekstTheme}
          onOpenLibrary={handleOpenImageLibrary}
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

      {/* Move Slide Modal */}
      <MoveSlideModal
        isOpen={moveSlideModalOpen}
        onClose={closeMoveSlideModal}
        slide={slideToMove}
        playlists={playlists}
        currentPlaylistId={currentPlaylistId}
        onMoveSlide={moveSlide}
      />

      {/* Image Library Modal */}
      <ImageLibraryModal
        isOpen={imageLibraryModalOpen}
        onClose={() => setImageLibraryModalOpen(false)}
        onSelectImage={handleSelectImageFromLibrary}
      />

      {/* Slide Delete Confirmation Modal */}
      {slideToDelete && (
        <div className="slide-delete-modal-wrapper">
          <div className="modal-overlay" onClick={() => setSlideToDelete(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Slide verwijderen</h3>
              <button 
                onClick={() => setSlideToDelete(null)}
                className="modal-close-btn"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <p className="modal-description">
                Weet je zeker dat je <strong>{slideToDelete.slide.name || 'Slide'}</strong> wilt verwijderen?
              </p>
              <p className="delete-warning">
                Deze actie kan niet ongedaan worden gemaakt.
              </p>
            </div>
            
            <div className="modal-footer">
              <button
                onClick={() => setSlideToDelete(null)}
                className="btn btn-secondary"
              >
                Annuleren
              </button>
              <button
                onClick={() => {
                  deleteSlide(slideToDelete.slide.id, slideToDelete.playlistId);
                  setSlideToDelete(null);
                  closeEditModal();
                }}
                className="btn btn-danger"
              >
                Verwijderen
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminView;

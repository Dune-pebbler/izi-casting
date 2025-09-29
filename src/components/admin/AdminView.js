import React, { useState, useMemo } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { sanitizeHTMLContent } from '../../utils/sanitize';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setDeviceToDelete, clearDeviceToDelete, setIsSidebarCollapsed } from '../../store/slices/deviceSlice';
import { usePlaylistManager } from './PlaylistManager';
import PlaylistList from './PlaylistList';
import EditModal from './EditModal';
import MoveSlideModal from './modal/MoveSlideModal';
import Sidebar from './sidebar/Sidebar';
import { Monitor, Clock } from 'lucide-react';

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
  const [currentEditingPlaylistId, setCurrentEditingPlaylistId] = useState(null);

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
  
  // Redux hooks
  const dispatch = useAppDispatch();
  const deviceToDelete = useAppSelector((state) => state.device.deviceToDelete);
  const isSidebarCollapsed = useAppSelector((state) => state.device.isSidebarCollapsed);

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
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    const slideToDelete = playlist.slides.find(s => s.id === slideId);
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
      toast.error('Please select a valid image file.');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Image file size must be less than 5MB.');
      return;
    }

    setUploadingImage(true);
    const loadingToast = toast.loading('Uploading image...');
    
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `slides/${fileName}`);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      setModalImageUrl(downloadURL);
      
      toast.dismiss(loadingToast);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.dismiss(loadingToast);
      toast.error('Error uploading image: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
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
              type: modalVideoUrl ? 'video' : (modalImageUrl ? 'image' : 'text'),
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
      toast.error('Please select a valid image file.');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Image file size must be less than 5MB.');
      return;
    }

    setUploadingImage(true);
    const loadingToast = toast.loading('Uploading image...');
    
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
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
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
        
        toast.dismiss(loadingToast);
        toast.success('Image removed successfully!');
      } catch (error) {
        console.error('Error removing image:', error);
        toast.dismiss(loadingToast);
        toast.error('Error removing image: ' + error.message);
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
          onDelete={() => deleteSlide(editingSlide.id, currentEditingPlaylistId)}
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

      {/* Edit Slide Modal */}
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
          videoUrl={modalVideoUrl}
          imageSide={modalImageSide}
          slideTransition={modalSlideTransition}
          onClose={closeEditModal}
          onSave={saveModalChanges}
          onDelete={deleteSlide}
          onImageUpload={handleModalImageUpload}
          onPositionChange={setImagePosition}
          onLayoutChange={setSlideLayout}
          onContentChange={setModalTinyMCEContent}
          onSlideNameChange={setModalSlideName}
          onDurationChange={setModalSlideDuration}
          onShowBarChange={setModalShowBar}
          onVideoUrlChange={setModalVideoUrl}
          onImageSideChange={setModalImageSide}
          onTransitionChange={setModalSlideTransition}
        />
      )}
      
    </div>
  );
}

export default AdminView;

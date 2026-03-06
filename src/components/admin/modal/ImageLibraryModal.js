import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2, Search, Image as ImageIcon } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db, storage } from '../../../firebase';
import { ref, deleteObject } from 'firebase/storage';
import { toast } from 'sonner';
import { useTenant } from '../../../context/TenantContext';
import { tenantDoc, tenantCollection } from '../../../utils/tenantPaths';

const ImageLibraryModal = ({ isOpen, onClose, onSelectImage }) => {
  const { tenantId } = useTenant();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [deletingImageId, setDeletingImageId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    // Listen to media library changes in real-time
    const mediaQuery = query(
      tenantCollection(db, tenantId, 'mediaLibrary'),
      orderBy('uploadedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      mediaQuery,
      (snapshot) => {
        const imageData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setImages(imageData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching images:', error);
        toast.error('Laden van afbeeldingsbibliotheek mislukt');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  const handleDelete = async (image, e) => {
    e.stopPropagation();

    if (!window.confirm(`Weet je zeker dat je "${image.name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
      return;
    }

    setDeletingImageId(image.id);

    try {
      // Delete from Firebase Storage
      const imageRef = ref(storage, image.storagePath);
      await deleteObject(imageRef);

      // Delete from Firestore
      await deleteDoc(tenantDoc(db, tenantId, 'mediaLibrary', image.id));

      toast.success('Afbeelding succesvol verwijderd');

      // Clear selection if deleted image was selected
      if (selectedImage?.id === image.id) {
        setSelectedImage(null);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Verwijderen van afbeelding mislukt');
    } finally {
      setDeletingImageId(null);
    }
  };

  const handleSelect = () => {
    if (selectedImage) {
      onSelectImage(selectedImage);
      onClose();
      setSelectedImage(null);
    }
  };

  const filteredImages = images.filter(image =>
    image.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (!isOpen) return null;

  return (
    <div className="image-library-modal-wrapper">
      <div className="modal-overlay" onClick={onClose}>
        <div className="image-library-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-header-left">
              <h2>Afbeeldingsbibliotheek</h2>
              <p className="image-count">{filteredImages.length} afbeelding{filteredImages.length !== 1 ? 'en' : ''}</p>
            </div>
            <button className="btn-icon" onClick={onClose} aria-label="Sluiten">
              <X size={20} />
            </button>
          </div>

          <div className="modal-body">
            <div className="image-library-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Zoek afbeeldingen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            {loading ? (
              <div className="image-library-loading">
                <ImageIcon size={48} />
                <p>Afbeeldingen laden...</p>
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="image-library-empty">
                <ImageIcon size={48} />
                <p>{searchTerm ? 'Geen afbeeldingen gevonden' : 'Nog geen afbeeldingen in bibliotheek'}</p>
                <p className="empty-hint">Upload een afbeelding om te beginnen</p>
              </div>
            ) : (
              <div className="image-library-grid">
                {filteredImages.map((image) => (
                  <div
                    key={image.id}
                    className={`image-library-item ${selectedImage?.id === image.id ? 'selected' : ''}`}
                    onClick={() => setSelectedImage(image)}
                  >
                    <div className="image-library-thumbnail">
                      <img src={image.url} alt={image.name} />
                      <button
                        className="image-delete-btn"
                        onClick={(e) => handleDelete(image, e)}
                        disabled={deletingImageId === image.id}
                        aria-label="Verwijder afbeelding"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="image-library-info">
                      <p className="image-name" title={image.name}>{image.name}</p>
                      <p className="image-meta">
                        {image.width && image.height ? `${image.width} × ${image.height}` : ''}
                        {image.size ? ` • ${formatFileSize(image.size)}` : ''}
                      </p>
                      <p className="image-date">{formatDate(image.uploadedAt)}</p>
                    </div>
                    {selectedImage?.id === image.id && (
                      <div className="selected-indicator">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M7 10L9 12L13 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Annuleren
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSelect}
              disabled={!selectedImage}
            >
              Selecteer afbeelding
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageLibraryModal;

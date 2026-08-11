import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Trash2, Search, Image as ImageIcon } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { db, storage } from '../../../firebase';
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import { useTenant } from '../../../context/TenantContext';
import { tenantDoc, tenantCollection, tenantStorageRef } from '../../../utils/tenantPaths';

const ImageLibraryModal = ({ isOpen, onClose, onSelectImage, multiple = false, allowUpload = false, usageCounts = null }) => {
  const { tenantId } = useTenant();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [deletingImageId, setDeletingImageId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showOnlyUnused, setShowOnlyUnused] = useState(false);
  const fileInputRef = useRef(null);
  const canSelect = typeof onSelectImage === 'function';
  const canShowUsage = usageCounts instanceof Map;
  const getUsageCount = (image) => (canShowUsage ? (usageCounts.get(image.url) || 0) : null);

  useEffect(() => {
    if (!isOpen) return;

    setSelectedImage(null);
    setSelectedImages([]);

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

    const usageCount = getUsageCount(image);
    const confirmMessage = usageCount
      ? `"${image.name}" wordt nog gebruikt in ${usageCount} slide${usageCount !== 1 ? 's' : ''}. Weet je zeker dat je deze afbeelding wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`
      : `Weet je zeker dat je "${image.name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`;

    if (!window.confirm(confirmMessage)) {
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
      setSelectedImages((prev) => prev.filter((img) => img.id !== image.id));
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Verwijderen van afbeelding mislukt');
    } finally {
      setDeletingImageId(null);
    }
  };

  const handleSelect = () => {
    if (multiple) {
      if (selectedImages.length > 0) {
        onSelectImage(selectedImages);
        onClose();
        setSelectedImages([]);
      }
    } else if (selectedImage) {
      onSelectImage(selectedImage);
      onClose();
      setSelectedImage(null);
    }
  };

  const uploadOne = async (file) => {
    if (!file.type.startsWith('image/')) {
      toast.error(`${file.name}: geen geldig afbeeldingsbestand.`);
      return false;
    }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`${file.name}: afbeelding moet kleiner zijn dan 5MB.`);
      return false;
    }

    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storageRef = tenantStorageRef(storage, tenantId, `slides/${fileName}`);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    const img = new Image();
    const dimensionsPromise = new Promise((resolve) => {
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: null, height: null });
    });
    img.src = downloadURL;
    const { width, height } = await dimensionsPromise;

    await addDoc(tenantCollection(db, tenantId, 'mediaLibrary'), {
      name: file.name,
      url: downloadURL,
      storagePath: `tenants/${tenantId}/slides/${fileName}`,
      size: file.size,
      type: file.type,
      width,
      height,
      uploadedAt: new Date(),
    });
    return true;
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setUploading(true);
    const loadingToast = toast.loading(
      files.length > 1 ? `${files.length} afbeeldingen uploaden...` : 'Afbeelding uploaden...'
    );

    let successCount = 0;
    for (const file of files) {
      try {
        if (await uploadOne(file)) successCount += 1;
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error(`${file.name}: fout bij uploaden - ${error.message}`);
      }
    }

    toast.dismiss(loadingToast);
    if (successCount > 0) {
      toast.success(
        successCount > 1
          ? `${successCount} afbeeldingen succesvol geüpload!`
          : 'Afbeelding succesvol geüpload!'
      );
    }
    setUploading(false);
  };

  const handleItemClick = (image) => {
    if (!canSelect) return;
    if (multiple) {
      setSelectedImages((prev) =>
        prev.some((img) => img.id === image.id)
          ? prev.filter((img) => img.id !== image.id)
          : [...prev, image]
      );
    } else {
      setSelectedImage(image);
    }
  };

  const filteredImages = images
    .filter(image => image.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(image => !showOnlyUnused || getUsageCount(image) === 0);

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

  return createPortal(
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
            <div className="image-library-toolbar">
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
              {canShowUsage && (
                <label className="image-library-unused-filter">
                  <input
                    type="checkbox"
                    checked={showOnlyUnused}
                    onChange={(e) => setShowOnlyUnused(e.target.checked)}
                  />
                  Alleen ongebruikte
                </label>
              )}
              {allowUpload && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    className="btn btn-primary image-library-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload size={16} />
                    {uploading ? 'Uploaden...' : 'Uploaden'}
                  </button>
                </>
              )}
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
                {filteredImages.map((image) => {
                  const isSelected = multiple
                    ? selectedImages.some((img) => img.id === image.id)
                    : selectedImage?.id === image.id;
                  return (
                  <div
                    key={image.id}
                    className={`image-library-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleItemClick(image)}
                  >
                    <div className="image-library-thumbnail">
                      <img src={image.url} alt={image.name} />
                      {canShowUsage && (
                        <span
                          className={`image-usage-badge ${getUsageCount(image) === 0 ? 'unused' : ''}`}
                          title={
                            getUsageCount(image) === 0
                              ? 'Niet gebruikt in een slide'
                              : `Gebruikt in ${getUsageCount(image)} slide${getUsageCount(image) !== 1 ? 's' : ''}`
                          }
                        >
                          {getUsageCount(image)}×
                        </span>
                      )}
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
                    {isSelected && (
                      <div className="selected-indicator">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M7 10L9 12L13 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="modal-footer">
            {canSelect ? (
              <>
                <button className="btn btn-secondary" onClick={onClose}>
                  Annuleren
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSelect}
                  disabled={multiple ? selectedImages.length === 0 : !selectedImage}
                >
                  {multiple
                    ? selectedImages.length > 0
                      ? `Selecteer ${selectedImages.length} afbeelding${selectedImages.length !== 1 ? 'en' : ''}`
                      : 'Selecteer afbeeldingen'
                    : 'Selecteer afbeelding'}
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={onClose}>
                Sluiten
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImageLibraryModal;

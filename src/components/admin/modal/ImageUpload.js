import React from 'react';
import { X } from 'lucide-react';
import PositionSelector from './PositionSelector';

function ImageUpload({
  imageUrl,
  uploadingImage,
  onImageUpload,
  onRemoveImage,
  showPositionSelector = false,
  imagePosition = 'center',
  onPositionChange,
  fullWidth = false,
  asBackground = false
}) {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImageUpload(file);
    }
  };

  const renderImagePreview = () => {
    if (imageUrl) {
      const containerClass = fullWidth ? 'modal-image-container-full' : 
                           asBackground ? 'modal-image-container-overlay' : 
                           'modal-image-container';
      const imageClass = fullWidth ? 'modal-image-full' : 
                       asBackground ? 'modal-image-overlay' : 
                       'modal-image';

      return (
        <div className="modal-image-preview">
          <div className={containerClass}>
            <img 
              src={imageUrl} 
              alt="Slide" 
              className={imageClass}
              style={{
                objectPosition: imagePosition
              }}
            />
          </div>
          {showPositionSelector && (
            <PositionSelector
              currentPosition={imagePosition}
              onPositionChange={onPositionChange}
            />
          )}
          <button
            onClick={onRemoveImage}
            className="remove-modal-image"
            title="Remove Image"
            aria-label="Remove Image"
          >
            <X size={20} />
          </button>
        </div>
      );
    }

    const uploadClass = fullWidth ? 'modal-image-upload-full' : 
                      asBackground ? 'modal-image-upload-overlay' : 
                      'modal-image-upload';
    const labelClass = fullWidth ? 'modal-upload-label-full' : 
                     asBackground ? 'modal-upload-label-overlay' : 
                     'modal-upload-label';
    const inputId = fullWidth ? 'modal-image-upload-full' : 
                  asBackground ? 'modal-image-upload-overlay' : 
                  'modal-image-upload';

    return (
      <label htmlFor={inputId} className={uploadClass}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="image-upload-input"
          id={inputId}
        />
        <div className={labelClass}>
          {uploadingImage ? (
            <>
              <div className="upload-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7,10 12,15 17,10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </div>
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <div className="upload-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7,10 12,15 17,10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </div>
              <span>Upload Image</span>
            </>
          )}
        </div>
      </label>
    );
  };

  return renderImagePreview();
}

export default ImageUpload;

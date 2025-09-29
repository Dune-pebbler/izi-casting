import React from "react";
import { Editor } from "@tinymce/tinymce-react";
import { Trash2, Clock, Maximize2, Layout, ArrowLeftRight, Zap } from "lucide-react";
import LayoutSelector from "./LayoutSelector";
import ImageUpload from "./ImageUpload";
import PositionSelector from "./PositionSelector";
import TextEditor from "./TextEditor";
import VideoUrlInput from "./VideoUrlInput";

function EditModal({
  slide,
  modalImageUrl,
  modalTinyMCEContent,
  imagePosition,
  slideLayout,
  uploadingImage,
  slideName,
  slideDuration,
  showBar,
  videoUrl,
  imageSide,
  slideTransition,
  onClose,
  onSave,
  onDelete,
  onImageUpload,
  onPositionChange,
  onLayoutChange,
  onContentChange,
  onSlideNameChange,
  onDurationChange,
  onShowBarChange,
  onVideoUrlChange,
  onImageSideChange,
  onTransitionChange,
}) {
  const renderLayoutContent = () => {
    switch (slideLayout) {
      case "side-by-side":
        return (
          <>
            <div className={`modal-left ${imageSide === 'right' ? 'flipped' : ''}`}>
              <ImageUpload
                imageUrl={modalImageUrl}
                uploadingImage={uploadingImage}
                onImageUpload={onImageUpload}
                onRemoveImage={() => onImageUpload(null)}
                showPositionSelector={true}
                imagePosition={imagePosition}
                onPositionChange={onPositionChange}
              />
            </div>

            <button
              className="flip-layout-btn"
              onClick={() => onImageSideChange(imageSide === 'left' ? 'right' : 'left')}
              title="Flip image and text positions"
            >
              <ArrowLeftRight size={20} />
            </button>

            <div className={`modal-right ${imageSide === 'right' ? 'flipped' : ''}`}>
              <div className="text-input-section">
                <TextEditor
                  content={modalTinyMCEContent}
                  onContentChange={onContentChange}
                />
              </div>
            </div>
          </>
        );

      case "image-only":
        return (
          <div className="modal-full-image">
            <ImageUpload
              imageUrl={modalImageUrl}
              uploadingImage={uploadingImage}
              onImageUpload={onImageUpload}
              onRemoveImage={() => onImageUpload(null)}
              showPositionSelector={true}
              imagePosition={imagePosition}
              onPositionChange={onPositionChange}
              fullWidth={true}
            />
          </div>
        );

      case "text-over-image":
        return (
          <div className="modal-text-over-image">
            <div className="modal-image-background">
              <ImageUpload
                imageUrl={modalImageUrl}
                uploadingImage={uploadingImage}
                onImageUpload={onImageUpload}
                onRemoveImage={() => onImageUpload(null)}
                showPositionSelector={true}
                imagePosition={imagePosition}
                onPositionChange={onPositionChange}
                asBackground={true}
              />
            </div>

            <div className="modal-text-overlay">
              <div className="text-input-section">
                <TextEditor
                  content={modalTinyMCEContent}
                  onContentChange={onContentChange}
                />
              </div>
            </div>
          </div>
        );

      case "text-only":
        return (
          <div className="modal-text-only">
            <div className="text-input-section-full">
              <TextEditor
                content={modalTinyMCEContent}
                onContentChange={onContentChange}
              />
            </div>
          </div>
        );

      case "video":
        return (
          <div className="modal-video">
            <div className="video-input-section">
              <VideoUrlInput
                videoUrl={videoUrl}
                onVideoUrlChange={onVideoUrlChange}
                onRemoveVideo={() => onVideoUrlChange('')}
                onDurationChange={onDurationChange}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="slide-edit-modal">
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="slide-name-input-container">
              <input
                type="text"
                className="slide-name-input"
                value={slideName || ""}
                onChange={(e) => onSlideNameChange(e.target.value)}
                placeholder="Enter slide name..."
                maxLength={50}
              />
            </div>
            <div className="slide-duration-input-container">
              <label htmlFor="slide-duration">
                <Clock size={16} />
              </label>
              <div className="duration-input-wrapper">
                <input
                  id="slide-duration"
                  type="number"
                  className="slide-duration-input"
                  value={slideDuration || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      onDurationChange('');
                    } else {
                      const numValue = parseInt(value);
                      onDurationChange(isNaN(numValue) ? 5 : numValue);
                    }
                  }}
                  min="0"
                  step="1"
                />
                <span className="duration-suffix">s</span>
              </div>
            </div>
            <div className="show-bar-checkbox-container">
              <div 
                className={`show-bar-slider ${showBar ? 'active' : ''}`}
                onClick={() => onShowBarChange(!showBar)}
                title={showBar ? 'Fullscreen mode' : 'Two-bar layout mode'}
              >
                <div className="slider-track">
                  <div className="slider-thumb"></div>
                </div>
                <div className="slider-icons">
                  <Maximize2 size={16} className="icon-fullscreen" />
                  <Layout size={16} className="icon-layout" />
                </div>
              </div>
            </div>
            <div className="slide-transition-container">
              <label htmlFor="slide-transition">
                <Zap size={16} />
              </label>
              <select
                id="slide-transition"
                className="slide-transition-select"
                value={slideTransition || 'fade'}
                onChange={(e) => onTransitionChange(e.target.value)}
                title="Select slide transition effect"
              >
                <option value="fade">Fade</option>
                <option value="slide-left">Slide Left</option>
                <option value="slide-right">Slide Right</option>
                <option value="slide-up">Slide Up</option>
                <option value="slide-down">Slide Down</option>
                <option value="zoom-in">Zoom In</option>
                <option value="zoom-out">Zoom Out</option>
                <option value="flip-horizontal">Flip Horizontal</option>
                <option value="flip-vertical">Flip Vertical</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>

          <div className="modal-header-center">
            <LayoutSelector
              currentLayout={slideLayout}
              onLayoutChange={onLayoutChange}
            />
          </div>

          <div className="modal-header-actions">
            <button
              onClick={() => {
                console.log('Delete button clicked');
                onDelete();
              }}
              className="btn btn-danger delete-slide-btn"
              title="Delete slide"
            >
              <Trash2 size={16} />
            </button>
            <button onClick={onClose} className="btn btn-secondary">
              Close
            </button>
            <button onClick={onSave} className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </div>

        <div className="modal-body">{renderLayoutContent()}</div>
        </div>
      </div>
    </div>
  );
}

export default EditModal;

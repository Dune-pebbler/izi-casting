import React, { useState, useEffect } from 'react';
import { X, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { sanitizeHTMLContent } from '../../utils/sanitize';
import { extractVideoInfo } from '../../utils/videoMetadata';

function TrashModal({
  isOpen,
  onClose,
  trashedSlides,
  playlists,
  onRestoreSlide,
  onPermanentDelete,
  onEmptyTrash
}) {
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showEmptyTrashConfirm, setShowEmptyTrashConfirm] = useState(false);

  // Function to strip HTML tags and get clean text
  const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Function to get preview text with proper truncation
  const getPreviewText = (htmlContent, maxLength = 50) => {
    const cleanText = stripHtml(htmlContent);
    if (cleanText.length > maxLength) {
      return `${cleanText.substring(0, maxLength)}...`;
    }
    return cleanText;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRestore = (slide) => {
    setSelectedSlide(slide);
    setSelectedPlaylistId(slide.originalPlaylistId || '');
    setShowRestoreModal(true);
  };

  const confirmRestore = () => {
    if (selectedSlide && selectedPlaylistId) {
      onRestoreSlide(selectedSlide, selectedPlaylistId);
      setShowRestoreModal(false);
      setSelectedSlide(null);
      setSelectedPlaylistId('');
    }
  };

  const handlePermanentDelete = (slide) => {
    setShowDeleteConfirm(slide);
  };

  const confirmPermanentDelete = () => {
    if (showDeleteConfirm) {
      onPermanentDelete(showDeleteConfirm);
      setShowDeleteConfirm(null);
    }
  };

  const confirmEmptyTrash = () => {
    onEmptyTrash();
    setShowEmptyTrashConfirm(false);
  };

  const renderSlidePreview = (slide) => {
    const layout = slide.layout || 'side-by-side';

    switch (layout) {
      case 'image-only':
        return (
          <div className="trash-slide-preview image-only">
            {slide.imageUrl ? (
              <img src={slide.imageUrl} alt="Slide" />
            ) : (
              <div className="preview-placeholder">🖼️</div>
            )}
          </div>
        );

      case 'text-only':
        return (
          <div className="trash-slide-preview text-only">
            {slide.text || slide.tinyMCEContent ? (
              <div
                className="preview-text"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHTMLContent(getPreviewText(slide.tinyMCEContent || slide.text, 50))
                }}
              />
            ) : (
              <div className="preview-placeholder">📝</div>
            )}
          </div>
        );

      case 'video':
        const videoInfo = slide.videoUrl ? extractVideoInfo(slide.videoUrl) : null;
        return (
          <div className="trash-slide-preview video">
            {videoInfo ? (
              <div className="video-preview">
                <span className="video-icon">🎥</span>
                <span className="video-platform">{videoInfo.type === 'youtube' ? 'YouTube' : 'Vimeo'}</span>
              </div>
            ) : (
              <div className="preview-placeholder">🎥</div>
            )}
          </div>
        );

      default:
        return (
          <div className="trash-slide-preview side-by-side">
            <div className="preview-left">
              {slide.imageUrl ? (
                <img src={slide.imageUrl} alt="Slide" />
              ) : (
                <div className="preview-placeholder">🖼️</div>
              )}
            </div>
            <div className="preview-right">
              {slide.text || slide.tinyMCEContent ? (
                <div
                  className="preview-text"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHTMLContent(getPreviewText(slide.tinyMCEContent || slide.text, 40))
                  }}
                />
              ) : (
                <div className="preview-placeholder">📝</div>
              )}
            </div>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="trash-modal-overlay" onClick={onClose}>
        <div className="trash-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="trash-modal-header">
            <h2>
              <Trash2 size={24} />
              Prullenbak
            </h2>
            <div className="trash-modal-header-actions">
              {trashedSlides.length > 0 && (
                <button
                  onClick={() => setShowEmptyTrashConfirm(true)}
                  className="btn btn-danger"
                  title="Leeg de prullenbak"
                >
                  <Trash2 size={16} />
                  Prullenbak legen
                </button>
              )}
              <button onClick={onClose} className="modal-close-btn" title="Sluiten">
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="trash-modal-body">
            {trashedSlides.length === 0 ? (
              <div className="trash-empty">
                <Trash2 size={48} />
                <p>De prullenbak is leeg</p>
              </div>
            ) : (
              <div className="trash-slides-grid">
                {trashedSlides.map((slide) => (
                  <div key={slide.trashId} className="trash-slide-card">
                    <div className="trash-slide-preview-container">
                      {renderSlidePreview(slide)}
                    </div>

                    <div className="trash-slide-info">
                      <h4>{slide.name || 'Untitled Slide'}</h4>
                      <div className="trash-slide-meta">
                        <span className="original-playlist">
                          Van: {slide.originalPlaylistName || 'Onbekende playlist'}
                        </span>
                        <span className="deleted-date">
                          Verwijderd: {formatDate(slide.deletedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="trash-slide-actions">
                      <button
                        onClick={() => handleRestore(slide)}
                        className="btn btn-primary"
                        title="Herstel slide"
                      >
                        <RotateCcw size={16} />
                        Herstel
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(slide)}
                        className="btn btn-danger"
                        title="Permanent verwijderen"
                      >
                        <Trash2 size={16} />
                        Verwijder
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Restore Modal */}
      {showRestoreModal && (
        <div className="restore-modal-overlay" onClick={() => setShowRestoreModal(false)}>
          <div className="restore-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Herstel Slide</h3>
              <button
                onClick={() => setShowRestoreModal(false)}
                className="modal-close-btn"
                title="Sluiten"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p>Selecteer de playlist waar je <strong>{selectedSlide?.name || 'deze slide'}</strong> wilt herstellen:</p>

              <select
                value={selectedPlaylistId}
                onChange={(e) => setSelectedPlaylistId(e.target.value)}
                className="playlist-select"
              >
                <option value="">Selecteer een playlist...</option>
                {playlists.map((playlist) => (
                  <option key={playlist.id} value={playlist.id}>
                    {playlist.name} ({playlist.slides.length} slides)
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowRestoreModal(false)}
                className="btn btn-secondary"
              >
                Annuleren
              </button>
              <button
                onClick={confirmRestore}
                className="btn btn-primary"
                disabled={!selectedPlaylistId}
              >
                <RotateCcw size={16} />
                Herstel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="delete-confirm-modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="delete-confirm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <AlertTriangle size={24} />
                Permanent Verwijderen
              </h3>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="modal-close-btn"
                title="Sluiten"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p>
                Weet je zeker dat je <strong>{showDeleteConfirm.name || 'deze slide'}</strong> permanent wilt verwijderen?
              </p>
              <p className="delete-warning">
                Deze actie kan niet ongedaan worden gemaakt. De slide zal definitief worden verwijderd.
              </p>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="btn btn-secondary"
              >
                Annuleren
              </button>
              <button
                onClick={confirmPermanentDelete}
                className="btn btn-danger"
              >
                <Trash2 size={16} />
                Permanent Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty Trash Confirmation Modal */}
      {showEmptyTrashConfirm && (
        <div className="delete-confirm-modal-overlay" onClick={() => setShowEmptyTrashConfirm(false)}>
          <div className="delete-confirm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <AlertTriangle size={24} />
                Prullenbak Legen
              </h3>
              <button
                onClick={() => setShowEmptyTrashConfirm(false)}
                className="modal-close-btn"
                title="Sluiten"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p>
                Weet je zeker dat je de hele prullenbak wilt legen?
              </p>
              <p className="delete-warning">
                Dit zal <strong>{trashedSlides.length} slide(s)</strong> permanent verwijderen. Deze actie kan niet ongedaan worden gemaakt.
              </p>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowEmptyTrashConfirm(false)}
                className="btn btn-secondary"
              >
                Annuleren
              </button>
              <button
                onClick={confirmEmptyTrash}
                className="btn btn-danger"
              >
                <Trash2 size={16} />
                Prullenbak Legen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TrashModal;

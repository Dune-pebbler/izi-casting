import React, { useState } from 'react';
import { X } from 'lucide-react';

const MoveSlideModal = ({ 
  isOpen, 
  onClose, 
  slide, 
  playlists, 
  currentPlaylistId, 
  onMoveSlide 
}) => {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');

  if (!isOpen) return null;

  // Filter out the current playlist from the options
  const availablePlaylists = playlists.filter(playlist => playlist.id !== currentPlaylistId);

  const handleMove = () => {
    if (selectedPlaylistId && slide) {
      onMoveSlide(slide, currentPlaylistId, selectedPlaylistId);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedPlaylistId('');
    onClose();
  };

  return (
    <div className="move-slide-modal">
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header">
            <h3>Move to other playlist</h3>
            <button 
              onClick={handleClose}
              className="modal-close-btn"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="modal-content">
            <p className="modal-description">
              Move <strong>"{slide?.name || 'Slide'}"</strong> to another playlist:
            </p>
            
            <div className="form-group">
              <label htmlFor="playlist-select">Select playlist:</label>
              <select
                id="playlist-select"
                value={selectedPlaylistId}
                onChange={(e) => setSelectedPlaylistId(e.target.value)}
                className="form-select"
              >
                <option value="">Choose a playlist...</option>
                {availablePlaylists.map(playlist => (
                  <option key={playlist.id} value={playlist.id}>
                    {playlist.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="modal-actions">
            <button
              onClick={handleClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleMove}
              disabled={!selectedPlaylistId}
              className="btn btn-primary"
            >
              Move Slide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoveSlideModal;

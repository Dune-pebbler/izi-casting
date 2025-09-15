import React from "react";
import { GripVertical, Copy, Trash2, Eye, EyeOff, Monitor, Clock } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const PlaylistHeader = ({
  playlist,
  isExpanded,
  onToggleExpansion,
  editingPlaylistNameId,
  editingPlaylistName,
  onStartEditingName,
  onSaveName,
  onCancelEditingName,
  onNameKeyPress,
  editingPlaylistRepeatCountId,
  editingPlaylistRepeatCount,
  onStartEditingRepeatCount,
  onSaveRepeatCount,
  onCancelEditingRepeatCount,
  onRepeatCountKeyPress,
  onToggleEnabled,
  onCopyPlaylist,
  onConfirmDelete,
  calculatePlaylistDuration,
}) => {
  // Calculate slide counts
  const totalSlides = playlist.slides ? playlist.slides.length : 0;
  const activeSlides = playlist.slides
    ? playlist.slides.filter((slide) => slide.isVisible !== false).length
    : 0;
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
      className={`admin-content-wrapper ${isDragging ? "dragging" : ""} ${
        isExpanded ? "expanded" : ""
      }`}
    >
      <div
        className="playlist-header"
        onClick={() => onToggleExpansion(playlist.id)}
      >
        <div className="playlist-header-left">
          <div className="playlist-drag-handle" {...attributes} {...listeners}>
            <GripVertical size={18} />
          </div>
          {editingPlaylistNameId === playlist.id ? (
            <input
              type="text"
              value={editingPlaylistName}
              onChange={(e) => onStartEditingName(playlist.id, e.target.value)}
              onBlur={onSaveName}
              onKeyPress={onNameKeyPress}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="playlist-title-input"
            />
          ) : (
            <h2
              className="playlist-title"
              onClick={(e) => {
                e.stopPropagation();
                onStartEditingName(playlist.id, playlist.name);
              }}
            >
              {playlist.name}
            </h2>
          )}
        </div>
        <div className="playlist-actions" onClick={(e) => e.stopPropagation()}>
          <div className="playlist-info">
              <div className="playlist-slide-count">
                <span className="slide-count-value">
                  <Monitor size={14} />
                  <span>{activeSlides}/{totalSlides}</span>
                </span>
              </div>
            <div className="playlist-duration">
              <span className="duration-value">
                <Clock size={14} />
                <span>
                  {calculatePlaylistDuration(playlist.slides)}
                  s
                </span>
              </span>
            </div>

            <div className="playlist-repeat-count">
              <span className="repeat-label">×</span>
              {editingPlaylistRepeatCountId === playlist.id ? (
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={editingPlaylistRepeatCount}
                  onChange={(e) =>
                    onStartEditingRepeatCount(
                      playlist.id,
                      parseInt(e.target.value) || 1
                    )
                  }
                  onBlur={onSaveRepeatCount}
                  onKeyPress={onRepeatCountKeyPress}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  className="repeat-count-input"
                />
              ) : (
                <span
                  className="repeat-count-display"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartEditingRepeatCount(
                      playlist.id,
                      playlist.repeatCount || 1
                    );
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
              onConfirmDelete(playlist);
            }}
            className="delete-playlist-btn"
            title="Delete playlist"
          >
            <Trash2 size={16} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopyPlaylist(playlist);
            }}
            className="copy-playlist-btn"
            title="Copy playlist"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleEnabled(playlist.id);
            }}
            className={`playlist-toggle-btn ${
              playlist.isEnabled !== false ? "enabled" : "disabled"
            }`}
            title={
              playlist.isEnabled !== false
                ? "Disable playlist"
                : "Enable playlist"
            }
          >
            {playlist.isEnabled !== false ? (
              <Eye size={16} />
            ) : (
              <EyeOff size={16} />
            )}
          </button>
          <div className="playlist-expand-icon">
            <svg
              className={`expand-arrow ${isExpanded ? "expanded" : ""}`}
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
    </div>
  );
};

export default PlaylistHeader;

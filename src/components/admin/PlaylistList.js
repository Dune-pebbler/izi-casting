import React, { useState, useMemo, useCallback } from "react";
import { Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import PlaylistHeader from "./PlaylistHeader";
import SlideList from "./SlideList";

const PlaylistList = ({
  playlists,
  expandedPlaylists,
  onToggleExpansion,
  onAddPlaylist,
  onReorderPlaylists,
  onUpdatePlaylistName,
  onUpdatePlaylistRepeatCount,
  onTogglePlaylistEnabled,
  onCopyPlaylist,
  onConfirmDeletePlaylist,
  onEditSlide,
  onUpdateSlideType,
  onToggleSlideVisibility,
  onRemoveSlide,
  onImageUpload,
  onRemoveImage,
  onCopySlide,
  onReorderSlides,
  onAddSlide,
  onMoveSlide,
  uploadingImage,
  calculatePlaylistDuration,
  // Playlist editing state
  editingPlaylistNameId,
  editingPlaylistName,
  onStartEditingPlaylistName,
  onSavePlaylistName,
  onCancelEditingPlaylistName,
  onPlaylistNameKeyPress,
  editingPlaylistRepeatCountId,
  editingPlaylistRepeatCount,
  onStartEditingPlaylistRepeatCount,
  onSavePlaylistRepeatCount,
  onCancelEditingPlaylistRepeatCount,
  onPlaylistRepeatCountKeyPress,
}) => {
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

  const playlistIds = useMemo(
    () => playlists.map((playlist) => playlist.id),
    [playlists]
  );

  const handlePlaylistDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      console.log("Playlist drag end:", { active, over });

      if (active.id !== over?.id) {
        const oldIndex = playlists.findIndex(
          (playlist) => playlist.id === active.id
        );
        const newIndex = playlists.findIndex(
          (playlist) => playlist.id === over.id
        );

        if (oldIndex !== -1 && newIndex !== -1) {
          const newPlaylists = arrayMove(playlists, oldIndex, newIndex);
          onReorderPlaylists(newPlaylists);
        }
      }
    },
    [playlists, onReorderPlaylists]
  );

  const handlePlaylistDragStart = useCallback((event) => {
    console.log("Playlist drag start:", event);
  }, []);

  return (
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
          <div key={playlist.id} className="playlist-container">
            <PlaylistHeader
              playlist={playlist}
              isExpanded={expandedPlaylists.has(playlist.id)}
              onToggleExpansion={onToggleExpansion}
              editingPlaylistNameId={editingPlaylistNameId}
              editingPlaylistName={editingPlaylistName}
              onStartEditingName={onStartEditingPlaylistName}
              onSaveName={onSavePlaylistName}
              onCancelEditingName={onCancelEditingPlaylistName}
              onNameKeyPress={onPlaylistNameKeyPress}
              editingPlaylistRepeatCountId={editingPlaylistRepeatCountId}
              editingPlaylistRepeatCount={editingPlaylistRepeatCount}
              onStartEditingRepeatCount={onStartEditingPlaylistRepeatCount}
              onSaveRepeatCount={onSavePlaylistRepeatCount}
              onCancelEditingRepeatCount={onCancelEditingPlaylistRepeatCount}
              onRepeatCountKeyPress={onPlaylistRepeatCountKeyPress}
              onToggleEnabled={onTogglePlaylistEnabled}
              onCopyPlaylist={onCopyPlaylist}
              onConfirmDelete={onConfirmDeletePlaylist}
              calculatePlaylistDuration={calculatePlaylistDuration}
            />

            {/* Collapsible Slides Container */}
            <div
              className={`playlist-slides-container ${
                expandedPlaylists.has(playlist.id) ? "expanded" : ""
              }`}
            >
              <SlideList
                slides={playlist.slides}
                onEditSlide={(slide) => onEditSlide(slide, playlist.id)}
                onUpdateSlideType={(slideId, type) =>
                  onUpdateSlideType(playlist.id, slideId, type)
                }
                onToggleSlideVisibility={(slideId) =>
                  onToggleSlideVisibility(playlist.id, slideId)
                }
                onRemoveSlide={(slideId) => onRemoveSlide(playlist.id, slideId)}
                onImageUpload={(slideId, file) =>
                  onImageUpload(playlist.id, slideId, file)
                }
                onRemoveImage={(slideId) => onRemoveImage(playlist.id, slideId)}
                uploadingImage={uploadingImage}
                onCopySlide={(slide) => onCopySlide(slide, playlist.id)}
                onReorderSlides={(newSlides) =>
                  onReorderSlides(playlist.id, newSlides)
                }
                onAddSlide={() => onAddSlide(playlist.id)}
                onMoveSlide={(slide) => onMoveSlide(slide, playlist.id)}
              />
            </div>
          </div>
        ))}
      </SortableContext>

      {/* Add Playlist Button */}
      <div className="add-playlist-button" onClick={onAddPlaylist}>
        <div className="add-playlist-content">
          <Plus size={24} />
          <span>Playlist toevoegen </span>
        </div>
      </div>
    </DndContext>
  );
};

export default PlaylistList;

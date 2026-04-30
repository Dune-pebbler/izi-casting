import React, { useRef } from "react";
import { Plus, Trash2, Images, BookImage, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableImageItem({ image, onRemove, onDurationChange }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={`gallery-input__item${isDragging ? " dragging" : ""}`}>
      <div className="gallery-input__drag-handle" {...attributes} {...listeners}>
        <GripVertical size={16} />
      </div>
      <div className="gallery-input__thumb">
        <img src={image.url} alt={image.name} />
      </div>
      <span className="gallery-input__name" title={image.name}>
        {image.name}
      </span>
      <div className="gallery-input__duration">
        <input
          type="number"
          min={1}
          value={image.duration ?? 3}
          onChange={(e) =>
            onDurationChange(image.id, Math.max(1, parseInt(e.target.value) || 1))
          }
          className="gallery-input__duration-input"
        />
        <span className="gallery-input__duration-suffix">s</span>
      </div>
      <button
        className="btn-icon btn-icon--danger gallery-input__remove"
        onClick={() => onRemove(image.id)}
        title="Verwijder foto"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function GalleryInput({ images = [], onAddImage, onRemoveImage, onDurationChange, onReorder, uploading, onOpenLibrary }) {
  const fileInputRef = useRef(null);
  const totalDuration = images.reduce((sum, img) => sum + (img.duration || 3), 0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = images.findIndex((img) => img.id === active.id);
    const newIndex = images.findIndex((img) => img.id === over.id);
    onReorder(arrayMove(images, oldIndex, newIndex));
  };

  const handleFiles = (e) => {
    Array.from(e.target.files).forEach((file) => onAddImage(file));
    e.target.value = "";
  };

  const AddButtons = () => (
    <div className="gallery-input__add-buttons">
      <button
        className="gallery-input__add-btn"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        <Plus size={16} />
        {uploading ? "Uploaden…" : "Uploaden"}
      </button>
      {onOpenLibrary && (
        <button
          className="gallery-input__add-btn"
          onClick={onOpenLibrary}
          disabled={uploading}
        >
          <BookImage size={16} />
          Bibliotheek
        </button>
      )}
    </div>
  );

  return (
    <div className="gallery-input">
      {images.length === 0 ? (
        <div className="gallery-input__empty">
          <Images size={40} strokeWidth={1.2} />
          <p>Voeg foto's toe om te beginnen</p>
          <AddButtons />
        </div>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={images.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="gallery-input__list">
                {images.map((image) => (
                  <SortableImageItem
                    key={image.id}
                    image={image}
                    onRemove={onRemoveImage}
                    onDurationChange={onDurationChange}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="gallery-input__footer">
            <AddButtons />
            <span className="gallery-input__total">
              {images.length} foto{images.length !== 1 ? "'s" : ""} · {totalDuration}s totaal
            </span>
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handleFiles}
      />
    </div>
  );
}

export default GalleryInput;

import React, { useRef } from "react";
import { Plus, Trash2, GripVertical, QrCode, PanelLeft, Image, BookImage, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function ColorField({ label, value, onChange }) {
  return (
    <div className="slide-color-input">
      <label>{label}</label>
      <div className="slide-color-input__wrapper">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="slide-color-input__picker"
        />
        <span className="slide-color-input__hex">{value}</span>
      </div>
    </div>
  );
}

function SortableTextSlide({
  item,
  onRemove,
  onTextChange,
  onBgColorChange,
  onBgImageUpload,
  onBgImageRemove,
  onOpenLibrary,
  uploadingId,
}) {
  const fileInputRef = useRef(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isUploading = uploadingId === item.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`qr-feed-input__item${isDragging ? " dragging" : ""}`}
    >
      <div className="qr-feed-input__drag-handle" {...attributes} {...listeners}>
        <GripVertical size={16} />
      </div>

      <div className="qr-feed-input__item-body">
        {/* Per-slide background row */}
        <div className="qr-feed-input__item-bg-row">
          <div className="slide-color-input qr-feed-input__item-bg-color">
            <label>Achtergrond</label>
            <div className="slide-color-input__wrapper">
              <input
                type="color"
                value={item.bgColor || "#0f172a"}
                onChange={(e) => onBgColorChange(item.id, e.target.value)}
                className="slide-color-input__picker"
              />
              <span className="slide-color-input__hex">{item.bgColor || "#0f172a"}</span>
            </div>
          </div>

          <div className="qr-feed-input__item-bg-image">
            <label>Afbeelding (optioneel)</label>
            {item.bgImage ? (
              <div className="qr-feed-input__item-thumb-row">
                <img
                  src={item.bgImage}
                  alt=""
                  className="qr-feed-input__item-thumb"
                />
                <button
                  type="button"
                  className="btn-icon btn-icon--danger"
                  onClick={() => onBgImageRemove(item.id)}
                  title="Verwijder afbeelding"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="qr-feed-input__item-upload-row">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files?.[0]) onBgImageUpload(item.id, e.target.files[0]);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Image size={13} />
                  {isUploading ? "Uploaden…" : "Upload"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onOpenLibrary(item.id)}
                  title="Kies uit bibliotheek"
                >
                  <BookImage size={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Text */}
        <textarea
          className="qr-feed-input__textarea"
          value={item.text || ""}
          onChange={(e) => onTextChange(item.id, e.target.value)}
          placeholder="Tekst (optioneel — laat leeg voor alleen achtergrond)"
          rows={2}
        />
      </div>

      <button
        type="button"
        className="btn-icon btn-icon--danger"
        onClick={() => onRemove(item.id)}
        title="Verwijder slide"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function QrFeedInput({
  qrUrl,
  onQrUrlChange,
  qrLabel,
  onQrLabelChange,
  qrLeftBgColor,
  onQrLeftBgColorChange,
  qrLeftTextColor,
  onQrLeftTextColorChange,
  qrPanelColor,
  onQrPanelColorChange,
  qrPanelTextColor,
  onQrPanelTextColorChange,
  qrTextSlides,
  onQrTextSlidesChange,
  qrTextInterval,
  onQrTextIntervalChange,
  onQrSlideImageUpload,
  onOpenQrSlideLibrary,
  uploadingQrSlideId,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const addSlide = () => {
    onQrTextSlidesChange([...qrTextSlides, { id: Date.now(), text: "", bgColor: "", bgImage: "" }]);
  };

  const removeSlide = (id) => {
    onQrTextSlidesChange(qrTextSlides.filter((s) => s.id !== id));
  };

  const updateField = (id, field, value) => {
    onQrTextSlidesChange(qrTextSlides.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = qrTextSlides.findIndex((s) => s.id === active.id);
    const newIndex = qrTextSlides.findIndex((s) => s.id === over.id);
    onQrTextSlidesChange(arrayMove(qrTextSlides, oldIndex, newIndex));
  };

  return (
    <div className="qr-feed-input">

      {/* LEFT — slides */}
      <div className="qr-feed-input__section">
        <div className="qr-feed-input__section-header">
          <h4 className="qr-feed-input__section-title">
            <PanelLeft size={15} /> Slides (links)
          </h4>
          <div className="qr-feed-input__interval">
            <label>Interval</label>
            <input
              type="number"
              min={2}
              max={60}
              value={qrTextInterval}
              onChange={(e) =>
                onQrTextIntervalChange(Math.max(2, parseInt(e.target.value) || 5))
              }
              className="form-input form-input--small"
            />
            <span>s</span>
          </div>
        </div>

        <div className="qr-feed-input__colors">
          <ColorField
            label="Standaard achtergrond"
            value={qrLeftBgColor}
            onChange={onQrLeftBgColorChange}
          />
          <ColorField
            label="Tekstkleur"
            value={qrLeftTextColor}
            onChange={onQrLeftTextColorChange}
          />
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={qrTextSlides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {qrTextSlides.map((item) => (
              <SortableTextSlide
                key={item.id}
                item={item}
                onRemove={removeSlide}
                onTextChange={(id, val) => updateField(id, "text", val)}
                onBgColorChange={(id, val) => updateField(id, "bgColor", val)}
                onBgImageUpload={onQrSlideImageUpload}
                onBgImageRemove={(id) => updateField(id, "bgImage", "")}
                onOpenLibrary={onOpenQrSlideLibrary}
                uploadingId={uploadingQrSlideId}
              />
            ))}
          </SortableContext>
        </DndContext>

        <button type="button" className="btn btn-secondary qr-feed-input__add-btn" onClick={addSlide}>
          <Plus size={16} /> Slide toevoegen
        </button>
      </div>

      {/* RIGHT — QR code */}
      <div className="qr-feed-input__section">
        <h4 className="qr-feed-input__section-title">
          <QrCode size={15} /> QR code (rechts)
        </h4>

        <div className="form-group">
          <label>URL</label>
          <input
            type="url"
            className="form-input"
            placeholder="https://jouwwebsite.nl"
            value={qrUrl}
            onChange={(e) => onQrUrlChange(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Label onder QR (optioneel)</label>
          <input
            type="text"
            className="form-input"
            placeholder="Bijv. Scan voor meer info"
            value={qrLabel}
            onChange={(e) => onQrLabelChange(e.target.value)}
          />
        </div>

        <div className="qr-feed-input__colors">
          <ColorField
            label="Achtergrond QR-vlak"
            value={qrPanelColor}
            onChange={onQrPanelColorChange}
          />
          <ColorField
            label="QR & labelkleur"
            value={qrPanelTextColor}
            onChange={onQrPanelTextColorChange}
          />
        </div>
      </div>

    </div>
  );
}

export default QrFeedInput;

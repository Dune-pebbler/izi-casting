import React, { useState, useEffect, useRef } from "react";
import { X, LayoutGrid, Image, FileText, Play, Tv, Globe } from "lucide-react";

const SLIDE_TYPES = [
  { id: "side-by-side", label: "Afbeelding + Tekst", icon: LayoutGrid },
  { id: "image-only", label: "Afbeelding", icon: Image },
  { id: "text-only", label: "Tekst", icon: FileText },
  { id: "video", label: "Video", icon: Play },
  { id: "teletekst", label: "Teletekst", icon: Tv },
  { id: "iframe", label: "Website", icon: Globe },
];

const AddSlideModal = ({ isOpen, onClose, onConfirm }) => {
  const [name, setName] = useState("");
  const [layout, setLayout] = useState("side-by-side");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setLayout("side-by-side");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed, layout);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") onClose();
  };

  return (
    <div className="move-slide-modal">
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content"
          style={{ padding: "0px" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h3>Nieuwe slide toevoegen</h3>
            <button
              onClick={onClose}
              className="modal-close-btn"
              title="Sluiten"
            >
              <X size={20} />
            </button>
          </div>

          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="slide-name-input">Naam</label>
              <input
                id="slide-name-input"
                ref={inputRef}
                type="text"
                className="form-input"
                placeholder="Bijv. Welkomstscherm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            <div className="form-group">
              <label>Type</label>
              <div className="add-slide-type-grid">
                {SLIDE_TYPES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className={`add-slide-type-btn${layout === id ? " active" : ""}`}
                    onClick={() => setLayout(id)}
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button onClick={onClose} className="btn btn-secondary">
              Annuleren
            </button>
            <button
              onClick={handleConfirm}
              disabled={!name.trim()}
              className="btn btn-primary"
            >
              Slide aanmaken
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSlideModal;

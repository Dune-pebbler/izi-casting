import React, { useState, useEffect, useRef } from "react";
import {
  X,
  LayoutGrid,
  Image,
  FileText,
  Play,
  Tv,
  Globe,
  Images,
  Timer,
  CalendarDays,
  Mail,
  Trophy,
  CloudIcon,
  QrCode,
} from "lucide-react";

const SLIDE_TYPES = [
  { id: "side-by-side", label: "Afbeelding + Tekst", icon: LayoutGrid },
  { id: "image-only", label: "Afbeelding", icon: Image },
  { id: "text-only", label: "Tekst", icon: FileText },
  { id: "video", label: "Video", icon: Play },
  { id: "teletekst", label: "Teletekst", icon: Tv },
  { id: "iframe", label: "Website", icon: Globe },
  { id: "gallery", label: "Fotogalerij", icon: Images },
  { id: "countdown", label: "Afteltimer", icon: Timer },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "email", label: "E-mail inbox", icon: Mail },
  {
    id: "sportlink-programma",
    label: "Sportlink - Programma",
    icon: Trophy,
    gateKey: "sportlink",
  },
  {
    id: "sportlink-uitslagen",
    label: "Sportlink - Uitslagen",
    icon: Trophy,
    gateKey: "sportlink",
  },
  {
    id: "sportlink-poulestand",
    label: "Sportlink - Poulestand",
    icon: Trophy,
    gateKey: "sportlink",
  },
  { id: "weather", label: "Weer", icon: CloudIcon },
  { id: "qr-feed", label: "QR + Tekst", icon: QrCode },
];

const AddSlideModal = ({ isOpen, onClose, onConfirm, slideTypes = {} }) => {
  const [name, setName] = useState("");
  const [layout, setLayout] = useState("side-by-side");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      const hasSlideTypeConfig = Object.keys(slideTypes).length > 0;
      const firstAllowed = hasSlideTypeConfig
        ? SLIDE_TYPES.find(({ id, gateKey }) => slideTypes[gateKey || id])?.id
        : "side-by-side";
      setLayout(firstAllowed || "side-by-side");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, slideTypes]);

  if (!isOpen) return null;

  const hasSlideTypeConfig = Object.keys(slideTypes).length > 0;
  const visibleTypes = hasSlideTypeConfig
    ? SLIDE_TYPES.filter(({ id, gateKey }) => slideTypes[gateKey || id])
    : SLIDE_TYPES;

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
                {visibleTypes.map(({ id, label, icon: Icon }) => (
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

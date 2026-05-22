import React, { useState } from "react";
import {
  X,
  Music2,
  Copy,
  GripVertical,
  Eye,
  EyeOff,
  Plus,
  ChevronsUpDown,
  Play,
  Tv,
  Trash2,
  Globe,
  Clock,
  Images,
  LayoutGrid,
  FileText,
  LucideImage,
  MoreVertical,
  Timer,
  CalendarDays,
  Sparkles,
  Mail,
  Trophy,
  CloudIcon,
  ScanQrCode,
  Rotate3dIcon,
} from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "sonner";
import QRCode from "react-qr-code";

const MODULES = [
  {
    key: "backgroundMusic",
    label: "Achtergrondmuziek",
    description: "Speel achtergrondmuziek af op het display",
    icon: Music2,
  },
  {
    key: "slideEffects",
    label: "Slide effects",
    description: "Voeg effecten toe op de slide!",
    icon: Sparkles,
  },
  {
    key: "rotateDevice",
    label: "Scherm draaien",
    description: "Draai een scherm 90, 180 or 270 om",
    icon: Rotate3dIcon,
  },
];

const SLIDETYPES = [
  {
    key: "video",
    label: "Video",
    description: "Speel een video af op de achtergrond van youtube of vimeo",
    icon: Play,
  },
  {
    key: "iframe",
    label: "Website",
    description: "Toon bijvoorbeeld een website in een slide",
    icon: Globe,
  },
  {
    key: "side-by-side",
    label: "Afbeelding met tekst",
    description: "Een slide met een foto en tekst",
    icon: LayoutGrid,
  },
  {
    key: "text-only",
    label: "Tekst",
    description: "Een slide met alleen tekst",
    icon: FileText,
  },
  {
    key: "image-only",
    label: "Afbeelding",
    description: "Een slide met alleen een afbeelding",
    icon: Music2,
  },
  {
    key: "teletekst",
    label: "Teletekst",
    description: "Een slide waarbij de teletekst pagina word uitgelezen",
    icon: Tv,
  },
  {
    key: "gallery",
    label: "Gallerij",
    description: "Toon meerdere afbeeldingen in 1 slide",
    icon: Images,
  },
  {
    key: "countdown",
    label: "Aftel",
    description: "Toon een slide waar afgeteld word tot een bepaalde datum",
    icon: Timer,
  },
  {
    key: "agenda",
    label: "Agenda",
    description: "Laat de klant agenda's toevoegen met ICal links",
    icon: CalendarDays,
  },
  {
    key: "email",
    label: "Gmail",
    description:
      "Laat een overzicht zien van de meest recente ongelezen emails.",
    icon: Mail,
  },
  {
    key: "sportlink",
    label: "Sportlink",
    description:
      "Toon wedstrijdprogramma, uitslagen of poulestand via Sportlink Club.Dataservice.",
    icon: Trophy,
  },
  {
    key: "weather",
    label: "Weer",
    description: "Toon de weersvoorspelling in een bepaalde regio",
    icon: CloudIcon,
  },
  {
    key: "qr-feed",
    label: "QR + Tekst",
    description: "Toon inhoud met een QR code om te scannen voor jou content!",
    icon: ScanQrCode,
  },
];

function EditTenantModal({ tenant, onClose }) {
  const [displayName, setDisplayName] = useState(tenant.name || "");
  const [modules, setModules] = useState(tenant.modules || {});
  const hasSlideTypeConfig = Object.keys(tenant.slideTypes || {}).length > 0;
  const [slideTypes, setSlideTypes] = useState(
    hasSlideTypeConfig
      ? tenant.slideTypes
      : Object.fromEntries(SLIDETYPES.map(({ key }) => [key, true])),
  );
  const [isSaving, setIsSaving] = useState(false);

  const toggleModule = (key) => {
    setModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSlideTypes = (key) => {
    setSlideTypes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    const name = displayName.trim();
    if (!name) {
      toast.error("Voer een weergavenaam in");
      return;
    }
    setIsSaving(true);

    const normalizedSlideTypes = Object.fromEntries(
      SLIDETYPES.map(({ key }) => [key, slideTypes[key] === true]),
    );

    try {
      await setDoc(
        doc(db, "tenants", tenant.id),
        { name, modules, slideTypes: normalizedSlideTypes },
        { merge: true },
      );
      toast.success(`Klant "${name}" bijgewerkt`);
      onClose();
    } catch (error) {
      toast.error("Fout bij opslaan: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay create-tenant-modal-overlay"
      onClick={onClose}
    >
      <div
        className="modal create-tenant-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Klant bewerken</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div
          className="modal-body"
          style={{ height: "50vh", overflowY: "scroll" }}
        >
          <div className="form-group">
            <label>URL-pad</label>
            <div className="subdomain-input-wrapper">
              <span className="subdomain-prefix">izi-casting.com/</span>
              <input
                type="text"
                className="form-input"
                value={tenant.id}
                disabled
              />
            </div>
            <small className="form-hint">
              Het URL-pad kan niet worden gewijzigd.
            </small>
          </div>

          <div className="form-group">
            <label>Weergavenaam</label>
            <input
              type="text"
              className="form-input"
              placeholder="Bakkerij de Groot"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Modules</label>
            <div className="tenant-modules-list">
              {MODULES.map(({ key, label, description, icon: Icon }) => (
                <div key={key} className="tenant-module-row">
                  <div className="tenant-module-info">
                    <Icon size={15} className="tenant-module-icon" />
                    <div>
                      <span className="tenant-module-label">{label}</span>
                      <span className="tenant-module-description">
                        {description}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`module-toggle ${modules[key] ? "on" : "off"}`}
                    onClick={() => toggleModule(key)}
                    aria-label={`${label} ${modules[key] ? "uitschakelen" : "inschakelen"}`}
                  >
                    <span className="module-toggle-thumb" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Actieve type slides</label>
            <div className="tenant-modules-list">
              {SLIDETYPES.map(({ key, label, description, icon: Icon }) => (
                <div key={key} className="tenant-module-row">
                  <div className="tenant-module-info">
                    <Icon size={15} className="tenant-module-icon" />
                    <div>
                      <span className="tenant-module-label">{label}</span>
                      <span className="tenant-module-description">
                        {description}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`module-toggle ${slideTypes[key] ? "on" : "off"}`}
                    onClick={() => toggleSlideTypes(key)}
                    aria-label={`${label} ${slideTypes[key] ? "uitschakelen" : "inschakelen"}`}
                  >
                    <span className="module-toggle-thumb" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Annuleren
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Opslaan..." : "Opslaan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditTenantModal;

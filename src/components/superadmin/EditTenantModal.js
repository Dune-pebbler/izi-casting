import React, { useState } from "react";
import { X, Music2 } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "sonner";

const MODULES = [
  {
    key: "backgroundMusic",
    label: "Achtergrondmuziek",
    description: "Speel achtergrondmuziek af op het display",
    icon: Music2,
  },
];

function EditTenantModal({ tenant, onClose }) {
  const [displayName, setDisplayName] = useState(tenant.name || "");
  const [modules, setModules] = useState(tenant.modules || {});
  const [isSaving, setIsSaving] = useState(false);

  const toggleModule = (key) => {
    setModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    const name = displayName.trim();
    if (!name) {
      toast.error("Voer een weergavenaam in");
      return;
    }
    setIsSaving(true);
    try {
      await setDoc(
        doc(db, "tenants", tenant.id),
        { name, modules },
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

        <div className="modal-body">
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

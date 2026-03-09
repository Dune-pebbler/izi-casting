import React, { useState } from "react";
import { X } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "sonner";

function EditTenantModal({ tenant, onClose }) {
  const [displayName, setDisplayName] = useState(tenant.name || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const name = displayName.trim();
    if (!name) {
      toast.error("Voer een weergavenaam in");
      return;
    }
    setIsSaving(true);
    try {
      await setDoc(doc(db, "tenants", tenant.id), { name }, { merge: true });
      toast.success(`Klant "${name}" bijgewerkt`);
      onClose();
    } catch (error) {
      toast.error("Fout bij opslaan: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay create-tenant-modal-overlay" onClick={onClose}>
      <div className="modal create-tenant-modal" onClick={(e) => e.stopPropagation()}>
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
            <small className="form-hint">Het URL-pad kan niet worden gewijzigd.</small>
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

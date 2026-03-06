import React, { useState } from "react";
import { X } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "sonner";

function CreateTenantModal({ isOpen, onClose, onCreated }) {
  const [subdomain, setSubdomain] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [emailsInput, setEmailsInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    const tenantId = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    const name = displayName.trim();
    if (!tenantId) {
      toast.error("Voer een geldig subdomein in (alleen letters, cijfers en koppeltekens)");
      return;
    }
    if (!name) {
      toast.error("Voer een weergavenaam in");
      return;
    }

    const authorizedUsers = emailsInput
      .split(/[\n,;]/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@"));

    setIsCreating(true);
    try {
      await setDoc(doc(db, "tenants", tenantId), {
        name,
        subdomain: tenantId,
        authorizedUsers,
        createdAt: new Date().toISOString(),
      });
      toast.success(`Tenant "${name}" aangemaakt`);
      onCreated?.();
      onClose();
      setSubdomain("");
      setDisplayName("");
      setEmailsInput("");
    } catch (error) {
      toast.error("Fout bij aanmaken: " + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal create-tenant-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nieuwe tenant aanmaken</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Subdomein</label>
            <div className="subdomain-input-wrapper">
              <input
                type="text"
                className="form-input"
                placeholder="bakkerij"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              />
              <span className="subdomain-suffix">.izi-casting.com</span>
            </div>
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
            <label>Geautoriseerde gebruikers (e-mails, één per regel)</label>
            <textarea
              className="form-input"
              rows={4}
              placeholder="gebruiker@bedrijf.nl"
              value={emailsInput}
              onChange={(e) => setEmailsInput(e.target.value)}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Annuleren
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? "Aanmaken..." : "Tenant aanmaken"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateTenantModal;

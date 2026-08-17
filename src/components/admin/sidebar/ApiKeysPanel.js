import React, { useEffect, useState } from "react";
import {
  KeyRound,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Copy,
  Check,
} from "lucide-react";
import {
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../../firebase";
import { tenantCollection } from "../../../utils/tenantPaths";
import { toast } from "sonner";

async function generateApiKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  const token = `izi_${hex}`;

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  const hash = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

  return { token, hash };
}

function formatDate(value) {
  const date = value?.toDate ? value.toDate() : value;
  if (!date) return "nooit";
  return new Date(date).toLocaleDateString("nl-NL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ApiKeysPanel({ tenantId }) {
  const [keys, setKeys] = useState([]);
  const [newLabel, setNewLabel] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState(null);
  const [copied, setCopied] = useState(false);

  const loadKeys = async (id) => {
    try {
      const snapshot = await getDocs(tenantCollection(db, id, "apiKeys"));
      setKeys(
        snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
          ),
      );
    } catch (error) {
      console.error("Error loading API keys:", error);
    }
  };

  useEffect(() => {
    loadKeys(tenantId);
  }, [tenantId]);

  const handleCreate = async () => {
    const label = newLabel.trim();
    if (!label) {
      toast.error("Voer een naam voor de API key in");
      return;
    }
    setIsCreating(true);
    try {
      const { token, hash } = await generateApiKey();
      await addDoc(tenantCollection(db, tenantId, "apiKeys"), {
        label,
        hash,
        active: true,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || "",
        lastUsedAt: null,
      });
      setNewLabel("");
      setRevealedSecret(token);
      await loadKeys(tenantId);
      toast.success(`API key "${label}" aangemaakt`);
    } catch (error) {
      toast.error("Fout bij aanmaken: " + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (key) => {
    try {
      await updateDoc(doc(db, "tenants", tenantId, "apiKeys", key.id), {
        active: !key.active,
      });
      await loadKeys(tenantId);
    } catch (error) {
      toast.error("Fout bij opslaan: " + error.message);
    }
  };

  const handleDelete = async (key) => {
    try {
      await deleteDoc(doc(db, "tenants", tenantId, "apiKeys", key.id));
      setKeys((prev) => prev.filter((k) => k.id !== key.id));
      toast.success(`API key "${key.label}" verwijderd`);
    } catch (error) {
      toast.error("Fout bij verwijderen: " + error.message);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(revealedSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="sidebar-section">
      <div className="sidebar-api-keys">
        <button
          className="settings-toggle-btn"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="settings-toggle-left">
            <KeyRound size={16} />
            <span>API keys ({keys.length})</span>
          </div>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <div className={`collapsible-wrapper${isExpanded ? " expanded" : ""}`}>
          <div className="sidebar-users users-collapse-inner">
            {revealedSecret && (
              <div className="api-key-reveal">
                <p>Bewaar deze key nu goed, hij wordt niet nogmaals getoond:</p>
                <div className="api-key-reveal-row">
                  <code>{revealedSecret}</code>
                  <button
                    className="user-remove-btn"
                    onClick={handleCopy}
                    title="Kopieer"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <button
                  className="api-key-reveal-close"
                  onClick={() => setRevealedSecret(null)}
                >
                  Sluiten
                </button>
              </div>
            )}
            <ul className="users-list">
              {keys.length === 0 && (
                <li className="user-empty">Nog geen API keys</li>
              )}
              {keys.map((key) => (
                <li key={key.id} className="user-item">
                  <div className="api-key-info">
                    <span className="user-email">{key.label}</span>
                    <span className="api-key-meta">
                      aangemaakt {formatDate(key.createdAt)} · laatst gebruikt{" "}
                      {formatDate(key.lastUsedAt)}
                      {key.active === false && " · ingetrokken"}
                    </span>
                  </div>
                  <div className="user-item-actions">
                    <button
                      className="btn btn-sm"
                      onClick={() => handleToggleActive(key)}
                      title={key.active === false ? "Activeren" : "Intrekken"}
                    >
                      {key.active === false ? "Activeren" : "Intrekken"}
                    </button>
                    <button
                      className="user-remove-btn"
                      onClick={() => handleDelete(key)}
                      title="Verwijderen"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="user-add-form mt-1">
              <input
                type="text"
                className="user-email-input"
                placeholder="naam (bv. planningssysteem)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <button
                className="btn btn-sm btn-primary"
                onClick={handleCreate}
                disabled={isCreating}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApiKeysPanel;

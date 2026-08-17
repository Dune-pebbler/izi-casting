import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Trophy, Eye, EyeOff } from "lucide-react";
import { setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase";
import { useTenant } from "../../../context/TenantContext";
import { tenantDoc } from "../../../utils/tenantPaths";
import { toast } from "sonner";

function SportlinkSettings() {
  const { tenantId } = useTenant();
  const [isExpanded, setIsExpanded] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const settingsDocRef = tenantDoc(db, tenantId, "display", "settings");
    const unsubscribe = onSnapshot(settingsDocRef, (snap) => {
      if (snap.exists()) {
        setApiKey(snap.data().sportlinkApiKey || "");
      }
    });
    return () => unsubscribe();
  }, [tenantId]);

  const handleSave = async () => {
    setIsSaving(true);
    const loadingToast = toast.loading("Opslaan...");
    try {
      const settingsDocRef = tenantDoc(db, tenantId, "display", "settings");
      await setDoc(
        settingsDocRef,
        { sportlinkApiKey: apiKey },
        { merge: true },
      );
      toast.dismiss(loadingToast);
      toast.success("Sportlink instellingen opgeslagen!");
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Fout bij opslaan: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="sidebar-section">
      <div className="settings-container" style={{ marginBottom: "0px" }}>
        <div className="settings-header">
          <button
            className="settings-toggle-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="settings-toggle-left">
              <Trophy size={16} />
              <span>Sportlink instellingen</span>
            </div>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        <div className={`collapsible-wrapper${isExpanded ? " expanded" : ""}`}>
          <div className="settings-content">
            <div className="settings-section">
              <div className="bar-style-settings">
                <div className="bar-style-input-group">
                  <label htmlFor="sportlinkApiKey">API key (Client ID)</label>
                  <div className="sportlink-input__api-key-wrapper">
                    <input
                      id="sportlinkApiKey"
                      type={showApiKey ? "text" : "password"}
                      className="bar-style-select sportlink-input__api-key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="API key..."
                    />
                    <button
                      type="button"
                      className="sportlink-input__api-key-toggle"
                      onClick={() => setShowApiKey((v) => !v)}
                      title={showApiKey ? "Verberg API key" : "Toon API key"}
                    >
                      {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="sportlink-input__hint">
                    Deze API key wordt gebruikt door alle Sportlink-slides van
                    deze tenant. Je Client ID vind je in Sportlink
                    Club.Dataservice.
                  </p>
                </div>
              </div>
            </div>

            <div className="settings-actions">
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
      </div>
    </div>
  );
}

export default SportlinkSettings;

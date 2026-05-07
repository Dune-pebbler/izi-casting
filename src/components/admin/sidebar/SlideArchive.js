import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  ChevronDown,
  ChevronUp,
  X,
  Type,
  Trash2,
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../../../firebase";
import { toast } from "sonner";
import { useTenant } from "../../../context/TenantContext";
import { tenantDoc, tenantStorageRef } from "../../../utils/tenantPaths";

function Settings({ onOpenTrash, trashedSlidesCount = 0 }) {
  const { tenantId } = useTenant();
  const [isSlideArchiveExpanded, setIsSlideArchiveExpanded] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="sidebar-section">
      <div className="settings-container" style={{ marginBottom: "0px" }}>
        <div className="settings-header">
          <button
            className="settings-toggle-btn"
            onClick={() => setIsSlideArchiveExpanded(!isSlideArchiveExpanded)}
          >
            <div className="settings-toggle-left">
              <Trash2 size={16} />
              <span>Verwijderde slides</span>
              {trashedSlidesCount !== 0 && (
                <span
                  className="trash-count-badge"
                  style={{ color: "white", backgroundColor: "red" }}
                >
                  {trashedSlidesCount}
                </span>
              )}
            </div>
            {isSlideArchiveExpanded ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>
        </div>

        <div
          className={`collapsible-wrapper${isSlideArchiveExpanded ? " expanded" : ""}`}
        >
          <div className="settings-content">
            {/* Trash Button */}
            <div className="settings-section">
              {trashedSlidesCount === 0 && (
                <div
                  className="warning alert alert-warning"
                  style={{
                    backgroundColor: "#fff3cd",
                    color: "#856404",
                    borderColor: "#ffeeba",
                    padding: ".75rem 1.25rem",
                    borderRadius: ".25rem",
                  }}
                >
                  Er geen geen slides verwijderd
                </div>
              )}
              {trashedSlidesCount !== 0 && (
                <button
                  className="sidebar-trash-btn"
                  onClick={onOpenTrash}
                  title="Prullenbak openen"
                >
                  <Trash2 size={20} />
                  <span>Verwijderde slides beheren</span>
                  {trashedSlidesCount > 0 && (
                    <span className="trash-count-badge">
                      {trashedSlidesCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;

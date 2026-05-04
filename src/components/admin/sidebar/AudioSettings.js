import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Music2 } from "lucide-react";
import { setDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../firebase";
import { useTenant } from "../../../context/TenantContext";
import { tenantDoc, tenantStorageRef } from "../../../utils/tenantPaths";
import { toast } from "sonner";

function AudioSettings() {
  const { tenantId } = useTenant();
  const [isExpanded, setIsExpanded] = useState(false);
  const [uploadingMusicFile, setUploadingMusicFile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const musicFileInputRef = useRef(null);

  const [music, setMusic] = useState({
    enabled: false,
    url: "",
    volume: 1.0,
    fileName: "",
  });

  useEffect(() => {
    const settingsDocRef = tenantDoc(db, tenantId, "display", "settings");
    const unsubscribe = onSnapshot(settingsDocRef, (snap) => {
      if (snap.exists()) {
        const m = snap.data().backgroundMusic;
        if (m) setMusic((prev) => ({ ...prev, ...m }));
      }
    });
    return () => unsubscribe();
  }, [tenantId]);

  const handleMusicUpload = async (file) => {
    if (!file) return;
    setUploadingMusicFile(true);
    const loadingToast = toast.loading("Audiobestand uploaden...");
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const audioRef = tenantStorageRef(storage, tenantId, `audio/${fileName}`);
      await uploadBytes(audioRef, file);
      const downloadURL = await getDownloadURL(audioRef);
      setMusic((prev) => ({ ...prev, url: downloadURL, fileName: file.name }));
      toast.dismiss(loadingToast);
      toast.success("Audiobestand geüpload!");
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Fout bij uploaden: " + error.message);
    } finally {
      setUploadingMusicFile(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const loadingToast = toast.loading("Opslaan...");
    try {
      const settingsDocRef = tenantDoc(db, tenantId, "display", "settings");
      await setDoc(settingsDocRef, { backgroundMusic: music }, { merge: true });
      toast.dismiss(loadingToast);
      toast.success("Muziekinstellingen opgeslagen!");
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
              <Music2 size={16} />
              <span>Achtergrondmuziek</span>
            </div>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        <div className={`collapsible-wrapper${isExpanded ? " expanded" : ""}`}>
          <div className="settings-content">
            {/* Ingeschakeld toggle */}
            <div className="settings-section">
              <div className="checkbox-setting">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={music.enabled}
                    onChange={(e) =>
                      setMusic((prev) => ({
                        ...prev,
                        enabled: e.target.checked,
                      }))
                    }
                    className="checkbox-input"
                  />
                  <span className="checkbox-text">Ingeschakeld</span>
                </label>
              </div>
            </div>

            {/* Stream URL */}
            <div className="settings-section">
              <div className="bar-style-settings">
                <div className="bar-style-input-group">
                  <label htmlFor="musicUrl">Stream URL of direct link</label>
                  <input
                    id="musicUrl"
                    type="url"
                    className="bar-style-select"
                    placeholder="https://stream.example.com/radio"
                    value={music.url}
                    onChange={(e) =>
                      setMusic((prev) => ({
                        ...prev,
                        url: e.target.value,
                        fileName: "",
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="music-divider">
              <span>Of</span>
            </div>

            {/* Bestand uploaden */}
            <div className="settings-section">
              <div className="bar-style-settings">
                <div className="bar-style-input-group">
                  <div
                    className="logo-upload-placeholder"
                    onClick={() => musicFileInputRef.current?.click()}
                  >
                    <label
                      className="logo-upload-label"
                      style={{ cursor: "pointer" }}
                    >
                      <span>
                        {uploadingMusicFile
                          ? "Uploaden..."
                          : music.fileName || "Selecteerd een audio bestand"}
                      </span>
                      <input
                        ref={musicFileInputRef}
                        type="file"
                        accept="audio/*"
                        style={{ display: "none" }}
                        onChange={(e) => handleMusicUpload(e.target.files[0])}
                        disabled={uploadingMusicFile}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Volume */}
            <div className="settings-section">
              <div className="bar-style-settings">
                <div className="bar-style-input-group">
                  <label htmlFor="musicVolume">
                    Volume: {Math.round(music.volume * 100)}%
                  </label>
                  <input
                    id="musicVolume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={music.volume}
                    onChange={(e) =>
                      setMusic((prev) => ({
                        ...prev,
                        volume: parseFloat(e.target.value),
                      }))
                    }
                    className="music-volume-slider"
                  />
                </div>
              </div>
            </div>

            {/* Opslaan */}
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

export default AudioSettings;

import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, ChevronDown, ChevronUp, X } from "lucide-react";
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../../../firebase";
import { toast } from "sonner";

function Settings() {
  const [isAdvancedSettingsExpanded, setIsAdvancedSettingsExpanded] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    logoUrl: "",
    logoName: "",
    backgroundColor: "#FAFAFA",
    foregroundColor: "#212121",
    feedUrl: "",
    showClock: true,
    barStyle: "onder",
  });

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, "display", "settings"));
        if (settingsDoc.exists()) {
          const loadedSettings = settingsDoc.data();
          setSettings(prev => ({
            ...prev,
            ...loadedSettings,
            // Ensure showClock is always present, default to true if missing
            showClock: loadedSettings.showClock !== undefined ? loadedSettings.showClock : true,
            // Ensure barStyle is always present, default to "onder" if missing
            barStyle: loadedSettings.barStyle || "onder",
          }));
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };

    loadSettings();
  }, []);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle logo upload
  const handleLogoUpload = async (file) => {
    if (!file) return;

    setUploadingLogo(true);
    const loadingToast = toast.loading("Logo uploaden...");

    try {
      const logoName = `logo_${Date.now()}_${file.name}`;
      const logoRef = ref(storage, `logos/${logoName}`);
      
      await uploadBytes(logoRef, file);
      const downloadURL = await getDownloadURL(logoRef);

      const newSettings = {
        ...settings,
        logoUrl: downloadURL,
        logoName: logoName,
      };

      setSettings(newSettings);

      // Save to Firestore
      await setDoc(doc(db, "display", "settings"), newSettings, {
        merge: true,
      });

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success("Logo succesvol geüpload!");
    } catch (error) {
      console.error("Error uploading logo:", error);

      // Dismiss loading toast and show error
      toast.dismiss(loadingToast);
      toast.error("Fout bij uploaden logo: " + error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  // Remove logo
  const removeLogo = async () => {
    // Show loading toast
    const loadingToast = toast.loading("Logo verwijderen...");

    try {
      if (settings.logoName) {
        try {
          const logoRef = ref(storage, `logos/${settings.logoName}`);
          await deleteObject(logoRef);
        } catch (error) {
          console.error("Error deleting logo:", error);
        }
      }

      const newSettings = {
        ...settings,
        logoUrl: "",
        logoName: "",
      };

      setSettings(newSettings);

      // Save to Firestore
      await setDoc(doc(db, "display", "settings"), newSettings, {
        merge: true,
      });

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success("Logo succesvol verwijderd!");
    } catch (error) {
      console.error("Error removing logo:", error);

      // Dismiss loading toast and show error
      toast.dismiss(loadingToast);
      toast.error("Fout bij verwijderen logo: " + error.message);
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    setIsSaving(true);

    // Show loading toast
    const loadingToast = toast.loading("Instellingen opslaan...");

    try {
      const settingsDocRef = doc(db, "display", "settings");
      await setDoc(settingsDocRef, settings, { merge: true });

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success("Instellingen succesvol opgeslagen!");
    } catch (error) {
      console.error("Error saving settings:", error);

      // Dismiss loading toast and show error
      toast.dismiss(loadingToast);
      toast.error("Fout bij opslaan instellingen: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="sidebar-section">
      <div className="settings-container">
        <div className="settings-header">
          <button
            className="settings-toggle-btn"
            onClick={() =>
              setIsAdvancedSettingsExpanded(!isAdvancedSettingsExpanded)
            }
          >
            <SettingsIcon size={16} />
            <span>Balk instellingen</span>
            {isAdvancedSettingsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {isAdvancedSettingsExpanded && (
          <div className="settings-content">
              {/* Logo Section - Full Width */}
              <div className="settings-section">
                <div className="logo-section">
                  <div className="logo-upload-area">
                    {settings.logoUrl ? (
                      <div className="logo-preview">
                        <div className="logo-image-container">
                          <img
                            src={settings.logoUrl}
                            alt="Logo"
                            className="logo-image"
                          />
                        <button
                          onClick={removeLogo}
                          className="logo-remove-btn"
                          disabled={uploadingLogo}
                          title="Remove Logo"
                        >
                          <X size={20} />
                        </button>
                        </div>
                      </div>
                    ) : (
                      <div className="logo-upload-placeholder">
                        <label className="logo-upload-label">
                          <div className="upload-icon">
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7,10 12,15 17,10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                          </div>
                          <span>Logo Uploaden</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleLogoUpload(e.target.files[0])
                            }
                            style={{ display: "none" }}
                            disabled={uploadingLogo}
                          />
                        </label>
                        {uploadingLogo && (
                          <div className="upload-status">Uploaden...</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Color Settings Row */}
              <div className="settings-section">
                <div className="color-settings">
                  <div className="color-input-group">
                    <label htmlFor="backgroundColor">Achtergrond Kleur</label>
                    <div className="color-input-wrapper">
                      <input
                        type="color"
                        id="backgroundColor"
                        value={settings.backgroundColor}
                        onChange={(e) =>
                          handleInputChange("backgroundColor", e.target.value)
                        }
                        className="color-picker"
                      />
                      <input
                        type="text"
                        value={settings.backgroundColor}
                        onChange={(e) =>
                          handleInputChange("backgroundColor", e.target.value)
                        }
                        className="color-text-input"
                        placeholder="#FAFAFA"
                      />
                    </div>
                  </div>

                  <div className="color-input-group">
                    <label htmlFor="foregroundColor">Tekst Kleur</label>
                    <div className="color-input-wrapper">
                      <input
                        type="color"
                        id="foregroundColor"
                        value={settings.foregroundColor}
                        onChange={(e) =>
                          handleInputChange("foregroundColor", e.target.value)
                        }
                        className="color-picker"
                      />
                      <input
                        type="text"
                        value={settings.foregroundColor}
                        onChange={(e) =>
                          handleInputChange("foregroundColor", e.target.value)
                        }
                        className="color-text-input"
                        placeholder="#212121"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bar Style and Clock Settings Row */}
              <div className="settings-section settings-row">
                <div className="bar-style-settings">
                  <div className="bar-style-input-group">
                    <label htmlFor="barStyle">Balk Stijl</label>
                    <select
                      id="barStyle"
                      value={settings.barStyle}
                      onChange={(e) =>
                        handleInputChange("barStyle", e.target.value)
                      }
                      className="bar-style-select"
                    >
                      <option value="onder">Onder</option>
                      <option value="boven">Boven</option>
                      <option value="transparant onder">Transparant Onder</option>
                      <option value="transparant boven">Transparant Boven</option>
                    </select>
                  </div>
                </div>

                <div className="display-section">
                  <div className="checkbox-setting">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={settings.showClock}
                        onChange={(e) =>
                          handleInputChange("showClock", e.target.checked)
                        }
                        className="checkbox-input"
                      />
                      <span className="checkbox-text">Klok Tonen</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="settings-actions">
                <button
                  onClick={handleSaveSettings}
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? "Opslaan..." : "Instellingen Opslaan"}
                </button>
              </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;

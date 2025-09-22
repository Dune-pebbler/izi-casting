import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, ChevronDown, ChevronUp } from "lucide-react";
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
            showClock: loadedSettings.showClock !== undefined ? loadedSettings.showClock : true
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
    const loadingToast = toast.loading("Uploading logo...");

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
      toast.success("Logo uploaded successfully!");
    } catch (error) {
      console.error("Error uploading logo:", error);

      // Dismiss loading toast and show error
      toast.dismiss(loadingToast);
      toast.error("Error uploading logo: " + error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  // Remove logo
  const removeLogo = async () => {
    // Show loading toast
    const loadingToast = toast.loading("Removing logo...");

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
      toast.success("Logo removed successfully!");
    } catch (error) {
      console.error("Error removing logo:", error);

      // Dismiss loading toast and show error
      toast.dismiss(loadingToast);
      toast.error("Error removing logo: " + error.message);
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    setIsSaving(true);

    // Show loading toast
    const loadingToast = toast.loading("Saving settings...");

    try {
      const settingsDocRef = doc(db, "display", "settings");
      await setDoc(settingsDocRef, settings, { merge: true });

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);

      // Dismiss loading toast and show error
      toast.dismiss(loadingToast);
      toast.error("Error saving settings: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="sidebar-section">
      
      {isAdvancedSettingsExpanded ? (
        <div className="compact-settings">
          {/* Advanced Settings Toggle */}
          <div className="compact-settings-header">
            <button
              className="advanced-settings-btn"
              onClick={() =>
                setIsAdvancedSettingsExpanded(!isAdvancedSettingsExpanded)
              }
            >
              <SettingsIcon size={16} />
              <span>Geavanceerde instellingen</span>
              {isAdvancedSettingsExpanded ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>
          </div>

          {/* Advanced Settings Content */}
          {isAdvancedSettingsExpanded && (
            <div className="advanced-settings-content">
              {/* Logo Upload Section */}
              <div className="settings-section">
                <h3>Logo</h3>
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
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                      <label className="logo-change-text">
                        Change Logo
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
                        <span>Upload Logo</span>
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
                        <div className="upload-status">Uploading...</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Display Settings Section */}
              <div className="settings-section">
                <h3>Display Settings</h3>
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
                    <span className="checkbox-text">Show Clock</span>
                  </label>
                </div>
              </div>

              {/* Color Settings Section */}
              <div className="settings-section">
                <h3>Colors</h3>
                <div className="color-settings">
                  <div className="color-input-group">
                    <label htmlFor="backgroundColor">Background Color</label>
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
                    <label htmlFor="foregroundColor">Foreground Color</label>
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

              {/* Save Button */}
              <div className="settings-actions">
                <button
                  onClick={handleSaveSettings}
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="compact-settings">
          <div
            className="compact-settings-header"
            onClick={() => setIsAdvancedSettingsExpanded(true)}
          >
            <SettingsIcon size={16} />
            <span>Geavanceerde instellingen</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;

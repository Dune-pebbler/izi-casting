import React, { useState, useEffect } from "react";
import {
  Edit2,
  Check,
  X as XIcon,
  RotateCcw,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { toast } from "sonner";
import { useTenant } from "../../../context/TenantContext";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  setLinkedDevices,
  setShowPairingForm,
  setIsPairing,
  setPairingError,
  clearPairingError,
} from "../../../store/slices/deviceSlice";

function Devices({ setDeviceToDelete, deleteDevice }) {
  const { tenantId } = useTenant();
  // Redux state
  const dispatch = useAppDispatch();
  const linkedDevices = useAppSelector((state) => state.device.linkedDevices);
  const showPairingForm = useAppSelector(
    (state) => state.device.showPairingForm,
  );
  const isPairing = useAppSelector((state) => state.device.isPairing);
  const pairingError = useAppSelector((state) => state.device.pairingError);

  // Local state (component-specific)
  const [enteredPairingCode, setEnteredPairingCode] = useState("");
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [editingDeviceName, setEditingDeviceName] = useState("");
  const [refreshingDevices, setRefreshingDevices] = useState(new Set());
  const [, setLastSeenUpdate] = useState(Date.now());

  console.log("Linked devices:", linkedDevices);

  // Update "last seen" display every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setLastSeenUpdate(Date.now());
    }, 60000); // Update every 60 seconds
    return () => clearInterval(interval);
  }, []);

  // Listen for linked devices
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(
        collection(db, "devices"),
        where("isLinked", "==", true),
        where("tenantId", "==", tenantId),
      ),
      (snapshot) => {
        const devices = snapshot.docs.map((doc) => {
          const data = doc.data();

          // Convert Firebase Timestamps to strings to avoid serialization errors
          const serializedData = { ...data };

          // Convert refreshCommand timestamp if it exists
          if (
            serializedData.refreshCommand &&
            serializedData.refreshCommand.timestamp
          ) {
            serializedData.refreshCommand = {
              ...serializedData.refreshCommand,
              timestamp: serializedData.refreshCommand.timestamp.toDate
                ? serializedData.refreshCommand.timestamp.toDate().toISOString()
                : serializedData.refreshCommand.timestamp,
            };
          }

          // Convert other timestamps
          if (serializedData.lastSeen && serializedData.lastSeen.toDate) {
            serializedData.lastSeen = serializedData.lastSeen
              .toDate()
              .toISOString();
          }

          if (
            serializedData.pairingCodeGenerated &&
            serializedData.pairingCodeGenerated.toDate
          ) {
            serializedData.pairingCodeGenerated =
              serializedData.pairingCodeGenerated.toDate().toISOString();
          }

          return {
            id: doc.id,
            ...serializedData,
          };
        });
        console.log("Devices loaded:", devices); // Debug log
        dispatch(setLinkedDevices(devices));
      },
    );

    return () => unsubscribe();
  }, [dispatch]);

  // Handle pairing code submission
  const handlePairingSubmit = async () => {
    if (enteredPairingCode.length !== 5) {
      dispatch(setPairingError("Voer een geldige 5-cijferige koppelcode in"));
      return;
    }

    dispatch(setIsPairing(true));
    dispatch(clearPairingError());

    try {
      // Check if the pairing code exists and is valid
      const pairingDoc = await getDoc(
        doc(db, "pairing_codes", enteredPairingCode),
      );

      if (!pairingDoc.exists()) {
        dispatch(setPairingError("Ongeldige koppelcode"));
        dispatch(setIsPairing(false));
        return;
      }

      const pairingData = pairingDoc.data();
      if (pairingData.isUsed) {
        dispatch(setPairingError("Deze koppelcode is al gebruikt"));
        dispatch(setIsPairing(false));
        return;
      }

      // Check if device already exists and has a custom name
      let existingDeviceName = null;
      if (pairingData.deviceId) {
        const existingDevice = await getDoc(
          doc(db, "devices", pairingData.deviceId),
        );
        if (existingDevice.exists()) {
          existingDeviceName = existingDevice.data().customName;
        }
      }

      // Create or update device document
      const deviceData = {
        id: pairingData.deviceId,
        customName: existingDeviceName || `Display ${linkedDevices.length + 1}`,
        lastSeen: new Date(),
        deviceInfo: pairingData.deviceInfo || {},
        isLinked: true,
        isPaired: true, // Also set isPaired for DisplayView compatibility
      };

      // Write to root-level devices — includes tenantId so the display knows its tenant
      await setDoc(
        doc(db, "devices", pairingData.deviceId),
        { ...deviceData, tenantId },
        {
          merge: true,
        },
      );

      // Delete pairing code — it's been used, no need to keep it
      await deleteDoc(doc(db, "pairing_codes", enteredPairingCode));

      setEnteredPairingCode("");
      dispatch(setShowPairingForm(false));
      dispatch(clearPairingError());
      toast.success("Apparaat succesvol gekoppeld!");
    } catch (error) {
      console.error("Error pairing device:", error);
      dispatch(setPairingError("Fout bij koppelen van apparaat"));
    } finally {
      dispatch(setIsPairing(false));
    }
  };

  // Handle device name editing
  const handleEditName = (device) => {
    setEditingDeviceId(device.id);
    setEditingDeviceName(device.customName || device.id);
  };

  const handleSaveName = async (deviceId) => {
    try {
      await updateDoc(doc(db, "devices", deviceId), {
        customName: editingDeviceName.trim(),
      });
      setEditingDeviceId(null);
      setEditingDeviceName("");
      toast.success("Naam opgeslagen!");
    } catch (error) {
      console.error("Error saving device name:", error);
      toast.error("Fout bij opslaan van naam");
    }
  };

  const handleCancelEdit = () => {
    setEditingDeviceId(null);
    setEditingDeviceName("");
  };

  // Handle device refresh
  const handleRefreshDevice = async (deviceId) => {
    setRefreshingDevices((prev) => new Set(prev).add(deviceId));

    try {
      // Send refresh command to device_commands collection
      await setDoc(doc(db, "device_commands", deviceId), {
        command: "refresh",
        action: "restart_slides",
        timestamp: new Date(),
        processed: false,
      });

      toast.success("Scherm is herstart!");
    } catch (error) {
      console.error("Error sending refresh command:", error);
      toast.error("Fout bij verzenden van refresh commando");
    } finally {
      setRefreshingDevices((prev) => {
        const newSet = new Set(prev);
        newSet.delete(deviceId);
        return newSet;
      });
    }
  };

  // Utility functions
  const getDisplayName = (device) => {
    return device.customName || device.id;
  };

  const isDeviceOnline = (lastSeen) => {
    if (!lastSeen) return false;
    const lastSeenDate = lastSeen.toDate
      ? lastSeen.toDate()
      : new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = (now - lastSeenDate) / (1000 * 60);
    return diffInMinutes < 5; // Consider device online if seen in last 5 minutes
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return "Nooit";

    const lastSeenDate = lastSeen.toDate
      ? lastSeen.toDate()
      : new Date(lastSeen);
    const now = new Date();
    const diffInSeconds = Math.floor((now - lastSeenDate) / 1000);

    if (diffInSeconds < 60) return "Zojuist";

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${diffInMinutes === 1 ? "minuut" : "minuten"} geleden`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? "uur" : "uur"} geleden`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} ${diffInDays === 1 ? "dag" : "dagen"} geleden`;
  };

  // Count online devices
  const onlineDevices = linkedDevices.filter(
    (device) => device.isPaired && isDeviceOnline(device.lastSeen),
  );

  const [isDeviceSettingsExpanded, setIsDeviceSettingsExpanded] =
    useState(true);

  return (
    <div className="sidebar-devices">
      <button
        className="settings-toggle-btn"
        onClick={() => setIsDeviceSettingsExpanded(!isDeviceSettingsExpanded)}
      >
        <span>Schermen ({onlineDevices.length}) </span>
        {isDeviceSettingsExpanded ? (
          <ChevronUp size={16} />
        ) : (
          <ChevronDown size={16} />
        )}
      </button>
      <div className={`collapsible-wrapper${isDeviceSettingsExpanded ? ' expanded' : ''}`}>
        <div className="devices-content">
          {/* Pairing Section */}

          {/* Devices List */}
          {linkedDevices.length > 0 && (
            <div className="devices-list">
              {linkedDevices
                .filter(
                  (device) =>
                    device.isPaired && isDeviceOnline(device.lastSeen),
                ) // Only show paired and online devices
                .map((device) => (
                  <div key={device.id} className="device-item">
                    <div className="device-header">
                      <div className="device-header-left">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRefreshDevice(device.id);
                          }}
                          className="device-refresh-btn"
                          title="Slides opnieuw starten"
                          disabled={refreshingDevices.has(device.id)}
                        >
                          <RotateCcw
                            size={16}
                            className={
                              refreshingDevices.has(device.id) ? "rotating" : ""
                            }
                          />
                          <span>Ververs</span>
                        </button>
                        {editingDeviceId === device.id ? (
                          <input
                            type="text"
                            value={editingDeviceName}
                            onChange={(e) =>
                              setEditingDeviceName(e.target.value)
                            }
                            onBlur={() => handleSaveName(device.id)}
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                handleSaveName(device.id);
                              } else if (e.key === "Escape") {
                                handleCancelEdit();
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="device-name-input"
                            placeholder="Voer display naam in..."
                            maxLength={30}
                            autoFocus
                          />
                        ) : (
                          <div className="device-name-display">
                            <strong
                              className="device-name-title"
                              onClick={() => handleEditName(device)}
                            >
                              {getDisplayName(device)}
                            </strong>
                            <div className="device-last-seen">
                              Laatst gezien: {formatLastSeen(device.lastSeen)}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="device-header-right">
                        <button
                          onClick={() => setDeviceToDelete(device)}
                          className="device-delete-btn"
                          title="Apparaat ontkoppelen"
                        >
                          <XIcon size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Extra Screen Button - only show when devices are connected and not showing pairing form */}
          {onlineDevices.length > 0 && !showPairingForm && (
            <div
              className="extra-screen-button"
              onClick={() => dispatch(setShowPairingForm(true))}
            >
              <div className="extra-screen-content">
                <Plus size={24} />
                <span>Extra scherm toevoegen</span>
              </div>
            </div>
          )}

          <div className="pairing-section">
            {(onlineDevices.length === 0 || showPairingForm) && (
              <div className="pairing-form-display">
                <div className="pairing-form-header">
                  <h2>Apparaat koppelen</h2>
                  {onlineDevices.length > 0 && (
                    <button
                      onClick={() => {
                        dispatch(setShowPairingForm(false));
                        setEnteredPairingCode("");
                      }}
                      className="btn btn-outline btn-sm"
                    >
                      <XIcon size={20} />
                    </button>
                  )}
                </div>
                <div className="pairing-form-content">
                  <p className="pairing-instructions">
                    Voer de koppelcode in die op het scherm wordt getoond
                  </p>
                  <div className="pairing-code-inputs">
                    {[0, 1, 2, 3, 4].map((index) => (
                      <input
                        key={index}
                        type="text"
                        maxLength="1"
                        className="pairing-code-input"
                        value={enteredPairingCode[index] || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value.match(/^[0-9]$/)) {
                            const newCode = enteredPairingCode.split("");
                            newCode[index] = value;
                            const updatedCode = newCode.join("");
                            setEnteredPairingCode(updatedCode);

                            // Auto-focus next input
                            if (index < 4 && value) {
                              const nextInput =
                                e.target.parentNode.children[index + 1];
                              if (nextInput) nextInput.focus();
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          // Handle backspace
                          if (
                            e.key === "Backspace" &&
                            !enteredPairingCode[index] &&
                            index > 0
                          ) {
                            const newCode = enteredPairingCode.split("");
                            newCode[index - 1] = "";
                            setEnteredPairingCode(newCode.join(""));
                            const prevInput =
                              e.target.parentNode.children[index - 1];
                            if (prevInput) prevInput.focus();
                          }
                          // Handle enter
                          if (
                            e.key === "Enter" &&
                            enteredPairingCode.length === 5
                          ) {
                            handlePairingSubmit();
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pastedData = e.clipboardData.getData("text");
                          const numbers = pastedData
                            .replace(/\D/g, "")
                            .substring(0, 5);
                          const updatedCode = numbers.padEnd(5, "");
                          setEnteredPairingCode(updatedCode);
                        }}
                      />
                    ))}
                  </div>
                  <button
                    className={`btn btn-primary ${
                      enteredPairingCode.length === 5
                        ? "btn-active"
                        : "btn-inactive"
                    }`}
                    onClick={handlePairingSubmit}
                    disabled={enteredPairingCode.length !== 5 || isPairing}
                  >
                    {isPairing ? "Koppelen..." : "Apparaat koppelen"}
                  </button>
                  {pairingError && (
                    <p className="pairing-error">{pairingError}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Devices;

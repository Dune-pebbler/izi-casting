import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase";
import { tenantDoc } from "../../utils/tenantPaths";
import { hideExpiredCountdownSlides } from "../../utils/countdownUtils";
import {
  isSportlinkLayout,
  getSlideTypeGateKey,
} from "../../utils/sportlinkTypes";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  setIsPaired,
  setDeviceId,
  setDisplayPairingCode,
  setIsGeneratingCode,
  setPairingError,
  clearPairingError,
  setCodeTimeRemaining,
  setIsCodeFlashing,
} from "../../store/slices/deviceSlice";
import PairingScreen from "./PairingScreen";
import SlideDisplay from "./SlideDisplay";
import ProgressBar from "./ProgressBar";
import StatusBar from "./StatusBar/StatusBar";
import FullscreenIndicator from "./FullscreenIndicator";

function DisplayView() {
  // tenantId is NOT read from hostname here — it comes from the device document
  // after pairing, so displays can be hosted on any URL.
  const [displayTenantId, setDisplayTenantId] = useState(
    () => localStorage.getItem("izi_tenant_id") || null,
  );

  const dispatch = useAppDispatch();
  const isPaired = useAppSelector((state) => state.device.isPaired);
  const deviceId = useAppSelector((state) => state.device.deviceId);
  const displayPairingCode = useAppSelector(
    (state) => state.device.displayPairingCode,
  );
  const isGeneratingCode = useAppSelector(
    (state) => state.device.isGeneratingCode,
  );
  const pairingError = useAppSelector((state) => state.device.pairingError);
  const codeTimeRemaining = useAppSelector(
    (state) => state.device.codeTimeRemaining,
  );
  const isCodeFlashing = useAppSelector((state) => state.device.isCodeFlashing);

  const [playlists, setPlaylists] = useState([]);
  const [slides, setSlides] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);
  const [tenantModules, setTenantModules] = useState({});
  const [tenantSlideTypes, setTenantSlideTypes] = useState({});
  const [settings, setSettings] = useState({
    logoUrl: "",
    backgroundColor: "#FAFAFA",
    foregroundColor: "#212121",
    feedUrl: "",
    showClock: true,
    clockFormat: "HH:mm:ss",
    analogClock: false,
    showDate: true,
    capitalRssTitle: false,
    reduceRssTitleLetterSpacing: false,
    barStyle: "onder",
    backgroundMusic: null,
    sportlinkApiKey: "",
  });
  const [feeds, setFeeds] = useState([]);

  const [screenRotation, setScreenRotation] = useState(0);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);

  const [animationStep, setAnimationStep] = useState(0);
  const [showAudioPrompt, setShowAudioPrompt] = useState(false);

  const hasInitializedRef = useRef(false);
  const generateDisplayPairingCodeRef = useRef();
  const isPairedRef = useRef(isPaired);
  const tenantDeletedRef = useRef(false);
  const rawPlaylistsRef = useRef([]);
  const lastFeedsSignatureRef = useRef(null);
  const isGeneratingCodeRef = useRef(isGeneratingCode);
  const displayPairingCodeRef = useRef(displayPairingCode);
  const isGeneratingCodeInternalRef = useRef(false);

  const clearInvalidDeviceId = useCallback(() => {
    const storedDeviceId = localStorage.getItem("izi_device_id");
    if (
      !storedDeviceId ||
      storedDeviceId.trim() === "" ||
      storedDeviceId.length < 10
    ) {
      console.log("Clearing invalid device ID from localStorage");
      localStorage.removeItem("izi_device_id");
      return true;
    }
    return false;
  }, []);

  console.log("DisplayView component rendered");

  const generatePairingCode = useCallback(() => {
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    console.log("Generated pairing code:", code);
    return code;
  }, []);

  const generateDeviceId = useCallback(() => {
    const userAgent = navigator.userAgent;
    const screenRes = `${screen.width}x${screen.height}`;
    const timeStamp = Date.now();
    const fingerprint = `${userAgent}-${screenRes}-${timeStamp}`;

    let deviceId = "";
    try {
      const hash = fingerprint.split("").reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0);
      deviceId = `device_${Math.abs(hash)}_${timeStamp}`.substring(0, 20);
    } catch (error) {
      deviceId = `device_${timeStamp}_${Math.random().toString(36).substr(2, 9)}`;
    }

    console.log("Generated device ID:", deviceId);
    return deviceId;
  }, []);

  const checkDevicePairing = useCallback(
    async (deviceId) => {
      const currentDeviceId = deviceId || localStorage.getItem("izi_device_id");

      if (!currentDeviceId || currentDeviceId.trim() === "") {
        console.error("Invalid device ID:", currentDeviceId);
        dispatch(setIsPaired(false));
        return false;
      }

      try {
        console.log("Checking device pairing for ID:", currentDeviceId);
        const deviceDoc = await getDoc(doc(db, "devices", currentDeviceId));
        if (deviceDoc.exists()) {
          const deviceData = deviceDoc.data();
          const isDevicePaired = deviceData.isPaired || false;
          console.log("Device pairing status from database:", isDevicePaired);

          // Cache tenantId from device doc so display knows which tenant it belongs to
          if (deviceData.tenantId) {
            setDisplayTenantId(deviceData.tenantId);
            localStorage.setItem("izi_tenant_id", deviceData.tenantId);
          }

          if (!deviceData.isLinked) {
            console.log("Device exists but not marked as linked, updating...");
            await setDoc(
              doc(db, "devices", currentDeviceId),
              { isLinked: true },
              { merge: true },
            );
          }

          dispatch(setIsPaired(isDevicePaired));
          return isDevicePaired;
        } else {
          console.log("Device document does not exist");
          dispatch(setIsPaired(false));
          return false;
        }
      } catch (error) {
        console.error("Error checking device pairing:", error);
        dispatch(setIsPaired(false));
        return false;
      }
    },
    [dispatch],
  );

  const fetchExternalIp = useCallback(async () => {
    try {
      const res = await fetch("https://api4.ipify.org?format=json");
      const data = await res.json();
      return data.ip || null;
    } catch {
      return null;
    }
  }, []);

  const generateDisplayPairingCode = useCallback(async () => {
    if (isGeneratingCodeInternalRef.current) {
      console.log("Already generating code internally, skipping...");
      return;
    }

    console.log("Starting code generation...");
    isGeneratingCodeInternalRef.current = true;
    dispatch(setIsGeneratingCode(true));
    dispatch(clearPairingError());

    try {
      const currentDeviceId = deviceId || localStorage.getItem("izi_device_id");

      if (!currentDeviceId || currentDeviceId.trim() === "") {
        console.error("No valid device ID available:", currentDeviceId);
        dispatch(setPairingError("Geen geldig apparaat ID beschikbaar"));
        return;
      }

      // Delete any existing pairing codes for this device before creating a new one
      try {
        const oldCodes = await getDocs(
          query(
            collection(db, "pairing_codes"),
            where("deviceId", "==", currentDeviceId),
          ),
        );
        for (const oldCode of oldCodes.docs) {
          await deleteDoc(oldCode.ref);
        }
      } catch (e) {
        // Non-critical — continue with new code generation
      }

      const newCode = generatePairingCode();
      console.log("Generated code:", newCode, "for device:", currentDeviceId);

      try {
        console.log("Saving to pairing_codes collection...");
        await setDoc(doc(db, "pairing_codes", newCode), {
          code: newCode,
          deviceId: currentDeviceId,
          isUsed: false,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

        console.log("Saving to devices collection...");

        const deviceUpdateData = {
          deviceId: currentDeviceId,
          displayPairingCode: newCode,
          isLinked: true,
          deviceInfo: {
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            createdAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
          },
        };

        if (!isPairedRef.current) {
          deviceUpdateData.isPaired = false;
        }

        await setDoc(doc(db, "devices", currentDeviceId), deviceUpdateData, {
          merge: true,
        });

        console.log("Firebase save successful");
      } catch (firebaseError) {
        console.warn(
          "Firebase save failed, but continuing with local code:",
          firebaseError,
        );
      }

      console.log("Code generation successful, updating state...");
      dispatch(setDisplayPairingCode(newCode));
      dispatch(setCodeTimeRemaining(30));
      dispatch(setIsCodeFlashing(false));
    } catch (error) {
      console.error("Error generating pairing code:", error);
      dispatch(setPairingError(`Fout bij genereren: ${error.message}`));

      try {
        const fallbackCode = generatePairingCode();
        console.log("Using fallback code:", fallbackCode);
        dispatch(setDisplayPairingCode(fallbackCode));
        dispatch(setCodeTimeRemaining(30));
        dispatch(setIsCodeFlashing(false));
        dispatch(clearPairingError());
      } catch (fallbackError) {
        console.error("Even fallback code generation failed:", fallbackError);
        dispatch(setPairingError("Kritieke fout: geen code gegenereerd"));
      }
    } finally {
      console.log(
        "Code generation finished, setting isGeneratingCode to false",
      );
      isGeneratingCodeInternalRef.current = false;
      dispatch(setIsGeneratingCode(false));
    }
  }, [generatePairingCode, dispatch]);

  generateDisplayPairingCodeRef.current = generateDisplayPairingCode;

  isPairedRef.current = isPaired;
  isGeneratingCodeRef.current = isGeneratingCode;
  displayPairingCodeRef.current = displayPairingCode;

  const requestFullscreen = async () => {
    if (!fullscreenSupported) {
      console.log("Fullscreen not supported");
      return;
    }

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.msRequestFullscreen) {
        await document.documentElement.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (error) {
      console.error("Error requesting fullscreen:", error);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
      setIsFullscreen(false);
    } catch (error) {
      console.error("Error exiting fullscreen:", error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e) => {
      if (e.key === "F11") {
        e.preventDefault();
        if (isFullscreen) {
          exitFullscreen();
        } else {
          requestFullscreen();
        }
      }

      if (e.key === "Escape" && isFullscreen) {
        exitFullscreen();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("msfullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "msfullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (isPaired && deviceId && deviceId.trim() !== "") {
      const updateLastSeen = async () => {
        try {
          const update = { lastSeen: new Date().toISOString() };
          const ip = await fetchExternalIp();
          if (ip) update.externalIp = ip;
          await setDoc(doc(db, "devices", deviceId), update, { merge: true });
        } catch (error) {
          console.error("Error updating last seen:", error);
        }
      };

      updateLastSeen();
      const interval = setInterval(updateLastSeen, 60000);
      return () => clearInterval(interval);
    }
  }, [isPaired, deviceId, fetchExternalIp]);

  const handleChangeSlide = useCallback((action) => {
    const total = slidesRef.current.length;
    if (total === 0) return;

    const current = currentSlideRef.current;
    const newIndex =
      action === "next" ? (current + 1) % total : (current - 1 + total) % total;

    if (rotationRestartRef.current) {
      rotationRestartRef.current(newIndex);
    }
    setSlideProgress(0);

    const PingIndicator = document.createElement("div");
    PingIndicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 123, 255, 0.9);
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      font-size: 14px;
      z-index: 9999;
      animation: fadeInOut 3s ease-in-out;
    `;

    const message = action === "next" ? "Volgende slide" : "Vorige slide";
    PingIndicator.textContent = message;

    const style = document.createElement("style");
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(-20px); }
        20% { opacity: 1; transform: translateY(0); }
        80% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-20px); }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(PingIndicator);

    setTimeout(() => {
      if (PingIndicator.parentNode) {
        PingIndicator.parentNode.removeChild(PingIndicator);
      }
    }, 3000);
  }, []);

  const handleDevicePing = useCallback(() => {
    console.log("Restarting slides from beginning");

    const PingIndicator = document.createElement("div");
    PingIndicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 123, 255, 0.9);
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      font-size: 14px;
      z-index: 9999;
      animation: fadeInOut 3s ease-in-out;
    `;
    PingIndicator.textContent = "Pong";

    const style = document.createElement("style");
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(-20px); }
        20% { opacity: 1; transform: translateY(0); }
        80% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-20px); }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(PingIndicator);

    setTimeout(() => {
      if (PingIndicator.parentNode) {
        PingIndicator.parentNode.removeChild(PingIndicator);
      }
    }, 3000);
  }, []);

  const handleRefreshSlides = useCallback(() => {
    console.log("Restarting slides from beginning");
    setCurrentSlideIndex(0);
    setSlideProgress(0);

    const refreshIndicator = document.createElement("div");
    refreshIndicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 123, 255, 0.9);
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      font-size: 14px;
      z-index: 9999;
      animation: fadeInOut 2s ease-in-out;
    `;
    refreshIndicator.textContent = "Slides opnieuw gestart";

    const style = document.createElement("style");
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(-20px); }
        20% { opacity: 1; transform: translateY(0); }
        80% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-20px); }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(refreshIndicator);

    setTimeout(() => {
      if (refreshIndicator.parentNode) {
        refreshIndicator.parentNode.removeChild(refreshIndicator);
      }

      console.log("Force reloading browser...");
      window.location.reload();
    }, 2000);
  }, []);

  useEffect(() => {
    console.log("🎧 Device pairing listener useEffect triggered");
    const currentDeviceId = deviceId || localStorage.getItem("izi_device_id");
    if (!currentDeviceId || currentDeviceId.trim() === "") {
      console.log("No valid device ID available for listener");
      return;
    }

    console.log(
      "Setting up device pairing listener for device:",
      currentDeviceId,
    );
    const deviceDocRef = doc(db, "devices", currentDeviceId);

    const unsubscribeDevice = onSnapshot(
      deviceDocRef,
      (doc) => {
        if (doc.exists()) {
          const deviceData = doc.data();
          const newPairedStatus = deviceData.isPaired || false;

          // Capture tenantId as soon as it appears in the device doc
          if (deviceData.tenantId) {
            setDisplayTenantId(deviceData.tenantId);
            localStorage.setItem("izi_tenant_id", deviceData.tenantId);
          }

          setScreenRotation(deviceData.screenRotation || 0);

          console.log("Device pairing status changed:", newPairedStatus);

          if (newPairedStatus !== isPairedRef.current) {
            dispatch(setIsPaired(newPairedStatus));

            if (newPairedStatus) {
              console.log("Device is now paired! Switching to display mode.");

              dispatch(setDisplayPairingCode(""));
              dispatch(clearPairingError());
            } else {
              console.log(
                "Device is no longer paired. Switching to pairing mode.",
              );

              if (
                !isGeneratingCodeRef.current &&
                !displayPairingCodeRef.current
              ) {
                console.log("Generating new pairing code for unpaired device");
                generateDisplayPairingCodeRef.current?.();
              }
            }
          }
        } else {
          if (isPairedRef.current) {
            console.log("Device document not found, treating as unpaired");
            dispatch(setIsPaired(false));

            if (
              !isGeneratingCodeRef.current &&
              !displayPairingCodeRef.current
            ) {
              generateDisplayPairingCodeRef.current?.();
            }
          }
        }
      },
      (error) => {
        console.error("Error listening to device pairing status:", error);
      },
    );

    return () => {
      console.log("Cleaning up device pairing listener");
      unsubscribeDevice();
    };
  }, [deviceId]);

  useEffect(() => {
    console.log("🎮 Device commands listener useEffect triggered");
    const currentDeviceId = deviceId || localStorage.getItem("izi_device_id");
    if (!currentDeviceId || currentDeviceId.trim() === "") {
      console.log("No valid device ID available for commands listener");
      return;
    }

    console.log(
      "Setting up device commands listener for device:",
      currentDeviceId,
    );
    const commandsDocRef = doc(db, "device_commands", currentDeviceId);

    const unsubscribeCommands = onSnapshot(
      commandsDocRef,
      (commandDoc) => {
        if (commandDoc.exists()) {
          const commandData = commandDoc.data();

          if (!commandData.processed) {
            console.log("New command received:", commandData);

            switch (commandData.command) {
              case "refresh":
                if (commandData.action === "restart_slides") {
                  console.log(
                    "Refresh command received, restarting slides from beginning",
                  );
                  handleRefreshSlides();
                }
                break;
              case "ping":
                if (commandData.action === "ping_device") {
                  console.log("Ping event is triggerd");
                  handleDevicePing();
                }
                break;

              case "change_slide":
                if (commandData.action === "next") {
                  console.log("Ping event is triggerd");
                  handleChangeSlide(commandData.action);
                }
                if (commandData.action === "previous") {
                  console.log("Ping event is triggerd");
                  handleChangeSlide(commandData.action);
                }
                break;

              default:
                console.log("Unknown command type:", commandData.command);
            }

            // Delete command after processing — keeps collection clean
            deleteDoc(doc(db, "device_commands", currentDeviceId)).catch(
              (error) => {
                console.error("Error deleting processed command:", error);
              },
            );
          }
        }
      },
      (error) => {
        console.error("Error in device commands listener:", error);
      },
    );

    return () => {
      console.log("Cleaning up device commands listener");
      unsubscribeCommands();
    };
  }, [deviceId, handleRefreshSlides, handleChangeSlide]);

  useEffect(() => {
    console.log(
      "📄 Content loading useEffect triggered, isPaired:",
      isPaired,
      "tenantId:",
      displayTenantId,
    );
    if (!isPaired || !displayTenantId) return;

    const displayDocRef = tenantDoc(db, displayTenantId, "display", "content");
    const settingsDocRef = tenantDoc(
      db,
      displayTenantId,
      "display",
      "settings",
    );

    let unsubscribeTenant;
    let unsubscribeContent;
    let unsubscribeSettings;
    let expiredCountdownInterval;

    const setup = async () => {
      // Check tenant deletion status before setting up the content listener
      // so we never show slides for a deleted tenant, even briefly on refresh.
      const tenantSnap = await getDoc(doc(db, "tenants", displayTenantId));
      const initialTenantData = tenantSnap.exists() ? tenantSnap.data() : {};
      tenantDeletedRef.current = !!initialTenantData.deletedAt;
      if (tenantDeletedRef.current) {
        setPlaylists([]);
      }

      // Displays run unattended for days at a time, so a countdown slide's
      // expiry has to be caught here rather than waiting for an admin to
      // open the panel. Re-check periodically and persist the "hidden"
      // state back to Firestore so the admin's eye toggle reflects it too.
      const checkExpiredCountdowns = () => {
        if (tenantDeletedRef.current || rawPlaylistsRef.current.length === 0)
          return;
        const { playlists: updatedPlaylists, changed } =
          hideExpiredCountdownSlides(rawPlaylistsRef.current);
        if (changed) {
          rawPlaylistsRef.current = updatedPlaylists;
          setDoc(displayDocRef, { playlists: updatedPlaylists }, { merge: true });
        }
      };

      const applyContentDoc = (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data.playlists) {
          rawPlaylistsRef.current = data.playlists;
          setPlaylists(data.playlists);
        } else if (data.slides) {
          rawPlaylistsRef.current = [];
          setPlaylists([
            {
              id: "default",
              name: "Default Playlist",
              slides: data.slides || [],
            },
          ]);
        } else {
          rawPlaylistsRef.current = [];
          setPlaylists([]);
        }
        checkExpiredCountdowns();
      };

      expiredCountdownInterval = setInterval(checkExpiredCountdowns, 30000);

      unsubscribeTenant = onSnapshot(
        doc(db, "tenants", displayTenantId),
        (snap) => {
          const tenantData = snap.exists() ? snap.data() : {};
          if (tenantData.deletedAt) {
            tenantDeletedRef.current = true;
            setPlaylists([]);
            return;
          }
          const wasDeleted = tenantDeletedRef.current;
          tenantDeletedRef.current = false;
          setTenantModules(tenantData.modules || {});
          setTenantSlideTypes(tenantData.slideTypes || {});
          if (wasDeleted) {
            getDoc(displayDocRef).then(applyContentDoc);
          }
        },
      );

      unsubscribeContent = onSnapshot(displayDocRef, (snap) => {
        if (tenantDeletedRef.current) return;
        if (Date.now() % 10000 < 100) {
          console.log("Raw Firebase data:", snap.data());
        }
        applyContentDoc(snap);
      });

      unsubscribeSettings = onSnapshot(settingsDocRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setSettings({
            logoUrl: data.logoUrl || "",
            backgroundColor: data.backgroundColor || "#FAFAFA",
            foregroundColor: data.foregroundColor || "#212121",
            progressBarColor: data.progressBarColor || "#3dbcc9",
            feedUrl: data.feedUrl || "",
            showClock: data.showClock !== undefined ? data.showClock : true,
            clockFormat: data.clockFormat || "HH:mm:ss",
            analogClock: data.analogClock || false,
            showDate: data.showDate !== undefined ? data.showDate : true,
            barStyle: data.barStyle || "onder",
            backgroundMusic: data.backgroundMusic || null,
            capitalRssTitle: data.capitalRssTitle || false,
            reduceRssTitleLetterSpacing:
              data.reduceRssTitleLetterSpacing || false,
            sportlinkApiKey: data.sportlinkApiKey || "",
          });

          // Apply typography as CSS custom properties
          const typo = data.typography || {};
          const defaults = {
            p: { fontSize: 27, fontFamily: "Arial", fontColor: "#000000" },
            h1: { fontSize: 64, fontFamily: "Arial", fontColor: "#000000" },
            h2: { fontSize: 53, fontFamily: "Arial", fontColor: "#000000" },
            h3: { fontSize: 43, fontFamily: "Arial", fontColor: "#000000" },
          };
          ["p", "h1", "h2", "h3"].forEach((tag) => {
            const t = { ...defaults[tag], ...typo[tag] };
            document.documentElement.style.setProperty(
              `--typo-${tag}-size`,
              `${t.fontSize}px`,
            );
            document.documentElement.style.setProperty(
              `--typo-${tag}-family`,
              t.fontFamily,
            );
            document.documentElement.style.setProperty(
              `--typo-${tag}-color`,
              t.fontColor,
            );
          });

          // Apply feed font size scale as a CSS custom property
          const feedFontScales = { groot: 1.5, normaal: 1, klein: 0.5 };
          const feedFontScale = feedFontScales[data.feedFontSize] ?? 1;
          document.documentElement.style.setProperty(
            "--feed-font-scale",
            feedFontScale,
          );

          let nextFeeds;
          if (data.feeds && Array.isArray(data.feeds)) {
            nextFeeds = data.feeds.filter(
              (feed) => feed.isEnabled !== false && feed.isVisible !== false,
            );
          } else if (data.feedUrl) {
            nextFeeds = [
              {
                id: "legacy",
                name: "Legacy Feed",
                url: data.feedUrl,
                isEnabled: true,
                duration: 10,
                isVisible: true,
              },
            ];
          } else {
            nextFeeds = [];
          }

          // Only produce a new `feeds` array reference when the feed content
          // actually changed. Otherwise every unrelated settings update (a
          // color, the clock toggle, etc.) recreates the array, which
          // Feed.js's fetch/rotation effects treat as "feeds changed" and
          // restart the RSS ticker from scratch.
          const nextFeedsSignature = JSON.stringify(nextFeeds);
          if (nextFeedsSignature !== lastFeedsSignatureRef.current) {
            lastFeedsSignatureRef.current = nextFeedsSignature;
            setFeeds(nextFeeds);
          }
        }
      });
    };

    setup();

    return () => {
      unsubscribeTenant?.();
      unsubscribeContent?.();
      unsubscribeSettings?.();
      clearInterval(expiredCountdownInterval);
    };
  }, [isPaired, displayTenantId]);

  useEffect(() => {
    console.log(
      "🎬 Playlists flattening useEffect triggered, playlists:",
      playlists.length,
    );
    if (playlists.length === 0) {
      setSlides([]);
      return;
    }

    const allSlides = playlists.reduce((acc, playlist) => {
      if (playlist.isEnabled === false) {
        return acc;
      }

      if (playlist.slides) {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const isTimeActive = (slide) => {
          const tr = slide.timeRestriction;
          if (!tr) return true;

          // Legacy data only has a single `enabled` flag — treat it as both
          // windows being on so previously configured slides keep working.
          const timeEnabled =
            tr.timeEnabled !== undefined ? tr.timeEnabled : !!tr.enabled;
          const dateEnabled =
            tr.dateEnabled !== undefined ? tr.dateEnabled : !!tr.enabled;

          if (!timeEnabled && !dateEnabled) return true;

          // Date range check (optional — empty string means no restriction)
          if (dateEnabled && (tr.startDate || tr.endDate)) {
            const pad = (n) => String(n).padStart(2, "0");
            const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

            // Normalize to YYYY-MM-DD string — handles plain strings, Date objects,
            // and Firestore Timestamps (which have a .toDate() method)
            const toDateStr = (val) => {
              if (!val) return null;
              if (typeof val === "string") return val.slice(0, 10);
              if (typeof val.toDate === "function")
                return val.toDate().toISOString().slice(0, 10);
              if (val instanceof Date) return val.toISOString().slice(0, 10);
              return null;
            };

            const startStr = toDateStr(tr.startDate);
            const endStr = toDateStr(tr.endDate);
            if (startStr && todayStr < startStr) return false;
            if (endStr && todayStr > endStr) return false;
          }

          if (!timeEnabled) return true;

          if (tr.days) {
            const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
            const key = dayKeys[now.getDay()];
            if (tr.days[key] === false) return false;
          }

          const [sh, sm] = tr.startTime.split(":").map(Number);
          const [eh, em] = tr.endTime.split(":").map(Number);
          const start = sh * 60 + sm;
          const end = eh * 60 + em;
          // Midnight overlap: start > end means e.g. 22:00 – 02:00
          return start <= end
            ? currentMinutes >= start && currentMinutes <= end
            : currentMinutes >= start || currentMinutes <= end;
        };

        const hasSlideTypeConfig = Object.keys(tenantSlideTypes).length > 0;
        const isSlideTypeAllowed = (slide) => {
          if (!hasSlideTypeConfig) return true;
          const typeKey = getSlideTypeGateKey(slide.layout) || slide.type;
          return typeKey ? tenantSlideTypes[typeKey] : true;
        };

        const visibleSlides = playlist.slides.filter(
          (slide) =>
            slide.isVisible &&
            isTimeActive(slide) &&
            isSlideTypeAllowed(slide) &&
            ((slide.type === "text" && slide.text && slide.text.trim()) ||
              (slide.type === "image" && slide.imageUrl) ||
              (slide.type === "video" && slide.videoUrl) ||
              (slide.type === "teletekst" && slide.teletekstChannel) ||
              (slide.layout === "teletekst" && slide.teletekstChannel) ||
              (slide.layout === "weather" && slide.weatherLat) ||
              (slide.type === "iframe" && slide.iframeUrl) ||
              (slide.layout === "iframe" && slide.iframeUrl) ||
              (slide.layout === "gallery" &&
                slide.images &&
                slide.images.length > 0) ||
              (slide.layout === "countdown" && slide.countdownTargetDate) ||
              (slide.layout === "agenda" &&
                slide.agendaCalendars &&
                slide.agendaCalendars.length > 0) ||
              (slide.layout === "email" && slide.emailProvider) ||
              (isSportlinkLayout(slide.layout) &&
                (slide.sportlinkApiKey || settings.sportlinkApiKey) &&
                slide.sportlinkTeams &&
                slide.sportlinkTeams.length > 0) ||
              (slide.layout === "qr-feed" && slide.qrUrl) ||
              (!slide.type && slide.text && slide.text.trim())),
        );

        const repeatCount = playlist.repeatCount || 1;
        const repeatedSlides = [];
        const taggedSlides = visibleSlides.map((slide) => ({
          ...slide,
          _playlistId: playlist.id,
          _playlistMusic: playlist.backgroundMusic || null,
        }));
        for (let i = 0; i < repeatCount; i++) {
          repeatedSlides.push(...taggedSlides);
        }

        return [...acc, ...repeatedSlides];
      }
      return acc;
    }, []);

    console.log("🎬 Slide processing debug:");
    console.log("📊 Total playlists:", playlists.length);
    playlists.forEach((playlist, index) => {
      console.log(`📁 Playlist ${index + 1}:`, {
        id: playlist.id,
        name: playlist.name,
        isEnabled: playlist.isEnabled,
        slidesCount: playlist.slides?.length || 0,
      });

      if (playlist.slides) {
        playlist.slides.forEach((slide, slideIndex) => {
          console.log(`  📄 Slide ${slideIndex + 1}:`, {
            id: slide.id,
            name: slide.name,
            type: slide.type,
            isVisible: slide.isVisible,
            hasText: !!slide.text,
            hasImageUrl: !!slide.imageUrl,
            hasVideoUrl: !!slide.videoUrl,
            hasTeletekstChannel: !!slide.teletekstChannel,
            teletekstChannel: slide.teletekstChannel,
            layout: slide.layout,
            duration: slide.duration,
          });

          if (slide.imageUrl) {
            console.log(
              `🖼️ Slide ${slideIndex + 1} Image URL:`,
              slide.imageUrl,
            );
            console.log(
              `📐 Slide ${slideIndex + 1} Layout:`,
              slide.layout || "default",
            );
          }
        });
      }
    });

    console.log("🎬 All flattened slides with image URLs and layouts:");
    allSlides.forEach((slide, index) => {
      console.log(`📄 Flattened Slide ${index + 1}:`, {
        id: slide.id,
        name: slide.name,
        layout: slide.layout || "default",
        imageUrl: slide.imageUrl || "No image",
        videoUrl: slide.videoUrl || "No video",
        duration: slide.duration,
      });
    });

    if (Date.now() % 10000 < 100) {
      console.log(
        "All flattened slides with positions:",
        allSlides.map((s) => ({
          id: s.id,
          type: s.type,
          imagePosition: s.imagePosition,
          duration: s.duration,
          hasVideoUrl: !!s.videoUrl,
        })),
      );
    }
    console.log("🎬 Setting slides:", allSlides.length, "slides");
    setSlides(allSlides);
  }, [playlists, tenantSlideTypes]);

  useEffect(() => {
    console.log(
      "🎠 Slide rotation useEffect triggered, slides:",
      slides.length,
    );
    if (slides.length === 0) return;

    slidesRef.current = slides;
    const savedId = currentSlideIdRef.current;
    const savedIndex = savedId ? slides.findIndex((s) => s.id === savedId) : -1;
    let currentIndex = savedIndex !== -1 ? savedIndex : 0;
    let timeoutId = null;

    const rotateSlides = () => {
      const currentSlide = slides[currentIndex];
      const slideDuration = (currentSlide?.duration || 5) * 1000;

      // Duck background music while a video slide with its own sound is on
      // screen, and bring it back up once we move past it.
      const isVideoWithSound =
        currentSlide?.layout === "video" && !!currentSlide?.videoSound;
      if (isVideoWithSound !== wasVideoWithSoundRef.current) {
        audioFadeRef.current?.(isVideoWithSound ? 0 : null, 900);
        wasVideoWithSoundRef.current = isVideoWithSound;
      }

      console.log("🎠 Current slide details:", {
        index: currentIndex,
        name: currentSlide?.name,
        layout: currentSlide?.layout || "default",
        imageUrl: currentSlide?.imageUrl || "No image",
        videoUrl: currentSlide?.videoUrl || "No video",
        duration: currentSlide?.duration,
        calculatedDurationMs: slideDuration,
      });

      if (Date.now() % 5000 < 100) {
        console.log(
          "Slide timing - Current slide:",
          currentSlide?.name,
          "Duration:",
          currentSlide?.duration,
          "Calculated duration (ms):",
          slideDuration,
        );
      }

      console.log("🎠 Setting current slide index:", currentIndex);
      setCurrentSlideIndex(currentIndex);
      currentSlideRef.current = currentIndex;
      currentSlideIdRef.current = currentSlide?.id ?? null;

      timeoutId = setTimeout(() => {
        currentIndex = (currentIndex + 1) % slides.length;
        rotateSlides();
      }, slideDuration);
    };

    // Expose a restart function so handleChangeSlide can jump to any index
    rotationRestartRef.current = (newIndex) => {
      if (timeoutId) clearTimeout(timeoutId);
      currentIndex = newIndex;
      rotateSlides();
    };

    rotateSlides();

    return () => {
      rotationRestartRef.current = null;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [slides]);

  const currentSlideRef = useRef(0);
  const currentSlideIdRef = useRef(null);
  const slidesRef = useRef([]);
  const rotationRestartRef = useRef(null);
  const progressRef = useRef(0);
  const progressBarRef = useRef(null);
  const audioRef = useRef(null);
  const activeAudioUrlRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const pendingMusicRef = useRef(null);
  const audioBaseVolumeRef = useRef(0.7);
  const audioFadeIntervalRef = useRef(null);
  const audioFadeRef = useRef(null);
  const wasVideoWithSoundRef = useRef(false);

  const playAudio = useCallback((music) => {
    const newUrl = music?.enabled && music?.url ? music.url : null;

    // Only restart if URL actually changed
    if (newUrl === activeAudioUrlRef.current) {
      // URL unchanged — just update volume if audio is playing
      if (music) {
        audioBaseVolumeRef.current = music.volume ?? 0.7;
      }
      if (audioRef.current && newUrl && !wasVideoWithSoundRef.current) {
        audioRef.current.volume = audioBaseVolumeRef.current;
      }
      return;
    }

    activeAudioUrlRef.current = newUrl;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }

    if (!newUrl) {
      setShowAudioPrompt(false);
      return;
    }

    const audio = new Audio(newUrl);
    audio.loop = true;
    audioBaseVolumeRef.current = music.volume ?? 0.7;
    audio.volume = wasVideoWithSoundRef.current ? 0 : audioBaseVolumeRef.current;
    audioRef.current = audio;

    if (audioUnlockedRef.current) {
      audio.play().catch(() => {});
    } else {
      pendingMusicRef.current = music;
      setShowAudioPrompt(true);
    }
  }, []);

  // Ramp background-music volume toward 0 (video slide with sound) or back to
  // its configured level, instead of snapping instantly.
  const fadeAudioTo = useCallback((targetVolume, durationMs = 900) => {
    const audio = audioRef.current;
    if (audioFadeIntervalRef.current) {
      clearInterval(audioFadeIntervalRef.current);
      audioFadeIntervalRef.current = null;
    }
    if (!audio) return;

    const target =
      targetVolume === null ? audioBaseVolumeRef.current : targetVolume;
    const start = audio.volume;
    const steps = 20;
    let step = 0;

    audioFadeIntervalRef.current = setInterval(() => {
      step += 1;
      const progress = step / steps;
      audio.volume = Math.max(
        0,
        Math.min(1, start + (target - start) * progress),
      );
      if (step >= steps) {
        clearInterval(audioFadeIntervalRef.current);
        audioFadeIntervalRef.current = null;
      }
    }, durationMs / steps);
  }, []);
  audioFadeRef.current = fadeAudioTo;

  // Unlock audio on first user interaction (browser autoplay policy)
  useEffect(() => {
    const unlock = () => {
      if (audioUnlockedRef.current) return;
      audioUnlockedRef.current = true;
      setShowAudioPrompt(false);

      if (pendingMusicRef.current) {
        const m = pendingMusicRef.current;
        pendingMusicRef.current = null;
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        } else {
          playAudio(m);
        }
      } else if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
    };

    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });

    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, [playAudio]);

  // React to global background music settings changes
  useEffect(() => {
    playAudio(tenantModules.backgroundMusic ? settings.backgroundMusic : null);
  }, [settings.backgroundMusic, tenantModules.backgroundMusic, playAudio]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;

    const progressInterval = 100;
    progressRef.current = 0;
    let startTime = Date.now();

    const progressIntervalId = setInterval(() => {
      const currentSlide = slides[currentSlideRef.current];
      const slideDuration = (currentSlide?.duration || 5) * 1000;

      const elapsedTime = Date.now() - startTime;
      const newProgress = Math.min((elapsedTime / slideDuration) * 100, 100);

      if (newProgress >= 100) {
        if (slides.length === 1) {
          progressRef.current = 0;

          startTime = Date.now();
        } else {
          progressRef.current = 100;
        }
      } else {
        progressRef.current = newProgress;
      }

      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${progressRef.current}%`;
      }
    }, progressInterval);

    return () => clearInterval(progressIntervalId);
  }, [slides, currentSlideIndex]);

  useEffect(() => {
    progressRef.current = 0;
    if (progressBarRef.current) {
      progressBarRef.current.style.width = "0%";
    }
  }, [currentSlideIndex]);

  useEffect(() => {
    return () => {
      setSlideProgress(0);
      setCurrentSlideIndex(0);
    };
  }, []);

  useEffect(() => {
    console.log("⏰ Countdown timer useEffect triggered", {
      isPaired,
      displayPairingCode: !!displayPairingCode,
      isGeneratingCode,
      codeTimeRemaining,
    });
    if (!isPaired && displayPairingCode && !isGeneratingCode) {
      const timer = setInterval(() => {
        const currentTime = codeTimeRemaining;
        const newTime = currentTime - 1;

        if (newTime <= 5 && newTime > 0) {
          dispatch(setIsCodeFlashing(true));
        } else if (newTime === 0) {
          if (!isPaired) {
            console.log("Timer reached 0, generating new code...");
            generateDisplayPairingCodeRef.current?.();
          }
          dispatch(setCodeTimeRemaining(30));
        } else {
          dispatch(setIsCodeFlashing(false));
        }

        if (newTime > 0) {
          dispatch(setCodeTimeRemaining(newTime));
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isPaired, displayPairingCode, isGeneratingCode, codeTimeRemaining]);

  // Force the application to refresh at 06:00
  useEffect(() => {
    const checkDailyReset = () => {
      const now = new Date();
      if (now.getHours() === 6 && now.getMinutes() === 0) {
        window.location.reload();
      }
    };
    const resetInterval = setInterval(checkDailyReset, 60000);
    return () => clearInterval(resetInterval);
  }, []);

  useEffect(() => {
    console.log(
      "🚀 Initialization useEffect triggered, hasInitialized:",
      hasInitializedRef.current,
    );
    if (hasInitializedRef.current) return;

    console.log("DisplayView component mounted");
    hasInitializedRef.current = true;

    const initializeDevice = async () => {
      if (clearInvalidDeviceId()) {
        console.log("Invalid device ID cleared, generating new one");
      }

      const storedDeviceId = localStorage.getItem("izi_device_id");
      let currentDeviceId;

      if (storedDeviceId && storedDeviceId.trim() !== "") {
        console.log("Using stored device ID:", storedDeviceId);
        currentDeviceId = storedDeviceId;
        dispatch(setDeviceId(storedDeviceId));
      } else {
        console.log("No valid stored device ID, generating new one");
        const newDeviceId = generateDeviceId();
        console.log("Generated new device ID:", newDeviceId);
        currentDeviceId = newDeviceId;
        dispatch(setDeviceId(newDeviceId));
        localStorage.setItem("izi_device_id", newDeviceId);
      }

      setFullscreenSupported(!!document.fullscreenEnabled);

      const isPaired = await checkDevicePairing(currentDeviceId);

      if (!isPaired) {
        console.log("Device not paired, generating pairing code...");

        setTimeout(() => {
          generateDisplayPairingCodeRef.current?.();
        }, 500);
      } else {
        console.log(
          "Device is already paired, skipping pairing code generation",
        );
      }
    };

    initializeDevice();
  }, []);

  if (!isPaired) {
    return (
      <PairingScreen
        displayPairingCode={displayPairingCode}
        isCodeFlashing={isCodeFlashing}
        codeTimeRemaining={codeTimeRemaining}
        pairingError={pairingError}
      />
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="display-container">
        <div className="display-content">
          <div className="display-text">No playlists available</div>
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="display-container">
        <div className="display-content">
          <div className="display-text">No slides available</div>
        </div>
      </div>
    );
  }

  const currentSlide = slides[currentSlideIndex];
  const slideLayout = currentSlide?.layout || "side-by-side";

  // Calculate next slide for pre-rendering
  const nextSlideIndex = (currentSlideIndex + 1) % slides.length;
  const nextSlide = slides[nextSlideIndex];
  const nextSlideLayout = nextSlide?.layout || "side-by-side";

  const rotationStyle = (() => {
    if (screenRotation === 90 || screenRotation === -90) {
      return {
        transform: `rotate(${screenRotation}deg)`,
        width: "100vh",
        height: "100vw",
        position: "fixed",
        top: "calc(50vh - 50vw)",
        left: "calc(50vw - 50vh)",
      };
    }
    if (screenRotation === 180) {
      return { transform: "rotate(180deg)" };
    }
    return {};
  })();

  const isPortrait = screenRotation === 90 || screenRotation === -90;

  return (
    <div
      className={`display-container${isPortrait ? " display--portrait" : ""}`}
      style={rotationStyle}
    >
      <SlideDisplay
        currentSlide={currentSlide}
        slideLayout={slideLayout}
        nextSlide={nextSlide}
        nextSlideLayout={nextSlideLayout}
        effectsEnabled={!!tenantModules.slideEffects}
        settings={settings}
      />

      <ProgressBar
        currentSlide={currentSlide}
        slideProgress={slideProgress}
        progressBarRef={progressBarRef}
        barStyle={settings.barStyle}
        color={settings.progressBarColor}
      />

      <StatusBar
        currentSlide={currentSlide}
        settings={settings}
        feeds={feeds}
      />

      {showAudioPrompt && (
        <div
          className="audio-unlock-overlay"
          onClick={() => document.dispatchEvent(new MouseEvent("click"))}
          onKeyDown={() => document.dispatchEvent(new KeyboardEvent("keydown"))}
          tabIndex={0}
          ref={(el) => el && el.focus()}
        >
          <div className="audio-unlock-card">
            <div className="audio-unlock-icon">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            </div>
            <span className="audio-unlock-text">
              Klik of druk op een toets om muziek te starten
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default DisplayView;

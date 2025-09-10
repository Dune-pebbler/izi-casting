import React, { useState, useEffect, useCallback, useRef } from "react";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { sanitizeHTMLContent } from "../../utils/sanitize";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { 
  setIsPaired, 
  setDeviceId, 
  setDisplayPairingCode, 
  setIsGeneratingCode,
  setPairingError,
  clearPairingError,
  setCodeTimeRemaining,
  setIsCodeFlashing
} from "../../store/slices/deviceSlice";
import Feed from "./Feed";

function DisplayView() {
  // Redux state
  const dispatch = useAppDispatch();
  const isPaired = useAppSelector((state) => state.device.isPaired);
  const deviceId = useAppSelector((state) => state.device.deviceId);
  const displayPairingCode = useAppSelector((state) => state.device.displayPairingCode);
  const isGeneratingCode = useAppSelector((state) => state.device.isGeneratingCode);
  const pairingError = useAppSelector((state) => state.device.pairingError);
  const codeTimeRemaining = useAppSelector((state) => state.device.codeTimeRemaining);
  const isCodeFlashing = useAppSelector((state) => state.device.isCodeFlashing);
  
  // Local state (component-specific)
  const [playlists, setPlaylists] = useState([]);
  const [slides, setSlides] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);
  const [settings, setSettings] = useState({
    logoUrl: "",
    backgroundColor: "#FAFAFA",
    foregroundColor: "#212121",
    feedUrl: "", // Keep for backward compatibility
  });
  const [feeds, setFeeds] = useState([]);
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  // Animation states
  const [animationStep, setAnimationStep] = useState(0); // 0: initial, 1: text fade in, 2: code display
  // Refs to prevent unnecessary re-renders
  const hasInitializedRef = useRef(false);
  
  // Utility function to clear invalid device ID
  const clearInvalidDeviceId = useCallback(() => {
    const storedDeviceId = localStorage.getItem("izi_device_id");
    if (!storedDeviceId || storedDeviceId.trim() === '' || storedDeviceId.length < 10) {
      console.log("Clearing invalid device ID from localStorage");
      localStorage.removeItem("izi_device_id");
      return true;
    }
    return false;
  }, []);

  console.log("reload triggered");
  // Generate a unique pairing code
  const generatePairingCode = useCallback(() => {
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    console.log("Generated pairing code:", code);
    return code;
  }, []);

  // Generate a unique device ID based on browser fingerprint and timestamp
  const generateDeviceId = useCallback(() => {
    const userAgent = navigator.userAgent;
    const screenRes = `${screen.width}x${screen.height}`;
    const timeStamp = Date.now();
    const fingerprint = `${userAgent}-${screenRes}-${timeStamp}`;
    
    // Create a more robust device ID
    let deviceId = '';
    try {
      // Use a combination of hash and timestamp for uniqueness
      const hash = fingerprint.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      deviceId = `device_${Math.abs(hash)}_${timeStamp}`.substring(0, 20);
    } catch (error) {
      // Fallback to a simple timestamp-based ID
      deviceId = `device_${timeStamp}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    console.log("Generated device ID:", deviceId);
    return deviceId;
  }, []);

  // Check if device is already paired
  const checkDevicePairing = useCallback(
    async (deviceId) => {
      // Get device ID from parameter or localStorage
      const currentDeviceId = deviceId || localStorage.getItem("izi_device_id");
      
      // Validate deviceId before making Firebase call
      if (!currentDeviceId || currentDeviceId.trim() === '') {
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
          
          // Ensure device is marked as linked if it exists
          if (!deviceData.isLinked) {
            console.log("Device exists but not marked as linked, updating...");
            await setDoc(
              doc(db, "devices", currentDeviceId),
              { isLinked: true },
              { merge: true }
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
    [dispatch]
  );

  // Generate and save display pairing code
  const generateDisplayPairingCode = useCallback(async () => {
    if (isGeneratingCode) {
      console.log("Already generating code, skipping...");
      return; // Prevent multiple simultaneous generations
    }

    console.log("Starting code generation...");
    dispatch(setIsGeneratingCode(true));
    dispatch(clearPairingError());

    try {
      // Get device ID from Redux state or localStorage
      const currentDeviceId = deviceId || localStorage.getItem("izi_device_id");
      
      // Check if deviceId is available and valid
      if (!currentDeviceId || currentDeviceId.trim() === '') {
        console.error("No valid device ID available:", currentDeviceId);
        dispatch(setPairingError("Geen geldig apparaat ID beschikbaar"));
        return;
      }

      const newCode = generatePairingCode();
      console.log(
        "Generated code:",
        newCode,
        "for device:",
        currentDeviceId
      );

      // Try to save to Firebase, but don't fail if it's not available
      try {
        console.log("Saving to pairing_codes collection...");
        await setDoc(doc(db, "pairing_codes", newCode), {
          code: newCode,
          deviceId: currentDeviceId,
          isUsed: false,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        });

        console.log("Saving to devices collection...");
        // Also save the code to the device document for reference
        await setDoc(
          doc(db, "devices", currentDeviceId),
          {
            deviceId: currentDeviceId,
            displayPairingCode: newCode,
            isPaired: false,
            isLinked: true, // Mark as linked so it appears in admin panel
            deviceInfo: {
              userAgent: navigator.userAgent,
              screenResolution: `${screen.width}x${screen.height}`,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              language: navigator.language,
              createdAt: new Date().toISOString(),
              lastSeen: new Date().toISOString(),
            },
          },
          { merge: true }
        );

        console.log("Firebase save successful");
      } catch (firebaseError) {
        console.warn(
          "Firebase save failed, but continuing with local code:",
          firebaseError
        );
        // Continue with local code generation even if Firebase fails
      }

      console.log("Code generation successful, updating state...");
      dispatch(setDisplayPairingCode(newCode));
      dispatch(setCodeTimeRemaining(30)); // Reset timer
      dispatch(setIsCodeFlashing(false)); // Stop flashing
    } catch (error) {
      console.error("Error generating pairing code:", error);
      dispatch(setPairingError(`Fout bij genereren: ${error.message}`));

      // Fallback: generate a local code even if everything else fails
      try {
        const fallbackCode = generatePairingCode();
        console.log("Using fallback code:", fallbackCode);
        dispatch(setDisplayPairingCode(fallbackCode));
        dispatch(setCodeTimeRemaining(30));
        dispatch(setIsCodeFlashing(false));
        dispatch(clearPairingError()); // Clear error since we have a fallback code
      } catch (fallbackError) {
        console.error("Even fallback code generation failed:", fallbackError);
        dispatch(setPairingError("Kritieke fout: geen code gegenereerd"));
      }
    } finally {
      console.log(
        "Code generation finished, setting isGeneratingCode to false"
      );
      dispatch(setIsGeneratingCode(false));
    }
  }, [isGeneratingCode, generatePairingCode, dispatch]);

  // Fullscreen functions
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

  // Calculate progress bar height based on duration
  const getProgressBarHeight = useCallback(() => {
    if (slides.length === 0) return 3;

    const currentSlide = slides[currentSlideIndex];
    const duration = currentSlide?.duration || 5;

    // Scale height based on duration
    // Base height: 3px for 5 seconds
    // Scale up for longer durations, cap at 20px for very long durations
    const baseHeight = 3;
    const maxHeight = 20;
    const scaleFactor = Math.min(duration / 5, 10); // Scale up to 10x for very long durations
    const calculatedHeight = baseHeight * scaleFactor;

    return Math.min(calculatedHeight, maxHeight);
  }, [slides, currentSlideIndex]);

  // Fullscreen change event listeners and keyboard shortcuts
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e) => {
      // F11 key to toggle fullscreen
      if (e.key === "F11") {
        e.preventDefault();
        if (isFullscreen) {
          exitFullscreen();
        } else {
          requestFullscreen();
        }
      }
      // Escape key to exit fullscreen
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
        handleFullscreenChange
      );
      document.removeEventListener(
        "msfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  // Automatic fullscreen when device is paired and content is ready
  useEffect(() => {
    if (isPaired && fullscreenSupported && !isFullscreen && slides.length > 0) {
      // Add a small delay to ensure the display is fully rendered
      const autoFullscreenTimer = setTimeout(() => {
        console.log("Automatically requesting fullscreen...");
        requestFullscreen();
      }, 2000); // 2 second delay

      return () => clearTimeout(autoFullscreenTimer);
    }
  }, [isPaired, fullscreenSupported, isFullscreen, slides.length]);

  // Update device last seen timestamp
  useEffect(() => {
    if (isPaired && deviceId && deviceId.trim() !== '') {
      const updateLastSeen = async () => {
        try {
          await setDoc(
            doc(db, "devices", deviceId),
            {
              lastSeen: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (error) {
          console.error("Error updating last seen:", error);
        }
      };

      updateLastSeen();
      const interval = setInterval(updateLastSeen, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [isPaired, deviceId]);
  // Handle refresh command - restart slides from beginning

  const handleRefreshSlides = useCallback(() => {
    console.log("Restarting slides from beginning");
    setCurrentSlideIndex(0);
    setSlideProgress(0);

    // Show a brief visual feedback that refresh occurred
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

    // Add CSS animation
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

    // Remove the indicator after animation
    setTimeout(() => {
      if (refreshIndicator.parentNode) {
        refreshIndicator.parentNode.removeChild(refreshIndicator);
      }
    }, 2000);
  }, []);

  // Listen for device pairing status changes in real-time
  useEffect(() => {
    const currentDeviceId = deviceId || localStorage.getItem("izi_device_id");
    if (!currentDeviceId || currentDeviceId.trim() === '') {
      console.log("No valid device ID available for listener");
      return;
    }

    console.log(
      "Setting up device pairing listener for device:",
      currentDeviceId
    );
    const deviceDocRef = doc(db, "devices", currentDeviceId);

    const unsubscribeDevice = onSnapshot(
      deviceDocRef,
      (doc) => {
        if (doc.exists()) {
          const deviceData = doc.data();
          const newPairedStatus = deviceData.isPaired || false;

          console.log("Device pairing status changed:", newPairedStatus);

          if (newPairedStatus !== isPaired) {
            dispatch(setIsPaired(newPairedStatus));

            if (newPairedStatus) {
              console.log("Device is now paired! Switching to display mode.");
              // Clear pairing code when successfully paired
              dispatch(setDisplayPairingCode(""));
              dispatch(clearPairingError());
            } else {
              console.log(
                "Device is no longer paired. Switching to pairing mode."
              );
              // Generate new pairing code when unpaired
              if (!isGeneratingCode) {
                generateDisplayPairingCode();
              }
            }
          }

        } else {
          // Device document doesn't exist, treat as unpaired
          if (isPaired) {
            console.log("Device document not found, treating as unpaired");
            dispatch(setIsPaired(false));
            if (!isGeneratingCode) {
              generateDisplayPairingCode();
            }
          }
        }
      },
      (error) => {
        console.error("Error listening to device pairing status:", error);
      }
    );

    return () => {
      console.log("Cleaning up device pairing listener");
      unsubscribeDevice();
    };
  }, [isGeneratingCode, generateDisplayPairingCode, dispatch]);

  // Listen for device commands (refresh, etc.)
  useEffect(() => {
    const currentDeviceId = deviceId || localStorage.getItem("izi_device_id");
    if (!currentDeviceId || currentDeviceId.trim() === '') {
      console.log("No valid device ID available for commands listener");
      return;
    }

    console.log("Setting up device commands listener for device:", currentDeviceId);
    const commandsDocRef = doc(db, "device_commands", currentDeviceId);

    const unsubscribeCommands = onSnapshot(
      commandsDocRef,
      (commandDoc) => {
        if (commandDoc.exists()) {
          const commandData = commandDoc.data();
          
          // Only process unprocessed commands
          if (!commandData.processed) {
            console.log("New command received:", commandData);
            
            // Handle different command types
            switch (commandData.command) {
              case "refresh":
                if (commandData.action === "restart_slides") {
                  console.log("Refresh command received, restarting slides from beginning");
                  handleRefreshSlides();
                }
                break;
              
              // Future commands can be added here
              // case "update_settings":
              //   handleUpdateSettings(commandData.settings);
              //   break;
              // case "change_playlist":
              //   handleChangePlaylist(commandData.playlistId);
              //   break;
              
              default:
                console.log("Unknown command type:", commandData.command);
            }
            
            // Mark command as processed
            setDoc(doc(db, "device_commands", currentDeviceId), {
              processed: true,
              processedAt: new Date()
            }, { merge: true }).catch(error => {
              console.error("Error marking command as processed:", error);
            });
          }
        }
      },
      (error) => {
        console.error("Error in device commands listener:", error);
      }
    );

    return () => {
      console.log("Cleaning up device commands listener");
      unsubscribeCommands();
    };
  }, [deviceId, handleRefreshSlides, dispatch]);

  // Load content and settings from Firestore
  useEffect(() => {
    if (!isPaired) return; // Only load content if device is paired

    const displayDocRef = doc(db, "display", "content");
    const settingsDocRef = doc(db, "display", "settings");

    const unsubscribeContent = onSnapshot(displayDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        // Throttle console logging to prevent spam
        if (Date.now() % 10000 < 100) {
          // Only log every ~10 seconds
          console.log("Raw Firebase data:", data);
        }

        if (data.playlists) {
          // New playlist structure - flatten all slides
          setPlaylists(data.playlists);
        } else if (data.slides) {
          // Migrate old single playlist structure to new multiple playlists structure
          const defaultPlaylist = {
            id: "default",
            name: "Default Playlist",
            slides: data.slides || [],
          };
          setPlaylists([defaultPlaylist]);
        } else {
          setPlaylists([]);
        }
      }
    });

    const unsubscribeSettings = onSnapshot(settingsDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setSettings({
          logoUrl: data.logoUrl || "",
          backgroundColor: data.backgroundColor || "#FAFAFA",
          foregroundColor: data.foregroundColor || "#212121",
          feedUrl: data.feedUrl || "", // Keep for backward compatibility
        });
        
        // Handle feeds - support both old single feed and new multiple feeds structure
        if (data.feeds && Array.isArray(data.feeds)) {
          // New multiple feeds structure
          const enabledFeeds = data.feeds.filter(feed => feed.isEnabled !== false && feed.isVisible !== false);
          setFeeds(enabledFeeds);
        } else if (data.feedUrl) {
          // Old single feed structure - migrate to new format
          const migratedFeed = {
            id: 'legacy',
            name: 'Legacy Feed',
            url: data.feedUrl,
            isEnabled: true,
            duration: 10,
            isVisible: true
          };
          setFeeds([migratedFeed]);
        } else {
          setFeeds([]);
        }
      }
    });

    return () => {
      unsubscribeContent();
      unsubscribeSettings();
    };
  }, [isPaired]);

  // Flatten all slides from all playlists into a single array
  useEffect(() => {
    if (playlists.length === 0) {
      setSlides([]);
      return;
    }

    // Combine all slides from all playlists into one array
    const allSlides = playlists.reduce((acc, playlist) => {
      // Skip disabled playlists
      if (playlist.isEnabled === false) {
        return acc;
      }

      if (playlist.slides) {
        const visibleSlides = playlist.slides.filter(
          (slide) =>
            slide.isVisible &&
            ((slide.type === "text" && slide.text && slide.text.trim()) ||
              (slide.type === "image" && slide.imageUrl) ||
              (!slide.type && slide.text && slide.text.trim())) // Backward compatibility
        );

        // Repeat slides based on playlist repeat count
        const repeatCount = playlist.repeatCount || 1;
        const repeatedSlides = [];
        for (let i = 0; i < repeatCount; i++) {
          repeatedSlides.push(...visibleSlides);
        }

        return [...acc, ...repeatedSlides];
      }
      return acc;
    }, []);

    // Throttle console logging to prevent spam
    if (Date.now() % 10000 < 100) {
      // Only log every ~10 seconds
      console.log(
        "All flattened slides with positions:",
        allSlides.map((s) => ({
          id: s.id,
          imagePosition: s.imagePosition,
          duration: s.duration,
        }))
      );
    }
    setSlides(allSlides);
    setCurrentSlideIndex(0); // Reset to first slide when slides change
  }, [playlists]);

  useEffect(() => {
    if (slides.length === 0) return;

    let currentIndex = 0;
    
    const rotateSlides = () => {
      const currentSlide = slides[currentIndex];
      const slideDuration = (currentSlide?.duration || 5) * 1000; // Convert to milliseconds

      // Throttle console logging to prevent spam
      if (Date.now() % 5000 < 100) {
        // Only log every ~5 seconds
        console.log(
          "Slide timing - Current slide:",
          currentSlide?.name,
          "Duration:",
          currentSlide?.duration,
          "Calculated duration (ms):",
          slideDuration
        );
      }

      // Update the current slide index for display and ref for progress tracking
      setCurrentSlideIndex(currentIndex);
      currentSlideRef.current = currentIndex;

      // Set up next rotation
      setTimeout(() => {
        currentIndex = (currentIndex + 1) % slides.length;
        rotateSlides();
      }, slideDuration);
    };

    // Start the rotation
    rotateSlides();
  }, [slides]);

  // Progress tracking effect - now uses a ref to track current slide
  const currentSlideRef = useRef(0);
  
  useEffect(() => {
    if (slides.length === 0) return;

    const progressInterval = 100; // Update progress every 100ms
    setSlideProgress(0); // Reset progress when slides change

    const progressIntervalId = setInterval(() => {
      setSlideProgress((prevProgress) => {
        const currentSlide = slides[currentSlideRef.current];
        const slideDuration = (currentSlide?.duration || 5) * 1000;
        
        const newProgress = prevProgress + (progressInterval / slideDuration) * 100;

        // If we reach 100%, reset to 0 for single slides or let it stay at 100% for multiple slides
        if (newProgress >= 100) {
          if (slides.length === 1) {
            // For single slides, reset progress to create a continuous loop
            return 0;
          } else {
            return 100;
          }
        }
        return newProgress;
      });
    }, progressInterval);

    return () => clearInterval(progressIntervalId);
  }, [slides]);

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      // Cleanup any remaining timeouts or intervals
      setSlideProgress(0);
      setCurrentSlideIndex(0);
      hasInitializedRef.current = false; // Reset initialization flag
    };
  }, []);

  // Countdown timer for pairing code
  useEffect(() => {
    if (
      !isPaired &&
      displayPairingCode &&
      !isGeneratingCode
    ) {
      const timer = setInterval(() => {
        // Get current time from Redux state
        const currentTime = codeTimeRemaining;
        const newTime = currentTime - 1;

        // Start flashing when 5 seconds or less remain
        if (newTime <= 5 && newTime > 0) {
          dispatch(setIsCodeFlashing(true));
        } else if (newTime === 0) {
          // Generate new code when timer reaches 0 (only if still not paired)
          if (!isPaired) {
            console.log("Timer reached 0, generating new code...");
            generateDisplayPairingCode();
          }
          dispatch(setCodeTimeRemaining(30)); // Reset timer
        } else {
          dispatch(setIsCodeFlashing(false));
        }

        // Update the time (but not if we're resetting to 30)
        if (newTime > 0) {
          dispatch(setCodeTimeRemaining(newTime));
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [
    isPaired,
    displayPairingCode,
    isGeneratingCode,
    codeTimeRemaining,
    generateDisplayPairingCode,
    dispatch,
  ]);

  // Generate or get device ID on component mount
  useEffect(() => {
    if (hasInitializedRef.current) return; // Prevent multiple initializations

    console.log("DisplayView component mounted");
    hasInitializedRef.current = true;

    const initializeDevice = async () => {
      // Check if we need to clear invalid device ID
      if (clearInvalidDeviceId()) {
        console.log("Invalid device ID cleared, generating new one");
      }
      
      const storedDeviceId = localStorage.getItem("izi_device_id");
      let currentDeviceId;
      
      if (storedDeviceId && storedDeviceId.trim() !== '') {
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

      // Check fullscreen support
      setFullscreenSupported(!!document.fullscreenEnabled);

      // Check if device is already paired before showing pairing screen
      const isPaired = await checkDevicePairing(currentDeviceId);
      
      // Only generate pairing code if device is not paired
      if (!isPaired) {
        console.log("Device not paired, generating pairing code...");
        // Add a small delay to ensure state is updated
        setTimeout(() => {
          generateDisplayPairingCode();
        }, 500);
      } else {
        console.log("Device is already paired, skipping pairing code generation");
      }
    };

    initializeDevice();
  }, [generateDeviceId, generateDisplayPairingCode, checkDevicePairing, dispatch, clearInvalidDeviceId]);

  if (!isPaired) {
    return (
      <div className="display-container pairing-screen">
        <div className="pairing-content">
          <div className="pairing-logo">
            <img src="/izicasting-logo.svg" alt="Izi Casting Logo" />
          </div>

          <div className="pairing-main">
            <h1 className="pairing-title">Apparaat koppelen</h1>

            <p className="pairing-instructions">
              Voer deze koppelcode in op het admin paneel
            </p>

            <div className="pairing-code-section">
              {displayPairingCode ? (
                <div className="pairing-code-display">
                  <div
                    className={`pairing-code-value ${
                      isCodeFlashing ? "flashing" : ""
                    }`}
                  >
                    {displayPairingCode.split("").map((digit, index) => (
                      <span key={index} className="pairing-code-digit">
                        {digit}
                      </span>
                    ))}
                  </div>

                  {/* Timer bar */}
                  <div className="pairing-timer-container">
                    <div
                      className="pairing-timer-bar"
                      style={{
                        width: `${(codeTimeRemaining / 30) * 100}%`,
                        backgroundColor:
                          codeTimeRemaining <= 5 ? "#FF3B30" : "#f07167",
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="pairing-code-generating">
                  <div className="loading-spinner"></div>
                  <div className="generating-text">Code genereren...</div>
                </div>
              )}
            </div>

            {pairingError && <p className="pairing-error">{pairingError}</p>}
          </div>
        </div>
      </div>
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
  const slideType = currentSlide?.type || "text"; // Default to text for backward compatibility
  const slideLayout = currentSlide?.layout || "side-by-side"; // Default to side-by-side for backward compatibility

  return (
    <div
      className="display-container"
      style={{
        backgroundColor: settings.backgroundColor,
        color: settings.foregroundColor,
      }}
    >
      {/* Fullscreen indicator */}
      {!isFullscreen && fullscreenSupported && (
        <div className="fullscreen-indicator">
          <button onClick={requestFullscreen} className="fullscreen-btn">
            <span>⛶</span> Volledig scherm
          </button>
        </div>
      )}
      <div className="display-content">
        {/* Layout-specific display */}
        {slideLayout === "side-by-side" && (
          <>
            {/* Left side - Image */}
            <div className="display-left">
              {slideType === "image" && currentSlide.imageUrl ? (
                <div className="display-image-container">
                  <img
                    src={currentSlide.imageUrl}
                    alt="Slide"
                    className="display-image"
                    style={{
                      objectPosition: currentSlide.imagePosition || "center",
                    }}
                    onLoad={() => {
                      // Throttle console logging to prevent spam
                      if (Date.now() % 10000 < 100) {
                        // Only log every ~10 seconds
                        console.log(
                          "Image loaded with position:",
                          currentSlide.imagePosition || "center"
                        );
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="display-image-placeholder">
                  <div className="placeholder-text">No Image</div>
                </div>
              )}
            </div>

            {/* Right side - Text */}
            <div className="display-right">
              <div className="display-text-container">
                {currentSlide.text ? (
                  <div
                    className="display-text"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHTMLContent(currentSlide.text),
                    }}
                  />
                ) : (
                  <div className="display-text-placeholder">
                    <div className="placeholder-text">No Text Content</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {slideLayout === "image-only" && (
          <div className="display-full-image">
            {slideType === "image" && currentSlide.imageUrl ? (
              <div className="display-image-container-full">
                <img
                  src={currentSlide.imageUrl}
                  alt="Slide"
                  className="display-image-full"
                  style={{
                    objectPosition: currentSlide.imagePosition || "center",
                  }}
                  onLoad={() => {
                    // Throttle console logging to prevent spam
                    if (Date.now() % 10000 < 100) {
                      // Only log every ~10 seconds
                      console.log(
                        "Image loaded with position:",
                        currentSlide.imagePosition || "center"
                      );
                    }
                  }}
                />
              </div>
            ) : (
              <div className="display-image-placeholder-full">
                <div className="placeholder-text">No Image</div>
              </div>
            )}
          </div>
        )}

        {slideLayout === "text-over-image" && (
          <div className="display-text-over-image">
            <div className="display-image-background">
              {slideType === "image" && currentSlide.imageUrl ? (
                <div className="display-image-container-overlay">
                  <img
                    src={currentSlide.imageUrl}
                    alt="Slide"
                    className="display-image-overlay"
                    style={{
                      objectPosition: currentSlide.imagePosition || "center",
                    }}
                    onLoad={() => {
                      // Throttle console logging to prevent spam
                      if (Date.now() % 10000 < 100) {
                        // Only log every ~10 seconds
                        console.log(
                          "Image loaded with position:",
                          currentSlide.imagePosition || "center"
                        );
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="display-image-placeholder-overlay">
                  <div className="placeholder-text">No Image</div>
                </div>
              )}
            </div>

            <div className="display-text-overlay">
              {currentSlide.text ? (
                <div
                  className="display-text-overlay-content"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHTMLContent(currentSlide.text),
                  }}
                />
              ) : (
                <div className="display-text-placeholder-overlay">
                  <div className="placeholder-text">No Text Content</div>
                </div>
              )}
            </div>
          </div>
        )}

        {slideLayout === "text-only" && (
          <div className="display-text-only">
            <div className="display-text-container-full">
              {currentSlide.text ? (
                <div
                  className="display-text-full"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHTMLContent(currentSlide.text),
                  }}
                />
              ) : (
                <div className="display-text-placeholder-full">
                  <div className="placeholder-text">No Text Content</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Progress bar - only show if showBar is true */}
      {currentSlide?.showBar !== false && (
        <div
          className="display-progress-bar"
          style={{ height: `${getProgressBarHeight()}px` }}
        >
          <div
            className="display-progress-fill"
            style={{ width: `${slideProgress}%` }}
          />
        </div>
      )}

      {/* Bottom bar with RSS feed and logo - only show if showBar is true */}
      {currentSlide?.showBar !== false && (
        <div
          className="display-bottom-bar"
          style={{
            backgroundColor: settings.backgroundColor,
            color: settings.foregroundColor,
          }}
        >
          <div className="display-rss-feed">
            <Feed feeds={feeds} settings={settings} />
          </div>

          {settings.logoUrl && (
            <div className="display-bottom-logo">
              <img src={settings.logoUrl} alt="Logo" className="bottom-logo" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DisplayView;

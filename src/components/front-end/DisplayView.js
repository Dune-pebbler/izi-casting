import React, { useState, useEffect, useCallback, useRef } from "react";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
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
import PairingScreen from "./PairingScreen";
import SlideDisplay from "./SlideDisplay";
import ProgressBar from "./ProgressBar";
import BottomBar from "./BottomBar";
import FullscreenIndicator from "./FullscreenIndicator";

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
    showClock: true, // Default to showing clock
  });
  const [feeds, setFeeds] = useState([]);
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  // Animation states
  const [animationStep, setAnimationStep] = useState(0); // 0: initial, 1: text fade in, 2: code display
  // Refs to prevent unnecessary re-renders
  const hasInitializedRef = useRef(false);
  const generateDisplayPairingCodeRef = useRef();
  const isPairedRef = useRef(isPaired);
  const isGeneratingCodeRef = useRef(isGeneratingCode);
  const displayPairingCodeRef = useRef(displayPairingCode);
  const isGeneratingCodeInternalRef = useRef(false);
  
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

  console .log("DisplayView component rendered");
  // Component render - progress updates now use refs to prevent re-renders
  
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
    // Use a ref to prevent multiple simultaneous generations
    if (isGeneratingCodeInternalRef.current) {
      console.log("Already generating code internally, skipping...");
      return; // Prevent multiple simultaneous generations
    }

    console.log("Starting code generation...");
    isGeneratingCodeInternalRef.current = true;
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
        // Only update isPaired to false if the device is not already paired
        const deviceUpdateData = {
          deviceId: currentDeviceId,
          displayPairingCode: newCode,
          isLinked: true, // Mark as linked so it appears in admin panel
          deviceInfo: {
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            createdAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
          },
        };
        
        // Only set isPaired to false if we're not already paired
        // This prevents overwriting a successful pairing
        if (!isPairedRef.current) {
          deviceUpdateData.isPaired = false;
        }
        
        await setDoc(
          doc(db, "devices", currentDeviceId),
          deviceUpdateData,
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
      isGeneratingCodeInternalRef.current = false;
      dispatch(setIsGeneratingCode(false));
    }
  }, [generatePairingCode, dispatch]);

  // Store the function in a ref so it can be called from useEffect hooks
  generateDisplayPairingCodeRef.current = generateDisplayPairingCode;
  
  // Update refs when state changes
  isPairedRef.current = isPaired;
  isGeneratingCodeRef.current = isGeneratingCode;
  displayPairingCodeRef.current = displayPairingCode;

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

    // Remove the indicator after animation and then force reload
    setTimeout(() => {
      if (refreshIndicator.parentNode) {
        refreshIndicator.parentNode.removeChild(refreshIndicator);
      }
      // Force browser reload after showing the feedback
      console.log("Force reloading browser...");
      window.location.reload();
    }, 2000);
  }, []);

  // Listen for device pairing status changes in real-time
  useEffect(() => {
    console.log("🎧 Device pairing listener useEffect triggered");
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

          // Only update if the status actually changed
          if (newPairedStatus !== isPairedRef.current) {
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
              // Only generate new pairing code if we're not already generating one
              // and if we don't already have a valid pairing code
              if (!isGeneratingCodeRef.current && !displayPairingCodeRef.current) {
                console.log("Generating new pairing code for unpaired device");
                generateDisplayPairingCodeRef.current?.();
              }
            }
          }

        } else {
          // Device document doesn't exist, treat as unpaired
          if (isPairedRef.current) {
            console.log("Device document not found, treating as unpaired");
            dispatch(setIsPaired(false));
            // Only generate new code if we don't already have one
            if (!isGeneratingCodeRef.current && !displayPairingCodeRef.current) {
              generateDisplayPairingCodeRef.current?.();
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
  }, [deviceId]); // Only depend on deviceId, not dispatch to prevent loops

  // Listen for device commands (refresh, etc.)
  useEffect(() => {
    console.log("🎮 Device commands listener useEffect triggered");
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
  }, [deviceId, handleRefreshSlides]); // Removed dispatch from dependencies

  // Load content and settings from Firestore
  useEffect(() => {
    console.log("📄 Content loading useEffect triggered, isPaired:", isPaired);
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
          showClock: data.showClock !== undefined ? data.showClock : true, // Default to true if not set
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
    console.log("🎬 Playlists flattening useEffect triggered, playlists:", playlists.length);
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
              (slide.type === "video" && slide.videoUrl) ||
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

    // Enhanced debugging for slide processing
    console.log("🎬 Slide processing debug:");
    console.log("📊 Total playlists:", playlists.length);
    playlists.forEach((playlist, index) => {
      console.log(`📁 Playlist ${index + 1}:`, {
        id: playlist.id,
        name: playlist.name,
        isEnabled: playlist.isEnabled,
        slidesCount: playlist.slides?.length || 0
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
            layout: slide.layout,
            duration: slide.duration
          });
          
          // Log image URL and slide layout for each slide
          if (slide.imageUrl) {
            console.log(`🖼️ Slide ${slideIndex + 1} Image URL:`, slide.imageUrl);
            console.log(`📐 Slide ${slideIndex + 1} Layout:`, slide.layout || 'default');
          }
        });
      }
    });

    // Log image URLs and slide layouts for all flattened slides
    console.log("🎬 All flattened slides with image URLs and layouts:");
    allSlides.forEach((slide, index) => {
      console.log(`📄 Flattened Slide ${index + 1}:`, {
        id: slide.id,
        name: slide.name,
        layout: slide.layout || 'default',
        imageUrl: slide.imageUrl || 'No image',
        videoUrl: slide.videoUrl || 'No video',
        duration: slide.duration
      });
    });

    // Throttle console logging to prevent spam
    if (Date.now() % 10000 < 100) {
      // Only log every ~10 seconds
      console.log(
        "All flattened slides with positions:",
        allSlides.map((s) => ({
          id: s.id,
          type: s.type,
          imagePosition: s.imagePosition,
          duration: s.duration,
          hasVideoUrl: !!s.videoUrl
        }))
      );
    }
    console.log("🎬 Setting slides:", allSlides.length, "slides");
    setSlides(allSlides);
    setCurrentSlideIndex(0); // Reset to first slide when slides change
  }, [playlists]);

  useEffect(() => {
    console.log("🎠 Slide rotation useEffect triggered, slides:", slides.length);
    if (slides.length === 0) return;

    let currentIndex = 0;
    let timeoutId = null;
    
    const rotateSlides = () => {
      const currentSlide = slides[currentIndex];
      const slideDuration = (currentSlide?.duration || 5) * 1000; // Convert to milliseconds

      // Log current slide details including image URL and layout
      console.log("🎠 Current slide details:", {
        index: currentIndex,
        name: currentSlide?.name,
        layout: currentSlide?.layout || 'default',
        imageUrl: currentSlide?.imageUrl || 'No image',
        videoUrl: currentSlide?.videoUrl || 'No video',
        duration: currentSlide?.duration,
        calculatedDurationMs: slideDuration
      });

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
      console.log("🎠 Setting current slide index:", currentIndex);
      setCurrentSlideIndex(currentIndex);
      currentSlideRef.current = currentIndex;

      // Set up next rotation
      timeoutId = setTimeout(() => {
        currentIndex = (currentIndex + 1) % slides.length;
        rotateSlides();
      }, slideDuration);
    };

    // Start the rotation
    rotateSlides();

    // Cleanup function to clear timeout
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [slides]);

  // Progress tracking effect - resets when currentSlideIndex changes
  const currentSlideRef = useRef(0);
  const progressRef = useRef(0);
  const progressBarRef = useRef(null);
  
  useEffect(() => {
    if (slides.length === 0) return;

    const progressInterval = 100; // Update progress every 100ms for smoother animation
    progressRef.current = 0;
    let startTime = Date.now();

    const progressIntervalId = setInterval(() => {
      const currentSlide = slides[currentSlideRef.current];
      const slideDuration = (currentSlide?.duration || 5) * 1000;
      
      // Calculate progress based on elapsed time for more accurate timing
      const elapsedTime = Date.now() - startTime;
      const newProgress = Math.min((elapsedTime / slideDuration) * 100, 100);

      // If we reach 100%, reset to 0 for single slides or let it stay at 100% for multiple slides
      if (newProgress >= 100) {
        if (slides.length === 1) {
          // For single slides, reset progress to create a continuous loop
          progressRef.current = 0;
          // Reset start time for continuous loop
          startTime = Date.now();
        } else {
          progressRef.current = 100;
        }
      } else {
        progressRef.current = newProgress;
      }
      
      // Update progress bar directly without causing re-render
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${progressRef.current}%`;
      }
    }, progressInterval);

    return () => clearInterval(progressIntervalId);
  }, [slides, currentSlideIndex]); // Add currentSlideIndex to dependencies

  // Reset progress when currentSlideIndex changes (new slide starts)
  useEffect(() => {
    progressRef.current = 0;
    if (progressBarRef.current) {
      progressBarRef.current.style.width = '0%';
    }
  }, [currentSlideIndex]);

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      // Cleanup any remaining timeouts or intervals
      setSlideProgress(0);
      setCurrentSlideIndex(0);
      // Don't reset hasInitializedRef here - it should persist across re-renders
    };
  }, []);

  // Countdown timer for pairing code
  useEffect(() => {
    console.log("⏰ Countdown timer useEffect triggered", {
      isPaired,
      displayPairingCode: !!displayPairingCode,
      isGeneratingCode,
      codeTimeRemaining
    });
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
            generateDisplayPairingCodeRef.current?.();
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
  ]); // Removed dispatch from dependencies

  // Generate or get device ID on component mount
  useEffect(() => {
    console.log("🚀 Initialization useEffect triggered, hasInitialized:", hasInitializedRef.current);
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
          generateDisplayPairingCodeRef.current?.();
        }, 500);
      } else {
        console.log("Device is already paired, skipping pairing code generation");
      }
    };

    initializeDevice();
  }, []); // Empty dependency array - this should only run once on mount

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
  const slideLayout = currentSlide?.layout || "side-by-side"; // Default to side-by-side for backward compatibility

  return (
    <div
      className="display-container"
      style={{
        backgroundColor: settings.backgroundColor,
        color: settings.foregroundColor,
      }}
    >
      <FullscreenIndicator
        isFullscreen={isFullscreen}
        fullscreenSupported={fullscreenSupported}
        requestFullscreen={requestFullscreen}
      />
      
      <SlideDisplay
        currentSlide={currentSlide}
        slideLayout={slideLayout}
      />

      <ProgressBar
        currentSlide={currentSlide}
        slideProgress={slideProgress}
        progressBarRef={progressBarRef}
      />

      <BottomBar
        currentSlide={currentSlide}
        settings={settings}
        feeds={feeds}
      />
    </div>
  );
}

export default DisplayView;

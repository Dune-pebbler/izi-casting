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
import StatusBar from "./StatusBar/StatusBar";
import FullscreenIndicator from "./FullscreenIndicator";

function DisplayView() {

  const dispatch = useAppDispatch();
  const isPaired = useAppSelector((state) => state.device.isPaired);
  const deviceId = useAppSelector((state) => state.device.deviceId);
  const displayPairingCode = useAppSelector((state) => state.device.displayPairingCode);
  const isGeneratingCode = useAppSelector((state) => state.device.isGeneratingCode);
  const pairingError = useAppSelector((state) => state.device.pairingError);
  const codeTimeRemaining = useAppSelector((state) => state.device.codeTimeRemaining);
  const isCodeFlashing = useAppSelector((state) => state.device.isCodeFlashing);
  
  
  const [playlists, setPlaylists] = useState([]);
  const [slides, setSlides] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);
  const [settings, setSettings] = useState({
    logoUrl: "",
    backgroundColor: "#FAFAFA",
    foregroundColor: "#212121",
    feedUrl: "", 
    showClock: true,
    barStyle: "onder",
  });
  const [feeds, setFeeds] = useState([]);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  
  const [animationStep, setAnimationStep] = useState(0); 
  
  const hasInitializedRef = useRef(false);
  const generateDisplayPairingCodeRef = useRef();
  const isPairedRef = useRef(isPaired);
  const isGeneratingCodeRef = useRef(isGeneratingCode);
  const displayPairingCodeRef = useRef(displayPairingCode);
  const isGeneratingCodeInternalRef = useRef(false);
  
  
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
    
    
    let deviceId = '';
    try {
      
      const hash = fingerprint.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
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
        "Code generation finished, setting isGeneratingCode to false"
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
        handleFullscreenChange
      );
      document.removeEventListener(
        "msfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  
  
  
  
  
  
  
  
  

  
  
  

  
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
      const interval = setInterval(updateLastSeen, 60000); 
      return () => clearInterval(interval);
    }
  }, [isPaired, deviceId]);
  

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

          
          if (newPairedStatus !== isPairedRef.current) {
            dispatch(setIsPaired(newPairedStatus));

            if (newPairedStatus) {
              console.log("Device is now paired! Switching to display mode.");
              
              dispatch(setDisplayPairingCode(""));
              dispatch(clearPairingError());
            } else {
              console.log(
                "Device is no longer paired. Switching to pairing mode."
              );
              
              
              if (!isGeneratingCodeRef.current && !displayPairingCodeRef.current) {
                console.log("Generating new pairing code for unpaired device");
                generateDisplayPairingCodeRef.current?.();
              }
            }
          }

        } else {
          
          if (isPairedRef.current) {
            console.log("Device document not found, treating as unpaired");
            dispatch(setIsPaired(false));
            
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
  }, [deviceId]); 

  
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
          
          
          if (!commandData.processed) {
            console.log("New command received:", commandData);
            
            
            switch (commandData.command) {
              case "refresh":
                if (commandData.action === "restart_slides") {
                  console.log("Refresh command received, restarting slides from beginning");
                  handleRefreshSlides();
                }
                break;
              
              
              
              
              
              
              
              
              
              default:
                console.log("Unknown command type:", commandData.command);
            }
            
            
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
  }, [deviceId, handleRefreshSlides]); 

  
  useEffect(() => {
    console.log("📄 Content loading useEffect triggered, isPaired:", isPaired);
    if (!isPaired) return; 

    const displayDocRef = doc(db, "display", "content");
    const settingsDocRef = doc(db, "display", "settings");

    const unsubscribeContent = onSnapshot(displayDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        
        if (Date.now() % 10000 < 100) {
          
          console.log("Raw Firebase data:", data);
        }

        if (data.playlists) {
          
          setPlaylists(data.playlists);
        } else if (data.slides) {
          
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
          feedUrl: data.feedUrl || "", 
          showClock: data.showClock !== undefined ? data.showClock : true,
          barStyle: data.barStyle || "onder",
        });
        
        
        if (data.feeds && Array.isArray(data.feeds)) {
          
          const enabledFeeds = data.feeds.filter(feed => feed.isEnabled !== false && feed.isVisible !== false);
          setFeeds(enabledFeeds);
        } else if (data.feedUrl) {
          
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

  
  useEffect(() => {
    console.log("🎬 Playlists flattening useEffect triggered, playlists:", playlists.length);
    if (playlists.length === 0) {
      setSlides([]);
      return;
    }

    
    const allSlides = playlists.reduce((acc, playlist) => {
      
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
              (!slide.type && slide.text && slide.text.trim())) 
        );

        
        const repeatCount = playlist.repeatCount || 1;
        const repeatedSlides = [];
        for (let i = 0; i < repeatCount; i++) {
          repeatedSlides.push(...visibleSlides);
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
          
          
          if (slide.imageUrl) {
            console.log(`🖼️ Slide ${slideIndex + 1} Image URL:`, slide.imageUrl);
            console.log(`📐 Slide ${slideIndex + 1} Layout:`, slide.layout || 'default');
          }
        });
      }
    });

    
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

    
    if (Date.now() % 10000 < 100) {
      
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
    setCurrentSlideIndex(0); 
  }, [playlists]);

  useEffect(() => {
    console.log("🎠 Slide rotation useEffect triggered, slides:", slides.length);
    if (slides.length === 0) return;

    let currentIndex = 0;
    let timeoutId = null;
    
    const rotateSlides = () => {
      const currentSlide = slides[currentIndex];
      const slideDuration = (currentSlide?.duration || 5) * 1000; 

      
      console.log("🎠 Current slide details:", {
        index: currentIndex,
        name: currentSlide?.name,
        layout: currentSlide?.layout || 'default',
        imageUrl: currentSlide?.imageUrl || 'No image',
        videoUrl: currentSlide?.videoUrl || 'No video',
        duration: currentSlide?.duration,
        calculatedDurationMs: slideDuration
      });

      
      if (Date.now() % 5000 < 100) {
        
        console.log(
          "Slide timing - Current slide:",
          currentSlide?.name,
          "Duration:",
          currentSlide?.duration,
          "Calculated duration (ms):",
          slideDuration
        );
      }

      
      console.log("🎠 Setting current slide index:", currentIndex);
      setCurrentSlideIndex(currentIndex);
      currentSlideRef.current = currentIndex;

      
      timeoutId = setTimeout(() => {
        currentIndex = (currentIndex + 1) % slides.length;
        rotateSlides();
      }, slideDuration);
    };

    
    rotateSlides();

    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [slides]);

  
  const currentSlideRef = useRef(0);
  const progressRef = useRef(0);
  const progressBarRef = useRef(null);
  
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
      progressBarRef.current.style.width = '0%';
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
      codeTimeRemaining
    });
    if (
      !isPaired &&
      displayPairingCode &&
      !isGeneratingCode
    ) {
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
  }, [
    isPaired,
    displayPairingCode,
    isGeneratingCode,
    codeTimeRemaining,
  ]); 

  
  useEffect(() => {
    console.log("🚀 Initialization useEffect triggered, hasInitialized:", hasInitializedRef.current);
    if (hasInitializedRef.current) return; 

    console.log("DisplayView component mounted");
    hasInitializedRef.current = true;

    const initializeDevice = async () => {
      
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

      
      setFullscreenSupported(!!document.fullscreenEnabled);

      
      const isPaired = await checkDevicePairing(currentDeviceId);
      
      
      if (!isPaired) {
        console.log("Device not paired, generating pairing code...");
        
        setTimeout(() => {
          generateDisplayPairingCodeRef.current?.();
        }, 500);
      } else {
        console.log("Device is already paired, skipping pairing code generation");
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


  return (
    <div
      className="display-container"
    >
      <FullscreenIndicator
        isFullscreen={isFullscreen}
        fullscreenSupported={fullscreenSupported}
        requestFullscreen={requestFullscreen}
      />
      
      <SlideDisplay
        currentSlide={currentSlide}
        slideLayout={slideLayout}
        nextSlide={nextSlide}
        nextSlideLayout={nextSlideLayout}
      />

      <ProgressBar
        currentSlide={currentSlide}
        slideProgress={slideProgress}
        progressBarRef={progressBarRef}
        barStyle={settings.barStyle}
      />

      <StatusBar
        currentSlide={currentSlide}
        settings={settings}
        feeds={feeds}
      />
    </div>
  );
}

export default DisplayView;

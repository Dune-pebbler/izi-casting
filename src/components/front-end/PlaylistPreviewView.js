import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Navigate } from "react-router-dom";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { tenantDoc } from "../../utils/tenantPaths";
import SlideDisplay from "./SlideDisplay";
import ProgressBar from "./ProgressBar";
import StatusBar from "./StatusBar/StatusBar";
import { ChevronLeft, ChevronRight } from "lucide-react";

function PlaylistPreviewView() {
  const { tenantId } = useParams();

  const [authState, setAuthState] = useState({
    loading: true,
    user: null,
    authorized: false,
  });
  const [redirectToLogin, setRedirectToLogin] = useState(false);

  const [playlists, setPlaylists] = useState([]);
  const [slides, setSlides] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);
  const [tenantSlideTypes, setTenantSlideTypes] = useState({});
  const [tenantModules, setTenantModules] = useState({});
  const [settings, setSettings] = useState({
    logoUrl: "",
    backgroundColor: "#FAFAFA",
    foregroundColor: "#212121",
    progressBarColor: "#3dbcc9",
    feedUrl: "",
    showClock: true,
    showDate: true,
    barStyle: "onder",
    backgroundMusic: null,
  });
  const [feeds, setFeeds] = useState([]);
  const [showControls, setShowControls] = useState(false);

  const currentSlideRef = useRef(0);
  const slidesRef = useRef([]);
  const rotationRestartRef = useRef(null);
  const progressRef = useRef(0);
  const progressBarRef = useRef(null);
  const hideControlsTimerRef = useRef(null);

  // Auth check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setRedirectToLogin(true);
        setAuthState({ loading: false, user: null, authorized: false });
        return;
      }

      const email = firebaseUser.email || "";

      if (email.endsWith("@dunepebbler.nl")) {
        setAuthState({ loading: false, user: firebaseUser, authorized: true });
        return;
      }

      try {
        const tenantSnap = await getDoc(doc(db, "tenants", tenantId));
        if (tenantSnap.exists()) {
          const data = tenantSnap.data();
          const authorizedUsers = data.authorizedUsers || [];
          const isAuthorized = authorizedUsers.some((u) =>
            typeof u === "string" ? u === email : u.email === email,
          );
          setAuthState({
            loading: false,
            user: firebaseUser,
            authorized: isAuthorized,
          });
        } else {
          setAuthState({
            loading: false,
            user: firebaseUser,
            authorized: false,
          });
        }
      } catch {
        setAuthState({ loading: false, user: firebaseUser, authorized: false });
      }
    });

    return () => unsubscribe();
  }, [tenantId]);

  // Firebase data loading
  useEffect(() => {
    if (!authState.authorized) return;

    const displayDocRef = tenantDoc(db, tenantId, "display", "content");
    const settingsDocRef = tenantDoc(db, tenantId, "display", "settings");

    const unsubscribeTenant = onSnapshot(
      doc(db, "tenants", tenantId),
      (snap) => {
        const tenantData = snap.exists() ? snap.data() : {};
        setTenantModules(tenantData.modules || {});
        setTenantSlideTypes(tenantData.slideTypes || {});
      },
    );

    const unsubscribeContent = onSnapshot(displayDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.playlists) {
          setPlaylists(data.playlists);
        } else if (data.slides) {
          setPlaylists([
            {
              id: "default",
              name: "Default Playlist",
              slides: data.slides || [],
            },
          ]);
        } else {
          setPlaylists([]);
        }
      }
    });

    const unsubscribeSettings = onSnapshot(settingsDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings({
          logoUrl: data.logoUrl || "",
          backgroundColor: data.backgroundColor || "#FAFAFA",
          foregroundColor: data.foregroundColor || "#212121",
          progressBarColor: data.progressBarColor || "#3dbcc9",
          feedUrl: data.feedUrl || "",
          showClock: data.showClock !== undefined ? data.showClock : true,
          showDate: data.showDate !== undefined ? data.showDate : true,
          barStyle: data.barStyle || "onder",
          backgroundMusic: data.backgroundMusic || null,
        });

        const typo = data.typography || {};
        const defaults = {
          p: { fontSize: 27, fontFamily: "Roboto" },
          h1: { fontSize: 64, fontFamily: "Roboto" },
          h2: { fontSize: 53, fontFamily: "Roboto" },
          h3: { fontSize: 43, fontFamily: "Roboto" },
        };
        ["p", "h1", "h2", "h3"].forEach((tag) => {
          const t = typo[tag] || defaults[tag];
          document.documentElement.style.setProperty(
            `--typo-${tag}-size`,
            `${t.fontSize}px`,
          );
          document.documentElement.style.setProperty(
            `--typo-${tag}-family`,
            t.fontFamily,
          );
        });

        if (data.feeds && Array.isArray(data.feeds)) {
          setFeeds(
            data.feeds.filter(
              (f) => f.isEnabled !== false && f.isVisible !== false,
            ),
          );
        } else if (data.feedUrl) {
          setFeeds([
            {
              id: "legacy",
              name: "Legacy Feed",
              url: data.feedUrl,
              isEnabled: true,
              duration: 10,
              isVisible: true,
            },
          ]);
        } else {
          setFeeds([]);
        }
      }
    });

    return () => {
      unsubscribeTenant();
      unsubscribeContent();
      unsubscribeSettings();
    };
  }, [authState.authorized, tenantId]);

  // Flatten playlists → slides
  useEffect(() => {
    if (playlists.length === 0) {
      setSlides([]);
      return;
    }

    const allSlides = playlists.reduce((acc, playlist) => {
      if (playlist.isEnabled === false) return acc;
      if (!playlist.slides) return acc;

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const isTimeActive = (slide) => {
        const tr = slide.timeRestriction;
        if (!tr?.enabled) return true;

        if (tr.startDate || tr.endDate) {
          const pad = (n) => String(n).padStart(2, "0");
          const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
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

        if (tr.days) {
          const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
          const key = dayKeys[now.getDay()];
          if (tr.days[key] === false) return false;
        }

        const [sh, sm] = tr.startTime.split(":").map(Number);
        const [eh, em] = tr.endTime.split(":").map(Number);
        const start = sh * 60 + sm;
        const end = eh * 60 + em;
        return start <= end
          ? currentMinutes >= start && currentMinutes <= end
          : currentMinutes >= start || currentMinutes <= end;
      };

      const hasSlideTypeConfig = Object.keys(tenantSlideTypes).length > 0;
      const isSlideTypeAllowed = (slide) => {
        if (!hasSlideTypeConfig) return true;
        const typeKey = slide.layout || slide.type;
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
            (slide.layout === "weather" && slide.weatherLat) ||
            (slide.layout === "sportlink" &&
              slide.sportlinkApiKey &&
              slide.sportlinkTeams &&
              slide.sportlinkTeams.length > 0) ||
            (!slide.type && slide.text && slide.text.trim())),
      );

      const repeatCount = playlist.repeatCount || 1;
      const taggedSlides = visibleSlides.map((slide) => ({
        ...slide,
        _playlistId: playlist.id,
        _playlistMusic: playlist.backgroundMusic || null,
      }));
      const repeated = [];
      for (let i = 0; i < repeatCount; i++) {
        repeated.push(...taggedSlides);
      }
      return [...acc, ...repeated];
    }, []);

    setSlides(allSlides);
    setCurrentSlideIndex(0);
  }, [playlists, tenantSlideTypes]);

  // Slide rotation
  useEffect(() => {
    if (slides.length === 0) return;

    slidesRef.current = slides;
    let currentIndex = 0;
    let timeoutId = null;

    const rotateSlides = () => {
      const currentSlide = slides[currentIndex];
      const slideDuration = (currentSlide?.duration || 5) * 1000;

      setCurrentSlideIndex(currentIndex);
      currentSlideRef.current = currentIndex;

      // Progress bar animation
      progressRef.current = 0;
      setSlideProgress(0);
      if (progressBarRef.current) {
        progressBarRef.current.style.transition = "none";
        progressBarRef.current.style.width = "0%";
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (progressBarRef.current) {
              progressBarRef.current.style.transition = `width ${slideDuration}ms linear`;
              progressBarRef.current.style.width = "100%";
            }
          });
        });
      }

      timeoutId = setTimeout(() => {
        currentIndex = (currentIndex + 1) % slides.length;
        rotateSlides();
      }, slideDuration);
    };

    rotationRestartRef.current = (newIndex) => {
      if (timeoutId) clearTimeout(timeoutId);
      currentIndex = newIndex;
      rotateSlides();
    };

    rotateSlides();

    return () => {
      rotationRestartRef.current = null;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [slides]);

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
  }, []);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current)
      clearTimeout(hideControlsTimerRef.current);
    hideControlsTimerRef.current = setTimeout(
      () => setShowControls(false),
      3000,
    );
  }, []);

  useEffect(() => {
    return () => {
      if (hideControlsTimerRef.current)
        clearTimeout(hideControlsTimerRef.current);
    };
  }, []);

  if (redirectToLogin) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(window.location.pathname)}`}
        replace
      />
    );
  }

  if (authState.loading) {
    return <div className="loading">Laden...</div>;
  }

  if (!authState.authorized) {
    return (
      <div className="access-denied">
        <h2>Geen toegang</h2>
        <p>
          Je account ({authState.user?.email}) heeft geen toegang tot deze
          omgeving.
        </p>
        <p>
          Neem contact op met{" "}
          <a href="mailto:info@dunepebbler.nl">info@dunepebbler.nl</a> om
          toegang te krijgen.
        </p>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="display-container">
        <div className="display-content">
          <div className="display-text">Geen slides beschikbaar</div>
        </div>
      </div>
    );
  }

  const currentSlide = slides[currentSlideIndex];
  const slideLayout = currentSlide?.layout || "side-by-side";
  const nextSlideIndex = (currentSlideIndex + 1) % slides.length;
  const nextSlide = slides[nextSlideIndex];
  const nextSlideLayout = nextSlide?.layout || "side-by-side";

  return (
    <div
      className="display-container preview-mode"
      onMouseMove={handleMouseMove}
    >
      <SlideDisplay
        currentSlide={currentSlide}
        slideLayout={slideLayout}
        nextSlide={nextSlide}
        nextSlideLayout={nextSlideLayout}
        effectsEnabled={!!tenantModules.slideEffects}
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

      <div
        className={`preview-controls-overlay ${showControls ? "visible" : ""}`}
      >
        <button
          className="preview-nav-btn"
          onClick={() => handleChangeSlide("prev")}
          title="Vorige slide"
        >
          <ChevronLeft size={28} />
        </button>

        <span className="preview-slide-counter">
          {currentSlideIndex + 1} / {slides.length}
        </span>

        <button
          className="preview-nav-btn"
          onClick={() => handleChangeSlide("next")}
          title="Volgende slide"
        >
          <ChevronRight size={28} />
        </button>
      </div>
    </div>
  );
}

export default PlaylistPreviewView;

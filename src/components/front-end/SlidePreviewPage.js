import React, { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { tenantDoc } from "../../utils/tenantPaths";
import SlideDisplay from "./SlideDisplay";
import ProgressBar from "./ProgressBar";
import StatusBar from "./StatusBar/StatusBar";

function SlidePreviewPage() {
  const { tenantId, slideId } = useParams();

  const [authState, setAuthState] = useState({
    loading: true,
    user: null,
    authorized: false,
  });
  const [redirectToLogin, setRedirectToLogin] = useState(false);
  const [slide, setSlide] = useState(null);
  const [slideLoading, setSlideLoading] = useState(true);
  const [settings, setSettings] = useState({
    logoUrl: "",
    backgroundColor: "#FAFAFA",
    foregroundColor: "#212121",
    progressBarColor: "#3dbcc9",
    showClock: true,
    showDate: true,
    barStyle: "onder",
  });
  const [feeds, setFeeds] = useState([]);


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

  // Load slide and settings once authorized
  useEffect(() => {
    if (!authState.authorized) return;

    // One-time slide load
    const loadSlide = async () => {
      try {
        const contentSnap = await getDoc(
          tenantDoc(db, tenantId, "display", "content"),
        );
        if (contentSnap.exists()) {
          const data = contentSnap.data();
          for (const playlist of data.playlists || []) {
            const found = (playlist.slides || []).find(
              (s) => String(s.id) === slideId,
            );
            if (found) {
              setSlide(found);
              break;
            }
          }
        }
      } finally {
        setSlideLoading(false);
      }
    };

    loadSlide();

    // Live settings listener (so StatusBar reflects real bar/clock/feeds)
    const unsubscribeSettings = onSnapshot(
      tenantDoc(db, tenantId, "display", "settings"),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setSettings({
          logoUrl: data.logoUrl || "",
          backgroundColor: data.backgroundColor || "#FAFAFA",
          foregroundColor: data.foregroundColor || "#212121",
          progressBarColor: data.progressBarColor || "#3dbcc9",
          showClock: data.showClock !== undefined ? data.showClock : true,
          showDate: data.showDate !== undefined ? data.showDate : true,
          barStyle: data.barStyle || "onder",
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
      },
    );

    return () => unsubscribeSettings();
  }, [authState.authorized, tenantId, slideId]);

  if (redirectToLogin) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(window.location.pathname)}`}
        replace
      />
    );
  }

  if (authState.loading || slideLoading) {
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

  if (!slide) {
    return <div className="loading">Slide niet gevonden.</div>;
  }

  return (
    <div className="display-container preview-mode">
      <SlideDisplay
        currentSlide={slide}
        slideLayout={slide.layout}
        effectsEnabled={false}
      />
      <ProgressBar
        currentSlide={slide}
        slideProgress={0}
        progressBarRef={null}
        barStyle={settings.barStyle}
        color={settings.progressBarColor}
      />
      <StatusBar currentSlide={slide} settings={settings} feeds={feeds} />
    </div>
  );
}

export default SlidePreviewPage;

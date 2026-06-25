import React, { useState, useEffect, useRef } from "react";
import { Tv, Palette, ChevronLeft, ChevronRight } from "lucide-react";

export const TELETEKST_THEMES = [
  {
    id: "classic",
    name: "Klassiek",
    bg: "#000",
    text: "#fff",
    colors: {
      red: "#ff0000",
      green: "#00ff00",
      yellow: "#ffff00",
      blue: "#0000ff",
      cyan: "#00ffff",
      magenta: "#ff00ff",
      white: "#ffffff",
      black: "#000000",
    },
  },
  {
    id: "amber",
    name: "Amber",
    bg: "#000",
    text: "#ffb000",
    colors: {
      red: "#ff8800",
      green: "#ffb000",
      yellow: "#ffd700",
      blue: "#ff6600",
      cyan: "#ffcc00",
      magenta: "#ff9900",
      white: "#ffe4b5",
      black: "#000000",
    },
  },
  {
    id: "cool",
    name: "Koel Blauw",
    bg: "#001a33",
    text: "#00ffff",
    colors: {
      red: "#ff6b9d",
      green: "#00ff88",
      yellow: "#ffff88",
      blue: "#66b3ff",
      cyan: "#00ffff",
      magenta: "#cc99ff",
      white: "#e6f2ff",
      black: "#001a33",
    },
  },
  {
    id: "matrix",
    name: "Matrix",
    bg: "#0d0208",
    text: "#00ff41",
    colors: {
      red: "#39ff14",
      green: "#00ff41",
      yellow: "#ccff00",
      blue: "#00ff88",
      cyan: "#0dff00",
      magenta: "#7fff00",
      white: "#b7ff4a",
      black: "#0d0208",
    },
  },
  {
    id: "warm",
    name: "Warm",
    bg: "#1a0f00",
    text: "#ffa500",
    colors: {
      red: "#ff4500",
      green: "#ffa500",
      yellow: "#ffff00",
      blue: "#ff6347",
      cyan: "#ffd700",
      magenta: "#ff69b4",
      white: "#ffe4b5",
      black: "#1a0f00",
    },
  },
  {
    id: "paper",
    name: "Papier",
    bg: "#f5f5dc",
    text: "#000",
    colors: {
      red: "#8b0000",
      green: "#006400",
      yellow: "#b8860b",
      blue: "#00008b",
      cyan: "#008b8b",
      magenta: "#8b008b",
      white: "#2f4f4f",
      black: "#f5f5dc",
    },
  },
  {
    id: "light-modern",
    name: "Licht Modern",
    bg: "#f8f9fa",
    text: "#212529",
    colors: {
      red: "#dc3545",
      green: "#28a745",
      yellow: "#ffc107",
      blue: "#007bff",
      cyan: "#17a2b8",
      magenta: "#e83e8c",
      white: "#495057",
      black: "#f8f9fa",
    },
  },
  {
    id: "pastel",
    name: "Pastel",
    bg: "#fef6e4",
    text: "#3d405b",
    colors: {
      red: "#f582ae",
      green: "#81b29a",
      yellow: "#f2cc8f",
      blue: "#8cb4d4",
      cyan: "#7bc9c9",
      magenta: "#d4a5d9",
      white: "#6d6875",
      black: "#fef6e4",
    },
  },
];

function TeletekstInput({
  channel = "101",
  theme = "classic",
  pages = [1],
  skipTopLines = 0,
  skipBottomLines = 0,
  onChannelChange,
  onThemeChange,
  onPagesChange,
  onSkipTopLinesChange,
  onSkipBottomLinesChange,
}) {
  const [maxPages, setMaxPages] = useState(1);
  const [detectingPages, setDetectingPages] = useState(false);

  const handleChange = (e) => {
    const value = e.target.value;
    // Only allow numbers and limit to 3 digits
    if (/^\d{0,3}$/.test(value)) {
      onChannelChange(value);
    }
  };

  const handleThemeChange = (e) => {
    if (onThemeChange) {
      onThemeChange(e.target.value);
    }
  };

  // Detect how many sub-pages are available for this channel
  const prevChannelRef = useRef(channel);
  useEffect(() => {
    // Reset the page selection whenever the channel actually changes —
    // a previously selected subpage may not exist on the new channel.
    if (prevChannelRef.current !== channel) {
      prevChannelRef.current = channel;
      onPagesChange && onPagesChange([1]);
    }

    if (!channel || channel.length < 3) {
      setMaxPages(1);
      return;
    }

    let cancelled = false;
    const detect = async () => {
      setDetectingPages(true);
      try {
        let page = 1;
        let nextSubPage = true;
        while (nextSubPage) {
          const key = page === 1 ? channel : `${channel}-${page}`;
          const res = await fetch(`/api/teletekst/${key}`);
          if (!res.ok) break;
          const ct = res.headers.get("content-type") || "";
          if (!ct.includes("application/json")) break;
          const data = await res.json();
          nextSubPage = !!data.nextSubPage;
          page += 1;
          if (page > 10) break; // safety cap
        }
        const detectedMaxPages = page - 1;
        if (!cancelled) {
          setMaxPages(detectedMaxPages);
          // Drop any selected pages that don't exist on this channel
          const validPages = pages.filter((p) => p <= detectedMaxPages);
          if (validPages.length !== pages.length) {
            onPagesChange &&
              onPagesChange(validPages.length ? validPages : [1]);
          }
        }
      } catch {
        if (!cancelled) setMaxPages(1);
      } finally {
        if (!cancelled) setDetectingPages(false);
      }
    };

    const timer = setTimeout(detect, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [channel]);

  const selectedTheme =
    TELETEKST_THEMES.find((t) => t.id === theme) || TELETEKST_THEMES[0];

  const sortedPages = [...pages].sort((a, b) => a - b);

  const togglePage = (page) => {
    if (!onPagesChange) return;
    if (sortedPages.includes(page)) {
      if (sortedPages.length === 1) return; // keep at least one page selected
      onPagesChange(sortedPages.filter((p) => p !== page));
    } else {
      onPagesChange([...sortedPages, page].sort((a, b) => a - b));
    }
  };

  return (
    <div className="teletekst-input">
      <div className="teletekst-input-section">
        <label className="input-label">
          <Tv size={16} />
          NOS Teletekst Paginanummer
        </label>
        <input
          type="text"
          value={channel}
          onChange={handleChange}
          placeholder="101"
          maxLength="3"
          className="channel-input"
        />
        <p className="input-hint">
          Voer een 3-cijferig NOS Teletekst paginanummer in (bijv. 101 voor
          nieuws, 102 voor koppen)
        </p>
      </div>

      {channel.length === 3 && (
        <div className="teletekst-input-section">
          <label className="input-label">
            <Tv size={16} />
            Pagina's
          </label>
          {detectingPages ? (
            <p className="input-hint">Pagina's detecteren...</p>
          ) : maxPages <= 1 ? (
            <p className="input-hint">Deze pagina heeft geen subpagina's.</p>
          ) : (
            <>
              <div className="page-toggle-selector">
                {Array.from({ length: maxPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      type="button"
                      className={`page-toggle-btn ${sortedPages.includes(page) ? "active" : ""}`}
                      onClick={() => togglePage(page)}
                    >
                      {page}
                    </button>
                  ),
                )}
              </div>
              <p className="input-hint">
                Toon{" "}
                {sortedPages.length === 1
                  ? `alleen pagina ${sortedPages[0]}`
                  : `pagina's ${sortedPages.join(", ")}`}{" "}
                — elke pagina wordt even lang getoond.
              </p>
            </>
          )}
        </div>
      )}

      <div className="teletekst-input-section">
        <label className="input-label">
          <Tv size={16} />
          Bovenste regels overslaan
        </label>
        <div className="page-count-selector">
          <button
            type="button"
            className="page-count-btn"
            onClick={() =>
              onSkipTopLinesChange &&
              onSkipTopLinesChange(Math.max(0, skipTopLines - 1))
            }
            disabled={skipTopLines <= 0}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="page-count-value">{skipTopLines}</span>
          <button
            type="button"
            className="page-count-btn"
            onClick={() =>
              onSkipTopLinesChange &&
              onSkipTopLinesChange(Math.min(20, skipTopLines + 1))
            }
            disabled={skipTopLines >= 20}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <p className="input-hint">
          {skipTopLines === 0
            ? "Hele pagina wordt getoond."
            : `De bovenste ${skipTopLines} ${skipTopLines === 1 ? "regel wordt" : "regels worden"} afgekapt.`}
        </p>
      </div>

      <div className="teletekst-input-section">
        <label className="input-label">
          <Tv size={16} />
          Onderste regels overslaan
        </label>
        <div className="page-count-selector">
          <button
            type="button"
            className="page-count-btn"
            onClick={() =>
              onSkipBottomLinesChange &&
              onSkipBottomLinesChange(Math.max(0, skipBottomLines - 1))
            }
            disabled={skipBottomLines <= 0}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="page-count-value">{skipBottomLines}</span>
          <button
            type="button"
            className="page-count-btn"
            onClick={() =>
              onSkipBottomLinesChange &&
              onSkipBottomLinesChange(Math.min(20, skipBottomLines + 1))
            }
            disabled={skipBottomLines >= 20}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <p className="input-hint">
          {skipBottomLines === 0
            ? "Hele pagina wordt getoond."
            : `De onderste ${skipBottomLines} ${skipBottomLines === 1 ? "regel wordt" : "regels worden"} afgekapt.`}
        </p>
      </div>

      <div className="teletekst-theme-section">
        <label className="input-label">
          <Palette size={16} />
          Kleurthema
        </label>
        <div className="theme-selector">
          {TELETEKST_THEMES.map((themeOption) => (
            <button
              key={themeOption.id}
              className={`theme-option ${theme === themeOption.id ? "active" : ""}`}
              onClick={() =>
                handleThemeChange({ target: { value: themeOption.id } })
              }
              title={themeOption.name}
            >
              <div
                className="theme-preview"
                style={{
                  backgroundColor: themeOption.bg,
                }}
              >
                <span style={{ color: themeOption.colors.green }}>A</span>
                <span style={{ color: themeOption.colors.yellow }}>a</span>
                <span style={{ color: themeOption.colors.cyan }}>1</span>
              </div>
              <span className="theme-name">{themeOption.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="teletekst-preview">
        <p className="preview-label">API Eindpunt:</p>
        {sortedPages.map((page) => (
          <code key={page}>
            {" "}
            /api/teletekst/
            {page === 1 ? channel || "101" : `${channel}-${page}`}
          </code>
        ))}
      </div>
    </div>
  );
}

export default TeletekstInput;

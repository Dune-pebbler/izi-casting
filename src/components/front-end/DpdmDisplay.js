import React, { useEffect, useRef, useState } from "react";
import { auth } from "../../firebase";
import { DPDM_SOURCES } from "../../utils/dpdmTypes";

const REFRESH_INTERVAL_MS = 2 * 60 * 1000;
const SCROLL_SPEED_PX_PER_SEC = 30;

// Preview pages are opened by a signed-in admin (ID token); display screens
// identify themselves by their paired device id. The server decides.
async function buildAuthHeaders() {
  const headers = { Accept: "application/json" };
  try {
    await auth.authStateReady?.();
    const token = await auth.currentUser?.getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // Not signed in — fall back to the device id below.
  }
  try {
    const deviceId = localStorage.getItem("izi_device_id");
    if (deviceId) headers["X-Device-Id"] = deviceId;
  } catch {
    // localStorage unavailable
  }
  return headers;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDate(value) {
  if (!value) return null;
  // "YYYY-MM-DD" is parsed as UTC by Date(); force local midnight instead.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(value) {
  const d = parseDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysBetween(from, to) {
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

function formatSince(value) {
  const d = parseDate(value);
  if (!d) return "—";
  const diffMin = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
  if (diffMin < 60) return `${diffMin} min`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} uur`;
  const diffDay = Math.floor(diffHour / 24);
  return diffDay === 1 ? "1 dag" : `${diffDay} dagen`;
}

function WebsiteCell({ item }) {
  return (
    <div className="dpdm-slide__site">
      <span className="dpdm-slide__site-name">{item.name}</span>
      {item.customer && (
        <span className="dpdm-slide__site-customer">{item.customer.trim()}</span>
      )}
    </div>
  );
}

const COLUMNS = {
  "dpdm-updates": {
    headers: ["Website", "WP-versie", "Laatste update", "Gepland"],
    template: "minmax(0, 2.4fr) minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 1.3fr)",
    renderRow: (item) => {
      const next = parseDate(item.next_update_at);
      const overdueDays = next ? daysBetween(next, startOfToday()) : 0;
      return [
        <WebsiteCell item={item} />,
        <span className="dpdm-slide__muted">{item.wordpress_version || "—"}</span>,
        <span className="dpdm-slide__muted">
          {item.last_update_at ? formatDate(item.last_update_at) : "Nooit"}
        </span>,
        <div className="dpdm-slide__stack">
          <span>{formatDate(item.next_update_at)}</span>
          <span
            className={`dpdm-slide__pill dpdm-slide__pill--${overdueDays > 0 ? "danger" : "warning"}`}
          >
            {overdueDays > 0
              ? `${overdueDays} ${overdueDays === 1 ? "dag" : "dagen"} te laat`
              : "Vandaag"}
          </span>
        </div>,
      ];
    },
  },
  "dpdm-ssl": {
    headers: ["Website", "Fout", "Verloopt", "Uitgever"],
    template: "minmax(0, 2fr) minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr)",
    renderRow: (item) => [
      <WebsiteCell item={item} />,
      <span className="dpdm-slide__error">
        {item.ssl_expired ? "Verlopen" : item.ssl_error || "Onbekende fout"}
      </span>,
      <span className="dpdm-slide__muted">{formatDate(item.ssl_expires_at)}</span>,
      <span className="dpdm-slide__muted">{item.ssl_issuer || "—"}</span>,
    ],
  },
  "dpdm-uptime": {
    headers: ["Website", "Fout", "Status", "Offline sinds"],
    template: "minmax(0, 2fr) minmax(0, 2fr) minmax(0, 0.7fr) minmax(0, 1fr)",
    renderRow: (item) => [
      <WebsiteCell item={item} />,
      <span className="dpdm-slide__error">{item.uptime_error || "Offline"}</span>,
      <span className="dpdm-slide__muted">{item.uptime_status ?? "—"}</span>,
      <span>{formatSince(item.uptime_down_since_at)}</span>,
    ],
  },
};

function DpdmDisplay({ slide }) {
  const layout = slide.layout;
  const source = DPDM_SOURCES[layout];
  const columns = COLUMNS[layout];
  const maxItems = Number(slide.dpdmMaxItems) || 20;
  const title = slide.dpdmTitle?.trim() || source?.title;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scroll, setScroll] = useState(null);
  const bodyRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!source) return undefined;
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`/api/dpdm/${source.endpoint}`, {
          headers: await buildAuthHeaders(),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const message =
            typeof json.error === "string"
              ? json.error
              : json.error?.message || `Serverfout (${res.status})`;
          throw new Error(message);
        }
        if (cancelled) return;
        const data = Array.isArray(json.data) ? json.data : [];
        setTotal(data.length);
        setItems(data.slice(0, maxItems));
        setFetchedAt(json.fetchedAt || new Date().toISOString());
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [source, maxItems]);

  // Auto-scroll when the list is taller than the slide.
  useEffect(() => {
    if (loading || !bodyRef.current || !contentRef.current) return undefined;
    const timer = setTimeout(() => {
      const overflow =
        contentRef.current.scrollHeight - bodyRef.current.clientHeight;
      setScroll(
        overflow > 0
          ? { dist: overflow, duration: Math.max(8, (overflow / SCROLL_SPEED_PX_PER_SEC) * 2.5) }
          : null,
      );
    }, 100);
    return () => clearTimeout(timer);
  }, [loading, items]);

  if (!source) return null;

  const hasItems = !loading && !error && items.length > 0;
  const isEmpty = !loading && !error && items.length === 0;

  return (
    <div className={`dpdm-slide dpdm-slide--${layout}`}>
      <div className="dpdm-slide__header">
        <span className="dpdm-slide__title">{title}</span>
        {hasItems && (
          <span
            className={`dpdm-slide__count dpdm-slide__count--${layout === "dpdm-updates" ? "warning" : "danger"}`}
          >
            {total}
          </span>
        )}
        {fetchedAt && (
          <span className="dpdm-slide__updated">
            Bijgewerkt{" "}
            {new Date(fetchedAt).toLocaleTimeString("nl-NL", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {loading && <div className="dpdm-slide__state">Gegevens ophalen…</div>}

      {!loading && error && (
        <div className="dpdm-slide__state dpdm-slide__state--error">{error}</div>
      )}

      {isEmpty && (
        <div className="dpdm-slide__ok">
          <svg
            className="dpdm-slide__ok-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m8 12 3 3 5-6" />
          </svg>
          <span className="dpdm-slide__ok-title">Alles in orde</span>
          <span className="dpdm-slide__ok-text">{source.emptyText}</span>
        </div>
      )}

      {hasItems && (
        <>
          <div
            className="dpdm-slide__row dpdm-slide__row--head"
            style={{ gridTemplateColumns: columns.template }}
          >
            {columns.headers.map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>
          <div className="dpdm-slide__body" ref={bodyRef}>
            <div
              ref={contentRef}
              className={`dpdm-slide__rows${scroll ? " dpdm-slide__rows--scroll" : ""}`}
              style={
                scroll
                  ? {
                      "--dpdm-scroll-dist": `-${scroll.dist}px`,
                      "--dpdm-scroll-duration": `${scroll.duration}s`,
                    }
                  : undefined
              }
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  className="dpdm-slide__row"
                  style={{ gridTemplateColumns: columns.template }}
                >
                  {columns.renderRow(item).map((cell, i) => (
                    <div key={i} className="dpdm-slide__cell">
                      {cell}
                    </div>
                  ))}
                </div>
              ))}
              {total > items.length && (
                <div className="dpdm-slide__more">
                  + {total - items.length} meer
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DpdmDisplay;

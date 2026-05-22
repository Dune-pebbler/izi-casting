import React, { useState, useEffect, useRef } from "react";
import { sanitizeHTMLContent } from "../../utils/sanitize";
import TextPagination from "./TextPagination";
import VideoPlayer from "./VideoPlayer";
import TeletekstDisplay from "./TeletekstDisplay";
import WeatherDisplay from "./WeatherDisplay";
import QrFeedDisplay from "./QrFeedDisplay";
import { getTextPaginationConfig } from "../../config/textPagination";

function CountdownDisplay({ slide }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!slide.countdownTargetDate) return;

    const tick = () => {
      const target = new Date(slide.countdownTargetDate).getTime();
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft(null);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        );
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [slide.countdownTargetDate]);

  const textColor = slide.countdownTextColor || "#ffffff";
  const numberColor = slide.countdownNumberColor || "#ffffff";
  const blockBg = slide.countdownBlockBg || "#1a1a2e";
  const labelColor = slide.countdownLabelColor || "#aaaaaa";

  const units = timeLeft
    ? [
        { value: timeLeft.days, label: "Dagen" },
        { value: timeLeft.hours, label: "Uren" },
        { value: timeLeft.minutes, label: "Minuten" },
        { value: timeLeft.seconds, label: "Seconden" },
      ]
    : null;

  return (
    <div
      className="display-countdown"
      style={{
        backgroundImage: slide.countdownBgImage
          ? `url(${slide.countdownBgImage})`
          : undefined,
        backgroundPosition: slide.countdownBgImagePosition || "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
      }}
    >
      {slide.countdownBgImage && <div className="display-countdown__overlay" />}

      <div className="display-countdown__inner">
        {slide.countdownTitle && (
          <h2 className="display-countdown__title" style={{ color: textColor }}>
            {slide.countdownTitle}
          </h2>
        )}

        {units ? (
          <div className="display-countdown__blocks">
            {units.map(({ value, label }) => (
              <div
                key={label}
                className="display-countdown__block"
                style={{ backgroundColor: blockBg }}
              >
                <span
                  className="display-countdown__number"
                  style={{ color: numberColor }}
                >
                  {String(value).padStart(2, "0")}
                </span>
                <span
                  className="display-countdown__label"
                  style={{ color: labelColor }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="display-countdown__expired"
            style={{ color: textColor }}
          >
            Verstreken
          </div>
        )}
      </div>
    </div>
  );
}

function GallerySlideDisplay({ images }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    if (images.length <= 1) return;
    const duration = (images[currentIndex]?.duration || 3) * 1000;
    const fadeOut = 500;

    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((i) => (i + 1) % images.length);
        setVisible(true);
      }, fadeOut);
    }, duration - fadeOut);

    return () => clearTimeout(timerRef.current);
  }, [currentIndex, images]);

  if (!images.length) {
    return (
      <div className="display-gallery-placeholder">
        <div className="placeholder-text">Geen foto's</div>
      </div>
    );
  }

  const current = images[currentIndex];
  return (
    <div className="display-gallery">
      <img
        key={current.id}
        src={current.url}
        alt={current.name}
        className={`display-gallery__image ${visible ? "visible" : ""}`}
      />
      {images.length > 1 && (
        <div className="display-gallery__dots">
          {images.map((_, i) => (
            <span
              key={i}
              className={`display-gallery__dot${i === currentIndex ? " active" : ""}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AgendaDisplay({ slide }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);
  const bodyRef = useRef(null);
  const contentRef = useRef(null);

  const calendars = slide.agendaCalendars || [];
  const daysAhead = slide.agendaDaysAhead || 14;
  const maxEvents = slide.agendaMaxEvents || 8;
  const bgColor = slide.agendaBgColor || "#0f172a";
  const textColor = slide.agendaTextColor || "#ffffff";

  useEffect(() => {
    if (!calendars.length) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
      const allEvents = [];

      await Promise.all(
        calendars.map(async (cal) => {
          if (!cal.url) return;
          try {
            const rawUrl = decodeURIComponent(cal.url).replace(
              /^webcal:\/\//,
              "https://",
            );
            const proxies = [
              // Local dev proxy (setupProxy.js) — server-side, no CORS issues
              () =>
                fetch(`/api/ical?url=${encodeURIComponent(rawUrl)}`).then(
                  (r) => (r.ok ? r.text() : Promise.reject()),
                ),
              // External fallbacks for production
              () =>
                fetch(
                  `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`,
                ).then((r) => (r.ok ? r.text() : Promise.reject())),
              () =>
                fetch(
                  `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(rawUrl)}`,
                ).then((r) => (r.ok ? r.text() : Promise.reject())),
            ];

            let icsText = null;
            for (const proxyFn of proxies) {
              try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10000);
                const text = await proxyFn();
                clearTimeout(timeout);
                if (text && text.includes("BEGIN:VCALENDAR")) {
                  icsText = text;
                  break;
                }
              } catch {
                // try next proxy
              }
            }

            if (!icsText) return;

            const parsed = parseICS(icsText);
            parsed.forEach((ev) => {
              if (ev.start >= now && ev.start <= cutoff) {
                allEvents.push({
                  ...ev,
                  calName: cal.name,
                  calColor: cal.color || "#4f87ff",
                });
              } else if (ev.rrule && ev.rrule.includes("FREQ=YEARLY")) {
                const until = ev.rrule.match(/UNTIL=(\d{8})/);
                const untilDate = until ? parseICSDate(until[1]) : null;
                const month = ev.start.getMonth();
                const day = ev.start.getDate();
                for (const year of [now.getFullYear(), now.getFullYear() + 1]) {
                  const occ = new Date(year, month, day);
                  if (untilDate && occ > untilDate) continue;
                  if (occ >= now && occ <= cutoff) {
                    allEvents.push({
                      ...ev,
                      start: occ,
                      end: ev.end
                        ? new Date(year, ev.end.getMonth(), ev.end.getDate())
                        : null,
                      calName: cal.name,
                      calColor: cal.color || "#4f87ff",
                    });
                  }
                }
              }
            });
          } catch (err) {
            console.error("📅 Agenda fetch error:", err);
          }
        }),
      );

      allEvents.sort((a, b) => a.start - b.start);
      setEvents(allEvents.slice(0, maxEvents));
      setLastFetched(Date.now());
      setLoading(false);
    };

    fetchAll();
    const interval = setInterval(fetchAll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [slide.agendaCalendars, slide.agendaDaysAhead, slide.agendaMaxEvents]); // eslint-disable-line

  const formatDate = (date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) return "Vandaag";
    if (isTomorrow) return "Morgen";
    return date.toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const formatTime = (start, isAllDay, end) => {
    if (isAllDay) return "Hele dag";
    const fmt = (d) =>
      d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
  };

  useEffect(() => {
    if (loading) return;

    const timeoutId = setTimeout(() => {
      const body = bodyRef.current;
      const content = contentRef.current;
      if (!body || !content) return;

      const scrollDistance = content.scrollHeight - body.clientHeight;
      if (scrollDistance <= 0) return;

      const scrollDuration = scrollDistance / 50;
      const totalDuration = scrollDuration / 0.6;

      content.style.setProperty("--agenda-scroll-dist", `-${scrollDistance}px`);
      content.style.animation = `agendaScroll ${totalDuration}s linear infinite`;
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      if (contentRef.current) {
        contentRef.current.style.animation = "";
        contentRef.current.style.removeProperty("--agenda-scroll-dist");
      }
    };
  }, [loading, events]);

  const groupedByDate = events.reduce((acc, ev) => {
    const key = ev.start.toDateString();
    if (!acc[key]) acc[key] = { label: formatDate(ev.start), items: [] };
    acc[key].items.push(ev);
    return acc;
  }, {});

  return (
    <div
      className="display-agenda"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {slide.agendaTitle && (
        <div
          className="display-agenda__header"
          style={{ borderColor: `${textColor}20` }}
        >
          <h2 className="display-agenda__title" style={{ color: textColor }}>
            {slide.agendaTitle}
          </h2>
        </div>
      )}
      <div className="display-agenda__body" ref={bodyRef}>
        {loading && (
          <div
            className="display-agenda__loading"
            style={{ color: `${textColor}88` }}
          >
            Agenda laden…
          </div>
        )}
        {!loading && events.length === 0 && (
          <div
            className="display-agenda__empty"
            style={{ color: `${textColor}88` }}
          >
            Geen afspraken in de komende {daysAhead} dagen
          </div>
        )}
        {!loading && (
          <div ref={contentRef}>
            {Object.values(groupedByDate).map((group) => (
              <div key={group.label} className="display-agenda__group">
                <div
                  className="display-agenda__date-label"
                  style={{ color: `${textColor}99` }}
                >
                  {group.label}
                </div>
                {group.items.map((ev, i) => (
                  <div key={i} className="display-agenda__event">
                    <div
                      className="display-agenda__event-bar"
                      style={{ backgroundColor: ev.calColor }}
                    />
                    <div className="display-agenda__event-content">
                      <span
                        className="display-agenda__event-time"
                        style={{ color: `${textColor}bb` }}
                      >
                        {formatTime(ev.start, ev.isAllDay, ev.end)}
                      </span>
                      <span
                        className="display-agenda__event-title"
                        style={{ color: textColor }}
                      >
                        {ev.summary}
                      </span>
                      {ev.calName && (
                        <span
                          className="display-agenda__event-cal"
                          style={{ color: ev.calColor }}
                        >
                          {ev.calName}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmailSlideDisplay({ slide }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const bodyRef = useRef(null);
  const contentRef = useRef(null);

  const credentials = slide.emailCredentials || {};
  const maxItems = slide.emailMaxItems || 10;
  const unreadOnly = slide.emailShowUnreadOnly ?? true;
  const bgColor = slide.emailBgColor || "#0f172a";
  const textColor = slide.emailTextColor || "#ffffff";
  const accentColor = slide.emailAccentColor || "#4f87ff";

  const hasCredentials = Object.values(credentials).some(Boolean);

  useEffect(() => {
    if (!hasCredentials) {
      setLoading(false);
      return;
    }

    const fetchEmails = async () => {
      try {
        const res = await fetch("/api/email/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credentials, maxItems, unreadOnly }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Ophalen mislukt");
        setEmails(data.emails || []);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEmails();
    const interval = setInterval(fetchEmails, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [JSON.stringify(credentials), maxItems, unreadOnly, hasCredentials]);

  useEffect(() => {
    if (loading || !contentRef.current || !bodyRef.current) return;

    const timer = setTimeout(() => {
      const contentHeight = contentRef.current.scrollHeight;
      const containerHeight = bodyRef.current.clientHeight;

      if (contentHeight > containerHeight) {
        const scrollDistance = contentHeight - containerHeight;
        const duration = scrollDistance / 30;
        contentRef.current.style.setProperty(
          "--email-scroll-dist",
          `-${scrollDistance}px`,
        );
        contentRef.current.style.setProperty(
          "--email-scroll-duration",
          `${duration}s`,
        );
        setShouldScroll(true);
      } else {
        setShouldScroll(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [loading, emails]);

  const formatFrom = (from) => {
    const match = from?.match(/^"?([^"<]+)"?\s*<?[^>]*>?$/);
    return match ? match[1].trim() : from || "Onbekend";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now - d;
      const diffMin = Math.floor(diffMs / 60000);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);
      if (diffMin < 60) return `${diffMin}m geleden`;
      if (diffHour < 24) return `${diffHour}u geleden`;
      if (diffDay === 1) return "gisteren";
      return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
    } catch {
      return "";
    }
  };

  return (
    <div
      className="email-slide"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div
        className="email-slide__header"
        style={{ borderBottomColor: accentColor }}
      >
        <span className="email-slide__title">Inbox</span>
        {unreadOnly && (
          <span
            className="email-slide__badge"
            style={{ backgroundColor: accentColor }}
          >
            Ongelezen
          </span>
        )}

        {credentials.email && (
          <span className="email-slide__account">{credentials.email}</span>
        )}
      </div>

      <div className="email-slide__body" ref={bodyRef}>
        {loading && <div className="email-slide__state">Emails ophalen...</div>}
        {!loading && error && (
          <div className="email-slide__state email-slide__state--error">
            {error}
          </div>
        )}
        {!loading && !error && !hasCredentials && (
          <div className="email-slide__state">Geen credentials ingesteld</div>
        )}
        {!loading && !error && hasCredentials && emails.length === 0 && (
          <div className="email-slide__state">Geen emails gevonden</div>
        )}
        {!loading && !error && emails.length > 0 && (
          <div
            ref={contentRef}
            className={`email-slide__content${shouldScroll ? " email-slide__content--scroll" : ""}`}
          >
            {emails.map((email, i) => (
              <div
                key={email.id || i}
                className={`email-slide__item${!email.isRead ? " email-slide__item--unread" : ""}`}
                style={{
                  borderLeftColor: !email.isRead ? accentColor : "transparent",
                }}
              >
                <div className="email-slide__item-subject">{email.subject}</div>
                <div
                  className="email-slide__item-meta"
                  style={{ color: `${textColor}99` }}
                >
                  <span className="email-slide__item-from">
                    {formatFrom(email.from)}
                  </span>
                  <span className="email-slide__item-date">
                    {formatDate(email.receivedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SportlinkDisplay({ slide }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const bodyRef = useRef(null);
  const contentRef = useRef(null);

  const apiKey = slide.sportlinkApiKey || "";
  const dataType = slide.sportlinkDataType || "programma";
  const teams = slide.sportlinkTeams || [];
  const aantalDagen = slide.sportlinkAantalDagen || 14;
  const maxItems = slide.sportlinkMaxItems || 10;
  const bgColor = slide.sportlinkBgColor || "#0f172a";
  const textColor = slide.sportlinkTextColor || "#ffffff";
  const accentColor = slide.sportlinkAccentColor || "#ff6600";
  const headerTextColor = slide.sportlinkHeaderTextColor || textColor;
  const targetDate =
    slide.sportlinkDate || new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!apiKey || !teams.length) {
      setLoading(false);
      return;
    }

    // Sportlink returns dates as DD-MM-YYYY; normalize to YYYY-MM-DD for comparison
    const normalizeSportlinkDate = (dateStr) => {
      if (!dateStr) return null;
      const m = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})/);
      if (m) return `${m[3]}-${m[2]}-${m[1]}`;
      return dateStr.slice(0, 10);
    };

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const settled = await Promise.allSettled(
          teams.map(async (team) => {
            const params = new URLSearchParams({ client_id: apiKey });
            if (dataType === "poulestand") {
              if (!team.poulecode) return [];
              params.set("poulecode", team.poulecode);
              const res = await fetch(
                `https://data.sportlink.com/${dataType}?${params}`,
              );
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const json = await res.json();
              return Array.isArray(json)
                ? json.map((row) => ({ ...row, _teamNaam: team.teamnaam }))
                : [];
            } else {
              const msPerWeek = 7 * 24 * 60 * 60 * 1000;
              // Sportlink week runs Tuesday–Monday (not Monday–Sunday)
              const getTuesdayOfWeek = (dateStr) => {
                const d = new Date(dateStr + "T00:00:00Z");
                const day = d.getUTCDay(); // 0=Sun,1=Mon,2=Tue,...
                const offset = day >= 2 ? 2 - day : -(day + 5);
                d.setUTCDate(d.getUTCDate() + offset);
                return d;
              };
              const todayStr = new Date().toISOString().slice(0, 10);
              const weekOffset = Math.round(
                (getTuesdayOfWeek(targetDate) - getTuesdayOfWeek(todayStr)) /
                  msPerWeek,
              );

              params.set("teamcode", team.teamcode);
              params.set("aantaldagen", 7);
              params.set("weekoffset", weekOffset);
              const url = `https://data.sportlink.com/${dataType}?${params}`;

              const res = await fetch(url);
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const json = await res.json();

              return json
                .filter(
                  (row) =>
                    row.wedstrijddatum &&
                    normalizeSportlinkDate(row.wedstrijddatum) === targetDate,
                )
                .map((row) => ({ ...row, _teamNaam: team.teamnaam }));
            }
          }),
        );

        if (dataType === "poulestand") {
          // Group by unique poulecode — teams in the same poule share one table
          const pouleMap = new Map();
          teams.forEach((team, i) => {
            const result = settled[i];
            if (result.status === "rejected") {
              console.warn("[Sportlink] team fout:", result.reason);
              return;
            }
            if (!result.value.length) return;
            if (!pouleMap.has(team.poulecode)) {
              const seen = new Set();
              const deduped = result.value.filter((row) => {
                const key = row.teamnaam;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
              pouleMap.set(team.poulecode, {
                teamNaam: team.teamnaam,
                rows: deduped.slice(0, maxItems),
              });
            }
          });
          setData([...pouleMap.values()]);
          return;
        }

        const results = settled
          .filter((r) => {
            if (r.status === "rejected") {
              console.warn("[Sportlink] team fout:", r.reason);
            }
            return r.status === "fulfilled";
          })
          .map((r) => r.value);

        const merged = results.flat();

        {
          const teamNamen = new Set(teams.map((t) => t.teamnaam));
          const seen = new Set();
          const deduped = merged.filter((row) => {
            const key = `${row.wedstrijddatum}|${row.thuisteam}|${row.uitteam}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          const filtered = slide.sportlinkOnlyThuis
            ? deduped.filter((row) => teamNamen.has(row.thuisteam))
            : deduped;
          // sort by date (ISO 8601 strings sort lexicographically)
          const sorted = filtered.sort((a, b) => {
            if (!a.wedstrijddatum) return 1;
            if (!b.wedstrijddatum) return -1;
            return a.wedstrijddatum.localeCompare(b.wedstrijddatum);
          });
          setData(sorted.slice(0, maxItems));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [
    slide.sportlinkApiKey,
    slide.sportlinkTeams,
    slide.sportlinkDataType,
    slide.sportlinkAantalDagen,
    slide.sportlinkMaxItems,
    slide.sportlinkDate,
    slide.sportlinkOnlyThuis,
  ]); // eslint-disable-line

  useEffect(() => {
    if (loading || !data.length) return;
    const timeoutId = setTimeout(() => {
      const body = bodyRef.current;
      const content = contentRef.current;
      if (!body || !content) return;
      const scrollDistance = content.scrollHeight - body.clientHeight;
      if (scrollDistance <= 0) return;
      const scrollDuration = scrollDistance / 50 / 0.6;
      const totalDuration = scrollDuration * 2;
      content.style.setProperty(
        "--sportlink-scroll-dist",
        `-${scrollDistance}px`,
      );
      content.style.animation = `sportlinkScroll ${totalDuration}s linear infinite`;
    }, 400);
    return () => {
      clearTimeout(timeoutId);
      if (contentRef.current) {
        contentRef.current.style.animation = "";
        contentRef.current.style.removeProperty("--sportlink-scroll-dist");
      }
    };
  }, [loading, data]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("nl-NL", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const dataTypeLabel =
    {
      programma: "Programma",
      uitslagen: "Uitslagen",
      poulestand: "Poulestand",
    }[dataType] || dataType;
  const title = slide.sportlinkTitle || dataTypeLabel;

  return (
    <div
      className="display-sportlink"
      style={{ color: textColor, width: "100%" }}
    >
      {dataTypeLabel !== "Programma" && (
        <div
          className="display-sportlink__header"
          style={{ borderBottomColor: `${accentColor}40` }}
        >
          <h2 className="display-sportlink__title" style={{ color: textColor }}>
            {title}
          </h2>

          {slide.sportlinkDate && (
            <div className="display-sportlink__title">
              {formatDate(slide.sportlinkDate)}
            </div>
          )}

          <span
            className="display-sportlink__badge"
            style={{ backgroundColor: accentColor }}
          >
            {dataTypeLabel}
          </span>
        </div>
      )}

      <div className="display-sportlink__body">
        {loading && (
          <div
            className="display-sportlink__loading"
            style={{ color: `${textColor}88` }}
          >
            Gegevens laden…
          </div>
        )}
        {!loading && error && (
          <div
            className="display-sportlink__error"
            style={{ color: "#ff6b6b" }}
          >
            Fout bij laden: {error}
          </div>
        )}
        {!loading && !error && data.length === 0 && (
          <div
            className="display-sportlink__empty"
            style={{ color: `${textColor}88` }}
          >
            {!apiKey || !teams.length
              ? "Geen koppeling geconfigureerd"
              : "Geen gegevens beschikbaar"}
          </div>
        )}

        {!loading &&
          !error &&
          data.length > 0 &&
          (dataType === "poulestand" ? (
            <div className="display-sportlink__rows-scroll" ref={bodyRef}>
              <div ref={contentRef}>
                {data.map((group, gi) => (
                  <div key={gi} className="display-sportlink__poule-group">
                    {data.length > 1 && (
                      <div
                        className="display-sportlink__poule-header"
                        style={{ color: accentColor }}
                      >
                        {group.teamNaam}
                      </div>
                    )}
                    <table className="display-sportlink__table">
                      <thead>
                        <tr
                          style={{
                            color: `${textColor}99`,
                            borderBottomColor: `${textColor}20`,
                          }}
                        >
                          <th>#</th>
                          <th className="team">Team</th>
                          <th>Gespeeld</th>
                          <th>Gewonnen</th>
                          <th>Gelijk</th>
                          <th>Verloren</th>
                          <th>Punten</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row, i) => {
                          const isOwn =
                            row.eigenteam === "true" ||
                            teams.some((t) => t.teamnaam === row.teamnaam);
                          return (
                            <tr
                              key={i}
                              style={{
                                borderBottomColor: `${textColor}20`,
                                backgroundColor: isOwn
                                  ? `${accentColor}20`
                                  : "transparent",
                              }}
                            >
                              <td
                                style={{
                                  color: `${textColor}99`,
                                  borderBottom: `1px solid ${textColor}20`,
                                }}
                              >
                                {row.positie || i + 1}
                              </td>
                              <td
                                style={{
                                  fontWeight: isOwn ? 700 : 400,
                                  borderBottom: `1px solid ${textColor}20`,
                                }}
                              >
                                <div className="display-sportlink__standing-team">
                                  {row.clublogo && (
                                    <img
                                      src={row.clublogo}
                                      alt=""
                                      className="display-sportlink__team-logo"
                                    />
                                  )}
                                  {row.teamnaam}
                                </div>
                              </td>
                              <td
                                style={{
                                  borderBottom: `1px solid ${textColor}20`,
                                }}
                              >
                                {row.gespeeldewedstrijden ?? "—"}
                              </td>
                              <td
                                style={{
                                  borderBottom: `1px solid ${textColor}20`,
                                }}
                              >
                                {row.gewonnen ?? "—"}
                              </td>
                              <td
                                style={{
                                  borderBottom: `1px solid ${textColor}20`,
                                }}
                              >
                                {row.gelijk ?? "—"}
                              </td>
                              <td
                                style={{
                                  borderBottom: `1px solid ${textColor}20`,
                                }}
                              >
                                {row.verloren ?? "—"}
                              </td>
                              <td
                                style={{
                                  fontWeight: 700,
                                  color: accentColor,
                                  borderBottom: `1px solid ${textColor}20`,
                                }}
                              >
                                {row.punten ?? "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="display-sportlink__matches">
              {/* Kolomheader — blijft vast, rijen animeren eronder */}
              {dataTypeLabel === "Programma" && (
                <div
                  className="display-sportlink__scoreboard-header"
                  style={{
                    backgroundColor: `${accentColor}`,
                    gridTemplateColumns: slide.sportlinkShowVeldInfo
                      ? "140px 1fr 200px 1fr 90px"
                      : "140px 1fr 200px 1fr",
                  }}
                >
                  <span style={{ color: headerTextColor }}>Tijd</span>
                  <span style={{ color: headerTextColor }}>Thuisteam</span>
                  <span style={{ textAlign: "center", color: headerTextColor }}>
                    {new Date(slide.sportlinkDate).toLocaleDateString("nl-NL", {
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span style={{ color: headerTextColor, textAlign: "right" }}>
                    Bezoekers
                  </span>
                  {slide.sportlinkShowVeldInfo && (
                    <span
                      style={{ color: headerTextColor, textAlign: "right" }}
                    >
                      Veld
                    </span>
                  )}
                </div>
              )}

              {/* Scrollbare rijen */}
              <div className="display-sportlink__rows-scroll" ref={bodyRef}>
                <div ref={contentRef}>
                  {data.map((row, i) => (
                    <div
                      key={i}
                      className="display-sportlink__scoreboard-row"
                      style={{
                        borderBottomColor: `${textColor}10`,
                        backgroundColor:
                          i % 2 === 0 ? `${bgColor}99` : `${bgColor}75`,
                        gridTemplateColumns: slide.sportlinkShowVeldInfo
                          ? "140px 1fr 200px 1fr 90px"
                          : "140px 1fr 200px 1fr",
                      }}
                    >
                      {/* Tijd */}
                      <span
                        className="display-sportlink__scoreboard-time"
                        style={{ color: accentColor }}
                      >
                        {row.aanvangstijd}
                      </span>

                      {/* Thuisteam + kleedkamer */}
                      <div className="display-sportlink__scoreboard-team">
                        <div style={{ color: textColor }}>
                          {row.thuisteamlogo && (
                            <img
                              src={row.thuisteamlogo}
                              width={40}
                              alt=""
                              className="display-sportlink__team-logo"
                            />
                          )}
                          <span className="display-sportlink__match-home">
                            {row.thuisteam}
                          </span>
                        </div>
                        {slide.sportlinkShowVeldInfo && (
                          <span
                            className="display-sportlink__scoreboard-room"
                            style={{ color: `${textColor}` }}
                          >
                            Kleedkamer:{" "}
                            {row.kleedkamerthuisteam
                              ? row.kleedkamerthuisteam
                              : "niet bekend"}
                          </span>
                        )}
                      </div>

                      {/* VS of uitslag */}
                      {dataType === "uitslagen" && row.uitslag ? (
                        <span
                          className="display-sportlink__match-score"
                          style={{
                            backgroundColor: `${accentColor}22`,
                            color: accentColor,
                          }}
                        >
                          {row.uitslag}
                        </span>
                      ) : (
                        <span
                          className="display-sportlink__match-vs"
                          style={{ color: `${textColor}55` }}
                        >
                          vs
                        </span>
                      )}

                      {/* Uitteam + kleedkamer */}
                      <div className="display-sportlink__scoreboard-team display-sportlink__scoreboard-team--away">
                        <div style={{ color: textColor }}>
                          <span className="display-sportlink__match-away">
                            {row.uitteam}
                          </span>
                          {row.uitteamlogo && (
                            <img
                              src={row.uitteamlogo}
                              width={40}
                              alt=""
                              className="display-sportlink__team-logo"
                            />
                          )}
                        </div>
                        {slide.sportlinkShowVeldInfo && (
                          <span
                            className="display-sportlink__scoreboard-room"
                            style={{ color: `${textColor}` }}
                          >
                            Kleedkamer:{" "}
                            {row.kleedkameruitteam
                              ? row.kleedkameruitteam
                              : "niet bekend"}
                          </span>
                        )}
                      </div>

                      {/* Veld */}
                      {row.accommodatie && slide.sportlinkShowVeldInfo && (
                        <span
                          className="display-sportlink__scoreboard-veld"
                          style={{ color: accentColor }}
                        >
                          {slide.sportlinkShowVeldInfo && `${row.veld}`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function parseICS(icsText) {
  const events = [];
  // Unfold lines: iCal folds long lines with CRLF+space or CRLF+tab.
  // Proxies may strip \r, so handle both \r\n and \n variants.
  const unfolded = icsText.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const lines = unfolded.split(/\r\n|\n|\r/);
  let current = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
    } else if (line === "END:VEVENT" && current) {
      if (current.summary && current.start) {
        events.push(current);
      }
      current = null;
    } else if (current) {
      if (line.startsWith("SUMMARY:") || line.startsWith("SUMMARY;")) {
        current.summary = line.replace(/^SUMMARY[^:]*:/, "").trim();
      } else if (line.match(/^DTSTART(;[^:]*)?:/)) {
        const val = line.replace(/^DTSTART[^:]*:/, "").trim();
        current.isAllDay = val.length === 8;
        current.start = parseICSDate(val);
      } else if (line.match(/^DTEND(;[^:]*)?:/)) {
        const val = line.replace(/^DTEND[^:]*:/, "").trim();
        current.end = parseICSDate(val);
      } else if (line.startsWith("RRULE:")) {
        current.rrule = line.replace("RRULE:", "").trim();
      }
    }
  }

  return events.filter((e) => e.start);
}

function parseICSDate(val) {
  if (!val) return null;
  const clean = val.replace("Z", "");
  if (clean.length === 8) {
    const y = +clean.slice(0, 4),
      m = +clean.slice(4, 6) - 1,
      d = +clean.slice(6, 8);
    return new Date(y, m, d);
  }
  const y = +clean.slice(0, 4),
    mo = +clean.slice(4, 6) - 1,
    d = +clean.slice(6, 8);
  const h = +clean.slice(9, 11),
    mi = +clean.slice(11, 13),
    s = +clean.slice(13, 15);
  return val.endsWith("Z")
    ? new Date(Date.UTC(y, mo, d, h, mi, s))
    : new Date(y, mo, d, h, mi, s);
}

function SlideDisplay({
  currentSlide,
  slideLayout,
  nextSlide,
  nextSlideLayout,
  effectsEnabled = false,
}) {
  // Get configuration for the current layout
  const textConfig = getTextPaginationConfig(slideLayout);
  const shouldUsePagination = textConfig !== null;

  // Transition state
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionType, setTransitionType] = useState(null);
  const [displaySlide, setDisplaySlide] = useState(currentSlide);
  const [displayLayout, setDisplayLayout] = useState(slideLayout);

  // Effect exit state
  const [exitedEffects, setExitedEffects] = useState(new Set());

  useEffect(() => {
    setExitedEffects(new Set());
    if (!displaySlide?.effects?.length) return;

    const timers = displaySlide.effects
      .filter((e) => e.exitAfter > 0)
      .map((e) => {
        const ms = ((e.delay || 0) + e.exitAfter) * 1000;
        return setTimeout(
          () => setExitedEffects((prev) => new Set([...prev, e.id])),
          ms,
        );
      });

    return () => timers.forEach(clearTimeout);
  }, [displaySlide?.id]);

  // Handle slide changes and transitions
  useEffect(() => {
    if (currentSlide && currentSlide.id === displaySlide?.id) {
      // Same slide, data might have changed — update in place without transition
      setDisplaySlide(currentSlide);
      return;
    }
    if (currentSlide && currentSlide.id !== displaySlide?.id) {
      const transition = currentSlide.transition || "slide-left";

      // Define all supported transition types
      const supportedTransitions = [
        "slide-left",
        "slide-right",
        "slide-up",
        "slide-down",
        "fade",
        "zoom-in",
        "zoom-out",
        "flip-horizontal",
        "flip-vertical",
      ];

      if (supportedTransitions.includes(transition) && nextSlide) {
        // Start transition
        setIsTransitioning(true);
        setTransitionType(transition);

        // Use requestAnimationFrame to ensure DOM is updated before starting animation
        requestAnimationFrame(() => {
          // After animation completes, update the display slide
          setTimeout(() => {
            setDisplaySlide(currentSlide);
            setDisplayLayout(slideLayout);
            setIsTransitioning(false);
            setTransitionType(null);
          }, 500); // Match the CSS animation duration
        });
      } else {
        // No transition or no next slide, update immediately
        setDisplaySlide(currentSlide);
        setDisplayLayout(slideLayout);
      }
    }
  }, [currentSlide, slideLayout, displaySlide?.id, nextSlide]);

  // Debug logging for slide display
  console.log("🎥 SlideDisplay render:", {
    currentSlide: currentSlide
      ? {
          id: currentSlide.id,
          name: currentSlide.name,
          layout: currentSlide.layout,
          hasText: !!currentSlide.text,
          hasImageUrl: !!currentSlide.imageUrl,
          hasVideoUrl: !!currentSlide.videoUrl,
          transition: currentSlide.transition,
        }
      : null,
    slideLayout,
    nextSlide: nextSlide
      ? {
          id: nextSlide.id,
          name: nextSlide.name,
          layout: nextSlide.layout,
          hasText: !!nextSlide.text,
          hasImageUrl: !!nextSlide.imageUrl,
          hasVideoUrl: !!nextSlide.videoUrl,
          transition: nextSlide.transition,
        }
      : null,
    nextSlideLayout,
  });

  if (!currentSlide) {
    return (
      <div className="display-container">
        <div className="display-content">
          <div className="display-text">No slides available</div>
        </div>
      </div>
    );
  }

  // Render slide content helper function
  const renderSlideContent = (slide, layout) => {
    if (!slide) return null;

    const slideTextConfig = getTextPaginationConfig(layout);
    const slideShouldUsePagination = slideTextConfig !== null;

    return (
      <>
        {layout === "side-by-side" && (
          <>
            <div
              className={`display-left ${slide.imageSide === "right" ? "flipped" : ""}`}
            >
              {slide.imageUrl ? (
                <div className="display-image-container">
                  <img
                    src={slide.imageUrl}
                    alt="Slide"
                    className="display-image"
                    style={{
                      objectPosition: slide.imagePosition || "center",
                    }}
                    onLoad={() => {
                      if (Date.now() % 10000 < 100) {
                        console.log(
                          "Image loaded with position:",
                          slide.imagePosition || "center",
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

            <div
              className={`display-right ${slide.imageSide === "right" ? "flipped" : ""}`}
            >
              <div className="display-text-container">
                {slide.text ? (
                  slideShouldUsePagination ? (
                    <TextPagination
                      text={slide.text}
                      maxHeight={slideTextConfig.maxHeight}
                      readTimePerPage={slideTextConfig.readTimePerPage}
                      scrollStepRatio={slideTextConfig.scrollStepRatio}
                      className="display-text"
                    />
                  ) : (
                    <div
                      className="display-text"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHTMLContent(slide.text),
                      }}
                    />
                  )
                ) : (
                  <div className="display-text-placeholder">
                    <div className="placeholder-text">No Text Content</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {layout === "image-only" && (
          <div className="display-full-image">
            {slide.imageUrl ? (
              <div className="display-image-container-full">
                <img
                  src={slide.imageUrl}
                  alt="Slide"
                  className="display-image-full"
                  style={{
                    objectPosition: slide.imagePosition || "center",
                  }}
                  onLoad={() => {
                    if (Date.now() % 10000 < 100) {
                      console.log(
                        "Image loaded with position:",
                        slide.imagePosition || "center",
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

        {layout === "text-over-image" && (
          <div className="display-text-over-image">
            <div className="display-image-background">
              {slide.imageUrl ? (
                <div className="display-image-container-overlay">
                  <img
                    src={slide.imageUrl}
                    alt="Slide"
                    className="display-image-overlay"
                    style={{
                      objectPosition: slide.imagePosition || "center",
                    }}
                    onLoad={() => {
                      if (Date.now() % 10000 < 100) {
                        console.log(
                          "Image loaded with position:",
                          slide.imagePosition || "center",
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
              {slide.text ? (
                <div
                  className="display-text-overlay-content"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHTMLContent(slide.text),
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

        {layout === "text-only" && (
          <div className="display-text-only">
            <div className="display-text-container-full">
              {slide.text ? (
                slideShouldUsePagination ? (
                  <TextPagination
                    text={slide.text}
                    maxHeight={slideTextConfig.maxHeight}
                    readTimePerPage={slideTextConfig.readTimePerPage}
                    scrollStepRatio={slideTextConfig.scrollStepRatio}
                    className="display-text-full"
                  />
                ) : (
                  <div
                    className="display-text-full"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHTMLContent(slide.text),
                    }}
                  />
                )
              ) : (
                <div className="display-text-placeholder-full">
                  <div className="placeholder-text">No Text Content</div>
                </div>
              )}
            </div>
          </div>
        )}

        {layout === "video" && (
          <div className="display-video">
            {slide.videoUrl ? (
              <VideoPlayer
                videoUrl={slide.videoUrl}
                autoplay={true}
                loop={true}
                muted={true}
              />
            ) : (
              <div className="display-video-placeholder">
                <div className="placeholder-text">No Video URL</div>
              </div>
            )}
          </div>
        )}

        {layout === "weather" && (
          <div className="display-weather-wrapper">
            {slide.weatherLat && slide.weatherLong ? (
              <WeatherDisplay
                key={`${slide.weatherLat}-${slide.weatherLong}-${slide.weatherForecastDays}-${slide.weatherAccentColor}-${slide.weatherLeftBgImage}-${slide.weatherCity}`}
                lat={slide.weatherLat}
                long={slide.weatherLong}
                cityName={slide.weatherCity || ""}
                accentColor={slide.weatherAccentColor || "#4f87ff"}
                forecastDays={slide.weatherForecastDays ?? 7}
                leftBgImage={slide.weatherLeftBgImage || ""}
                leftBgImagePosition={
                  slide.weatherLeftBgImagePosition || "center"
                }
              />
            ) : (
              <div className="display-weather-placeholder">
                <div className="placeholder-text">Geen locatie ingesteld</div>
              </div>
            )}
          </div>
        )}
        {layout === "teletekst" && (
          <div className="display-teletekst">
            {slide.teletekstChannel ? (
              <TeletekstDisplay
                channel={slide.teletekstChannel}
                theme={slide.teletekstTheme || "classic"}
                pageCount={slide.teletekstPageCount || 1}
                duration={slide.duration || 10}
                skipTopLines={slide.teletekstSkipTopLines || 0}
                skipBottomLines={slide.teletekstSkipBottomLines || 0}
              />
            ) : (
              <div className="display-teletekst-placeholder">
                <div className="placeholder-text">Geen Teletekst Kanaal</div>
              </div>
            )}
          </div>
        )}

        {layout === "iframe" && (
          <div className="display-iframe">
            {slide.iframeUrl ? (
              <iframe
                src={slide.iframeUrl}
                title={slide.name || "Website"}
                className="display-iframe-content"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                allow="autoplay; fullscreen"
                scrolling="no"
              />
            ) : (
              <div className="display-iframe-placeholder">
                <div className="placeholder-text">Geen Website URL</div>
              </div>
            )}
          </div>
        )}

        {layout === "gallery" && (
          <GallerySlideDisplay images={slide.images || []} />
        )}

        {layout === "countdown" && <CountdownDisplay slide={slide} />}

        {layout === "agenda" && <AgendaDisplay slide={slide} />}

        {layout === "email" && <EmailSlideDisplay slide={slide} />}

        {layout === "sportlink" && <SportlinkDisplay slide={slide} />}

        {layout === "qr-feed" && <QrFeedDisplay slide={slide} />}
      </>
    );
  };

  // Handle transition rendering
  if (isTransitioning && transitionType) {
    const transitionClass = `${transitionType}-transition`;
    return (
      <div className={`display-content slide-transition ${transitionClass}`}>
        <div className="slide-current">
          <div className="display-content">
            {renderSlideContent(displaySlide, displayLayout)}
          </div>
        </div>
        <div className="slide-next">
          <div className="display-content">
            {renderSlideContent(currentSlide, slideLayout)}
          </div>
        </div>
      </div>
    );
  }

  const hexToRgba = (hex, opacity) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  };

  const renderEffects = (slide) => {
    if (!effectsEnabled || !slide?.effects?.length) return null;
    return slide.effects.map((effect) => {
      const isImage = effect.type === "image";
      return (
        <div
          key={effect.id}
          className={`slide-effect slide-effect--${effect.position} slide-effect--${effect.animation}${exitedEffects.has(effect.id) ? " slide-effect--exit" : ""}`}
          style={{ animationDelay: `${effect.delay || 0}s` }}
        >
          {isImage ? (
            <img
              src={effect.imageUrl}
              alt=""
              className="slide-effect__image"
              style={{
                width: `${effect.imageWidth || 200}px`,
                borderRadius: effect.imageRounded ? "12px" : "0",
              }}
            />
          ) : (
            <span
              className="slide-effect__text"
              style={{
                fontSize: `${effect.fontSize || 48}px`,
                color: effect.color || "#ffffff",
                fontWeight: effect.bold ? "bold" : "normal",
                fontStyle: effect.italic ? "italic" : "normal",
                ...(effect.background && {
                  background: hexToRgba(
                    effect.backgroundColor || "#000000",
                    (effect.backgroundOpacity ?? 45) / 100,
                  ),
                  padding: "0.15em 0.4em",
                  borderRadius: "6px",
                  backdropFilter: "blur(4px)",
                }),
              }}
            >
              {effect.content}
            </span>
          )}
        </div>
      );
    });
  };

  return (
    <div className="display-content">
      {renderSlideContent(displaySlide, displayLayout)}
      {renderEffects(displaySlide)}

      {/* Pre-rendered next slide (hidden) */}
      {nextSlide && (
        <div className="next-slide-prerender" style={{ display: "none" }}>
          <SlideDisplay
            currentSlide={nextSlide}
            slideLayout={nextSlideLayout || nextSlide.layout || "side-by-side"}
          />
        </div>
      )}
    </div>
  );
}

export default SlideDisplay;

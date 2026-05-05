import React, { useState, useEffect, useRef } from "react";
import { sanitizeHTMLContent } from "../../utils/sanitize";
import TextPagination from "./TextPagination";
import VideoPlayer from "./VideoPlayer";
import TeletekstDisplay from "./TeletekstDisplay";
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
          ms
        );
      });

    return () => timers.forEach(clearTimeout);
  }, [displaySlide?.id]);

  // Handle slide changes and transitions
  useEffect(() => {
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

        {layout === "teletekst" && (
          <div className="display-teletekst">
            {slide.teletekstChannel ? (
              <TeletekstDisplay
                channel={slide.teletekstChannel}
                theme={slide.teletekstTheme || "classic"}
                pageCount={slide.teletekstPageCount || 1}
                duration={slide.duration || 10}
                skipLines={slide.teletekstSkipLines || 0}
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
                    (effect.backgroundOpacity ?? 45) / 100
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

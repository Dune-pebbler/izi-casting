export const isCountdownExpired = (slide, now = Date.now()) =>
  slide.layout === "countdown" &&
  !!slide.countdownTargetDate &&
  new Date(slide.countdownTargetDate).getTime() <= now;

// Once a countdown slide's target date/time has passed, it should stop
// being shown automatically instead of requiring someone to manually flip
// the "visible" toggle off in the admin panel.
export const hideExpiredCountdownSlides = (playlists) => {
  const now = Date.now();
  let changed = false;

  const nextPlaylists = playlists.map((playlist) => {
    if (!playlist.slides || playlist.slides.length === 0) return playlist;

    const nextSlides = playlist.slides.map((slide) => {
      const isExpiredCountdown =
        slide.isVisible !== false && isCountdownExpired(slide, now);

      if (!isExpiredCountdown) return slide;

      changed = true;
      return { ...slide, isVisible: false };
    });

    return { ...playlist, slides: nextSlides };
  });

  return { playlists: changed ? nextPlaylists : playlists, changed };
};

const COUNTDOWN_UNITS = [
  { key: "d", label: "Dagen", ms: 1000 * 60 * 60 * 24 },
  { key: "h", label: "Uur", ms: 1000 * 60 * 60 },
  { key: "m", label: "Minuten", ms: 1000 * 60 },
  { key: "s", label: "Seconden", ms: 1000 },
];

export const DEFAULT_COUNTDOWN_FORMAT = "dhms";

export const COUNTDOWN_FORMAT_OPTIONS = [
  { value: "dhms", label: "Dagen, uur, minuten, seconden" },
  { value: "dhm", label: "Dagen, uur, minuten" },
  { value: "dh", label: "Dagen, uur" },
  { value: "d", label: "Dagen" },
  { value: "hms", label: "Uur, minuten, seconden" },
  { value: "hm", label: "Uur, minuten" },
  { value: "h", label: "Uur" },
  { value: "ms", label: "Minuten, seconden" },
  { value: "m", label: "Minuten" },
  { value: "s", label: "Seconden" },
];

// Splits the remaining time into the units selected by `format`. The largest
// selected unit absorbs everything above it (e.g. "h" on a 3-day countdown
// shows 72 hours), and the smallest unit is floored.
export const getCountdownUnits = (diff, format = DEFAULT_COUNTDOWN_FORMAT) => {
  const units = COUNTDOWN_UNITS.filter((unit) => format.includes(unit.key));
  const selected = units.length > 0 ? units : COUNTDOWN_UNITS;

  let remaining = diff;
  return selected.map(({ key, label, ms }) => {
    const value = Math.floor(remaining / ms);
    remaining -= value * ms;
    return { key, label, value };
  });
};

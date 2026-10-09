// Before the global "Slide-achtergrond" setting existed, agenda,
// email, sportlink and qr-feed slides were saved with this hard-coded color.
// Treat it as "not set" so those slides follow the global default.
const LEGACY_DEFAULT_BG = "#0f172a";

// Returns the slide's own background override, or "" when it should use the
// global default.
export function getSlideBgOverride(value) {
  if (!value || value.toLowerCase() === LEGACY_DEFAULT_BG) return "";
  return value;
}

// Background color for rendering: the override, or the global CSS variable.
export function resolveSlideBg(value) {
  return getSlideBgOverride(value) || "var(--slide-bg)";
}

// Sportlink used to be a single slide type with a `sportlinkDataType` field
// ("programma" | "uitslagen" | "poulestand") chosen inside the editor. It is
// now split into 3 distinct slide types, one per data type, so tenants and
// editors can enable/pick them individually. Existing slides keep their old
// combined `layout: "sportlink"` + `sportlinkDataType` shape — these helpers
// let the rest of the app treat both shapes the same way without migrating
// any Firestore data.
export const SPORTLINK_DATA_TYPES = ["programma", "uitslagen", "poulestand"];

export const SPORTLINK_LAYOUTS = SPORTLINK_DATA_TYPES.map(
  (dataType) => `sportlink-${dataType}`,
);

export function isSportlinkLayout(layout) {
  return layout === "sportlink" || SPORTLINK_LAYOUTS.includes(layout);
}

export function getSportlinkDataType(layout, legacyDataType) {
  if (layout === "sportlink") return legacyDataType || "programma";
  const dataType = (layout || "").replace("sportlink-", "");
  return SPORTLINK_DATA_TYPES.includes(dataType) ? dataType : "programma";
}

// Tenants only have a single `slideTypes.sportlink` flag gating access to all
// Sportlink slide types (and the sidebar Sportlink instellingen), so any of
// the 3 specific layouts must check that shared key instead of their own id.
export function getSlideTypeGateKey(layout) {
  return isSportlinkLayout(layout) ? "sportlink" : layout;
}

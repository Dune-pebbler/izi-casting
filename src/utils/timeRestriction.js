// Legacy data only has a single `enabled` flag — treat it as both
// windows being on so previously configured slides keep working.
const legacyFlag = (tr, key) =>
  tr[key] !== undefined ? tr[key] : !!tr.enabled;

export const isTimeRestrictionEnabled = (tr) => {
  if (!tr) return false;
  return legacyFlag(tr, "timeEnabled") || legacyFlag(tr, "dateEnabled");
};

// Whether a slide's time window currently allows it to be shown, given `now`.
export const isSlideCurrentlyInWindow = (slide, now = new Date()) => {
  const tr = slide?.timeRestriction;
  if (!tr) return true;

  const timeEnabled = legacyFlag(tr, "timeEnabled");
  const dateEnabled = legacyFlag(tr, "dateEnabled");
  if (!timeEnabled && !dateEnabled) return true;

  // Date range check (optional — empty string means no restriction)
  if (dateEnabled && (tr.startDate || tr.endDate)) {
    const pad = (n) => String(n).padStart(2, "0");
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    // Normalize to YYYY-MM-DD string — handles plain strings, Date objects,
    // and Firestore Timestamps (which have a .toDate() method)
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

  if (!timeEnabled) return true;

  if (tr.days) {
    const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const key = dayKeys[now.getDay()];
    if (tr.days[key] === false) return false;
  }

  if (!tr.startTime || !tr.endTime) return true;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = tr.startTime.split(":").map(Number);
  const [eh, em] = tr.endTime.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  // Midnight overlap: start > end means e.g. 22:00 – 02:00
  return start <= end
    ? currentMinutes >= start && currentMinutes <= end
    : currentMinutes >= start || currentMinutes <= end;
};

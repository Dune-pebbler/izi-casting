import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { ArrowLeft, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { Check } from "lucide-react";
import {
  isSportlinkLayout,
  getSportlinkDataType,
} from "../../utils/sportlinkTypes";

const MODULE_COLUMNS = [
  { key: "slideEffects", label: "Effecten" },
  { key: "backgroundMusic", label: "Achtergrond muziek" },
  { key: "rotateDevice", label: "Scherm draaien" },
];

const SLIDE_TYPE_COLUMNS = [
  { key: "video", label: "Video" },
  { key: "iframe", label: "Website" },
  { key: "side-by-side", label: "Afbeelding met tekst" },
  { key: "text-only", label: "Tekst" },
  { key: "image-only", label: "Afbeelding" },
  { key: "teletekst", label: "Teletekst" },
  { key: "gallery", label: "Gallerij" },
  { key: "countdown", label: "Aftel" },
  { key: "agenda", label: "Agenda" },
  { key: "email", label: "Gmail" },
  {
    key: "sportlink-programma",
    label: "Sportlink programma",
    gateKey: "sportlink",
  },
  {
    key: "sportlink-uitslagen",
    label: "Sportlink uitslagen",
    gateKey: "sportlink",
  },
  {
    key: "sportlink-poulestand",
    label: "Sportlink poulestand",
    gateKey: "sportlink",
  },
  { key: "weather", label: "Weer" },
  { key: "qr-feed", label: "QR + Tekst" },
];

function slideTypeKey(slide) {
  const layout = slide?.layout;
  if (isSportlinkLayout(layout)) {
    return `sportlink-${getSportlinkDataType(layout, slide.sportlinkDataType)}`;
  }
  return layout;
}

function countSlideTypes(contentData) {
  const counts = {};
  const playlists =
    contentData?.playlists ||
    (contentData?.slides ? [{ slides: contentData.slides }] : []);
  playlists.forEach((playlist) => {
    (playlist.slides || []).forEach((slide) => {
      const key = slideTypeKey(slide);
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
  });
  return counts;
}

function StatsView({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [selectedModules, setSelectedModules] = useState(
    () => new Set(MODULE_COLUMNS.map((m) => m.key)),
  );
  const [selectedSlideTypes, setSelectedSlideTypes] = useState(
    () => new Set(SLIDE_TYPE_COLUMNS.map((s) => s.key)),
  );
  const [selectedTenants, setSelectedTenants] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const tenantsSnap = await getDocs(collection(db, "tenants"));
      const tenants = tenantsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((t) => !t.deletedAt);

      const results = await Promise.all(
        tenants.map(async (tenant) => {
          const contentSnap = await getDoc(
            doc(db, "tenants", tenant.id, "display", "content"),
          );
          const counts = contentSnap.exists()
            ? countSlideTypes(contentSnap.data())
            : {};
          return { tenant, counts };
        }),
      );

      if (!cancelled) {
        results.sort((a, b) => a.tenant.name?.localeCompare(b.tenant.name));
        setRows(results);
        setSelectedTenants(new Set(results.map((r) => r.tenant.id)));
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleInSet(setter) {
    return (key) => {
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    };
  }

  const toggleModule = toggleInSet(setSelectedModules);
  const toggleSlideType = toggleInSet(setSelectedSlideTypes);
  const toggleTenant = toggleInSet(setSelectedTenants);

  const visibleRows = rows.filter(({ tenant }) =>
    selectedTenants ? selectedTenants.has(tenant.id) : true,
  );
  const visibleModuleColumns = MODULE_COLUMNS.filter((m) =>
    selectedModules.has(m.key),
  );
  const visibleSlideTypeColumns = SLIDE_TYPE_COLUMNS.filter((s) =>
    selectedSlideTypes.has(s.key),
  );

  function renderSectionRow(label) {
    return (
      <tr key={label} className="superadmin-stats-section-row">
        <td className="superadmin-stats-row-label">{label}</td>
        {visibleRows.map(({ tenant }) => (
          <td key={tenant.id} />
        ))}
      </tr>
    );
  }

  function renderModuleRow({ key, label }) {
    return (
      <tr key={key}>
        <td className="superadmin-stats-row-label">{label}</td>
        {visibleRows.map(({ tenant }) => {
          const enabled = tenant.modules?.[key] === true;
          return (
            <td
              key={tenant.id}
              className={
                enabled
                  ? "superadmin-stats-count"
                  : "superadmin-stats-count superadmin-stats-count--disabled"
              }
              title={enabled ? undefined : "Niet toegestaan voor deze omgeving"}
            >
              {enabled ? <Check size={11} /> : "—"}
            </td>
          );
        })}
      </tr>
    );
  }

  function renderSlideTypeRow({ key, label, gateKey }) {
    const checkKey = gateKey || key;
    return (
      <tr key={key}>
        <td className="superadmin-stats-row-label">{label}</td>
        {visibleRows.map(({ tenant, counts }) => {
          const hasSlideTypeConfig =
            Object.keys(tenant.slideTypes || {}).length > 0;
          const enabled = hasSlideTypeConfig
            ? tenant.slideTypes[checkKey] === true
            : true;
          const count = counts[key] || 0;
          return (
            <td
              key={tenant.id}
              className={
                enabled
                  ? "superadmin-stats-count"
                  : "superadmin-stats-count superadmin-stats-count--disabled"
              }
              title={enabled ? undefined : "Niet toegestaan voor deze omgeving"}
            >
              {enabled ? count : "—"}
            </td>
          );
        })}
      </tr>
    );
  }

  return (
    <div className="superadmin-stats">
      <div className="superadmin-stats-header">
        <button className="btn btn-outline btn-sm" onClick={onBack}>
          <ArrowLeft size={14} />
          Terug
        </button>
        <h2>
          <BarChart3 size={18} />
          Statistieken per omgeving
        </h2>
      </div>

      {!loading && rows.length > 0 && (
        <div className="superadmin-stats-filters">
          <button
            type="button"
            className="superadmin-stats-filters-toggle"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
          >
            Filters
            {filtersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <div
            className={
              filtersOpen
                ? "superadmin-stats-filters-collapse superadmin-stats-filters-collapse--open"
                : "superadmin-stats-filters-collapse"
            }
          >
            <div className="superadmin-stats-filters-collapse-inner">
            <div className="superadmin-stats-filters-body">
              <div className="superadmin-stats-filter-group">
                <div className="superadmin-stats-filter-title">Modules</div>
                <div className="superadmin-stats-filter-options">
                  {MODULE_COLUMNS.map(({ key, label }) => (
                    <label
                      key={key}
                      className="superadmin-stats-filter-option"
                    >
                      <input
                        type="checkbox"
                        checked={selectedModules.has(key)}
                        onChange={() => toggleModule(key)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="superadmin-stats-filter-group">
                <div className="superadmin-stats-filter-title">
                  Slide types
                </div>
                <div className="superadmin-stats-filter-options">
                  {SLIDE_TYPE_COLUMNS.map(({ key, label }) => (
                    <label
                      key={key}
                      className="superadmin-stats-filter-option"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSlideTypes.has(key)}
                        onChange={() => toggleSlideType(key)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="superadmin-stats-filter-group">
                <div className="superadmin-stats-filter-title">
                  Omgevingen
                </div>
                <div className="superadmin-stats-filter-options">
                  {rows.map(({ tenant }) => (
                    <label
                      key={tenant.id}
                      className="superadmin-stats-filter-option"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTenants?.has(tenant.id) ?? true}
                        onChange={() => toggleTenant(tenant.id)}
                      />
                      {tenant.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Statistieken laden...</div>
      ) : rows.length === 0 ? (
        <div className="superadmin-empty">Geen omgevingen gevonden.</div>
      ) : visibleRows.length === 0 ? (
        <div className="superadmin-empty">
          Geen omgevingen geselecteerd.
        </div>
      ) : (
        <div className="superadmin-stats-table-wrapper">
          <table className="superadmin-stats-table">
            <thead>
              <tr>
                <th className="superadmin-stats-row-label superadmin-stats-corner">
                  Omgeving
                </th>
                {visibleRows.map(({ tenant }) => (
                  <th key={tenant.id}>{tenant.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleModuleColumns.length > 0 && (
                <>
                  {renderSectionRow("Modules")}
                  {visibleModuleColumns.map(renderModuleRow)}
                </>
              )}
              {visibleSlideTypeColumns.length > 0 && (
                <>
                  {renderSectionRow("Slide types")}
                  {visibleSlideTypeColumns.map(renderSlideTypeRow)}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default StatsView;

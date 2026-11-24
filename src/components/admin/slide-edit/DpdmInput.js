import React from "react";
import { DPDM_SOURCES } from "../../../utils/dpdmTypes";

const SOURCE_DESCRIPTIONS = {
  "dpdm-updates":
    "Websites met technische support waarvan de geplande updatedatum vandaag of eerder is.",
  "dpdm-ssl": "Live websites met een SSL-fout.",
  "dpdm-uptime": "Live websites die op dit moment niet bereikbaar zijn.",
};

function DpdmInput({
  slideLayout,
  dpdmTitle,
  onTitleChange,
  dpdmMaxItems,
  onMaxItemsChange,
}) {
  const source = DPDM_SOURCES[slideLayout];

  return (
    <div className="dpdm-input">
      <div className="dpdm-input__section">
        <h4 className="dpdm-input__section-title">{source?.label}</h4>
        <p className="dpdm-input__hint">{SOURCE_DESCRIPTIONS[slideLayout]}</p>
        <p className="dpdm-input__hint">
          De data komt live uit DPDM en wordt elke 2 minuten ververst. De
          API-token staat server-side ingesteld.
        </p>
      </div>

      <div className="dpdm-input__section">
        <div className="dpdm-input__field">
          <label htmlFor="dpdm-title">Titel</label>
          <input
            id="dpdm-title"
            type="text"
            className="form-input"
            value={dpdmTitle || ""}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder={source?.title}
            maxLength={60}
          />
        </div>

        <div className="dpdm-input__field">
          <label htmlFor="dpdm-max-items">Maximaal aantal regels</label>
          <input
            id="dpdm-max-items"
            type="number"
            className="form-input"
            value={dpdmMaxItems || ""}
            min={1}
            max={100}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              onMaxItemsChange(
                isNaN(value) ? "" : Math.min(100, Math.max(1, value)),
              );
            }}
          />
          <p className="dpdm-input__hint">
            Past de lijst niet op het scherm, dan scrollt hij automatisch.
          </p>
        </div>
      </div>
    </div>
  );
}

export default DpdmInput;

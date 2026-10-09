import React from "react";
import { RotateCcw } from "lucide-react";

// Background color picker that falls back to the global default
// (Settings → "Standaard slide-achtergrond") when no value is set.
function BackgroundColorInput({ value, defaultColor = "#FFFFFF", onChange, label }) {
  const isDefault = !value;

  return (
    <div className="slide-bg-input">
      {label && <label>{label}</label>}
      <div className="slide-color-input__wrapper">
        <input
          type="color"
          value={value || defaultColor}
          onChange={(e) => onChange(e.target.value)}
          className="slide-color-input__picker"
          title="Achtergrondkleur"
        />
        <span className="slide-color-input__hex">
          {isDefault ? `Standaard (${defaultColor})` : value}
        </span>
        {!isDefault && (
          <button
            type="button"
            className="slide-bg-input__reset"
            onClick={() => onChange("")}
            title="Standaard achtergrond gebruiken"
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export default BackgroundColorInput;

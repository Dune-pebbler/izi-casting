import React from 'react';
import ImageUpload from './ImageUpload';
import {
  COUNTDOWN_FORMAT_OPTIONS,
  DEFAULT_COUNTDOWN_FORMAT,
} from '../../../utils/countdownUtils';

function ColorField({ label, value, onChange }) {
  return (
    <div className="slide-color-input">
      <label>{label}</label>
      <div className="slide-color-input__wrapper">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="slide-color-input__picker"
        />
        <span className="slide-color-input__hex">{value}</span>
      </div>
    </div>
  );
}

function CountdownInput({
  countdownTitle,
  onCountdownTitleChange,
  countdownTargetDate,
  onCountdownTargetDateChange,
  countdownFormat,
  onCountdownFormatChange,
  countdownBgImage,
  onCountdownBgImageUpload,
  countdownBgImagePosition,
  onCountdownBgImagePositionChange,
  countdownTextColor,
  onCountdownTextColorChange,
  countdownNumberColor,
  onCountdownNumberColorChange,
  countdownBlockBg,
  onCountdownBlockBgChange,
  countdownLabelColor,
  onCountdownLabelColorChange,
  uploadingImage,
  onOpenLibrary,
}) {
  return (
    <div className="countdown-input">
      <div className="countdown-input__left">
        <div className="countdown-input__section">
          <h4 className="countdown-input__section-title">Inhoud</h4>
          <div className="countdown-input__field">
            <label>Onderwerp / Titel</label>
            <input
              type="text"
              className="form-input"
              value={countdownTitle}
              onChange={(e) => onCountdownTitleChange(e.target.value)}
              placeholder="Bijv. Kerst 2025"
            />
          </div>
          <div className="countdown-input__field">
            <label>Aftellen naar</label>
            <input
              type="datetime-local"
              className="form-input countdown-input__datetime"
              value={countdownTargetDate}
              onChange={(e) => onCountdownTargetDateChange(e.target.value)}
            />
          </div>
          <div className="countdown-input__field">
            <label>Notatie</label>
            <select
              className="form-input"
              value={countdownFormat || DEFAULT_COUNTDOWN_FORMAT}
              onChange={(e) => onCountdownFormatChange(e.target.value)}
            >
              {COUNTDOWN_FORMAT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="countdown-input__section">
          <h4 className="countdown-input__section-title">Kleuren</h4>
          <div className="countdown-input__colors">
            <ColorField
              label="Titel kleur"
              value={countdownTextColor}
              onChange={onCountdownTextColorChange}
            />
            <ColorField
              label="Getal kleur"
              value={countdownNumberColor}
              onChange={onCountdownNumberColorChange}
            />
            <ColorField
              label="Blok achtergrond"
              value={countdownBlockBg}
              onChange={onCountdownBlockBgChange}
            />
            <ColorField
              label="Label kleur"
              value={countdownLabelColor}
              onChange={onCountdownLabelColorChange}
            />
          </div>
        </div>
      </div>

      <div className="countdown-input__right">
        <div className="countdown-input__section">
          <h4 className="countdown-input__section-title">Achtergrond afbeelding (optioneel)</h4>
          <ImageUpload
            imageUrl={countdownBgImage}
            uploadingImage={uploadingImage}
            onImageUpload={onCountdownBgImageUpload}
            onRemoveImage={() => onCountdownBgImageUpload(null)}
            showPositionSelector={!!countdownBgImage}
            imagePosition={countdownBgImagePosition}
            onPositionChange={onCountdownBgImagePositionChange}
            fullWidth={true}
            onOpenLibrary={onOpenLibrary}
          />
        </div>
      </div>
    </div>
  );
}

export default CountdownInput;

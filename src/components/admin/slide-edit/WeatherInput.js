import React, { useState } from "react";
import { RefreshCw, MapPin, X } from "lucide-react";
import ImageUpload from "./ImageUpload";

function WeatherInput({
  weatherLat,
  weatherLong,
  weatherCity,
  weatherAccentColor,
  weatherForecastDays,
  weatherLeftBgImage,
  weatherLeftBgImagePosition,
  onLatChange,
  onLongChange,
  onCityChange,
  onAccentColorChange,
  onForecastDaysChange,
  onWeatherLeftBgImageUpload,
  onWeatherLeftBgImagePositionChange,
  uploadingImage,
  onOpenWeatherLeftLibrary,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const searchLocation = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearchError(null);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=nl&format=json`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResults(data.results || []);
      if (!data.results?.length) setSearchError("Geen resultaten gevonden.");
    } catch (err) {
      setSearchError(`Fout bij zoeken: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (result) => {
    const label = [result.name, result.admin1, result.country]
      .filter(Boolean)
      .join(", ");
    onLatChange(String(result.latitude));
    onLongChange(String(result.longitude));
    onCityChange(label);
    setQuery("");
    setResults([]);
    setSearchError(null);
  };

  const handleClear = () => {
    onLatChange("");
    onLongChange("");
    onCityChange("");
  };

  return (
    <div className="sportlink-input">
      <div className="sportlink-input__left">
        <div className="sportlink-input__section">
          <h4 className="sportlink-input__section-title">Instellingen</h4>

          <div className="sportlink-input__field">
            <label>Accentkleur</label>
            <div className="countdown-input__color-wrapper">
              <input
                type="color"
                value={weatherAccentColor}
                onChange={(e) => onAccentColorChange(e.target.value)}
                className="countdown-input__color-picker"
              />
              <span className="countdown-input__color-hex">
                {weatherAccentColor}
              </span>
            </div>
          </div>

          <div className="sportlink-input__field">
            <label>Aantal dagen verwachting</label>
            <input
              type="number"
              className="form-input"
              min={1}
              max={16}
              value={weatherForecastDays}
              onChange={(e) =>
                onForecastDaysChange(
                  Math.min(16, Math.max(1, Number(e.target.value))),
                )
              }
            />
            <p className="sportlink-input__hint">Maximaal 16 dagen.</p>
          </div>
        </div>
        <div className="sportlink-input__section">
          <h4 className="sportlink-input__section-title">
            Achtergrond (optioneel)
          </h4>
          <ImageUpload
            imageUrl={weatherLeftBgImage}
            uploadingImage={uploadingImage}
            onImageUpload={onWeatherLeftBgImageUpload}
            onRemoveImage={() => onWeatherLeftBgImageUpload(null)}
            showPositionSelector={!!weatherLeftBgImage}
            imagePosition={weatherLeftBgImagePosition}
            onPositionChange={onWeatherLeftBgImagePositionChange}
            fullWidth={true}
            onOpenLibrary={onOpenWeatherLeftLibrary}
          />
        </div>
      </div>

      <div className="sportlink-input__right">
        <div className="sportlink-input__section">
          <h4 className="sportlink-input__section-title">Locatie</h4>

          <div className="sportlink-input__field">
            <label>Plaatsnaam zoeken</label>
            <div className="sportlink-input__api-row">
              <input
                type="text"
                className="form-input sportlink-input__api-key"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchLocation()}
                placeholder="Bijv. Amsterdam, Nijmegen..."
              />
              <button
                type="button"
                className="btn btn-secondary sportlink-input__fetch-btn"
                onClick={searchLocation}
                disabled={!query.trim() || loading}
              >
                <RefreshCw size={14} className={loading ? "spinning" : ""} />
                {loading ? "Zoeken…" : "Zoek locatie"}
              </button>
            </div>
            <p className="sportlink-input__hint">
              Typ een stad of plaats en klik op "Zoek locatie" om de coördinaten
              op te halen.
            </p>
          </div>

          {searchError && (
            <div className="sportlink-input__error">{searchError}</div>
          )}

          {results.length > 0 && (
            <div className="sportlink-input__field">
              <label>Selecteer een locatie</label>
              <div className="sportlink-input__team-list">
                {results.map((r, i) => {
                  const label = [r.name, r.admin1, r.country]
                    .filter(Boolean)
                    .join(", ");
                  const isActive =
                    weatherCity === label &&
                    weatherLat === String(r.latitude) &&
                    weatherLong === String(r.longitude);
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`sportlink-input__team-btn${isActive ? " active" : ""}`}
                      onClick={() => handleSelect(r)}
                    >
                      <MapPin
                        size={12}
                        className="sportlink-input__team-check"
                      />
                      <span className="sportlink-input__team-name">
                        {r.name}
                      </span>
                      <span className="sportlink-input__team-meta">
                        {[r.admin1, r.country].filter(Boolean).join(", ")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {weatherCity ? (
            <div className="sportlink-input__field">
              <div className="sportlink-input__chips-header">
                <label>Geselecteerde locatie</label>
                <button
                  type="button"
                  className="sportlink-input__chips-clear"
                  onClick={handleClear}
                >
                  Wis locatie
                </button>
              </div>
              <div className="sportlink-input__team-chips">
                <span className="sportlink-input__team-chip">
                  {weatherCity}
                  <button
                    type="button"
                    className="sportlink-input__chip-remove"
                    onClick={handleClear}
                    title="Locatie verwijderen"
                  >
                    <X size={10} />
                  </button>
                </span>
              </div>
              <p className="sportlink-input__hint">
                Coördinaten: {weatherLat}, {weatherLong}
              </p>
            </div>
          ) : (
            results.length === 0 &&
            !searchError && (
              <p className="sportlink-input__hint">
                Zoek en selecteer een locatie om het weer op te halen.
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default WeatherInput;

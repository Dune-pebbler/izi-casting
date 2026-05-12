import React, { useState } from "react";
import { RefreshCw, Check } from "lucide-react";

const DATA_TYPES = [
  {
    id: "programma",
    label: "Programma",
    description: "Aankomende wedstrijden",
  },
  { id: "uitslagen", label: "Uitslagen", description: "Gespeelde wedstrijden" },
  {
    id: "poulestand",
    label: "Poulestand",
    description: "Ranglijst in de competitie",
  },
];

function SportlinkInput({
  sportlinkApiKey,
  onApiKeyChange,
  sportlinkDataType,
  onDataTypeChange,
  sportlinkTeams,
  onTeamsChange,
  sportlinkTitle,
  onTitleChange,
  sportlinkAantalDagen,
  onAantalDagenChange,
  sportlinkMaxItems,
  onMaxItemsChange,
  sportlinkBgColor,
  onBgColorChange,
  sportlinkTextColor,
  onTextColorChange,
  sportlinkAccentColor,
  onAccentColorChange,
  sportlinkDate,
  onDateChange,
}) {
  const [availableTeams, setAvailableTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamLoadError, setTeamLoadError] = useState(null);
  const [teamSearch, setTeamSearch] = useState("");

  const selectedTeams = sportlinkTeams || [];

  const fetchTeams = async () => {
    if (!sportlinkApiKey) return;
    setLoadingTeams(true);
    setTeamLoadError(null);
    try {
      const res = await fetch(
        `https://data.sportlink.com/teams?client_id=${encodeURIComponent(sportlinkApiKey)}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Onverwacht antwoord van API");
      const seen = new Set();
      const unique = data.filter((t) => {
        if (seen.has(t.teamcode)) return false;
        seen.add(t.teamcode);
        return true;
      });
      setAvailableTeams(unique);
    } catch (err) {
      setTeamLoadError(`Fout bij ophalen teams: ${err.message}`);
    } finally {
      setLoadingTeams(false);
    }
  };

  const toggleTeam = (team) => {
    const exists = selectedTeams.find((t) => t.teamcode === team.teamcode);
    if (exists) {
      onTeamsChange(selectedTeams.filter((t) => t.teamcode !== team.teamcode));
    } else {
      onTeamsChange([
        ...selectedTeams,
        {
          teamcode: team.teamcode,
          poulecode: team.poulecode,
          teamnaam: team.teamnaam,
        },
      ]);
    }
  };

  const isSelected = (teamcode) =>
    selectedTeams.some((t) => t.teamcode === teamcode);

  return (
    <div className="sportlink-input">
      <div className="sportlink-input__left">
        <div className="sportlink-input__section">
          <h4 className="sportlink-input__section-title">Instellingen</h4>

          <div className="sportlink-input__field">
            <label>Titel (optioneel)</label>
            <input
              type="text"
              className="form-input"
              value={sportlinkTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Bijv. Programma JO15-1"
            />
          </div>

          <div className="sportlink-input__field">
            <label>Type data</label>
            <div className="sportlink-input__data-types">
              {DATA_TYPES.map(({ id, label, description }) => (
                <button
                  key={id}
                  type="button"
                  className={`sportlink-input__type-btn${sportlinkDataType === id ? " active" : ""}`}
                  onClick={() => onDataTypeChange(id)}
                >
                  <span className="sportlink-input__type-label">{label}</span>
                  <span className="sportlink-input__type-desc">
                    {description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="sportlink-input__field">
            <label>Datum (optioneel)</label>
            <input
              type="date"
              className="form-input"
              value={sportlinkDate || ""}
              onChange={(e) => onDateChange(e.target.value)}
            />
            <p className="sportlink-input__hint">
              Laat leeg om resultaten van vandaag te tonen.
            </p>
          </div>

          {sportlinkDataType !== "poulestand" && (
            <div className="sportlink-input__field">
              <label>Max. items</label>
              <input
                type="number"
                className="form-input"
                value={sportlinkMaxItems}
                min="1"
                max="50"
                onChange={(e) => onMaxItemsChange(Number(e.target.value))}
              />
            </div>
          )}

          {sportlinkDataType === "poulestand" && (
            <div className="sportlink-input__field">
              <label>Max. items</label>
              <input
                type="number"
                className="form-input"
                value={sportlinkMaxItems}
                min="1"
                max="50"
                onChange={(e) => onMaxItemsChange(Number(e.target.value))}
              />
            </div>
          )}

          <div className="sportlink-input__row">
            <div className="sportlink-input__field">
              <label>Achtergrondkleur</label>
              <div className="countdown-input__color-wrapper">
                <input
                  type="color"
                  value={sportlinkBgColor}
                  onChange={(e) => onBgColorChange(e.target.value)}
                  className="countdown-input__color-picker"
                />
                <span className="countdown-input__color-hex">
                  {sportlinkBgColor}
                </span>
              </div>
            </div>
            <div className="sportlink-input__field">
              <label>Tekstkleur</label>
              <div className="countdown-input__color-wrapper">
                <input
                  type="color"
                  value={sportlinkTextColor}
                  onChange={(e) => onTextColorChange(e.target.value)}
                  className="countdown-input__color-picker"
                />
                <span className="countdown-input__color-hex">
                  {sportlinkTextColor}
                </span>
              </div>
            </div>
          </div>

          <div className="sportlink-input__field">
            <label>Accentkleur (clubkleur)</label>
            <div className="countdown-input__color-wrapper">
              <input
                type="color"
                value={sportlinkAccentColor}
                onChange={(e) => onAccentColorChange(e.target.value)}
                className="countdown-input__color-picker"
              />
              <span className="countdown-input__color-hex">
                {sportlinkAccentColor}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="sportlink-input__right">
        <div className="sportlink-input__section">
          <h4 className="sportlink-input__section-title">
            Sportlink koppeling
          </h4>

          <div className="sportlink-input__field">
            <label>API key (Client ID)</label>
            <div className="sportlink-input__api-row">
              <input
                type="text"
                className="form-input sportlink-input__api-key"
                value={sportlinkApiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder="API key..."
              />
              <button
                type="button"
                className="btn btn-secondary sportlink-input__fetch-btn"
                onClick={fetchTeams}
                disabled={!sportlinkApiKey || loadingTeams}
                title="Teams ophalen van Sportlink"
              >
                <RefreshCw
                  size={14}
                  className={loadingTeams ? "spinning" : ""}
                />
                {loadingTeams ? "Laden…" : "Haal teams op"}
              </button>
            </div>
            <p className="sportlink-input__hint">
              Je Client ID vind je in Sportlink Club.Dataservice. Klik op "Haal
              teams op" om je teams te laden.
            </p>
          </div>

          {teamLoadError && (
            <div className="sportlink-input__error">{teamLoadError}</div>
          )}

          {availableTeams.length > 0 && (
            <div className="sportlink-input__field">
              <label>Teams selecteren</label>
              <input
                type="text"
                className="form-input"
                placeholder="Zoeken..."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                style={{ marginBottom: "8px" }}
              />
              <div className="sportlink-input__team-list">
                {availableTeams.filter((t) =>
                  t.teamnaam.toLowerCase().includes(teamSearch.toLowerCase())
                ).map((team) => {
                  const selected = isSelected(team.teamcode);
                  return (
                    <button
                      key={team.teamcode}
                      type="button"
                      className={`sportlink-input__team-btn${selected ? " active" : ""}`}
                      onClick={() => toggleTeam(team)}
                    >
                      {selected && (
                        <Check
                          size={12}
                          className="sportlink-input__team-check"
                        />
                      )}
                      <span className="sportlink-input__team-name">
                        {team.teamnaam}
                      </span>
                      <span className="sportlink-input__team-meta">
                        {team.klasse && ` ${team.klasse}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedTeams.length > 0 && availableTeams.length === 0 && (
            <div className="sportlink-input__field">
              <label>Geselecteerde teams</label>
              <div className="sportlink-input__selected-teams">
                {selectedTeams.map((team) => (
                  <div
                    key={team.teamcode}
                    className="sportlink-input__selected-team"
                  >
                    <span>{team.teamnaam}</span>
                    <button
                      type="button"
                      className="btn-icon btn-icon--danger"
                      onClick={() =>
                        onTeamsChange(
                          selectedTeams.filter(
                            (t) => t.teamcode !== team.teamcode,
                          ),
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTeams.length === 0 && availableTeams.length === 0 && (
            <p className="sportlink-input__hint">
              Voer je API key in en klik op "Haal teams op" om je teams te
              selecteren.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default SportlinkInput;

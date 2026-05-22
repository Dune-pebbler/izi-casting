import React from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";

function AgendaInput({
  agendaCalendars,
  onCalendarsChange,
  agendaTitle,
  onAgendaTitleChange,
  agendaDaysAhead,
  onAgendaDaysAheadChange,
  agendaMaxEvents,
  onAgendaMaxEventsChange,
  agendaBgColor,
  onAgendaBgColorChange,
  agendaTextColor,
  onAgendaTextColorChange,
}) {
  const calendars = agendaCalendars || [];

  const addCalendar = () => {
    onCalendarsChange([
      ...calendars,
      { id: Date.now(), name: "", url: "", color: "#4f87ff" },
    ]);
  };

  const updateCalendar = (id, field, value) => {
    onCalendarsChange(
      calendars.map((cal) =>
        cal.id === id ? { ...cal, [field]: value } : cal,
      ),
    );
  };

  const removeCalendar = (id) => {
    onCalendarsChange(calendars.filter((cal) => cal.id !== id));
  };

  return (
    <div className="agenda-input">
      <div className="agenda-input__left">
        <div className="agenda-input__section">
          <h4 className="agenda-input__section-title">Instellingen</h4>
          <div className="agenda-input__field">
            <label>Titel (optioneel)</label>
            <input
              type="text"
              className="form-input"
              value={agendaTitle}
              onChange={(e) => onAgendaTitleChange(e.target.value)}
              placeholder="Bijv. Agenda"
            />
          </div>
          <div className="agenda-input__row">
            <div className="agenda-input__field">
              <label>Dagen vooruit</label>
              <input
                type="number"
                className="form-input"
                value={agendaDaysAhead}
                min="1"
                max="365"
                onChange={(e) =>
                  onAgendaDaysAheadChange(Number(e.target.value))
                }
              />
            </div>
            <div className="agenda-input__field">
              <label>Max. afspraken</label>
              <input
                type="number"
                className="form-input"
                value={agendaMaxEvents}
                min="1"
                max="20"
                onChange={(e) =>
                  onAgendaMaxEventsChange(Number(e.target.value))
                }
              />
            </div>
          </div>
          <div className="agenda-input__row">
            <div className="agenda-input__field">
              <label>Achtergrondkleur</label>
              <div className="slide-color-input__wrapper">
                <input
                  type="color"
                  value={agendaBgColor}
                  onChange={(e) => onAgendaBgColorChange(e.target.value)}
                  className="slide-color-input__picker"
                />
                <span className="slide-color-input__hex">
                  {agendaBgColor}
                </span>
              </div>
            </div>
            <div className="agenda-input__field">
              <label>Tekstkleur</label>
              <div className="slide-color-input__wrapper">
                <input
                  type="color"
                  value={agendaTextColor}
                  onChange={(e) => onAgendaTextColorChange(e.target.value)}
                  className="slide-color-input__picker"
                />
                <span className="slide-color-input__hex">
                  {agendaTextColor}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="agenda-input__right">
        <div className="agenda-input__section">
          <h4 className="agenda-input__section-title">Agenda's</h4>
          <p className="agenda-input__hint">
            Voeg private iCal-links toe (Google Calendar, Outlook, Apple
            Calendar). Elke agenda krijgt een eigen kleur.
          </p>

          <div className="agenda-input__calendars">
            {calendars.map((cal) => (
              <div key={cal.id} className="agenda-input__calendar-row">
                <GripVertical size={16} className="agenda-input__grip" />
                <input
                  type="color"
                  value={cal.color}
                  onChange={(e) =>
                    updateCalendar(cal.id, "color", e.target.value)
                  }
                  className="agenda-input__cal-color"
                  title="Kalenderkleur"
                />
                <input
                  type="text"
                  className="form-input agenda-input__cal-name"
                  value={cal.name}
                  onChange={(e) =>
                    updateCalendar(cal.id, "name", e.target.value)
                  }
                  placeholder="Naam (bijv. Team)"
                />
                <input
                  type="url"
                  className="form-input agenda-input__cal-url"
                  value={cal.url}
                  onChange={(e) =>
                    updateCalendar(cal.id, "url", e.target.value)
                  }
                  placeholder="iCal URL (webcal:// of https://)"
                />
                <button
                  type="button"
                  className="btn-icon btn-icon--danger agenda-input__cal-remove"
                  onClick={() => removeCalendar(cal.id)}
                  title="Verwijderen"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-secondary agenda-input__add-btn"
            onClick={addCalendar}
          >
            <Plus size={16} />
            Agenda toevoegen
          </button>
        </div>
      </div>
    </div>
  );
}

export default AgendaInput;

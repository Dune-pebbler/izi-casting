import React, { useState } from "react";
import { Eye, EyeOff, ExternalLink } from "lucide-react";

function EmailInput({
  emailCredentials,
  onEmailCredentialsChange,
  emailMaxItems,
  onEmailMaxItemsChange,
  emailShowUnreadOnly,
  onEmailShowUnreadOnlyChange,
  emailBgColor,
  onEmailBgColorChange,
  emailTextColor,
  onEmailTextColorChange,
  emailAccentColor,
  onEmailAccentColorChange,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const credentials = emailCredentials || {};

  const updateCredential = (key, value) => {
    onEmailCredentialsChange({ ...credentials, [key]: value });
  };

  return (
    <div className="email-input">
      <div className="email-input__section">
        <h4 className="email-input__section-title">Gmail account</h4>
        <div className="email-input__field">
          <label>E-mailadres</label>
          <input
            type="email"
            className="form-input"
            value={credentials.email || ""}
            onChange={(e) => updateCredential("email", e.target.value)}
            placeholder="jouw@gmail.com"
            autoComplete="off"
          />
        </div>
        <div className="email-input__field">
          <label>
            App-wachtwoord
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noopener noreferrer"
              className="email-input__help-link"
              title="Genereer een app-wachtwoord in je Google account"
            >
              <ExternalLink size={12} />
              Genereren
            </a>
          </label>
          <div className="email-input__password-row">
            <input
              type={showPassword ? "text" : "password"}
              className="form-input"
              value={credentials.appPassword || ""}
              onChange={(e) => updateCredential("appPassword", e.target.value)}
              placeholder="xxxx xxxx xxxx xxxx"
              autoComplete="off"
            />
            <button
              type="button"
              className="email-input__toggle-secrets"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <div className="email-input__info">
          <strong>App-wachtwoord aanmaken:</strong>
          <ol>
            <li>Zet 2-staps verificatie aan op je Google account</li>
            <li>
              Ga naar{" "}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noopener noreferrer"
              >
                myaccount.google.com/apppasswords
              </a>
            </li>
            <li>Kies een naam (bijv. "izi-casting") en klik op Maken</li>
            <li>Kopieer het 16-cijferige wachtwoord en plak het hierboven</li>
          </ol>
        </div>
      </div>

      <div className="email-input__section">
        <h4 className="email-input__section-title">Instellingen</h4>
        <div className="email-input__row">
          <div className="email-input__field">
            <label>Max. emails</label>
            <input
              type="number"
              className="form-input"
              value={emailMaxItems ?? 10}
              min="1"
              max="20"
              onChange={(e) => onEmailMaxItemsChange(Number(e.target.value))}
            />
          </div>
          <div className="email-input__field">
            <label>Alleen ongelezen</label>
            <button
              type="button"
              className={`email-input__toggle-btn${emailShowUnreadOnly ? " active" : ""}`}
              onClick={() => onEmailShowUnreadOnlyChange(!emailShowUnreadOnly)}
            >
              {emailShowUnreadOnly ? "Ja" : "Nee"}
            </button>
          </div>
        </div>
      </div>

      <div className="email-input__section">
        <h4 className="email-input__section-title">Uiterlijk</h4>
        <div className="email-input__row">
          <div className="email-input__field">
            <label>Achtergrond</label>
            <input
              type="color"
              className="form-input form-input--color"
              value={emailBgColor || "#0f172a"}
              onChange={(e) => onEmailBgColorChange(e.target.value)}
            />
          </div>
          <div className="email-input__field">
            <label>Tekst</label>
            <input
              type="color"
              className="form-input form-input--color"
              value={emailTextColor || "#ffffff"}
              onChange={(e) => onEmailTextColorChange(e.target.value)}
            />
          </div>
          <div className="email-input__field">
            <label>Accent</label>
            <input
              type="color"
              className="form-input form-input--color"
              value={emailAccentColor || "#4f87ff"}
              onChange={(e) => onEmailAccentColorChange(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailInput;

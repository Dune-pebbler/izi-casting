import React, { useState, useEffect } from 'react';
import { Globe, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

function IframeUrlInput({ iframeUrl, onIframeUrlChange, onRemoveIframe }) {
  const [url, setUrl] = useState(iframeUrl || '');
  const [isValid, setIsValid] = useState(false);

  // Validate URL format
  const validateUrl = (urlString) => {
    if (!urlString) {
      setIsValid(false);
      return false;
    }

    try {
      const url = new URL(urlString);
      const valid = url.protocol === 'http:' || url.protocol === 'https:';
      setIsValid(valid);
      return valid;
    } catch (error) {
      setIsValid(false);
      return false;
    }
  };

  useEffect(() => {
    validateUrl(url);
  }, [url]);

  useEffect(() => {
    if (iframeUrl !== url) {
      setUrl(iframeUrl || '');
    }
  }, [iframeUrl]);

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    onIframeUrlChange(newUrl);
  };

  const handleRemove = () => {
    setUrl('');
    setIsValid(false);
    onRemoveIframe();
  };

  return (
    <div className="iframe-url-input">
      <div className="iframe-input-container">
        <div className="iframe-input-content">
          <div className="iframe-header">
            <label htmlFor="iframe-url" className="iframe-label">
              <Globe size={16} />
              Website URL
            </label>
            {isValid && url && (
              <div className="iframe-actions">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-secondary preview-url-btn"
                  title="URL openen in nieuw tabblad"
                >
                  <ExternalLink size={14} />
                  Voorbeeld
                </a>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="btn btn-sm btn-danger remove-iframe-btn"
                  title="Website verwijderen"
                >
                  Verwijderen
                </button>
              </div>
            )}
          </div>

          <input
            id="iframe-url"
            type="url"
            className={`iframe-url-field ${isValid ? 'valid' : url ? 'invalid' : ''}`}
            value={url}
            onChange={handleUrlChange}
            placeholder="https://example.com"
          />

          {url && (
            <div className="iframe-validation">
              {isValid ? (
                <div className="validation-success">
                  <CheckCircle size={16} />
                  <span>Geldige URL - Website wordt ingebed in een iframe</span>
                </div>
              ) : (
                <div className="validation-error">
                  <AlertCircle size={16} />
                  <span>Voer een geldige URL in die begint met http:// of https://</span>
                </div>
              )}
            </div>
          )}

          <div className="iframe-help">
            <p><strong>Let op:</strong> Sommige websites blokkeren inbedding in iframes vanwege beveiligingsbeleid (X-Frame-Options). Als een website niet laadt, wordt deze waarschijnlijk geblokkeerd door de website eigenaar.</p>
            <p><strong>Voorbeelden van inbedbare content:</strong></p>
            <ul>
              <li>Google Maps, Weer widgets, Nieuwssites</li>
              <li>Aangepaste web apps en dashboards</li>
              <li>Publieke datavisualisaties</li>
            </ul>
          </div>

          {isValid && url && (
            <div className="iframe-preview-container">
              <p className="preview-label">Voorbeeld:</p>
              <div className="iframe-preview-wrapper">
                <iframe
                  src={url}
                  title="Website voorbeeld"
                  className="iframe-preview"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default IframeUrlInput;

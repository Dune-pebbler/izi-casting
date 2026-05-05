import React, { useState } from "react";
import { X, Plus, Trash2, Sparkles, Type, Image } from "lucide-react";
import ImageLibraryModal from "./modal/ImageLibraryModal";

const ANIMATIONS = [
  { value: "fade-in", label: "Fade in" },
  { value: "slide-up", label: "Slide omhoog" },
  { value: "slide-down", label: "Slide omlaag" },
  { value: "slide-left", label: "Slide links" },
  { value: "slide-right", label: "Slide rechts" },
  { value: "zoom-in", label: "Zoom in" },
  { value: "bounce", label: "Bounce" },
];

const POSITIONS = [
  { value: "top-left", label: "↖" },
  { value: "top-center", label: "↑" },
  { value: "top-right", label: "↗" },
  { value: "center-left", label: "←" },
  { value: "center", label: "○" },
  { value: "center-right", label: "→" },
  { value: "bottom-left", label: "↙" },
  { value: "bottom-center", label: "↓" },
  { value: "bottom-right", label: "↘" },
];

function createEffect(type = "text") {
  const base = {
    id: `effect_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    animation: "fade-in",
    position: "center",
    delay: 0,
  };

  if (type === "text") {
    return {
      ...base,
      content: "Tekst effect",
      fontSize: 48,
      color: "#ffffff",
      bold: false,
      italic: false,
      background: true,
      backgroundColor: "#000000",
      backgroundOpacity: 45,
      exitAfter: 0,
    };
  }

  return {
    ...base,
    imageUrl: "",
    imageWidth: 200,
    imageRounded: false,
    exitAfter: 0,
  };
}

function SlideEffectsModal({ slide, onClose, onSave }) {
  const [effects, setEffects] = useState(
    (slide.effects || []).map((e) => ({ ...e })),
  );
  const [libraryTargetId, setLibraryTargetId] = useState(null);

  const addEffect = (type) => {
    setEffects((prev) => [...prev, createEffect(type)]);
  };

  const removeEffect = (id) => {
    setEffects((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEffect = (id, key, value) => {
    setEffects((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [key]: value } : e)),
    );
  };

  const handleSelectImage = (image) => {
    if (libraryTargetId) {
      updateEffect(libraryTargetId, "imageUrl", image.url);
    }
    setLibraryTargetId(null);
  };

  const handleSave = () => {
    onSave(effects);
    onClose();
  };

  return (
    <div className="slide-effects-modal">
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content slide-effects-modal__content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <div className="modal-header__title">
              <Sparkles size={18} />
              <h3>Slide effecten — {slide.name || "Slide"}</h3>
            </div>
            <button className="modal-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="modal-body slide-effects-modal__body">
            {effects.length === 0 && (
              <p className="slide-effects-modal__empty">
                Nog geen effecten toegevoegd. Klik hieronder op "Tekst" of
                "Afbeelding" om te beginnen.
              </p>
            )}

            {effects.map((effect, index) => (
              <div key={effect.id} className="slide-effects-modal__effect">
                <div className="slide-effects-modal__effect-header">
                  <div className="slide-effects-modal__effect-title">
                    {effect.type === "image" ? (
                      <Image size={14} />
                    ) : (
                      <Type size={14} />
                    )}
                    <span className="slide-effects-modal__effect-number">
                      Effect {index + 1} —{" "}
                      {effect.type === "image" ? "Afbeelding" : "Tekst"}
                    </span>
                  </div>
                  <button
                    className="btn-icon btn-icon--danger"
                    onClick={() => removeEffect(effect.id)}
                    title="Verwijder effect"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* ── TEXT fields ── */}
                {effect.type !== "image" && (
                  <>
                    <div className="slide-effects-modal__field">
                      <label>Tekst</label>
                      <input
                        type="text"
                        value={effect.content || ""}
                        onChange={(e) =>
                          updateEffect(effect.id, "content", e.target.value)
                        }
                        placeholder="Tekst inhoud..."
                      />
                    </div>

                    <div className="slide-effects-modal__row">
                      <div className="slide-effects-modal__field">
                        <label>Animatie</label>
                        <select
                          value={effect.animation}
                          onChange={(e) =>
                            updateEffect(effect.id, "animation", e.target.value)
                          }
                        >
                          {ANIMATIONS.map((a) => (
                            <option key={a.value} value={a.value}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="slide-effects-modal__field">
                        <label>Vertraging (s)</label>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          step="0.5"
                          value={effect.delay}
                          onChange={(e) =>
                            updateEffect(
                              effect.id,
                              "delay",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                        />
                      </div>

                      <div className="slide-effects-modal__field">
                        <label>Lettergrootte (px)</label>
                        <input
                          type="number"
                          min="12"
                          max="200"
                          step="4"
                          value={effect.fontSize}
                          onChange={(e) =>
                            updateEffect(
                              effect.id,
                              "fontSize",
                              parseInt(e.target.value) || 48,
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="slide-effects-modal__row">
                      <div className="slide-effects-modal__field">
                        <label>Kleur</label>
                        <div className="slide-effects-modal__color-row">
                          <input
                            type="color"
                            value={effect.color || "#ffffff"}
                            onChange={(e) =>
                              updateEffect(effect.id, "color", e.target.value)
                            }
                          />
                          <span className="slide-effects-modal__color-value">
                            {effect.color}
                          </span>
                        </div>
                      </div>

                      <div className="slide-effects-modal__field">
                        <label>Stijl</label>
                        <div className="slide-effects-modal__toggles">
                          <button
                            className={`btn-toggle ${effect.bold ? "btn-toggle--active" : ""}`}
                            onClick={() =>
                              updateEffect(effect.id, "bold", !effect.bold)
                            }
                          >
                            <strong>B</strong>
                          </button>
                          <button
                            className={`btn-toggle ${effect.italic ? "btn-toggle--active" : ""}`}
                            onClick={() =>
                              updateEffect(effect.id, "italic", !effect.italic)
                            }
                          >
                            <em>I</em>
                          </button>
                          <button
                            className={`btn-toggle ${effect.background ? "btn-toggle--active" : ""}`}
                            onClick={() =>
                              updateEffect(
                                effect.id,
                                "background",
                                !effect.background,
                              )
                            }
                            title="Achtergrond tonen"
                          >
                            BG
                          </button>
                          {effect.background && (
                            <input
                              type="color"
                              value={effect.backgroundColor || "#000000"}
                              onChange={(e) =>
                                updateEffect(
                                  effect.id,
                                  "backgroundColor",
                                  e.target.value,
                                )
                              }
                              title="Achtergrond kleur"
                              className="slide-effects-modal__bg-color"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {effect.background && (
                      <div className="slide-effects-modal__field">
                        <label>
                          Achtergrond doorzichtigheid (
                          {effect.backgroundOpacity ?? 45}%)
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={effect.backgroundOpacity ?? 45}
                          onChange={(e) =>
                            updateEffect(
                              effect.id,
                              "backgroundOpacity",
                              parseInt(e.target.value),
                            )
                          }
                        />
                      </div>
                    )}
                  </>
                )}

                {/* ── IMAGE fields ── */}
                {effect.type === "image" && (
                  <>
                    <div className="slide-effects-modal__field">
                      <label>Afbeelding</label>
                      <div className="slide-effects-modal__image-row">
                        {effect.imageUrl && (
                          <img
                            src={effect.imageUrl}
                            alt="Preview"
                            className="slide-effects-modal__image-preview"
                          />
                        )}
                        <div className="slide-effects-modal__image-inputs">
                          <input
                            type="text"
                            value={effect.imageUrl || ""}
                            onChange={(e) =>
                              updateEffect(
                                effect.id,
                                "imageUrl",
                                e.target.value,
                              )
                            }
                            placeholder="Afbeelding URL..."
                          />
                          <button
                            className="btn btn--secondary btn--sm"
                            onClick={() => setLibraryTargetId(effect.id)}
                          >
                            Kies uit bibliotheek
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="slide-effects-modal__row">
                      <div className="slide-effects-modal__field">
                        <label>Animatie</label>
                        <select
                          value={effect.animation}
                          onChange={(e) =>
                            updateEffect(effect.id, "animation", e.target.value)
                          }
                        >
                          {ANIMATIONS.map((a) => (
                            <option key={a.value} value={a.value}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="slide-effects-modal__field">
                        <label>Vertraging (s)</label>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          step="0.5"
                          value={effect.delay}
                          onChange={(e) =>
                            updateEffect(
                              effect.id,
                              "delay",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                        />
                      </div>

                      <div className="slide-effects-modal__field">
                        <label>Breedte (px)</label>
                        <input
                          type="number"
                          min="20"
                          max="1920"
                          step="10"
                          value={effect.imageWidth || 200}
                          onChange={(e) =>
                            updateEffect(
                              effect.id,
                              "imageWidth",
                              parseInt(e.target.value) || 200,
                            )
                          }
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* ── EXIT + POSITION (shared) ── */}
                <div className="slide-effects-modal__field">
                  <label>Verdwijnen na (s)</label>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    step="0.5"
                    value={effect.exitAfter || 0}
                    onChange={(e) =>
                      updateEffect(
                        effect.id,
                        "exitAfter",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                </div>

                <div className="slide-effects-modal__field">
                  <label>Positie</label>
                  <div className="slide-effects-modal__position-grid">
                    {POSITIONS.map((pos) => (
                      <button
                        key={pos.value}
                        className={`position-cell ${effect.position === pos.value ? "position-cell--active" : ""}`}
                        onClick={() =>
                          updateEffect(effect.id, "position", pos.value)
                        }
                        title={pos.value}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="modal-footer">
            <div className="slide-effects-modal__add-buttons">
              <button
                className="btn btn--secondary"
                onClick={() => addEffect("text")}
              >
                <Type size={14} />
                Tekst
              </button>
              <button
                className="btn btn--secondary"
                onClick={() => addEffect("image")}
              >
                <Image size={14} />
                Afbeelding
              </button>
            </div>
            <div className="modal-footer__right">
              <button className="btn btn--ghost" onClick={onClose}>
                Annuleren
              </button>
              <button className="btn btn--primary" onClick={handleSave}>
                Opslaan
              </button>
            </div>
          </div>
        </div>
      </div>

      <ImageLibraryModal
        isOpen={libraryTargetId !== null}
        onClose={() => setLibraryTargetId(null)}
        onSelectImage={handleSelectImage}
      />
    </div>
  );
}

export default SlideEffectsModal;

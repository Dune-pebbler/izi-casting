import React, { useState } from "react";
import { Editor } from "@tinymce/tinymce-react";
import {
  Trash2,
  Clock,
  Maximize2,
  Layout,
  ArrowLeftRight,
  Zap,
  Eye,
  EyeOff,
} from "lucide-react";
import LayoutSelector from "./LayoutSelector";
import ImageUpload from "./ImageUpload";
import PositionSelector from "./PositionSelector";
import TextEditor from "./TextEditor";
import VideoUrlInput from "./VideoUrlInput";
import TeletekstInput from "./TeletekstInput";
import IframeUrlInput from "./IframeUrlInput";
import GalleryInput from "./GalleryInput";
import CountdownInput from "./CountdownInput";
import AgendaInput from "./AgendaInput";
import EmailInput from "./EmailInput";

function EditModal({
  slide,
  slideTypes = {},
  modalImageUrl,
  modalTinyMCEContent,
  imagePosition,
  slideLayout,
  uploadingImage,
  slideName,
  slideDuration,
  showBar,
  videoUrl,
  imageSide,
  slideTransition,
  enabledFonts,
  typography,
  teletekstChannel,
  teletekstTheme,
  teletekstPageCount,
  teletekstSkipLines,
  iframeUrl,
  onClose,
  onSave,
  onDelete,
  onImageUpload,
  onPositionChange,
  onLayoutChange,
  onContentChange,
  onSlideNameChange,
  onDurationChange,
  onShowBarChange,
  onVideoUrlChange,
  onImageSideChange,
  onTransitionChange,
  onTeletekstChannelChange,
  onTeletekstThemeChange,
  onTeletekstPageCountChange,
  onTeletekstSkipLinesChange,
  onIframeUrlChange,
  onToggleSlideVisibility,
  onOpenLibrary,
  timeRestriction,
  onTimeRestrictionChange,
  galleryImages,
  onGalleryImageAdd,
  onGalleryImageRemove,
  onGalleryImageDurationChange,
  uploadingGalleryImage,
  onOpenGalleryLibrary,
  onGalleryReorder,
  countdownTitle,
  onCountdownTitleChange,
  countdownTargetDate,
  onCountdownTargetDateChange,
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
  onOpenCountdownLibrary,
  agendaCalendars,
  onAgendaCalendarsChange,
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
  emailProvider,
  onEmailProviderChange,
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
  const [timePopupOpen, setTimePopupOpen] = useState(false);

  const renderLayoutContent = () => {
    switch (slideLayout) {
      case "side-by-side":
        return (
          <>
            <div
              className={`slide-modal__body-left ${imageSide === "right" ? "flipped" : ""}`}
            >
              <ImageUpload
                imageUrl={modalImageUrl}
                uploadingImage={uploadingImage}
                onImageUpload={onImageUpload}
                onRemoveImage={() => onImageUpload(null)}
                showPositionSelector={true}
                imagePosition={imagePosition}
                onPositionChange={onPositionChange}
                onOpenLibrary={onOpenLibrary}
              />
            </div>

            <button
              className="slide-modal__flip-btn"
              onClick={() =>
                onImageSideChange(imageSide === "left" ? "right" : "left")
              }
              title="Flip image and text positions"
            >
              <ArrowLeftRight size={20} />
            </button>

            <div
              className={`slide-modal__body-right ${imageSide === "right" ? "flipped" : ""}`}
            >
              <div className="text-input-section">
                <TextEditor
                  content={modalTinyMCEContent}
                  onContentChange={onContentChange}
                  enabledFonts={enabledFonts}
                  typography={typography}
                />
              </div>
            </div>
          </>
        );

      case "image-only":
        return (
          <div className="slide-modal__full-image">
            <ImageUpload
              imageUrl={modalImageUrl}
              uploadingImage={uploadingImage}
              onImageUpload={onImageUpload}
              onRemoveImage={() => onImageUpload(null)}
              showPositionSelector={true}
              imagePosition={imagePosition}
              onPositionChange={onPositionChange}
              fullWidth={true}
              onOpenLibrary={onOpenLibrary}
            />
          </div>
        );

      case "text-over-image":
        return (
          <div className="slide-modal__text-over-image">
            <div className="slide-modal__image-background">
              <ImageUpload
                imageUrl={modalImageUrl}
                uploadingImage={uploadingImage}
                onImageUpload={onImageUpload}
                onRemoveImage={() => onImageUpload(null)}
                showPositionSelector={true}
                imagePosition={imagePosition}
                onPositionChange={onPositionChange}
                asBackground={true}
                onOpenLibrary={onOpenLibrary}
              />
            </div>

            <div className="slide-modal__text-overlay">
              <div className="text-input-section">
                <TextEditor
                  content={modalTinyMCEContent}
                  onContentChange={onContentChange}
                  enabledFonts={enabledFonts}
                  typography={typography}
                />
              </div>
            </div>
          </div>
        );

      case "text-only":
        return (
          <div className="slide-modal__text-only">
            <div className="text-input-section-full">
              <TextEditor
                content={modalTinyMCEContent}
                onContentChange={onContentChange}
                enabledFonts={enabledFonts}
              />
            </div>
          </div>
        );

      case "video":
        return (
          <div className="modal-video">
            <div className="video-input-section">
              <VideoUrlInput
                videoUrl={videoUrl}
                onVideoUrlChange={onVideoUrlChange}
                onRemoveVideo={() => onVideoUrlChange("")}
                onDurationChange={onDurationChange}
              />
            </div>
          </div>
        );

      case "teletekst":
        return (
          <div className="modal-teletekst">
            <div className="teletekst-input-section">
              <TeletekstInput
                channel={teletekstChannel}
                theme={teletekstTheme}
                pageCount={teletekstPageCount}
                skipLines={teletekstSkipLines}
                onChannelChange={onTeletekstChannelChange}
                onThemeChange={onTeletekstThemeChange}
                onPageCountChange={onTeletekstPageCountChange}
                onSkipLinesChange={onTeletekstSkipLinesChange}
              />
            </div>
          </div>
        );

      case "iframe":
        return (
          <div className="modal-iframe">
            <div className="iframe-input-section">
              <IframeUrlInput
                iframeUrl={iframeUrl}
                onIframeUrlChange={onIframeUrlChange}
                onRemoveIframe={() => onIframeUrlChange("")}
              />
            </div>
          </div>
        );

      case "gallery":
        return (
          <div className="modal-gallery">
            <GalleryInput
              images={galleryImages || []}
              onAddImage={onGalleryImageAdd}
              onRemoveImage={onGalleryImageRemove}
              onDurationChange={onGalleryImageDurationChange}
              uploading={uploadingGalleryImage}
              onOpenLibrary={onOpenGalleryLibrary}
              onReorder={onGalleryReorder}
            />
          </div>
        );

      case "countdown":
        return (
          <div className="modal-countdown">
            <CountdownInput
              countdownTitle={countdownTitle}
              onCountdownTitleChange={onCountdownTitleChange}
              countdownTargetDate={countdownTargetDate}
              onCountdownTargetDateChange={onCountdownTargetDateChange}
              countdownBgImage={countdownBgImage}
              onCountdownBgImageUpload={onCountdownBgImageUpload}
              countdownBgImagePosition={countdownBgImagePosition}
              onCountdownBgImagePositionChange={
                onCountdownBgImagePositionChange
              }
              countdownTextColor={countdownTextColor}
              onCountdownTextColorChange={onCountdownTextColorChange}
              countdownNumberColor={countdownNumberColor}
              onCountdownNumberColorChange={onCountdownNumberColorChange}
              countdownBlockBg={countdownBlockBg}
              onCountdownBlockBgChange={onCountdownBlockBgChange}
              countdownLabelColor={countdownLabelColor}
              onCountdownLabelColorChange={onCountdownLabelColorChange}
              uploadingImage={uploadingImage}
              onOpenLibrary={onOpenCountdownLibrary}
            />
          </div>
        );

      case "agenda":
        return (
          <div className="modal-agenda">
            <AgendaInput
              agendaCalendars={agendaCalendars}
              onCalendarsChange={onAgendaCalendarsChange}
              agendaTitle={agendaTitle}
              onAgendaTitleChange={onAgendaTitleChange}
              agendaDaysAhead={agendaDaysAhead}
              onAgendaDaysAheadChange={onAgendaDaysAheadChange}
              agendaMaxEvents={agendaMaxEvents}
              onAgendaMaxEventsChange={onAgendaMaxEventsChange}
              agendaBgColor={agendaBgColor}
              onAgendaBgColorChange={onAgendaBgColorChange}
              agendaTextColor={agendaTextColor}
              onAgendaTextColorChange={onAgendaTextColorChange}
            />
          </div>
        );

      case "email":
        return (
          <div className="modal-email">
            <EmailInput
              emailCredentials={emailCredentials}
              onEmailCredentialsChange={onEmailCredentialsChange}
              emailMaxItems={emailMaxItems}
              onEmailMaxItemsChange={onEmailMaxItemsChange}
              emailShowUnreadOnly={emailShowUnreadOnly}
              onEmailShowUnreadOnlyChange={onEmailShowUnreadOnlyChange}
              emailBgColor={emailBgColor}
              onEmailBgColorChange={onEmailBgColorChange}
              emailTextColor={emailTextColor}
              onEmailTextColorChange={onEmailTextColorChange}
              emailAccentColor={emailAccentColor}
              onEmailAccentColorChange={onEmailAccentColorChange}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="slide-modal">
      <div className="slide-modal__overlay" onClick={onClose}>
        <div
          className="slide-modal__content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="slide-modal__header">
            <div className="slide-modal__header-left">
              <div className="slide-modal__name-input-container">
                <input
                  type="text"
                  className="slide-modal__name-input"
                  value={slideName || ""}
                  onChange={(e) => onSlideNameChange(e.target.value)}
                  placeholder="Enter slide name..."
                  maxLength={50}
                />
              </div>
              <div className="slide-modal__duration-container">
                <label htmlFor="slide-duration">
                  <Clock size={16} />
                </label>
                <div className="slide-modal__duration-wrapper">
                  <input
                    id="slide-duration"
                    type="number"
                    className="slide-modal__duration-input"
                    value={slideDuration || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "") {
                        onDurationChange("");
                      } else {
                        const numValue = parseInt(value);
                        onDurationChange(isNaN(numValue) ? 5 : numValue);
                      }
                    }}
                    min="0"
                    step="1"
                    disabled={slideLayout === "gallery"}
                    title={
                      slideLayout === "gallery"
                        ? "Automatisch berekend op basis van foto-duraties"
                        : undefined
                    }
                  />
                  <span className="slide-modal__duration-suffix">s</span>
                </div>
              </div>
              <div className="slide-modal__showbar-container">
                <div
                  className={`slide-modal__showbar-slider ${showBar ? "active" : ""}`}
                  onClick={() => onShowBarChange(!showBar)}
                  title={showBar ? "Fullscreen mode" : "Two-bar layout mode"}
                >
                  <div className="slider-track">
                    <div className="slider-thumb"></div>
                  </div>
                  <div className="slider-icons">
                    <Maximize2 size={16} className="icon-fullscreen" />
                    <Layout size={16} className="icon-layout" />
                  </div>
                </div>
              </div>
              <div className="slide-modal__transition-container">
                <label htmlFor="slide-transition">
                  <Zap size={16} />
                </label>
                <select
                  id="slide-transition"
                  className="slide-modal__transition-select"
                  value={slideTransition || "fade"}
                  onChange={(e) => onTransitionChange(e.target.value)}
                  title="Select slide transition effect"
                >
                  <option value="fade">Fade</option>
                  <option value="slide-left">Slide Left</option>
                  <option value="slide-right">Slide Right</option>
                  <option value="slide-up">Slide Up</option>
                  <option value="slide-down">Slide Down</option>
                  <option value="zoom-in">Zoom In</option>
                  <option value="zoom-out">Zoom Out</option>
                  <option value="flip-horizontal">Flip Horizontal</option>
                  <option value="flip-vertical">Flip Vertical</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>

            <div className="slide-modal__header-center">
              <LayoutSelector
                currentLayout={slideLayout}
                onLayoutChange={onLayoutChange}
                slideTypes={slideTypes}
              />
            </div>

            <div className="slide-modal__header-actions">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSlideVisibility(slide.id);
                }}
                className={`btn-icon btn-icon--time ${slide.isVisible ? "btn-icon--success" : ""}`}
                title="Toggle slide"
              >
                {slide.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>

              <div className="slide-modal__time-popup-wrapper">
                <button
                  className={`btn-icon btn-icon--time ${timeRestriction?.enabled ? "btn-icon--success" : ""}`}
                  title="Tijdvenster instellen"
                  onClick={() => setTimePopupOpen(!timePopupOpen)}
                >
                  <Clock size={16} />
                </button>
                {timePopupOpen && (
                  <div className="slide-modal__time-popup">
                    <div className="time-popup__header">
                      <span>Tijdvenster</span>
                      <button
                        className="time-popup__close"
                        onClick={() => setTimePopupOpen(false)}
                      >
                        ✕
                      </button>
                    </div>
                    <label className="time-popup__toggle">
                      <input
                        type="checkbox"
                        checked={timeRestriction?.enabled || false}
                        onChange={(e) =>
                          onTimeRestrictionChange({
                            ...timeRestriction,
                            enabled: e.target.checked,
                          })
                        }
                      />
                      <span>Tijdvenster inschakelen</span>
                    </label>
                    {timeRestriction?.enabled && (
                      <div className="time-popup__inputs">
                        <div className="time-popup__row">
                          <div className="time-popup__field">
                            <label>Van</label>
                            <input
                              type="time"
                              value={timeRestriction.startTime || "08:00"}
                              onChange={(e) =>
                                onTimeRestrictionChange({
                                  ...timeRestriction,
                                  startTime: e.target.value,
                                })
                              }
                              className="time-popup__time-input"
                            />
                          </div>
                          <div className="time-popup__field">
                            <label>Tot</label>
                            <input
                              type="time"
                              value={timeRestriction.endTime || "17:00"}
                              onChange={(e) =>
                                onTimeRestrictionChange({
                                  ...timeRestriction,
                                  endTime: e.target.value,
                                })
                              }
                              className="time-popup__time-input"
                            />
                          </div>
                        </div>
                        {timeRestriction.startTime >
                          timeRestriction.endTime && (
                          <p className="time-popup__midnight-note">
                            ↻ Loopt over middernacht
                          </p>
                        )}

                        <div className="time-popup__date-section">
                          <small>Datumvenster (optioneel)</small>
                          <div className="time-popup__field">
                            <label>Vanaf</label>
                            <input
                              type="date"
                              value={timeRestriction.startDate || ""}
                              onChange={(e) =>
                                onTimeRestrictionChange({
                                  ...timeRestriction,
                                  startDate: e.target.value,
                                })
                              }
                              className="time-popup__time-input"
                            />
                          </div>
                          <div className="time-popup__field">
                            <label>Tot en met</label>
                            <input
                              type="date"
                              value={timeRestriction.endDate || ""}
                              onChange={(e) =>
                                onTimeRestrictionChange({
                                  ...timeRestriction,
                                  endDate: e.target.value,
                                })
                              }
                              className="time-popup__time-input"
                            />
                          </div>
                          {timeRestriction.startDate && timeRestriction.endDate && timeRestriction.startDate > timeRestriction.endDate && (
                            <p className="time-popup__midnight-note">
                              ⚠ Einddatum ligt voor de startdatum
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  console.log("Delete button clicked");
                  onDelete();
                }}
                className="btn-icon btn-icon--danger"
                title="Delete slide"
              >
                <Trash2 size={16} />
              </button>
              <button onClick={onClose} className="btn btn-secondary">
                Close
              </button>
              <button onClick={onSave} className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </div>

          <div className="slide-modal__body">{renderLayoutContent()}</div>

          <div className="slide-modal__mobile-footer">
            <button
              onClick={() => {
                onDelete();
              }}
              className="btn-icon btn-icon--danger slide-modal__mobile-footer-delete"
              title="Slide verwijderen"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={onSave}
              className="btn btn-primary slide-modal__mobile-footer-save"
            >
              Opslaan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditModal;

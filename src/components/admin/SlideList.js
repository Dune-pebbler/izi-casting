import React, { useMemo, useCallback, useState } from "react";
import {
  Copy,
  GripVertical,
  Eye,
  EyeOff,
  Plus,
  ChevronsUpDown,
  Play,
  Tv,
  Trash2,
  Globe,
  Clock,
  Images,
  LayoutGrid,
  FileText,
  LucideImage,
  MoreVertical,
} from "lucide-react";

const iconMap = {
  video: <Play />,
  iframe: <Globe />,
  "side-by-side": <LayoutGrid />,
  "text-only": <FileText />,
  "image-only": <LucideImage />,
  teletekst: <Tv />,
  gallery: <Images />,
  // Voeg hier makkelijk nieuwe types toe in de toekomst
};
import { sanitizeHTMLContent } from "../../utils/sanitize";
import { extractVideoInfo } from "../../utils/videoMetadata";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SlideList({
  slides,
  layout = "grid",
  onEditSlide,
  onUpdateSlideType,
  onToggleSlideVisibility,
  onConfirmDeleteSlide,
  onRemoveSlide,
  onImageUpload,
  onRemoveImage,
  uploadingImage,
  onCopySlide,
  onReorderSlides,
  onAddSlide,
  onMoveSlide,
}) {
  // Function to strip HTML tags and get clean text
  const stripHtml = (html) => {
    if (!html) return "";
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  // Function to get preview text with proper truncation
  const getPreviewText = (htmlContent, maxLength = 100) => {
    const cleanText = stripHtml(htmlContent);
    if (cleanText.length > maxLength) {
      return `${cleanText.substring(0, maxLength)}...`;
    }
    return cleanText;
  };

  // Function to get rich HTML content for preview
  const getPreviewHTML = (htmlContent, maxLength = 100) => {
    if (!htmlContent || typeof htmlContent !== "string") return "";

    // First get the clean text to check length
    const cleanText = stripHtml(htmlContent);
    if (cleanText.length <= maxLength) {
      return htmlContent;
    }

    // If content is too long, we need to truncate while preserving HTML structure
    // This is a more sophisticated approach that tries to preserve formatting
    try {
      const tmp = document.createElement("div");
      tmp.innerHTML = htmlContent;

      // Function to recursively truncate text content while preserving HTML structure
      const truncateNode = (node, remainingLength) => {
        if (remainingLength <= 0) return 0;

        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent;
          if (text.length <= remainingLength) {
            return remainingLength - text.length;
          } else {
            node.textContent = text.substring(0, remainingLength) + "...";
            return 0;
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          // Process child nodes
          for (let i = 0; i < node.childNodes.length; i++) {
            const child = node.childNodes[i];
            remainingLength = truncateNode(child, remainingLength);
            if (remainingLength <= 0) break;
          }
          return remainingLength;
        }

        return remainingLength;
      };

      // Clone the content to avoid modifying the original
      const clonedContent = tmp.cloneNode(true);
      truncateNode(clonedContent, maxLength);

      return clonedContent.innerHTML;
    } catch (error) {
      console.warn("Error processing HTML for preview:", error);
      // Fallback to simple text truncation
      return cleanText.substring(0, maxLength) + "...";
    }
  };

  // SortableSlideCard component
  const SortableSlideCard = ({ slide, index }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: slide.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const renderSlidePreview = (slide) => {
      const layout = slide.layout || "side-by-side";
      const type = slide.type || "text";

      switch (layout) {
        case "image-only":
          return (
            <div className="slide-preview slide-preview--image-only">
              {slide.imageUrl ? (
                <img
                  src={slide.imageUrl}
                  alt="Slide"
                  className="slide-preview__image"
                  style={{
                    objectPosition: slide.imagePosition || "center",
                  }}
                />
              ) : (
                <div className="placeholder">
                  <div className="placeholder__icon">🖼️</div>
                  <span className="placeholder__text">No image</span>
                </div>
              )}
            </div>
          );

        case "text-only":
          return (
            <div className="slide-preview slide-preview--text-only">
              {slide.text || slide.tinyMCEContent ? (
                <div
                  className="preview-text-content"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHTMLContent(
                      getPreviewHTML(slide.tinyMCEContent || slide.text, 100),
                    ),
                  }}
                />
              ) : (
                <div className="placeholder">
                  <div className="placeholder__icon">📝</div>
                  <span className="placeholder__text">No text</span>
                </div>
              )}
            </div>
          );

        case "text-over-image":
          return (
            <div className="slide-preview slide-preview--text-over-image">
              {slide.imageUrl ? (
                <div className="preview-image-background">
                  <img
                    src={slide.imageUrl}
                    alt="Slide"
                    className="slide-preview__image"
                    style={{
                      objectPosition: slide.imagePosition || "center",
                    }}
                  />
                  <div className="preview-text-overlay">
                    {slide.text || slide.tinyMCEContent ? (
                      <div
                        className="preview-text-content"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHTMLContent(
                            getPreviewHTML(
                              slide.tinyMCEContent || slide.text,
                              50,
                            ),
                          ),
                        }}
                      />
                    ) : (
                      <span>No text</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="placeholder">
                  <div className="placeholder__icon">🖼️</div>
                  <span className="placeholder__text">No image</span>
                </div>
              )}
            </div>
          );

        case "video":
          const videoInfo = slide.videoUrl
            ? extractVideoInfo(slide.videoUrl)
            : null;
          const getVideoThumbnailUrl = () => {
            if (!videoInfo) return "";
            if (videoInfo.type === "youtube") {
              return `https://img.youtube.com/vi/${videoInfo.id}/maxresdefault.jpg`;
            } else if (videoInfo.type === "vimeo") {
              return `https://vumbnail.com/${videoInfo.id}.jpg`;
            }
            return "";
          };

          return (
            <div className="slide-preview slide-preview--video">
              {slide.videoUrl && videoInfo ? (
                <div className="preview-video-container">
                  <img
                    src={getVideoThumbnailUrl()}
                    alt="Video thumbnail"
                    className="preview-video-thumbnail"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                  <div className="preview-video-overlay">
                    <Play size={24} />
                  </div>
                  <div className="preview-video-info">
                    <span
                      className={`video-platform ${videoInfo.type === "vimeo" ? "vimeo" : ""}`}
                    >
                      {videoInfo.type === "youtube" ? "YouTube" : "Vimeo"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="placeholder">
                  <div className="placeholder__icon">🎥</div>
                  <span className="placeholder__text">No video URL</span>
                </div>
              )}
            </div>
          );

        case "teletekst":
          return (
            <div className="slide-preview slide-preview--teletekst">
              {slide.teletekstChannel ? (
                <div className="preview-teletekst-container">
                  <div className="preview-teletekst-icon">
                    <Tv size={48} />
                  </div>
                  <div className="preview-teletekst-info">
                    <span className="teletekst-label">NOS Teletekst</span>
                    <span className="teletekst-channel">
                      Pagina {slide.teletekstChannel}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="placeholder">
                  <div className="placeholder__icon">
                    <Tv size={24} />
                  </div>
                  <span className="placeholder__text">
                    No teletekst channel
                  </span>
                </div>
              )}
            </div>
          );

        case "iframe":
          return (
            <div className="slide-preview slide-preview--iframe">
              {slide.iframeUrl ? (
                <div className="preview-iframe-container">
                  <div className="preview-iframe-icon">
                    <Globe size={48} />
                  </div>
                  <div className="preview-iframe-info">
                    <span className="iframe-label">Website</span>
                    <span className="iframe-url">{slide.iframeUrl}</span>
                  </div>
                </div>
              ) : (
                <div className="placeholder">
                  <div className="placeholder__icon">
                    <Globe size={24} />
                  </div>
                  <span className="placeholder__text">Geen website URL</span>
                </div>
              )}
            </div>
          );

        case "gallery": {
          const images = slide.images || [];
          const shown = images.slice(0, 4);
          const extra = images.length - 4;
          return (
            <div className="slide-preview slide-preview--gallery">
              {images.length === 0 ? (
                <div className="placeholder">
                  <div className="placeholder__icon">
                    <LucideImage size={24} />
                  </div>
                  <span className="placeholder__text">Geen foto's</span>
                </div>
              ) : (
                <div
                  className={`gallery-preview gallery-preview--${Math.min(images.length, 4)}`}
                >
                  {shown.map((img, i) => (
                    <div key={img.id} className="gallery-preview__cell">
                      <img
                        src={img.url}
                        alt={img.name}
                        className="gallery-preview__img"
                      />
                      {i === 3 && extra > 0 && (
                        <div className="gallery-preview__more">+{extra}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        case "side-by-side":
        default:
          return (
            <div className="slide-preview slide-preview--side-by-side">
              <div
                className={`preview-left ${slide.imageSide === "right" ? "flipped" : ""}`}
              >
                {slide.imageUrl ? (
                  <img
                    src={slide.imageUrl}
                    alt="Slide"
                    className="slide-preview__image"
                    style={{
                      objectPosition: slide.imagePosition || "center",
                    }}
                  />
                ) : (
                  <div className="placeholder">
                    <div className="placeholder__icon">🖼️</div>
                  </div>
                )}
              </div>
              <div
                className={`preview-right ${slide.imageSide === "right" ? "flipped" : ""}`}
              >
                {slide.text || slide.tinyMCEContent ? (
                  <div
                    className="preview-text-content"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHTMLContent(
                        getPreviewHTML(slide.tinyMCEContent || slide.text, 80),
                      ),
                    }}
                  />
                ) : (
                  <div className="placeholder">
                    <div className="placeholder__icon">📝</div>
                  </div>
                )}
              </div>
            </div>
          );
      }
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`slide-card ${isDragging ? "dragging" : ""}`}
        onClick={() => onEditSlide(slide)}
      >
        <div className="slide-card__header">
          <div
            className="slide-card__header-left"
            {...attributes}
            {...listeners}
          >
            <div className="drag-handle">
              <GripVertical size={18} />
            </div>
            <h4 className="slide-card__title">
              {slide.name || `Slide ${index + 1}`}
            </h4>
            <div className="slide-card__duration">
              <span className="duration-value">{slide.duration || 5}s</span>
            </div>
          </div>
          <div className="slide-card__actions">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveSlide(slide);
              }}
              className="btn-icon"
              title="Move to other playlist"
            >
              <ChevronsUpDown size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopySlide(slide);
              }}
              className="btn-icon"
              title="Copy slide"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConfirmDeleteSlide(slide);
              }}
              className="btn-icon btn-icon--danger"
              title="Delete slide"
            >
              <Trash2 size={16} />
            </button>

            <span
              className={`btn-icon btn-icon--time ${slide.timeRestriction?.enabled ? "btn-icon--success" : ""}`}
              title={`Tijdvenster: ${slide.timeRestriction?.startTime} – ${slide.timeRestriction?.endTime}`}
            >
              <Clock size={16} />
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSlideVisibility(slide.id);
              }}
              className={`btn-icon ${slide.isVisible ? "btn-icon--success" : ""}`}
              title={slide.isVisible ? "Hide slide" : "Show slide"}
            >
              {slide.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        </div>

        <div className="slide-card__preview">{renderSlidePreview(slide)}</div>
      </div>
    );
  };

  // SortableSlideRow component for list view
  const SortableSlideRow = ({ slide, index }) => {
    const [actionsOpen, setActionsOpen] = useState(false);
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: slide.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const getPlaceholderIcon = (layout) => {
      // Return het specifieke icoon, of een standaard icoon als fallback
      return iconMap[layout] || "Geen Icon";
    };

    const getSlideTypeLabel = (slide) => {
      const layout = slide.layout || "side-by-side";
      switch (layout) {
        case "image-only":
          return "Image Only";
        case "text-only":
          return "Text Only";
        case "text-over-image":
          return "Text Over Image";
        case "video":
          return "Video";
        case "teletekst":
          return `Teletekst ${slide.teletekstChannel || ""}`;
        case "iframe":
          return "Website";
        case "side-by-side":
        default:
          return "Side by Side";
      }
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={[
          `slide-row ${isDragging ? "dragging" : ""}`,
          slide.isVisible ? " mobile-green" : " mobile-red",
        ]}
        onClick={() => onEditSlide(slide)}
      >
        <div className="slide-row__left" {...attributes} {...listeners}>
          <div className="drag-handle">
            <GripVertical size={18} />
          </div>
        </div>

        <div
          className="slide-preview slide-preview--image-only"
          style={{
            height: "50px",
            width: "50px",
          }}
        >
          {slide.imageUrl ? (
            <img
              src={slide.imageUrl}
              alt="Slide"
              className="slide-preview__image"
              style={{
                objectPosition: slide.imagePosition || "center",
              }}
            />
          ) : (
            <div className="slide-img-placeholder">
              {getPlaceholderIcon(slide.layout)}
            </div>
          )}
        </div>

        <div className="slide-row__content">
          <h4 className="slide-row__title">
            {slide.name || `Slide ${index + 1}`}
          </h4>
          <div className="slide-row__info">
            <span className="slide-row__type">{getSlideTypeLabel(slide)}</span>
            <span className="slide-row__duration">{slide.duration || 5}s</span>
          </div>
        </div>
        <div className="slide-row__actions">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveSlide(slide);
            }}
            className="btn-icon"
            title="Move to other playlist"
          >
            <ChevronsUpDown size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopySlide(slide);
            }}
            className="btn-icon"
            title="Copy slide"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConfirmDeleteSlide(slide);
            }}
            className="btn-icon btn-icon--danger"
            title="Delete slide"
          >
            <Trash2 size={16} />
          </button>

          <span
            className={`btn-icon btn-icon--time ${slide.timeRestriction?.enabled ? "btn-icon--success" : ""}`}
            title={`Tijdvenster: ${slide.timeRestriction?.startTime} – ${slide.timeRestriction?.endTime}`}
          >
            <Clock size={16} />
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSlideVisibility(slide.id);
            }}
            className={`btn-icon ${slide.isVisible ? "btn-icon--success" : ""}`}
            title={slide.isVisible ? "Hide slide" : "Show slide"}
          >
            {slide.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setActionsOpen((o) => !o);
            }}
            className={`btn-icon slide-row__mobile-toggle${actionsOpen ? " active" : ""}`}
            title="Meer acties"
          >
            <MoreVertical size={16} />
          </button>
        </div>

        {actionsOpen && (
          <div
            className="slide-row__actions-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveSlide(slide);
                setActionsOpen(false);
              }}
              className="btn-icon slide-row__actions-panel-btn"
            >
              <ChevronsUpDown size={16} />
              <span>Verplaatsen</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopySlide(slide);
                setActionsOpen(false);
              }}
              className="btn-icon slide-row__actions-panel-btn"
            >
              <Copy size={16} />
              <span>Kopiëren</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSlideVisibility(slide.id);
                setActionsOpen(false);
              }}
              className={`btn-icon slide-row__actions-panel-btn${slide.isVisible ? " btn-icon--success" : ""}`}
            >
              {slide.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
              <span>{slide.isVisible ? "Verbergen" : "Tonen"}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditSlide(slide);
                setActionsOpen(false);
              }}
              className={`btn-icon slide-row__actions-panel-btn${slide.timeRestriction?.enabled ? " btn-icon--success" : ""}`}
            >
              <Clock size={16} />
              <span>Tijdvenster</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConfirmDeleteSlide(slide);
                setActionsOpen(false);
              }}
              className="btn-icon btn-icon--danger slide-row__actions-panel-btn"
            >
              <Trash2 size={16} />
              <span>Verwijderen</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const slideIds = useMemo(() => slides.map((slide) => slide.id), [slides]);

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      console.log("Drag end:", { active, over });

      if (active.id !== over?.id) {
        const oldIndex = slides.findIndex((slide) => slide.id === active.id);
        const newIndex = slides.findIndex((slide) => slide.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newSlides = arrayMove(slides, oldIndex, newIndex);
          onReorderSlides(newSlides);
        }
      }
    },
    [slides, onReorderSlides],
  );

  const handleDragStart = useCallback((event) => {
    console.log("Drag start:", event);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={slideIds} strategy={verticalListSortingStrategy}>
        {layout === "list" ? (
          <div className="slides-list">
            {slides.map((slide, index) => (
              <SortableSlideRow key={slide.id} slide={slide} index={index} />
            ))}

            {/* Add Slide Button */}
            {onAddSlide && (
              <div className="add-button add-button--list" onClick={onAddSlide}>
                <div className="add-button__content">
                  <Plus size={24} />
                  <span>Add Slide</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="slides-grid">
            {slides.map((slide, index) => (
              <SortableSlideCard key={slide.id} slide={slide} index={index} />
            ))}

            {/* Add Slide Button */}
            {onAddSlide && (
              <div className="add-button" onClick={onAddSlide}>
                <div className="add-button__content">
                  <Plus size={24} />
                  <span>Add Slide</span>
                </div>
              </div>
            )}
          </div>
        )}
      </SortableContext>
    </DndContext>
  );
}

export default SlideList;

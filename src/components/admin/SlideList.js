import React, { useMemo, useCallback } from 'react';
import { Copy, GripVertical, Eye, EyeOff, Plus, ChevronsUpDown } from 'lucide-react';
import { sanitizeHTMLContent } from '../../utils/sanitize';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SlideList({ 
  slides, 
  onEditSlide, 
  onUpdateSlideType, 
  onToggleSlideVisibility, 
  onRemoveSlide, 
  onImageUpload, 
  onRemoveImage, 
  uploadingImage,
  onCopySlide,
  onReorderSlides,
  onAddSlide,
  onMoveSlide
}) {
  // Function to strip HTML tags and get clean text
  const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
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
    if (!htmlContent || typeof htmlContent !== 'string') return '';
    
    // First get the clean text to check length
    const cleanText = stripHtml(htmlContent);
    if (cleanText.length <= maxLength) {
      return htmlContent;
    }
    
    // If content is too long, we need to truncate while preserving HTML structure
    // This is a more sophisticated approach that tries to preserve formatting
    try {
      const tmp = document.createElement('div');
      tmp.innerHTML = htmlContent;
      
      // Function to recursively truncate text content while preserving HTML structure
      const truncateNode = (node, remainingLength) => {
        if (remainingLength <= 0) return 0;
        
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent;
          if (text.length <= remainingLength) {
            return remainingLength - text.length;
          } else {
            node.textContent = text.substring(0, remainingLength) + '...';
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
      console.warn('Error processing HTML for preview:', error);
      // Fallback to simple text truncation
      return cleanText.substring(0, maxLength) + '...';
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
      const layout = slide.layout || 'side-by-side';
      const type = slide.type || 'text';

      switch (layout) {
        case 'image-only':
          return (
            <div className="slide-preview-image-only">
              {slide.imageUrl ? (
                <img src={slide.imageUrl} alt="Slide" className="preview-image" />
              ) : (
                <div className="preview-placeholder">
                  <div className="placeholder-icon">🖼️</div>
                  <span>No image</span>
                </div>
              )}
            </div>
          );

        case 'text-only':
          return (
            <div className="slide-preview-text-only">
              {slide.text || slide.tinyMCEContent ? (
                <div 
                  className="preview-text-content"
                  dangerouslySetInnerHTML={{ 
                    __html: sanitizeHTMLContent(getPreviewHTML(slide.tinyMCEContent || slide.text, 100))
                  }}
                />
              ) : (
                <div className="preview-placeholder">
                  <div className="placeholder-icon">📝</div>
                  <span>No text</span>
                </div>
              )}
            </div>
          );

        case 'text-over-image':
          return (
            <div className="slide-preview-text-over-image">
              {slide.imageUrl ? (
                <div className="preview-image-background">
                  <img src={slide.imageUrl} alt="Slide" className="preview-image" />
                  <div className="preview-text-overlay">
                    {slide.text || slide.tinyMCEContent ? (
                      <div 
                        className="preview-text-content"
                        dangerouslySetInnerHTML={{ 
                          __html: sanitizeHTMLContent(getPreviewHTML(slide.tinyMCEContent || slide.text, 50))
                        }}
                      />
                    ) : (
                      <span>No text</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="preview-placeholder">
                  <div className="placeholder-icon">🖼️</div>
                  <span>No image</span>
                </div>
              )}
            </div>
          );

        case 'side-by-side':
        default:
          return (
            <div className="slide-preview-side-by-side">
              <div className="preview-left">
                {slide.imageUrl ? (
                  <img src={slide.imageUrl} alt="Slide" className="preview-image" />
                ) : (
                  <div className="preview-placeholder">
                    <div className="placeholder-icon">🖼️</div>
                  </div>
                )}
              </div>
              <div className="preview-right">
                {slide.text || slide.tinyMCEContent ? (
                  <div 
                    className="preview-text-content"
                    dangerouslySetInnerHTML={{ 
                      __html: sanitizeHTMLContent(getPreviewHTML(slide.tinyMCEContent || slide.text, 80))
                    }}
                  />
                ) : (
                  <div className="preview-placeholder">
                    <div className="placeholder-icon">📝</div>
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
        className={`slide-card ${isDragging ? 'dragging' : ''}`}
        onClick={() => onEditSlide(slide)}
      >
        <div className="slide-card-header">
          <div className="slide-header-left" {...attributes} {...listeners}>
            <div className="drag-handle">
              <GripVertical size={18} />
            </div>
            <h4 className="slide-title">{slide.name || `Slide ${index + 1}`}</h4>
            <div className="slide-duration-display">
              <span className="duration-value">{slide.duration || 5}s</span>
            </div>
          </div>
          <div className="slide-header-actions">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveSlide(slide);
              }}
              className="move-slide-btn"
              title="Move to other playlist"
            >
              <ChevronsUpDown size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopySlide(slide);
              }}
              className="copy-slide-btn"
              title="Copy slide"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSlideVisibility(slide.id);
              }}
              className={`status-toggle-btn ${slide.isVisible ? 'visible' : 'hidden'}`}
              title={slide.isVisible ? 'Hide slide' : 'Show slide'}
            >
              {slide.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        </div>
        
        <div className="slide-preview-container">
          {renderSlidePreview(slide)}
        </div>
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
    })
  );

  const slideIds = useMemo(() => slides.map(slide => slide.id), [slides]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    console.log('Drag end:', { active, over });

    if (active.id !== over?.id) {
      const oldIndex = slides.findIndex(slide => slide.id === active.id);
      const newIndex = slides.findIndex(slide => slide.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newSlides = arrayMove(slides, oldIndex, newIndex);
        onReorderSlides(newSlides);
      }
    }
  }, [slides, onReorderSlides]);

  const handleDragStart = useCallback((event) => {
    console.log('Drag start:', event);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={slideIds} strategy={verticalListSortingStrategy}>
        <div className="slides-grid">
          {slides.map((slide, index) => (
            <SortableSlideCard key={slide.id} slide={slide} index={index} />
          ))}
          
          {/* Add Slide Button */}
          {onAddSlide && (
            <div className="add-slide-button" onClick={onAddSlide}>
              <div className="add-slide-content">
                <Plus size={24} />
                <span>Add Slide</span>
              </div>
            </div>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export default SlideList;

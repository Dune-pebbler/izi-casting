import React, { useState, useEffect } from "react";
import { sanitizeHTMLContent } from "../../utils/sanitize";
import TextPagination from "./TextPagination";
import VideoPlayer from "./VideoPlayer";
import { getTextPaginationConfig } from "../../config/textPagination";

function SlideDisplay({ currentSlide, slideLayout, nextSlide, nextSlideLayout }) {
  // Get configuration for the current layout
  const textConfig = getTextPaginationConfig(slideLayout);
  const shouldUsePagination = textConfig !== null;
  
  // Transition state
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionType, setTransitionType] = useState(null);
  const [displaySlide, setDisplaySlide] = useState(currentSlide);
  const [displayLayout, setDisplayLayout] = useState(slideLayout);

  // Handle slide changes and transitions
  useEffect(() => {
    if (currentSlide && currentSlide.id !== displaySlide?.id) {
      const transition = currentSlide.transition || 'slide-left';
      
      if ((transition === 'slide-left' || transition === 'slide-right' || transition === 'fade') && nextSlide) {
        // Start transition
        setIsTransitioning(true);
        setTransitionType(transition);
        
        // Use requestAnimationFrame to ensure DOM is updated before starting animation
        requestAnimationFrame(() => {
          // After animation completes, update the display slide
          setTimeout(() => {
            setDisplaySlide(currentSlide);
            setDisplayLayout(slideLayout);
            setIsTransitioning(false);
            setTransitionType(null);
          }, 500); // Match the CSS animation duration
        });
      } else {
        // No transition or no next slide, update immediately
        setDisplaySlide(currentSlide);
        setDisplayLayout(slideLayout);
      }
    }
  }, [currentSlide, slideLayout, displaySlide?.id, nextSlide]);

  // Debug logging for slide display
  console.log("🎥 SlideDisplay render:", {
    currentSlide: currentSlide ? {
      id: currentSlide.id,
      name: currentSlide.name,
      layout: currentSlide.layout,
      hasText: !!currentSlide.text,
      hasImageUrl: !!currentSlide.imageUrl,
      hasVideoUrl: !!currentSlide.videoUrl,
      transition: currentSlide.transition
    } : null,
    slideLayout,
    nextSlide: nextSlide ? {
      id: nextSlide.id,
      name: nextSlide.name,
      layout: nextSlide.layout,
      hasText: !!nextSlide.text,
      hasImageUrl: !!nextSlide.imageUrl,
      hasVideoUrl: !!nextSlide.videoUrl,
      transition: nextSlide.transition
    } : null,
    nextSlideLayout
  });

  if (!currentSlide) {
    return (
      <div className="display-container">
        <div className="display-content">
          <div className="display-text">No slides available</div>
        </div>
      </div>
    );
  }

  // Render slide content helper function
  const renderSlideContent = (slide, layout) => {
    if (!slide) return null;
    
    const slideTextConfig = getTextPaginationConfig(layout);
    const slideShouldUsePagination = slideTextConfig !== null;

    return (
      <>
        {layout === "side-by-side" && (
          <>
            <div className={`display-left ${slide.imageSide === 'right' ? 'flipped' : ''}`}>
              {slide.imageUrl ? (
                <div className="display-image-container">
                  <img
                    src={slide.imageUrl}
                    alt="Slide"
                    className="display-image"
                    style={{
                      objectPosition: slide.imagePosition || "center",
                    }}
                    onLoad={() => {
                      if (Date.now() % 10000 < 100) {
                        console.log("Image loaded with position:", slide.imagePosition || "center");
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="display-image-placeholder">
                  <div className="placeholder-text">No Image</div>
                </div>
              )}
            </div>

            <div className={`display-right ${slide.imageSide === 'right' ? 'flipped' : ''}`}>
              <div className="display-text-container">
                {slide.text ? (
                  slideShouldUsePagination ? (
                    <TextPagination
                      text={slide.text}
                      maxHeight={slideTextConfig.maxHeight}
                      readTimePerPage={slideTextConfig.readTimePerPage}
                      scrollStepRatio={slideTextConfig.scrollStepRatio}
                      className="display-text"
                    />
                  ) : (
                    <div
                      className="display-text"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHTMLContent(slide.text),
                      }}
                    />
                  )
                ) : (
                  <div className="display-text-placeholder">
                    <div className="placeholder-text">No Text Content</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {layout === "image-only" && (
          <div className="display-full-image">
            {slide.imageUrl ? (
              <div className="display-image-container-full">
                <img
                  src={slide.imageUrl}
                  alt="Slide"
                  className="display-image-full"
                  style={{
                    objectPosition: slide.imagePosition || "center",
                  }}
                  onLoad={() => {
                    if (Date.now() % 10000 < 100) {
                      console.log("Image loaded with position:", slide.imagePosition || "center");
                    }
                  }}
                />
              </div>
            ) : (
              <div className="display-image-placeholder-full">
                <div className="placeholder-text">No Image</div>
              </div>
            )}
          </div>
        )}

        {layout === "text-over-image" && (
          <div className="display-text-over-image">
            <div className="display-image-background">
              {slide.imageUrl ? (
                <div className="display-image-container-overlay">
                  <img
                    src={slide.imageUrl}
                    alt="Slide"
                    className="display-image-overlay"
                    style={{
                      objectPosition: slide.imagePosition || "center",
                    }}
                    onLoad={() => {
                      if (Date.now() % 10000 < 100) {
                        console.log("Image loaded with position:", slide.imagePosition || "center");
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="display-image-placeholder-overlay">
                  <div className="placeholder-text">No Image</div>
                </div>
              )}
            </div>

            <div className="display-text-overlay">
              {slide.text ? (
                <div
                  className="display-text-overlay-content"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHTMLContent(slide.text),
                  }}
                />
              ) : (
                <div className="display-text-placeholder-overlay">
                  <div className="placeholder-text">No Text Content</div>
                </div>
              )}
            </div>
          </div>
        )}

        {layout === "text-only" && (
          <div className="display-text-only">
            <div className="display-text-container-full">
              {slide.text ? (
                slideShouldUsePagination ? (
                  <TextPagination
                    text={slide.text}
                    maxHeight={slideTextConfig.maxHeight}
                    readTimePerPage={slideTextConfig.readTimePerPage}
                    scrollStepRatio={slideTextConfig.scrollStepRatio}
                    className="display-text-full"
                  />
                ) : (
                  <div
                    className="display-text-full"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHTMLContent(slide.text),
                    }}
                  />
                )
              ) : (
                <div className="display-text-placeholder-full">
                  <div className="placeholder-text">No Text Content</div>
                </div>
              )}
            </div>
          </div>
        )}

        {layout === "video" && (
          <div className="display-video">
            {slide.videoUrl ? (
              <VideoPlayer
                videoUrl={slide.videoUrl}
                autoplay={true}
                loop={true}
                muted={true}
              />
            ) : (
              <div className="display-video-placeholder">
                <div className="placeholder-text">No Video URL</div>
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  // Handle transition rendering
  if (isTransitioning && transitionType) {
    const transitionClass = `${transitionType}-transition`;
    return (
      <div className={`display-content slide-transition ${transitionClass}`}>
        <div className="slide-current">
          <div className="display-content">
            {renderSlideContent(displaySlide, displayLayout)}
          </div>
        </div>
        <div className="slide-next">
          <div className="display-content">
            {renderSlideContent(currentSlide, slideLayout)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="display-content">
      {renderSlideContent(displaySlide, displayLayout)}
      
      {/* Pre-rendered next slide (hidden) */}
      {nextSlide && (
        <div className="next-slide-prerender" style={{ display: 'none' }}>
          <SlideDisplay 
            currentSlide={nextSlide} 
            slideLayout={nextSlideLayout || nextSlide.layout || "side-by-side"}
          />
        </div>
      )}
    </div>
  );
}

export default SlideDisplay;

import React, { useState, useEffect, useRef } from "react";
import { sanitizeHTMLContent } from "../../utils/sanitize";
import TextPagination from "./TextPagination";
import VideoPlayer from "./VideoPlayer";
import TeletekstDisplay from "./TeletekstDisplay";
import { getTextPaginationConfig } from "../../config/textPagination";

function CountdownDisplay({ slide }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!slide.countdownTargetDate) return;

    const tick = () => {
      const target = new Date(slide.countdownTargetDate).getTime();
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft(null);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [slide.countdownTargetDate]);

  const textColor = slide.countdownTextColor || "#ffffff";
  const numberColor = slide.countdownNumberColor || "#ffffff";
  const blockBg = slide.countdownBlockBg || "#1a1a2e";
  const labelColor = slide.countdownLabelColor || "#aaaaaa";

  const units = timeLeft
    ? [
        { value: timeLeft.days, label: "Dagen" },
        { value: timeLeft.hours, label: "Uren" },
        { value: timeLeft.minutes, label: "Minuten" },
        { value: timeLeft.seconds, label: "Seconden" },
      ]
    : null;

  return (
    <div
      className="display-countdown"
      style={{
        backgroundImage: slide.countdownBgImage ? `url(${slide.countdownBgImage})` : undefined,
        backgroundPosition: slide.countdownBgImagePosition || "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
      }}
    >
      {slide.countdownBgImage && <div className="display-countdown__overlay" />}

      <div className="display-countdown__inner">
        {slide.countdownTitle && (
          <h2 className="display-countdown__title" style={{ color: textColor }}>
            {slide.countdownTitle}
          </h2>
        )}

        {units ? (
          <div className="display-countdown__blocks">
            {units.map(({ value, label }) => (
              <div
                key={label}
                className="display-countdown__block"
                style={{ backgroundColor: blockBg }}
              >
                <span className="display-countdown__number" style={{ color: numberColor }}>
                  {String(value).padStart(2, "0")}
                </span>
                <span className="display-countdown__label" style={{ color: labelColor }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="display-countdown__expired" style={{ color: textColor }}>
            Verstreken
          </div>
        )}
      </div>
    </div>
  );
}

function GallerySlideDisplay({ images }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    if (images.length <= 1) return;
    const duration = (images[currentIndex]?.duration || 3) * 1000;
    const fadeOut = 500;

    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((i) => (i + 1) % images.length);
        setVisible(true);
      }, fadeOut);
    }, duration - fadeOut);

    return () => clearTimeout(timerRef.current);
  }, [currentIndex, images]);

  if (!images.length) {
    return (
      <div className="display-gallery-placeholder">
        <div className="placeholder-text">Geen foto's</div>
      </div>
    );
  }

  const current = images[currentIndex];
  return (
    <div className="display-gallery">
      <img
        key={current.id}
        src={current.url}
        alt={current.name}
        className={`display-gallery__image ${visible ? "visible" : ""}`}
      />
      {images.length > 1 && (
        <div className="display-gallery__dots">
          {images.map((_, i) => (
            <span key={i} className={`display-gallery__dot${i === currentIndex ? " active" : ""}`} />
          ))}
        </div>
      )}
    </div>
  );
}

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
      
      // Define all supported transition types
      const supportedTransitions = [
        'slide-left', 'slide-right', 'slide-up', 'slide-down',
        'fade', 'zoom-in', 'zoom-out', 
        'flip-horizontal', 'flip-vertical'
      ];
      
      if (supportedTransitions.includes(transition) && nextSlide) {
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

        {layout === "teletekst" && (
          <div className="display-teletekst">
            {slide.teletekstChannel ? (
              <TeletekstDisplay
                channel={slide.teletekstChannel}
                theme={slide.teletekstTheme || 'classic'}
                pageCount={slide.teletekstPageCount || 1}
                duration={slide.duration || 10}
              />
            ) : (
              <div className="display-teletekst-placeholder">
                <div className="placeholder-text">Geen Teletekst Kanaal</div>
              </div>
            )}
          </div>
        )}

        {layout === "iframe" && (
          <div className="display-iframe">
            {slide.iframeUrl ? (
              <iframe
                src={slide.iframeUrl}
                title={slide.name || "Website"}
                className="display-iframe-content"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                allow="autoplay; fullscreen"
                scrolling="no"
              />
            ) : (
              <div className="display-iframe-placeholder">
                <div className="placeholder-text">Geen Website URL</div>
              </div>
            )}
          </div>
        )}

        {layout === "gallery" && (
          <GallerySlideDisplay images={slide.images || []} />
        )}

        {layout === "countdown" && (
          <CountdownDisplay slide={slide} />
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

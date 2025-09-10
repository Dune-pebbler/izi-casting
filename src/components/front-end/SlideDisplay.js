import React from "react";
import { sanitizeHTMLContent } from "../../utils/sanitize";

function SlideDisplay({ currentSlide, slideType, slideLayout }) {
  if (!currentSlide) {
    return (
      <div className="display-container">
        <div className="display-content">
          <div className="display-text">No slides available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="display-content">
      {/* Layout-specific display */}
      {slideLayout === "side-by-side" && (
        <>
          {/* Left side - Image */}
          <div className="display-left">
            {slideType === "image" && currentSlide.imageUrl ? (
              <div className="display-image-container">
                <img
                  src={currentSlide.imageUrl}
                  alt="Slide"
                  className="display-image"
                  style={{
                    objectPosition: currentSlide.imagePosition || "center",
                  }}
                  onLoad={() => {
                    // Throttle console logging to prevent spam
                    if (Date.now() % 10000 < 100) {
                      // Only log every ~10 seconds
                      console.log(
                        "Image loaded with position:",
                        currentSlide.imagePosition || "center"
                      );
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

          {/* Right side - Text */}
          <div className="display-right">
            <div className="display-text-container">
              {currentSlide.text ? (
                <div
                  className="display-text"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHTMLContent(currentSlide.text),
                  }}
                />
              ) : (
                <div className="display-text-placeholder">
                  <div className="placeholder-text">No Text Content</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {slideLayout === "image-only" && (
        <div className="display-full-image">
          {slideType === "image" && currentSlide.imageUrl ? (
            <div className="display-image-container-full">
              <img
                src={currentSlide.imageUrl}
                alt="Slide"
                className="display-image-full"
                style={{
                  objectPosition: currentSlide.imagePosition || "center",
                }}
                onLoad={() => {
                  // Throttle console logging to prevent spam
                  if (Date.now() % 10000 < 100) {
                    // Only log every ~10 seconds
                    console.log(
                      "Image loaded with position:",
                      currentSlide.imagePosition || "center"
                    );
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

      {slideLayout === "text-over-image" && (
        <div className="display-text-over-image">
          <div className="display-image-background">
            {slideType === "image" && currentSlide.imageUrl ? (
              <div className="display-image-container-overlay">
                <img
                  src={currentSlide.imageUrl}
                  alt="Slide"
                  className="display-image-overlay"
                  style={{
                    objectPosition: currentSlide.imagePosition || "center",
                  }}
                  onLoad={() => {
                    // Throttle console logging to prevent spam
                    if (Date.now() % 10000 < 100) {
                      // Only log every ~10 seconds
                      console.log(
                        "Image loaded with position:",
                        currentSlide.imagePosition || "center"
                      );
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
            {currentSlide.text ? (
              <div
                className="display-text-overlay-content"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHTMLContent(currentSlide.text),
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

      {slideLayout === "text-only" && (
        <div className="display-text-only">
          <div className="display-text-container-full">
            {currentSlide.text ? (
              <div
                className="display-text-full"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHTMLContent(currentSlide.text),
                }}
              />
            ) : (
              <div className="display-text-placeholder-full">
                <div className="placeholder-text">No Text Content</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SlideDisplay;

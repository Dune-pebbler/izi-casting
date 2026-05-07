import React, { useRef, useEffect, useState } from "react";
import { X, Monitor } from "lucide-react";
import SlideDisplay from "../../front-end/SlideDisplay";

function SlidePreviewModal({ slide, onClose }) {
  const outerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (!outerRef.current) return;
      const { clientWidth, clientHeight } = outerRef.current;
      const scaleX = clientWidth / 1920;
      const scaleY = clientHeight / 1080;
      setScale(Math.min(scaleX, scaleY));
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  if (!slide) return null;

  return (
    <div className="slide-preview-modal">
      <div className="slide-preview-modal__overlay" onClick={onClose}>
        <div
          className="slide-preview-modal__content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="slide-preview-modal__header">
            <div className="slide-preview-modal__header-left">
              <Monitor size={16} />
              <span>Voorbeeld</span>
              {slide.name && (
                <span className="slide-preview-modal__slide-name">
                  {slide.name}
                </span>
              )}
            </div>
            <button className="btn-icon" onClick={onClose} title="Sluiten">
              <X size={16} />
            </button>
          </div>

          <div className="slide-preview-modal__stage">
            <div className="slide-preview-modal__screen-outer" ref={outerRef}>
              <div
                className="slide-preview-modal__screen-inner"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  width: "1920px",
                  height: "1080px",
                  position: "absolute",
                  top: 0,
                  left: 0,
                }}
              >
                <SlideDisplay
                  currentSlide={slide}
                  slideLayout={slide.layout}
                  effectsEnabled={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SlidePreviewModal;

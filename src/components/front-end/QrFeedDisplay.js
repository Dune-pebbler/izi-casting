import React, { useState, useEffect, useRef } from "react";
import QRCode from "react-qr-code";

function QrFeedDisplay({ slide }) {
  const qrUrl = slide.qrUrl || "";
  const qrLabel = slide.qrLabel || "";
  const panelColor = slide.qrPanelColor || "#1d4ed8";
  const panelTextColor = slide.qrPanelTextColor || "#ffffff";
  const leftBgColor = slide.qrLeftBgColor || "#0f172a";
  const leftTextColor = slide.qrLeftTextColor || "#ffffff";
  const textSlides = slide.qrTextSlides || [];
  const intervalSeconds = slide.qrTextInterval || 5;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (textSlides.length <= 1) return;

    timerRef.current = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % textSlides.length);
        setAnimating(false);
      }, 400);
    }, intervalSeconds * 1000);

    return () => clearInterval(timerRef.current);
  }, [textSlides.length, intervalSeconds]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [textSlides.length]);

  const currentSlide = textSlides[currentIndex];
  const slideBgColor = currentSlide?.bgColor || leftBgColor;
  const slideBgImage = currentSlide?.bgImage || null;

  return (
    <div className="qr-feed">
      <div
        className="qr-feed__left"
        style={{ color: leftTextColor, backgroundColor: leftBgColor }}
      >
        {/* Background layer fades with the slide */}
        <div
          className={`qr-feed__slide-bg${animating ? " qr-feed__slide-bg--exit" : ""}`}
          style={{
            backgroundColor: slideBgColor,
            backgroundImage: slideBgImage ? `url(${slideBgImage})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {slideBgImage && <div className="qr-feed__bg-overlay" />}
        </div>

        {textSlides.length > 0 ? (
          <>
            {textSlides.length > 1 && (
              <div className="qr-feed__dots">
                {textSlides.map((_, i) => (
                  <span
                    key={i}
                    className={`qr-feed__dot${i === currentIndex ? " qr-feed__dot--active" : ""}`}
                    style={{ backgroundColor: leftTextColor }}
                  />
                ))}
              </div>
            )}
            <div
              className={`qr-feed__text-slide${animating ? " qr-feed__text-slide--exit" : ""}`}
            >
              {currentSlide?.text && (
                <div
                  className="qr-feed__text-content"
                  dangerouslySetInnerHTML={{ __html: currentSlide.text }}
                />
              )}
            </div>
          </>
        ) : (
          <div className="qr-feed__empty-left">
            <span>Geen slides toegevoegd</span>
          </div>
        )}
      </div>

      <div className="qr-feed__right" style={{ backgroundColor: panelColor }}>
        <div className="qr-feed__qr-wrapper">
          {qrUrl ? (
            <QRCode
              value={qrUrl}
              size={256}
              bgColor="transparent"
              fgColor={panelTextColor}
              style={{ width: "100%", height: "auto", maxWidth: 280 }}
            />
          ) : (
            <div
              className="qr-feed__qr-placeholder"
              style={{ borderColor: panelTextColor, color: panelTextColor }}
            >
              Geen URL ingesteld
            </div>
          )}
          {qrLabel && (
            <p className="qr-feed__label" style={{ color: panelTextColor }}>
              {qrLabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default QrFeedDisplay;

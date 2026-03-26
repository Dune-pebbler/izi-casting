import React from "react";

function ProgressBar({ currentSlide, slideProgress, progressBarRef, barStyle }) {

  if (currentSlide?.showBar === false) {
    return null;
  }

  // Determine progress bar position based on bar style
  const getProgressBarStyle = () => {
    switch (barStyle) {
      case "boven":
      case "donker transparant boven":
      case "licht transparant boven":
      case "transparant boven": // legacy
        return {
          top: "140px",
          bottom: "auto",
        };
      case "onder":
      case "donker transparant onder":
      case "licht transparant onder":
      case "transparant onder": // legacy
      default:
        return {
          top: "auto",
          bottom: "140px",
        };
    }
  };

  return (
    <div
      className="display-progress-bar"
      style={getProgressBarStyle()}
    >
      <div
        ref={progressBarRef}
        className="display-progress-fill"
        style={{ width: `${slideProgress}%` }}
      />
    </div>
  );
}

export default ProgressBar;

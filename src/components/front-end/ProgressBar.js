import React from "react";

function ProgressBar({ currentSlide, slideProgress, progressBarRef, barStyle }) {

  if (currentSlide?.showBar === false) {
    return null;
  }

  // Determine progress bar position based on bar style
  const getProgressBarStyle = () => {
    switch (barStyle) {
      case "boven":
        return {
          top: "20vh", // Position below the top bar
          bottom: "auto",
        };
      case "transparant boven":
        return {
          top: "20vh", // Position below the top bar
          bottom: "auto",
        };
      case "transparant onder":
        return {
          top: "auto",
          bottom: "20vh", // Position above the bottom bar
        };
      case "onder":
      default:
        return {
          top: "auto",
          bottom: "20vh", // Position above the bottom bar
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

import React from "react";

function ProgressBar({
  currentSlide,
  slideProgress,
  progressBarRef,
  barStyle,
  color,
}) {
  // if (currentSlide?.showBar === false) {
  //   return null;
  // }

  // Determine progress bar position based on bar style
  const getProgressBarStyle = () => {
    switch (barStyle) {
      case "boven":
      case "donker transparant boven":
      case "licht transparant boven":
      case "transparant boven": // legacy
        return {
          top: currentSlide?.showBar === false ? "0px" : "140px",
          bottom: "auto",
          margin: currentSlide?.showBar === false ? "0" : "16px",
          width:
            currentSlide?.showBar === false
              ? "calc(100%)"
              : "calc(100% - 32px)",
        };
      case "onder":
      case "donker transparant onder":
      case "licht transparant onder":
      case "transparant onder": // legacy
      default:
        return {
          top: "auto",
          bottom: currentSlide?.showBar === false ? "0px" : "140px",
          margin: currentSlide?.showBar === false ? "0" : "16px",
          width:
            currentSlide?.showBar === false
              ? "calc(100%)"
              : "calc(100% - 32px)",
        };
    }
  };

  return (
    <div className="display-progress-bar" style={getProgressBarStyle()}>
      <div
        ref={progressBarRef}
        className="display-progress-fill"
        style={{
          width: `${slideProgress}%`,
          backgroundColor: color || undefined,
        }}
      />
    </div>
  );
}

export default ProgressBar;

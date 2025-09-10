import React from "react";

function ProgressBar({ currentSlide, slideProgress, getProgressBarHeight }) {
  // Only show if showBar is true (default is true)
  if (currentSlide?.showBar === false) {
    return null;
  }

  return (
    <div
      className="display-progress-bar"
      style={{ height: `${getProgressBarHeight()}px` }}
    >
      <div
        className="display-progress-fill"
        style={{ width: `${slideProgress}%` }}
      />
    </div>
  );
}

export default ProgressBar;

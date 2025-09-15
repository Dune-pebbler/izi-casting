import React from "react";

function ProgressBar({ currentSlide, slideProgress, progressBarRef }) {

  if (currentSlide?.showBar === false) {
    return null;
  }

  return (
    <div
      className="display-progress-bar"
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

import React from "react";

function FullscreenIndicator({ isFullscreen, fullscreenSupported, requestFullscreen }) {
  if (isFullscreen || !fullscreenSupported) {
    return null;
  }

  return (
    <div className="fullscreen-indicator">
      <button onClick={requestFullscreen} className="fullscreen-btn">
        <span>⛶</span> Volledig scherm
      </button>
    </div>
  );
}

export default FullscreenIndicator;

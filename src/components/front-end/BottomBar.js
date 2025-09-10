import React from "react";
import Feed from "./Feed";

function BottomBar({ currentSlide, settings, feeds }) {
  // Only show if showBar is true (default is true)
  if (currentSlide?.showBar === false) {
    return null;
  }

  return (
    <div
      className="display-bottom-bar"
      style={{
        backgroundColor: settings.backgroundColor,
        color: settings.foregroundColor,
      }}
    >
      <div className="display-rss-feed">
        <Feed feeds={feeds} settings={settings} />
      </div>

      {settings.logoUrl && (
        <div className="display-bottom-logo">
          <img src={settings.logoUrl} alt="Logo" className="bottom-logo" />
        </div>
      )}
    </div>
  );
}

export default BottomBar;

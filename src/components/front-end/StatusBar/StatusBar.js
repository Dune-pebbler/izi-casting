import React, { useMemo, memo } from "react";
import Feed from "../Feed";
import Clock from "./Clock";

const Logo = memo(({ logoUrl }) => {
  if (!logoUrl) return null;

  return (
    <div className="display-bottom-logo">
      <img src={logoUrl} alt="Logo" className="bottom-logo" />
    </div>
  );
});

const FeedWrapper = memo(({ feeds, settings }) => {
  return (
    <div className="display-rss-feed">
      <Feed feeds={feeds} settings={settings} />
    </div>
  );
});

function StatusBar({ currentSlide, settings, feeds }) {
  const shouldShowBar = currentSlide?.showBar !== false;

  const barStyle = useMemo(
    () => ({
      backgroundColor: settings.backgroundColor,
      color: settings.foregroundColor,
      display: shouldShowBar ? "flex" : "none",
    }),
    [settings.backgroundColor, settings.foregroundColor, shouldShowBar]
  );

  console.log("status bar rerendered");

  return (
    <div className="display-bottom-bar" style={barStyle}>
      <Logo logoUrl={settings.logoUrl} />
      <FeedWrapper feeds={feeds} settings={settings} />
      {settings.showClock && <Clock settings={settings} />}
    </div>
  );
}

export default memo(StatusBar);

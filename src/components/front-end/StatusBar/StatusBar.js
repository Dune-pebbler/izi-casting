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
    () => {
      const baseStyle = {
        color: settings.foregroundColor,
        display: shouldShowBar ? "flex" : "none",
        position: "fixed",
        zIndex: 5,
      };

      // Handle different bar styles
      switch (settings.barStyle) {
        case "boven":
          return {
            ...baseStyle,
            backgroundColor: settings.backgroundColor,
            top: 0,
            bottom: "auto",
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderBottomLeftRadius: "var(--border-radius-md)",
            borderBottomRightRadius: "var(--border-radius-md)",
            borderBottom: "1px solid var(--gray-700)",
            borderTop: "none",
          };
        case "transparant onder":
          return {
            ...baseStyle,
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            border: "none",
            boxShadow: "none",
          };
        case "transparant boven":
          return {
            ...baseStyle,
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            top: 0,
            bottom: "auto",
            border: "none",
            boxShadow: "none",
          };
        case "onder":
        default:
          return {
            ...baseStyle,
            backgroundColor: settings.backgroundColor,
          };
      }
    },
    [settings.backgroundColor, settings.foregroundColor, settings.barStyle, shouldShowBar]
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

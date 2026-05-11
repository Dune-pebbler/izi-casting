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
        position: "absolute",
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
        case "donker transparant onder":
        case "transparant onder": // legacy
          return {
            ...baseStyle,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            border: "none",
            boxShadow: "none",
          };
        case "donker transparant boven":
        case "transparant boven": // legacy
          return {
            ...baseStyle,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            top: 0,
            bottom: "auto",
            border: "none",
            boxShadow: "none",
          };
        case "licht transparant onder":
          return {
            ...baseStyle,
            backgroundColor: "rgba(255, 255, 255, 0.45)",
            border: "none",
            boxShadow: "none",
          };
        case "licht transparant boven":
          return {
            ...baseStyle,
            backgroundColor: "rgba(255, 255, 255, 0.45)",
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

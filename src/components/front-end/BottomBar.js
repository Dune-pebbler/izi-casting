import React, { useState, useEffect } from "react";
import Feed from "./Feed";

function BottomBar({ currentSlide, settings, feeds }) {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date) => {
    const dateOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
    };

    const timeOptions = {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };

    const dateString = date.toLocaleDateString("nl-NL", dateOptions);
    const timeString = date.toLocaleTimeString("nl-NL", timeOptions);

    return { dateString, timeString };
  };

  // Hide the bar visually instead of removing from DOM
  const shouldShowBar = currentSlide?.showBar !== false;

  return (
    <div
      className="display-bottom-bar"
      style={{
        backgroundColor: settings.backgroundColor,
        color: settings.foregroundColor,
        display: shouldShowBar ? 'flex' : 'none',
      }}
    >
      {settings.logoUrl && (
        <div className="display-bottom-logo">
          <img src={settings.logoUrl} alt="Logo" className="bottom-logo" />
        </div>
      )}

      <div className="display-rss-feed">
        <Feed feeds={feeds} settings={settings} />
      </div>

      {settings.showClock && (
        <div className="display-bottom-clock">
          <div className="date-time-display">
            <div className="date-line">
              {formatDateTime(currentDateTime).dateString}
            </div>
            <div className="time-line">
              {formatDateTime(currentDateTime).timeString}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BottomBar;

import React, { useState, useEffect, useMemo, memo } from "react";

const Clock = memo(({ settings }) => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDateTime = useMemo(() => {
    const dateOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
    };

    const timeOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      ...(settings.clockFormat !== "HH:mm" && { second: "2-digit" }),
    };

    const dateString = currentDateTime.toLocaleDateString("nl-NL", dateOptions);
    const timeString = currentDateTime.toLocaleTimeString("nl-NL", timeOptions);

    return { dateString, timeString };
  }, [currentDateTime, settings.clockFormat]);

  return (
    <div className="display-bottom-clock">
      <div className="date-time-display">
        {settings.showDate && (
          <div className="date-line" style={{ color: settings.foregroundColor }}>
            {formatDateTime.dateString}
          </div>
        )}
        {settings.showClock && (
          <div className="time-line" style={{ color: settings.foregroundColor }}>
            {formatDateTime.timeString}
          </div>
        )}
      </div>
    </div>
  );
});

export default Clock;

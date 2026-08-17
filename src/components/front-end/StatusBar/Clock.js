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

  const handAngles = useMemo(() => {
    const hours = currentDateTime.getHours() % 12;
    const minutes = currentDateTime.getMinutes();
    const seconds = currentDateTime.getSeconds();

    return {
      hour: hours * 30 + minutes * 0.5,
      minute: minutes * 6 + seconds * 0.1,
      second: seconds * 6,
    };
  }, [currentDateTime]);

  const clockNumbers = useMemo(() => {
    const radius = 38;
    return [...Array(12)].map((_, i) => {
      const number = i === 0 ? 12 : i;
      const angle = i * 30 * (Math.PI / 180);
      const x = 50 + radius * Math.sin(angle);
      const y = 50 - radius * Math.cos(angle);
      return { number, x, y };
    });
  }, []);

  const clockSize = settings.showDate ? 80 : 130;

  return (
    <div className="display-bottom-clock">
      <div className="date-time-display">
        {settings.showDate && (
          <div className="date-line" style={{ color: settings.foregroundColor }}>
            {formatDateTime.dateString}
          </div>
        )}
        {settings.showClock && settings.analogClock && (
          <div
            className="analog-clock"
            style={{
              borderColor: settings.foregroundColor,
              "--clock-size": `${clockSize}px`,
            }}
          >
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="analog-clock-tick"
                style={{
                  backgroundColor: settings.foregroundColor,
                  transform: `rotate(${i * 30}deg) translateY(-50%)`,
                }}
              />
            ))}
            {clockNumbers.map(({ number, x, y }) => (
              <div
                key={number}
                className="analog-clock-number"
                style={{
                  color: settings.foregroundColor,
                  left: `${x}%`,
                  top: `${y}%`,
                }}
              >
                {number}
              </div>
            ))}
            <div
              className="analog-clock-hand analog-clock-hand-hour"
              style={{
                backgroundColor: settings.foregroundColor,
                transform: `rotate(${handAngles.hour}deg)`,
              }}
            />
            <div
              className="analog-clock-hand analog-clock-hand-minute"
              style={{
                backgroundColor: settings.foregroundColor,
                transform: `rotate(${handAngles.minute}deg)`,
              }}
            />
            <div
              className="analog-clock-hand analog-clock-hand-second"
              style={{
                backgroundColor: settings.foregroundColor,
                transform: `rotate(${handAngles.second}deg)`,
              }}
            />
            <div
              className="analog-clock-center"
              style={{ backgroundColor: settings.foregroundColor }}
            />
          </div>
        )}
        {settings.showClock && !settings.analogClock && (
          <div className="time-line" style={{ color: settings.foregroundColor }}>
            {formatDateTime.timeString}
          </div>
        )}
      </div>
    </div>
  );
});

export default Clock;

import React, { useState, useEffect, useMemo, useRef } from "react";

const WMO = {
  0: { label: "Heldere hemel", emoji: "☀️" },
  1: { label: "Overwegend helder", emoji: "🌤️" },
  2: { label: "Gedeeltelijk bewolkt", emoji: "⛅" },
  3: { label: "Bewolkt", emoji: "☁️" },
  45: { label: "Mist", emoji: "🌫️" },
  48: { label: "IJsmist", emoji: "🌫️" },
  51: { label: "Lichte motregen", emoji: "🌦️" },
  53: { label: "Motregen", emoji: "🌦️" },
  55: { label: "Dichte motregen", emoji: "🌧️" },
  61: { label: "Lichte regen", emoji: "🌧️" },
  63: { label: "Regen", emoji: "🌧️" },
  65: { label: "Zware regen", emoji: "🌧️" },
  71: { label: "Lichte sneeuw", emoji: "🌨️" },
  73: { label: "Sneeuw", emoji: "❄️" },
  75: { label: "Zware sneeuw", emoji: "❄️" },
  77: { label: "Sneeuwkorrels", emoji: "❄️" },
  80: { label: "Lichte buien", emoji: "🌦️" },
  81: { label: "Buien", emoji: "🌧️" },
  82: { label: "Zware buien", emoji: "⛈️" },
  85: { label: "Lichte sneeuwbuien", emoji: "🌨️" },
  86: { label: "Zware sneeuwbuien", emoji: "❄️" },
  95: { label: "Onweer", emoji: "⛈️" },
  96: { label: "Onweer met hagel", emoji: "⛈️" },
  99: { label: "Zwaar onweer met hagel", emoji: "⛈️" },
};

const DAYS_NL = ["zo", "ma", "di", "wo", "do", "vr", "za"];

function getWmo(code) {
  return WMO[code] || { label: "Onbekend", emoji: "🌡️" };
}

const tempColors = {
  lightbg: "#fafafa",
  lightgrey: "#f0f0f0",
  grey: "#a3a3a3",
};

function WeatherDisplay({
  lat,
  long,
  cityName = "",
  accentColor = "#4f87ff",
  forecastDays = 7,
  leftBgImage = "",
  leftBgImagePosition = "center",
}) {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);
  const forecastBodyRef = useRef(null);
  const forecastContentRef = useRef(null);

  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);

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
    };

    const dateString = currentDateTime.toLocaleDateString("nl-NL", dateOptions);
    const timeString = currentDateTime.toLocaleTimeString("nl-NL", timeOptions);

    return { dateString, timeString };
  }, [currentDateTime]);

  useEffect(() => {
    if (!lat || !long) return;

    const fetchWeather = async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}` +
            `&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m` +
            `&hourly=precipitation_probability` +
            `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
            `&timezone=auto&forecast_days=${forecastDays}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setWeather(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [lat, long]);

  useEffect(() => {
    if (!weather) return;
    const timeoutId = setTimeout(() => {
      const body = forecastBodyRef.current;
      const content = forecastContentRef.current;
      if (!body || !content) return;
      const scrollDistance = content.scrollHeight - body.clientHeight;
      if (scrollDistance <= 0) return;
      const scrollDuration = scrollDistance / 50 / 0.6;
      const totalDuration = scrollDuration * 2;
      content.style.setProperty(
        "--weather-forecast-scroll-dist",
        `-${scrollDistance}px`,
      );
      content.style.animation = `weatherForecastScroll ${totalDuration}s linear infinite`;
    }, 400);
    return () => {
      clearTimeout(timeoutId);
      if (forecastContentRef.current) {
        forecastContentRef.current.style.animation = "";
        forecastContentRef.current.style.removeProperty(
          "--weather-forecast-scroll-dist",
        );
      }
    };
  }, [weather]);

  if (!lat || !long) {
    return (
      <div className="display-weather__empty" style={{ color: accentColor }}>
        Geen locatie ingesteld
      </div>
    );
  }

  if (error) {
    return (
      <div className="display-weather__empty" style={{ color: accentColor }}>
        Kon weer niet laden
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="display-weather__loading" style={{ color: accentColor }}>
        <span>⛅</span>
        <p>Weer laden…</p>
      </div>
    );
  }

  const currentTime = new Date();
  const cur = weather.current;
  const daily = weather.daily;
  const currentWmo = getWmo(cur.weathercode);
  const temp = Math.round(cur.temperature_2m);
  const feelsLike = Math.round(cur.apparent_temperature);
  const wind = Math.round(cur.windspeed_10m);

  // Find precipitation probability for the current hour from hourly data
  const currentHour = cur.time?.slice(0, 13); // "2026-05-20T10"
  const hourlyIdx = weather.hourly?.time?.findIndex((t) =>
    t.startsWith(currentHour),
  );
  const precipProb =
    hourlyIdx >= 0 ? weather.hourly.precipitation_probability[hourlyIdx] : null;

  return (
    <div
      style={{
        flexDirection: "row",
        display: "grid",
        width: "100%",
        height: "100%",
        gridTemplateColumns: "1fr 1fr",
        position: "relative",
        fontFamily: "Poppins",
      }}
    >
      <div
        style={{
          background: leftBgImage
            ? `url(${leftBgImage}) ${leftBgImagePosition} / cover no-repeat`
            : "linear-gradient(140deg,rgba(0, 0, 0, 1) 0%, rgba(8, 8, 8, 1) 50%, rgba(99, 99, 99, 1) 100%)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontSize: "24px",
            opacity: "0.5",
            textAlign: "center",
            fontFamily: "Poppins",
          }}
        >
          {cityName}
        </div>
        <div
          style={{
            flexGrow: "1",
            display: "flex",
            verticalAlign: "middle",
            textAlign: "center",
            margin: "0 auto",
          }}
        >
          <div className="display-weather__current">
            <div className="display-weather__main">
              <span
                className="display-weather__temp"
                style={{
                  color: "white",
                  marginTop: "48px",
                  fontFamily: "Poppins",
                }}
              >
                {temp}°C
              </span>
              <span
                style={{
                  fontSize: "24px",
                  opacity: "0.7",
                  marginTop: "48px",
                  fontFamily: "Poppins",
                }}
                className="display-weather__desc"
              >
                {currentWmo.label}
              </span>
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(0,0,0,0.4)",
              borderRadius: "16px",
              padding: "16px",
              border: "1px solid grey",
              textAlign: "center",
              fontFamily: "Poppins",
            }}
          >
            <span
              style={{ display: "block", color: "white", fontSize: "32px" }}
            >
              {feelsLike}°C
            </span>
            <span
              style={{
                opacity: "0.5",
                textTransform: "uppercase",
                display: "block",
                marginTop: "8px",
              }}
            >
              gevoel
            </span>
          </div>
          <div
            style={{
              backgroundColor: "rgba(0,0,0,0.4)",
              borderRadius: "16px",
              padding: "16px",
              border: "1px solid grey",
              textAlign: "center",
              fontFamily: "Poppins",
            }}
          >
            <span
              style={{ display: "block", color: "white", fontSize: "32px" }}
            >
              {wind}
            </span>
            <span
              style={{
                opacity: "0.5",
                textTransform: "uppercase",
                display: "block",
                marginTop: "8px",
              }}
            >
              km/u
            </span>
          </div>
          <div
            style={{
              backgroundColor: "rgba(0,0,0,0.4)",
              borderRadius: "16px",
              padding: "16px",
              border: "1px solid grey",
              textAlign: "center",
              fontFamily: "Poppins",
            }}
          >
            <span
              style={{ display: "block", color: "white", fontSize: "32px" }}
            >
              {precipProb}%
            </span>
            <span
              style={{
                opacity: "0.5",
                textTransform: "uppercase",
                display: "block",
                marginTop: "8px",
              }}
            >
              Regen
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: tempColors.lightbg,
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderBottom: "1px solid grey",
            marginBottom: "16px",
          }}
        >
          <h2 style={{ color: tempColors.grey, fontFamily: "Poppins" }}>
            VERWACHTING
          </h2>
          <h2 style={{ color: tempColors.grey, fontFamily: "Poppins" }}>
            {formatDateTime.dateString} {formatDateTime.timeString}
          </h2>
        </div>

        <div
          ref={forecastBodyRef}
          style={{ overflow: "hidden", flex: 1, fontFamily: "Poppins" }}
        >
          {daily && (
            <div ref={forecastContentRef}>
              {daily.time.map((dateStr, i) => {
                const d = new Date(dateStr + "T12:00:00");
                const dayLabel = DAYS_NL[d.getDay()];
                const wmo = getWmo(daily.weathercode[i]);
                return (
                  <div
                    key={dateStr}
                    style={{
                      borderRadius: "16px",
                      padding: "16px",
                      backgroundColor: tempColors.lightgrey,
                      marginBottom: "16px",
                      fontSize: "2.5rem",
                      display: "grid",
                      gridTemplateColumns: "auto auto 1fr auto auto",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "80px",
                        borderRight: "1px solid grey",
                        paddingRight: "16px",
                        color: tempColors.grey,
                        textAlign: "right",
                      }}
                    >
                      {dayLabel}
                    </div>
                    <div style={{ width: "60px", textAlign: "center" }}>
                      {wmo.emoji}
                    </div>
                    <div style={{ color: tempColors.grey }}>{wmo.label}</div>

                    <div
                      style={{
                        color: "black",
                        width: "80px",
                        textAlign: "center",
                      }}
                    >
                      {Math.round(daily.temperature_2m_max[i])}°
                    </div>

                    <div
                      style={{
                        color: tempColors.grey,
                        marginLeft: "16px",
                        width: "60px",
                        textAlign: "center",
                      }}
                    >
                      {Math.round(daily.temperature_2m_min[i])}°
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WeatherDisplay;

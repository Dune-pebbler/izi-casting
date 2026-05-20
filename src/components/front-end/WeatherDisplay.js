import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Snowflake,
  Thermometer,
} from "lucide-react";

const WMO = {
  0: { label: "Heldere hemel", Icon: Sun, color: "#FFD700" },
  1: { label: "Overwegend helder", Icon: CloudSun, color: "#FFA500" },
  2: { label: "Gedeeltelijk bewolkt", Icon: CloudSun, color: "#FFA500" },
  3: { label: "Bewolkt", Icon: Cloud, color: "#9CA3AF" },
  45: { label: "Mist", Icon: CloudFog, color: "#D1D5DB" },
  48: { label: "IJsmist", Icon: CloudFog, color: "#D1D5DB" },
  51: { label: "Lichte motregen", Icon: CloudDrizzle, color: "#60A5FA" },
  53: { label: "Motregen", Icon: CloudDrizzle, color: "#60A5FA" },
  55: { label: "Dichte motregen", Icon: CloudDrizzle, color: "#3B82F6" },
  61: { label: "Lichte regen", Icon: CloudRain, color: "#60A5FA" },
  63: { label: "Regen", Icon: CloudRain, color: "#3B82F6" },
  65: { label: "Zware regen", Icon: CloudRain, color: "#1D4ED8" },
  71: { label: "Lichte sneeuw", Icon: CloudSnow, color: "#BAE6FD" },
  73: { label: "Sneeuw", Icon: CloudSnow, color: "#BAE6FD" },
  75: { label: "Zware sneeuw", Icon: CloudSnow, color: "#93C5FD" },
  77: { label: "Sneeuwkorrels", Icon: Snowflake, color: "#BAE6FD" },
  80: { label: "Lichte buien", Icon: CloudRain, color: "#60A5FA" },
  81: { label: "Buien", Icon: CloudRain, color: "#3B82F6" },
  82: { label: "Zware buien", Icon: CloudLightning, color: "#818CF8" },
  85: { label: "Lichte sneeuwbuien", Icon: CloudSnow, color: "#BAE6FD" },
  86: { label: "Zware sneeuwbuien", Icon: CloudSnow, color: "#93C5FD" },
  95: { label: "Onweer", Icon: CloudLightning, color: "#FBBF24" },
  96: { label: "Onweer met hagel", Icon: CloudLightning, color: "#FBBF24" },
  99: {
    label: "Zwaar onweer met hagel",
    Icon: CloudLightning,
    color: "#FBBF24",
  },
};

const DAYS_NL = ["zo", "ma", "di", "wo", "do", "vr", "za"];

function getWmo(code) {
  return WMO[code] || { label: "Onbekend", Icon: Thermometer };
}

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
      <div
        className="display-weather__empty"
        style={{ color: accentColor, fontFamily: "Poppins, sans-serif" }}
      >
        Geen locatie ingesteld
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="display-weather__empty"
        style={{ color: accentColor, fontFamily: "Poppins, sans-serif" }}
      >
        Kon weer niet laden
      </div>
    );
  }

  if (!weather) {
    return (
      <div
        className="display-weather__loading"
        style={{ color: accentColor, fontFamily: "Poppins, sans-serif" }}
      >
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
      className="display-weather__grid"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      <div
        className="display-weather__left"
        style={{
          background: leftBgImage
            ? `url(${leftBgImage}) ${leftBgImagePosition} / cover no-repeat`
            : "linear-gradient(140deg,rgba(0, 0, 0, 1) 0%, rgba(8, 8, 8, 1) 50%, rgba(99, 99, 99, 1) 100%)",
        }}
      >
        <div
          className="display-weather__city"
          style={{
            color: `${accentColor}`,
            fontFamily: "Poppins",
            fontWeight: "600",
          }}
        >
          {cityName}
        </div>
        <div className="display-weather__center">
          <div className="display-weather__current">
            <div className="display-weather__main">
              <span className="display-weather__temp">{temp}°C</span>
              <span className="display-weather__desc">{currentWmo.label}</span>
            </div>
          </div>
        </div>
        <div className="display-weather__stats">
          <div
            className="display-weather__stat"
            style={{
              borderColor: accentColor,
              backgroundColor: `${accentColor}33`,
            }}
          >
            <span className="display-weather__stat-value">{feelsLike}°C</span>
            <span className="display-weather__stat-label">gevoel</span>
          </div>
          <div
            className="display-weather__stat"
            style={{
              borderColor: accentColor,
              backgroundColor: `${accentColor}33`,
            }}
          >
            <span className="display-weather__stat-value">{wind}</span>
            <span className="display-weather__stat-label">km/u</span>
          </div>
          <div
            className="display-weather__stat"
            style={{
              borderColor: accentColor,
              backgroundColor: `${accentColor}33`,
            }}
          >
            <span className="display-weather__stat-value">{precipProb}%</span>
            <span className="display-weather__stat-label">Regen</span>
          </div>
        </div>
      </div>

      <div className="display-weather__right">
        <div
          className="display-weather__forecast-header"
          style={{ borderBottomColor: accentColor }}
        >
          <h2 style={{ color: accentColor }}>VERWACHTING</h2>
          <h2>
            {formatDateTime.dateString} {formatDateTime.timeString}
          </h2>
        </div>

        <div ref={forecastBodyRef} className="display-weather__forecast-body">
          {daily && (
            <div ref={forecastContentRef}>
              {daily.time.map((dateStr, i) => {
                const d = new Date(dateStr + "T12:00:00");
                const dayLabel = DAYS_NL[d.getDay()];
                const wmo = getWmo(daily.weathercode[i]);
                return (
                  <div key={dateStr} className="display-weather__forecast-row">
                    <div className="display-weather__row-day">{dayLabel}</div>
                    <div className="display-weather__row-emoji">
                      <wmo.Icon
                        size="1em"
                        strokeWidth={1.5}
                        color={wmo.color}
                      />
                    </div>
                    <div className="display-weather__row-label">
                      {wmo.label}
                    </div>
                    <div
                      className="display-weather__row-max"
                      style={{ color: accentColor }}
                    >
                      {Math.round(daily.temperature_2m_max[i])}°
                    </div>
                    <div className="display-weather__row-min">
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

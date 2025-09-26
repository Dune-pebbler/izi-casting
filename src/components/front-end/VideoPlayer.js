import React, { useState, useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";

function VideoPlayer({ videoUrl, autoplay = true, loop = true, muted = true }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  const containerRef = useRef(null);
  const iframeRef = useRef(null);

  // Debug logging
  console.log("🎬 VideoPlayer render:", {
    videoUrl,
    autoplay,
    loop,
    muted,
  });

  // Extract video information from URL
  const extractVideoInfo = (url) => {
    if (!url) return null;

    // YouTube patterns
    const youtubePatterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];

    // Vimeo patterns
    const vimeoPatterns = [
      /vimeo\.com\/(\d+)/,
      /player\.vimeo\.com\/video\/(\d+)/,
    ];

    for (const pattern of youtubePatterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          type: "youtube",
          id: match[1],
          embedUrl: `https://www.youtube.com/embed/${match[1]}?autoplay=${
            autoplay ? 1 : 0
          }&loop=${loop ? 1 : 0}&mute=${
            muted ? 1 : 0
          }&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&fs=0&cc_load_policy=0&disablekb=1&playsinline=1&start=0&end=0&enablejsapi=1&origin=${
            window.location.origin
          }&adblock=1&no_ads=1`,
        };
      }
    }

    for (const pattern of vimeoPatterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          type: "vimeo",
          id: match[1],
          embedUrl: `https://player.vimeo.com/video/${match[1]}?autoplay=${
            autoplay ? 1 : 0
          }&loop=${loop ? 1 : 0}&muted=${
            muted ? 1 : 0
          }&controls=0&title=0&byline=0&portrait=0&transparent=0&background=0&responsive=1&dnt=1&app_id=1&no_ads=1&quality=1080p`,
        };
      }
    }

    return null;
  };

  useEffect(() => {
    if (!videoUrl) {
      setError("No video URL provided");
      setIsLoading(false);
      return;
    }

    const info = extractVideoInfo(videoUrl);
    if (!info) {
      setError(
        "Invalid video URL. Please provide a valid YouTube or Vimeo URL."
      );
      setIsLoading(false);
      return;
    }

    setVideoInfo(info);
    setError(null);
    setIsLoading(false);
  }, [videoUrl]);

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  // Handle iframe error
  const handleIframeError = () => {
    setError("Failed to load video. Please check the URL and try again.");
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="video-player-container loading">
        <div className="video-loading">
          <div className="loading-spinner"></div>
          <p>Loading video...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="video-player-container error">
        <div className="video-error">
          <AlertCircle size={48} />
          <h3>Video Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!videoInfo) {
    return (
      <div className="video-player-container error">
        <div className="video-error">
          <AlertCircle size={48} />
          <h3>No Video</h3>
          <p>Please provide a valid video URL</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      width="1920"
      height="1080"
      ref={iframeRef}
      src={videoInfo.embedUrl}
      title={`${videoInfo.type} video player`}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      onLoad={handleIframeLoad}
      onError={handleIframeError}
      className="video-iframe"
    />
  );
}

export default VideoPlayer;

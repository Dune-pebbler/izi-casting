import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, AlertCircle } from 'lucide-react';

function VideoPlayer({ videoUrl, autoplay = true, loop = true, muted = true }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const iframeRef = useRef(null);

  // Debug logging
  console.log("🎬 VideoPlayer render:", {
    videoUrl,
    autoplay,
    loop,
    muted
  });

  // Extract video information from URL
  const extractVideoInfo = (url) => {
    if (!url) return null;

    // YouTube patterns
    const youtubePatterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    // Vimeo patterns
    const vimeoPatterns = [
      /vimeo\.com\/(\d+)/,
      /player\.vimeo\.com\/video\/(\d+)/
    ];

    for (const pattern of youtubePatterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          type: 'youtube',
          id: match[1],
          embedUrl: `https://www.youtube.com/embed/${match[1]}?autoplay=${autoplay ? 1 : 0}&loop=${loop ? 1 : 0}&mute=${muted ? 1 : 0}&controls=1&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&fs=1&cc_load_policy=0&disablekb=1&playsinline=1&start=0&end=0&enablejsapi=1&origin=${window.location.origin}&adblock=1&no_ads=1`
        };
      }
    }

    for (const pattern of vimeoPatterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          type: 'vimeo',
          id: match[1],
          embedUrl: `https://player.vimeo.com/video/${match[1]}?autoplay=${autoplay ? 1 : 0}&loop=${loop ? 1 : 0}&muted=${muted ? 1 : 0}&controls=1&title=0&byline=0&portrait=0&transparent=0&background=0&responsive=1&dnt=1&app_id=1&no_ads=1`
        };
      }
    }

    return null;
  };

  useEffect(() => {
    if (!videoUrl) {
      setError('No video URL provided');
      setIsLoading(false);
      return;
    }

    const info = extractVideoInfo(videoUrl);
    if (!info) {
      setError('Invalid video URL. Please provide a valid YouTube or Vimeo URL.');
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
    if (autoplay) {
      setIsPlaying(true);
    }
  };

  // Handle iframe error
  const handleIframeError = () => {
    setError('Failed to load video. Please check the URL and try again.');
    setIsLoading(false);
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (iframeRef.current) {
      try {
        if (videoInfo?.type === 'youtube') {
          // YouTube API commands
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              event: 'command',
              func: isPlaying ? 'pauseVideo' : 'playVideo'
            }),
            '*'
          );
        } else if (videoInfo?.type === 'vimeo') {
          // Vimeo API commands
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              method: isPlaying ? 'pause' : 'play'
            }),
            '*'
          );
        }
        setIsPlaying(!isPlaying);
      } catch (error) {
        console.error('Error controlling video:', error);
      }
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (iframeRef.current) {
      try {
        if (videoInfo?.type === 'youtube') {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              event: 'command',
              func: isMuted ? 'unMute' : 'mute'
            }),
            '*'
          );
        } else if (videoInfo?.type === 'vimeo') {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              method: isMuted ? 'setVolume' : 'setVolume',
              value: isMuted ? 1 : 0
            }),
            '*'
          );
        }
        setIsMuted(!isMuted);
      } catch (error) {
        console.error('Error controlling volume:', error);
      }
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      } else if (containerRef.current.msRequestFullscreen) {
        containerRef.current.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Listen for messages from iframe (for play/pause state updates)
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== 'https://www.youtube.com' && event.origin !== 'https://player.vimeo.com') {
        return;
      }

      try {
        const data = JSON.parse(event.data);
        
        if (videoInfo?.type === 'youtube') {
          if (data.event === 'video-progress') {
            // Handle YouTube progress updates
          } else if (data.event === 'video-state-change') {
            setIsPlaying(data.info === 1); // 1 = playing, 2 = paused
          }
        } else if (videoInfo?.type === 'vimeo') {
          if (data.event === 'play') {
            setIsPlaying(true);
          } else if (data.event === 'pause') {
            setIsPlaying(false);
          }
        }
      } catch (error) {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [videoInfo]);

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
    <div className="video-player-container" ref={containerRef}>
      <div className="video-wrapper">
        <iframe
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
      </div>

      <div className="video-controls">
        <button
          className="control-btn play-pause-btn"
          onClick={togglePlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <button
          className="control-btn mute-btn"
          onClick={toggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

        <button
          className="control-btn fullscreen-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          <Maximize2 size={20} />
        </button>
      </div>

      <div className="video-info">
        <div className="video-platform">
          {videoInfo.type === 'youtube' ? 'YouTube' : 'Vimeo'}
        </div>
        <div className="video-id">ID: {videoInfo.id}</div>
      </div>
    </div>
  );
}

export default VideoPlayer;

import React, { useState, useEffect } from 'react';
import { Play, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { getVideoMetadata, formatDuration, estimateVideoDuration } from '../../../utils/videoMetadata';

function VideoUrlInput({ videoUrl, onVideoUrlChange, onRemoveVideo, onDurationChange }) {
  const [url, setUrl] = useState(videoUrl || '');
  const [isValid, setIsValid] = useState(false);
  const [videoType, setVideoType] = useState('');
  const [videoId, setVideoId] = useState('');
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [videoMetadata, setVideoMetadata] = useState(null);
  const [metadataError, setMetadataError] = useState(null);

  // Extract video ID and type from URL
  const extractVideoInfo = (url) => {
    if (!url) {
      setIsValid(false);
      setVideoType('');
      setVideoId('');
      setVideoMetadata(null);
      setMetadataError(null);
      return;
    }

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
        setVideoType('youtube');
        setVideoId(match[1]);
        setIsValid(true);
        return { type: 'youtube', id: match[1] };
      }
    }

    for (const pattern of vimeoPatterns) {
      const match = url.match(pattern);
      if (match) {
        setVideoType('vimeo');
        setVideoId(match[1]);
        setIsValid(true);
        return { type: 'vimeo', id: match[1] };
      }
    }

    setIsValid(false);
    setVideoType('');
    setVideoId('');
    setVideoMetadata(null);
    setMetadataError(null);
    return null;
  };

  // Fetch video metadata and update duration
  const fetchAndSetVideoMetadata = async (url) => {
    const videoInfo = extractVideoInfo(url);
    if (!videoInfo) {
      console.log('❌ No video info extracted, skipping metadata fetch');
      return;
    }

    console.log('🔄 Starting metadata fetch for:', videoInfo);
    setIsLoadingMetadata(true);
    setMetadataError(null);

    try {
      const metadata = await getVideoMetadata(url);
      console.log('✅ Metadata fetch successful:', metadata);
      setVideoMetadata(metadata);
      
      // If we have duration, automatically set it
      if (metadata.duration && onDurationChange) {
        console.log(`🎬 Auto-setting video duration: ${metadata.duration} seconds (${formatDuration(metadata.duration)})`);
        onDurationChange(metadata.duration);
      } else if (videoInfo.type === 'youtube' && onDurationChange) {
        // For YouTube, try to estimate duration based on title or use a reasonable default
        const estimatedDuration = estimateVideoDuration(videoInfo.id, metadata?.title || '');
        console.log(`🎬 Using estimated duration for YouTube video: ${estimatedDuration} seconds`);
        onDurationChange(estimatedDuration);
      }
    } catch (error) {
      console.error('❌ Error fetching video metadata:', error);
      setMetadataError(error.message);
      
      // Still set a default duration even if metadata fetch fails
      if (onDurationChange) {
        const defaultDuration = videoInfo.type === 'youtube' ? 240 : 60; // 4 minutes for YouTube, 1 minute for Vimeo
        console.log(`🎬 Using fallback duration: ${defaultDuration} seconds`);
        onDurationChange(defaultDuration);
      }
    } finally {
      console.log('🏁 Metadata fetch completed, setting loading to false');
      setIsLoadingMetadata(false);
    }
  };

  useEffect(() => {
    if (url && url.trim()) {
      // Debounce the metadata fetching to avoid too many API calls
      const timeoutId = setTimeout(() => {
        console.log('⏰ Debounce timeout reached, starting metadata fetch for:', url);
        fetchAndSetVideoMetadata(url);
      }, 1000); // Wait 1 second after user stops typing

      return () => {
        console.log('🧹 Clearing debounce timeout');
        clearTimeout(timeoutId);
      };
    } else {
      console.log('📝 Empty URL, extracting video info only');
      extractVideoInfo(url);
    }
  }, [url]);

  useEffect(() => {
    if (videoUrl !== url) {
      setUrl(videoUrl || '');
    }
  }, [videoUrl]);

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    onVideoUrlChange(newUrl);
  };

  const handleRemove = () => {
    setUrl('');
    setVideoType('');
    setVideoId('');
    setIsValid(false);
    setVideoMetadata(null);
    setMetadataError(null);
    onRemoveVideo();
  };

  const getVideoPreviewUrl = () => {
    if (!isValid || !videoId) return '';

    if (videoType === 'youtube') {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    } else if (videoType === 'vimeo') {
      // Vimeo doesn't have a simple thumbnail API, so we'll use a placeholder
      return `https://vumbnail.com/${videoId}.jpg`;
    }
    return '';
  };

  return (
    <div className="video-url-input">
      <div className="video-input-header">
        <label htmlFor="video-url" className="video-input-label">
          <Play size={16} />
          Video URL (YouTube or Vimeo)
        </label>
        {isValid && (
          <button
            type="button"
            onClick={handleRemove}
            className="btn btn-sm btn-danger remove-video-btn"
            title="Remove video"
          >
            Remove
          </button>
        )}
      </div>

      <div className="video-input-container">
        <input
          id="video-url"
          type="url"
          className={`video-url-field ${isValid ? 'valid' : url ? 'invalid' : ''}`}
          value={url}
          onChange={handleUrlChange}
          placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
        />
        
        {url && (
          <div className="video-validation">
            {isLoadingMetadata ? (
              <div className="validation-loading">
                <Loader2 size={16} className="animate-spin" />
                <span>Loading video information...</span>
              </div>
            ) : isValid ? (
              <div className="validation-success">
                <CheckCircle size={16} />
                <span>
                  {videoType === 'youtube' ? 'YouTube' : 'Vimeo'} video detected
                </span>
                {videoMetadata && (
                  <div className="video-metadata-info">
                    {videoMetadata.title && (
                      <div className="video-title">
                        <strong>Title:</strong> {videoMetadata.title}
                      </div>
                    )}
                    {videoMetadata.duration && (
                      <div className="video-duration">
                        <Clock size={14} />
                        <strong>Duration:</strong> {formatDuration(videoMetadata.duration)}
                      </div>
                    )}
                  </div>
                )}
                {metadataError && (
                  <div className="metadata-warning">
                    <AlertCircle size={14} />
                    <span>Could not fetch video details, using estimated duration</span>
                  </div>
                )}
                {videoMetadata && !videoMetadata.duration && videoType === 'youtube' && (
                  <div className="metadata-info">
                    <Clock size={14} />
                    <span>Duration estimated from title. You can adjust it manually in the duration field above.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="validation-error">
                <AlertCircle size={16} />
                <span>Please enter a valid YouTube or Vimeo URL</span>
              </div>
            )}
          </div>
        )}

        {isValid && videoId && (
          <div className="video-preview">
            <div className="video-preview-container">
              <img
                src={getVideoPreviewUrl()}
                alt="Video preview"
                className="video-preview-thumbnail"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div className="video-preview-overlay">
                <Play size={24} />
              </div>
            </div>
            <div className="video-info">
              <div className="video-type">
                {videoType === 'youtube' ? 'YouTube' : 'Vimeo'}
              </div>
              <div className="video-id">ID: {videoId}</div>
            </div>
          </div>
        )}
      </div>

      <div className="video-help">
        <p>Supported formats:</p>
        <ul>
          <li>YouTube: youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/...</li>
          <li>Vimeo: vimeo.com/..., player.vimeo.com/video/...</li>
        </ul>
      </div>
    </div>
  );
}

export default VideoUrlInput;

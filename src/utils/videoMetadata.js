// Video metadata service for fetching duration from YouTube and Vimeo

/**
 * Extract video ID and type from URL
 */
export const extractVideoInfo = (url) => {
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
        id: match[1]
      };
    }
  }

  for (const pattern of vimeoPatterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        type: 'vimeo',
        id: match[1]
      };
    }
  }

  return null;
};

/**
 * Fetch YouTube video metadata using multiple methods
 * 1. Try YouTube Data API v3 (requires API key)
 * 2. Fallback to oEmbed API (no duration)
 * 3. Try alternative public APIs
 */
export const fetchYouTubeMetadata = async (videoId) => {
  console.log(`🎬 Starting YouTube metadata fetch for video ID: ${videoId}`);
  
  try {
    // Method 1: Try YouTube Data API v3 (if API key is available)
    const apiKey = process.env.REACT_APP_YOUTUBE_API_KEY;
    if (apiKey) {
      console.log('🔑 YouTube API key found, trying official API...');
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails,snippet&key=${apiKey}`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ YouTube Data API v3 response:', data);
          if (data.items && data.items.length > 0) {
            const video = data.items[0];
            const duration = parseYouTubeDuration(video.contentDetails.duration);
            console.log(`🎬 YouTube duration parsed: ${duration} seconds`);
            return {
              title: video.snippet.title,
              thumbnail: video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high?.url,
              duration: duration
            };
          }
        } else {
          console.warn(`❌ YouTube Data API v3 failed with status: ${response.status}`);
        }
      } catch (apiError) {
        if (apiError.name === 'AbortError') {
          console.warn('⏰ YouTube Data API v3 timed out after 10 seconds');
        } else {
          console.warn('❌ YouTube Data API v3 failed:', apiError);
        }
      }
    } else {
      console.log('🔑 No YouTube API key found, skipping official API');
    }

    // Method 2: Try public APIs that provide video duration
    console.log('🌐 Trying public APIs for YouTube metadata...');
    try {
      // Try multiple public APIs for YouTube video information
      const publicApis = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
        `https://corsproxy.io/?${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`
      ];

      for (let i = 0; i < publicApis.length; i++) {
        const apiUrl = publicApis[i];
        console.log(`🌐 Trying public API ${i + 1}/${publicApis.length}: ${apiUrl.split('?')[0]}...`);
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout per API
          
          const response = await fetch(apiUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            const htmlContent = data.contents || data;
            
            console.log(`📄 Got HTML content from API ${i + 1}, length: ${htmlContent?.length || 0} characters`);
            
            // Extract duration from the HTML content
            const duration = extractDurationFromYouTubeHTML(htmlContent);
            if (duration) {
              console.log(`🎬 Found YouTube duration: ${duration} seconds using public API ${i + 1}`);
              // Get basic info from oEmbed
              const oembedResponse = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
              if (oembedResponse.ok) {
                const oembedData = await oembedResponse.json();
                return {
                  title: oembedData.title,
                  thumbnail: oembedData.thumbnail_url,
                  duration: duration
                };
              }
            } else {
              console.log(`❌ No duration found in HTML from API ${i + 1}`);
            }
          } else {
            console.warn(`❌ Public API ${i + 1} failed with status: ${response.status}`);
          }
        } catch (apiError) {
          if (apiError.name === 'AbortError') {
            console.warn(`⏰ Public API ${i + 1} timed out after 8 seconds`);
          } else {
            console.warn(`❌ Public API ${i + 1} failed:`, apiError.message);
          }
          continue; // Try next API
        }
      }
    } catch (altError) {
      console.warn('❌ All alternative YouTube APIs failed:', altError);
    }

    // Method 3: Fallback to oEmbed (no duration)
    console.log('📡 Trying YouTube oEmbed API as fallback...');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`YouTube oEmbed API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ YouTube oEmbed API response:', data);
      
      return {
        title: data.title,
        thumbnail: data.thumbnail_url,
        duration: null // No duration available from oEmbed
      };
    } catch (oembedError) {
      if (oembedError.name === 'AbortError') {
        console.warn('⏰ YouTube oEmbed API timed out after 5 seconds');
      } else {
        console.warn('❌ YouTube oEmbed API failed:', oembedError);
      }
      throw oembedError;
    }
  } catch (error) {
    console.error('❌ Error fetching YouTube metadata:', error);
    throw error;
  }
};

/**
 * Parse YouTube duration format (PT4M27S) to seconds
 */
const parseYouTubeDuration = (duration) => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  
  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Extract duration from YouTube HTML content
 */
const extractDurationFromYouTubeHTML = (htmlContent) => {
  try {
    // Look for duration in various places in the HTML
    const patterns = [
      // Pattern 1: Look for "PT4M27S" format in JSON-LD
      /"duration":"PT(\d+)H?(\d+)M?(\d+)S?"/,
      // Pattern 2: Look for duration in meta tags
      /"duration":"(\d+):(\d+):(\d+)"/,
      // Pattern 3: Look for duration in player config
      /"length_seconds":(\d+)/,
      // Pattern 4: Look for duration in video details
      /"approxDurationMs":"(\d+)"/
    ];

    for (const pattern of patterns) {
      const match = htmlContent.match(pattern);
      if (match) {
        if (pattern.source.includes('PT')) {
          // ISO 8601 duration format (PT4M27S)
          const hours = parseInt(match[1]) || 0;
          const minutes = parseInt(match[2]) || 0;
          const seconds = parseInt(match[3]) || 0;
          return hours * 3600 + minutes * 60 + seconds;
        } else if (pattern.source.includes('length_seconds')) {
          // Direct seconds format
          return parseInt(match[1]);
        } else if (pattern.source.includes('approxDurationMs')) {
          // Milliseconds format
          return Math.floor(parseInt(match[1]) / 1000);
        } else if (pattern.source.includes(':')) {
          // HH:MM:SS format
          const hours = parseInt(match[1]) || 0;
          const minutes = parseInt(match[2]) || 0;
          const seconds = parseInt(match[3]) || 0;
          return hours * 3600 + minutes * 60 + seconds;
        }
      }
    }

    // Try to find duration in the page title or description
    const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) {
      const title = titleMatch[1];
      const durationMatch = title.match(/(\d+):(\d+)/);
      if (durationMatch) {
        const minutes = parseInt(durationMatch[1]);
        const seconds = parseInt(durationMatch[2]);
        return minutes * 60 + seconds;
      }
    }

    return null;
  } catch (error) {
    console.warn('Error extracting duration from YouTube HTML:', error);
    return null;
  }
};

/**
 * Fetch Vimeo video metadata using Vimeo API
 */
export const fetchVimeoMetadata = async (videoId) => {
  try {
    // Vimeo oEmbed API provides more information including duration
    const response = await fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`);
    
    if (!response.ok) {
      throw new Error(`Vimeo API error: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('Vimeo API response:', data); // Debug log
    
    return {
      title: data.title,
      thumbnail: data.thumbnail_url,
      duration: data.duration || null // Vimeo provides duration in seconds
    };
  } catch (error) {
    console.error('Error fetching Vimeo metadata:', error);
    throw error;
  }
};

/**
 * Get video metadata (title, thumbnail, duration) from URL
 */
export const getVideoMetadata = async (url) => {
  console.log(`🎬 Starting video metadata fetch for URL: ${url}`);
  
  const videoInfo = extractVideoInfo(url);
  
  if (!videoInfo) {
    console.error('❌ Invalid video URL - could not extract video info');
    throw new Error('Invalid video URL');
  }

  console.log(`🎬 Extracted video info:`, videoInfo);

  try {
    if (videoInfo.type === 'youtube') {
      console.log('📺 Fetching YouTube metadata...');
      const metadata = await fetchYouTubeMetadata(videoInfo.id);
      console.log('✅ YouTube metadata fetched successfully:', metadata);
      return {
        ...metadata,
        type: 'youtube',
        id: videoInfo.id
      };
    } else if (videoInfo.type === 'vimeo') {
      console.log('📺 Fetching Vimeo metadata...');
      const metadata = await fetchVimeoMetadata(videoInfo.id);
      console.log('✅ Vimeo metadata fetched successfully:', metadata);
      return {
        ...metadata,
        type: 'vimeo',
        id: videoInfo.id
      };
    }
  } catch (error) {
    console.error('❌ Error fetching video metadata:', error);
    throw error;
  }
};

/**
 * Estimate video duration for YouTube videos (fallback when API doesn't provide duration)
 * This is a rough estimation based on common video lengths and patterns
 */
export const estimateVideoDuration = (videoId, videoTitle = '') => {
  // For YouTube, we can't get exact duration without API key
  // So we'll use a reasonable default based on common video lengths
  
  // Try to make a smarter estimation based on video title patterns
  const title = videoTitle.toLowerCase();
  
  // Music videos are typically 3-5 minutes
  if (title.includes('official video') || title.includes('music video') || 
      title.includes('lyrics') || title.includes('song')) {
    return 240; // 4 minutes
  }
  
  // Shorts are typically 15-60 seconds
  if (title.includes('short') || title.includes('#shorts')) {
    return 30; // 30 seconds
  }
  
  // Tutorials and how-to videos are typically 5-15 minutes
  if (title.includes('tutorial') || title.includes('how to') || 
      title.includes('guide') || title.includes('lesson')) {
    return 600; // 10 minutes
  }
  
  // Live streams and long-form content
  if (title.includes('live') || title.includes('stream') || 
      title.includes('podcast') || title.includes('interview')) {
    return 1800; // 30 minutes
  }
  
  // Default to 4 minutes for most content
  return 240; // 4 minutes in seconds
};

/**
 * Format duration in seconds to human readable format
 */
export const formatDuration = (seconds) => {
  if (!seconds) return 'Unknown';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  } else {
    return `${minutes}m ${remainingSeconds}s`;
  }
};

/**
 * Parse duration string to seconds
 */
export const parseDuration = (durationString) => {
  if (!durationString) return 0;
  
  // Handle formats like "2m 30s", "30s", "2:30", etc.
  const match = durationString.match(/(?:(\d+)m\s*)?(?:(\d+)s)?/);
  if (match) {
    const minutes = parseInt(match[1]) || 0;
    const seconds = parseInt(match[2]) || 0;
    return minutes * 60 + seconds;
  }
  
  // Handle MM:SS format
  const timeMatch = durationString.match(/(\d+):(\d+)/);
  if (timeMatch) {
    const minutes = parseInt(timeMatch[1]);
    const seconds = parseInt(timeMatch[2]);
    return minutes * 60 + seconds;
  }
  
  return 0;
};

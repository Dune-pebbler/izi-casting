import React, { useState, useEffect, useCallback, memo } from "react";
import { sanitizeHTMLContent } from "../../utils/sanitize";
import { parseFeed, validateFeedItems } from "../../utils/rssParser";

function Feed({ feeds, settings }) {
  const [rssFeed, setRssFeed] = useState([]);
  const [currentFeedIndex, setCurrentFeedIndex] = useState(0);

  const fetchRssFeedItems = useCallback(async (url) => {
    if (!url) return [];

    try {
      const proxies = [
        { url: `https://corsproxy.io/?${encodeURIComponent(url)}`, extractData: (data) => data },
        { url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, extractData: (data) => data },
        { url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, extractData: (data) => JSON.parse(data).contents },
        { url: `https://thingproxy.freeboard.io/fetch/${url}`, extractData: (data) => data },
        { url: `https://cors-anywhere.herokuapp.com/${url}`, extractData: (data) => data },
      ];

      let feedData = null;
      let lastError = null;

      for (const proxy of proxies) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);

          const response = await fetch(proxy.url, {
            method: "GET",
            headers: {
              Accept: "application/rss+xml, application/xml, text/xml, application/json, */*",
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const contentType = response.headers.get('content-type') || '';
          let data;

          if (contentType.includes('application/json')) {
            const jsonResponse = await response.json();
            data = proxy.extractData(JSON.stringify(jsonResponse));
          } else {
            data = await response.text();
            data = proxy.extractData(data);
          }

          if (data && data.startsWith('data:application/rss+xml;')) {
            data = atob(data.split(',')[1]);
          }

          if (data && data.trim().length > 0) {
            feedData = data;
            break;
          }
        } catch (error) {
          lastError = error;
        }
      }

      if (!feedData) {
        try {
          const directResponse = await fetch(url, {
            method: "GET",
            headers: { Accept: "application/rss+xml, application/xml, text/xml, */*" },
          });
          if (directResponse.ok) {
            feedData = await directResponse.text();
          } else {
            throw new Error(`Direct fetch failed: ${directResponse.status}`);
          }
        } catch (directError) {
          throw new Error(`All fetch methods failed. Last error: ${lastError?.message || 'Unknown'}`);
        }
      }

      const trimmedData = feedData.trim().toLowerCase();
      if (trimmedData.startsWith('<!doctype html') || trimmedData.startsWith('<html')) {
        throw new Error("Received HTML instead of RSS/XML/JSON feed.");
      }

      const { items } = parseFeed(feedData);
      return validateFeedItems(items);

    } catch (error) {
      console.error(`Error fetching feed from ${url}:`, error.message);
      return [];
    }
  }, []);

  // Calculate reading time based on content length
  const calculateReadingTime = useCallback((title, description) => {
    const wordsPerMinute = 200; // Average reading speed
    const titleWords = (title || '').split(/\s+/).length;
    const descriptionWords = (description || '').split(/\s+/).length;
    const totalWords = titleWords + descriptionWords;
    
    // Calculate reading time in seconds
    const readingTimeSeconds = (totalWords / wordsPerMinute) * 60;
    
    // Make duration 50% longer by multiplying by 1.5
    const extendedReadingTime = readingTimeSeconds * 1.5;
    
    // Set minimum duration of 3 seconds and maximum of 45 seconds (increased from 30 to accommodate 50% longer)
    const minDuration = 3;
    const maxDuration = 45;
    
    return Math.max(minDuration, Math.min(maxDuration, Math.ceil(extendedReadingTime)));
  }, []);

  // Load RSS feeds when feeds change with debouncing
  useEffect(() => {
    if (feeds.length > 0) {
      const timeoutId = setTimeout(() => {
        const enabledFeeds = feeds.filter(feed =>
          feed.isEnabled !== false &&
          feed.isVisible !== false &&
          feed.url &&
          feed.url.trim() !== ''
        );
        
        const feedPromises = enabledFeeds.map(async (feed, index) => {
          try {
            const items = await fetchRssFeedItems(feed.url);
            const limitedItems = (items || []).slice(0, feed.maxPosts || 5).map(item => ({
              ...item,
              dynamicDuration: calculateReadingTime(item.title, item.description),
              feedId: feed.id,
              feedName: feed.name,
              maxPosts: feed.maxPosts || 5
            }));
            return { ...feed, items: limitedItems };
          } catch (error) {
            console.error(`Error processing feed ${feed.name}:`, error.message);
            return { ...feed, items: [], error: error.message };
          }
        });

        Promise.all(feedPromises).then(feedResults => {
          const allItems = feedResults.flatMap(result => result.items);
          setRssFeed(allItems);
          setCurrentFeedIndex(0);
        }).catch(error => {
          console.error('Error loading feeds:', error);
          setRssFeed([]);
        });
      }, 1000);

      return () => clearTimeout(timeoutId);
    } else {
      setRssFeed([]);
    }
  }, [feeds, fetchRssFeedItems, calculateReadingTime]);

  // Rotate through RSS feed items with dynamic duration
  useEffect(() => {
    if (rssFeed.length === 0) return;

    let currentIndex = 0;
    let timeoutId = null;

    const rotateFeeds = () => {
      const currentItem = rssFeed[currentIndex];
      const duration = (currentItem.dynamicDuration || 10) * 1000;

      setCurrentFeedIndex(currentIndex);

      timeoutId = setTimeout(() => {
        currentIndex = (currentIndex + 1) % rssFeed.length;
        rotateFeeds();
      }, duration);
    };

    rotateFeeds();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [rssFeed]);

  if (rssFeed.length === 0) {
    return null;
  }

  const currentItem = rssFeed[currentFeedIndex];

  return (
    <div className="feed-container">
      <div className="rss-item">
        <div 
          className="rss-title"
          style={{ color: settings.foregroundColor }}
        >
          {currentItem?.title || "No title"}
        </div>
        <div className="rss-description-container">
          <div 
            className="rss-description"
            style={{ color: settings.foregroundColor }}
            ref={(el) => {
              if (el && currentItem?.description) {
                // Use requestAnimationFrame to defer the measurement to avoid render loops
                requestAnimationFrame(() => {
                  // Temporarily remove line clamp to measure full text width
                  const originalStyle = el.style.cssText;
                  el.style.webkitLineClamp = 'unset';
                  el.style.display = 'block';
                  el.style.whiteSpace = 'nowrap';
                  el.style.overflow = 'visible';
                  
                  // Check if text overflows the container
                  const containerWidth = el.parentElement.clientWidth;
                  const textWidth = el.scrollWidth;
                  const isOverflowing = textWidth > containerWidth;
                  
                  if (isOverflowing) {
                    el.classList.add('scrolling-text');
                    
                    // Calculate scroll distance to show the full text
                    const scrollDistance = textWidth - containerWidth;
                    
                    // Use a consistent scroll speed for all content
                    const consistentScrollSpeed = 150; // pixels per second - consistent for all content
                    
                    // Calculate the time needed to scroll the full distance at consistent speed
                    const scrollTime = (scrollDistance / consistentScrollSpeed) * 1000; // convert to milliseconds
                    
                    // Add pause time at start and end (2 seconds total: 1s start + 1s end)
                    const pauseTime = 1000; // 1 second pause at start and end
                    const totalAnimationDuration = scrollTime + (pauseTime * 2);
                    
                    // Update the feed item's duration to match the calculated time
                    if (currentItem) {
                      currentItem.dynamicDuration = Math.max(totalAnimationDuration / 1000, 5); // minimum 5 seconds
                    }
                    
                    // Create and apply the animation with consistent timing
                    const startPauseRatio = pauseTime / totalAnimationDuration;
                    const endPauseRatio = (totalAnimationDuration - pauseTime) / totalAnimationDuration;
                    
                    // Create keyframes with consistent timing
                    const keyframes = [
                      { transform: 'translateX(0)', offset: 0 },
                      { transform: 'translateX(0)', offset: startPauseRatio },
                      { transform: `translateX(-${scrollDistance}px)`, offset: endPauseRatio },
                      { transform: `translateX(-${scrollDistance}px)`, offset: 1 }
                    ];
                    
                    const animationOptions = {
                      duration: totalAnimationDuration,
                      easing: 'linear',
                      fill: 'forwards'
                    };
                    
                    // Check if animation is already running for this feed item
                    const existingAnimations = el.getAnimations();
                    const isAlreadyAnimating = existingAnimations.some(anim => 
                      anim.playState === 'running' && 
                      anim.effect && 
                      anim.effect.getKeyframes().some(kf => 
                        kf.transform && kf.transform.includes(`translateX(-${scrollDistance}px)`)
                      )
                    );
                    
                    // Also check if we've already set up animation for this specific item
                    const animationKey = `${currentItem?.title}-${scrollDistance}-${totalAnimationDuration}`;
                    const hasAnimated = el.dataset.animationKey === animationKey;
                    
                    if (!isAlreadyAnimating && !hasAnimated) {
                      // Stop any existing animation
                      el.getAnimations().forEach(anim => anim.cancel());
                      
                      // Mark this element as having been animated
                      el.dataset.animationKey = animationKey;
                      
                      // Add a small delay to prevent jump on re-render
                      setTimeout(() => {
                        // Start the new animation
                        el.animate(keyframes, animationOptions);
                      }, 100);
                    }
                    
                    // console.log(`🎬 Scrolling animation started:`, {
                    //   scrollDistance: `${scrollDistance}px`,
                    //   duration: `${totalAnimationDuration}ms`,
                    //   feedDuration: `${currentItem?.dynamicDuration || 10}s`,
                    //   scrollSpeed: `${consistentScrollSpeed}px/s`,
                    //   pauseTime: `${pauseTime}ms`
                    // });
                  } else {
                    el.classList.remove('scrolling-text');
                    // Stop any existing animation
                    el.getAnimations().forEach(anim => anim.cancel());
                  }
                  
                  // Restore original style
                  el.style.cssText = originalStyle;
                });
              }
            }}
          >
            {currentItem?.description || "No description"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(Feed);

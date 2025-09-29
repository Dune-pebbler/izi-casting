import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import { sanitizeHTMLContent } from "../../utils/sanitize";

function Feed({ feeds, settings }) {
  const [rssFeed, setRssFeed] = useState([]);
  const [currentFeedIndex, setCurrentFeedIndex] = useState(0);

  // Fetch RSS feed and return items (for multiple feeds support)
  const fetchRssFeedItems = useCallback(async (url) => {
    if (!url) {
      console.warn("fetchRssFeedItems: No URL provided");
      return [];
    }

    console.log(`fetchRssFeedItems: Starting fetch for URL: ${url}`);

    try {
      // Try multiple CORS proxies for better reliability
      const proxies = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        `https://cors-anywhere.herokuapp.com/${url}`,
        `https://thingproxy.freeboard.io/fetch/${url}`,
      ];

      let feedData = null;
      let lastError = null;
      let successfulProxy = null;

      for (const proxyUrl of proxies) {
        try {
          console.log(`fetchRssFeedItems: Trying proxy: ${proxyUrl}`);
          const response = await fetch(proxyUrl, {
            method: "GET",
            headers: {
              Accept: "application/rss+xml, application/xml, text/xml, */*",
              "User-Agent": "Mozilla/5.0 (compatible; RSSReader/1.0)",
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          let data;
          if (proxyUrl.includes("allorigins.win")) {
            const jsonData = await response.json();
            data = jsonData.contents;
            console.log(`fetchRssFeedItems: Got data from allorigins.win, length: ${data?.length || 0}`);
          } else if (proxyUrl.includes("corsproxy.io")) {
            data = await response.text();
            console.log(`fetchRssFeedItems: Got data from corsproxy.io, length: ${data?.length || 0}`);
          } else if (proxyUrl.includes("codetabs.com")) {
            data = await response.text();
            console.log(`fetchRssFeedItems: Got data from codetabs.com, length: ${data?.length || 0}`);
          } else {
            data = await response.text();
            console.log(`fetchRssFeedItems: Got data from ${proxyUrl}, length: ${data?.length || 0}`);
          }

          // Handle base64 data URLs (some proxies return data this way)
          if (data && data.startsWith('data:application/rss+xml;')) {
            console.log('fetchRssFeedItems: Detected base64 data URL, decoding...');
            try {
              const base64Data = data.split(',')[1];
              const decodedData = atob(base64Data);
              data = decodedData;
              console.log(`fetchRssFeedItems: Decoded base64 data, new length: ${data.length}`);
            } catch (decodeError) {
              console.error('fetchRssFeedItems: Failed to decode base64 data:', decodeError);
              throw new Error('Failed to decode base64 RSS data');
            }
          }

          if (data && data.trim().length > 0) {
            feedData = data;
            successfulProxy = proxyUrl;
            console.log(`fetchRssFeedItems: Successfully fetched data from ${proxyUrl}`);
            break;
          } else {
            console.warn(`fetchRssFeedItems: Empty data from ${proxyUrl}`);
          }
        } catch (error) {
          lastError = error;
          console.warn(`fetchRssFeedItems: Proxy ${proxyUrl} failed:`, error.message);
          continue;
        }
      }

      if (!feedData) {
        console.error("fetchRssFeedItems: All proxies failed. Last error:", lastError);
        console.warn("fetchRssFeedItems: Trying direct fetch as last resort...");
        
        // Try direct fetch as last resort (may fail due to CORS)
        try {
          const directResponse = await fetch(url, {
            method: "GET",
            headers: {
              Accept: "application/rss+xml, application/xml, text/xml, */*",
              "User-Agent": "Mozilla/5.0 (compatible; RSSReader/1.0)",
            },
          });
          
          if (directResponse.ok) {
            feedData = await directResponse.text();
            successfulProxy = "direct";
            console.log("fetchRssFeedItems: Direct fetch succeeded!");
          } else {
            throw new Error(`Direct fetch failed: ${directResponse.status}`);
          }
        } catch (directError) {
          console.error("fetchRssFeedItems: Direct fetch also failed:", directError);
          throw new Error(`All CORS proxies failed and direct fetch blocked by CORS. Last proxy error: ${lastError?.message || 'Unknown error'}`);
        }
      }

      console.log(`fetchRssFeedItems: Successfully fetched data from ${successfulProxy}, parsing XML...`);
      console.log(`fetchRssFeedItems: XML content preview (first 200 chars):`, feedData.substring(0, 200));

      // Check if we got HTML instead of RSS/XML
      if (feedData.trim().toLowerCase().startsWith('<!doctype html') || 
          feedData.trim().toLowerCase().startsWith('<html')) {
        console.error("fetchRssFeedItems: Received HTML instead of RSS/XML feed");
        console.error("fetchRssFeedItems: This usually means the URL is incorrect or the site doesn't provide RSS");
        console.error("fetchRssFeedItems: Raw data preview:", feedData.substring(0, 200));
        throw new Error("Received HTML instead of RSS/XML feed. Please check the URL.");
      }

      // Check if the feed data is JSON or XML
      let feedItems = [];
      
      try {
        // Try to parse as JSON first
        const jsonData = JSON.parse(feedData);
        console.log("fetchRssFeedItems: Successfully detected JSON feed format");
        
        if (Array.isArray(jsonData)) {
          feedItems = jsonData.map((item, index) => {
            const feedItem = item.item || item; // Handle both {item: {...}} and direct item structure
            
            // Extract title - handle CDATA sections
            let title = "";
            if (feedItem.title) {
              if (typeof feedItem.title === 'string') {
                title = feedItem.title;
              } else if (feedItem.title['#cdata-section']) {
                title = feedItem.title['#cdata-section'];
              } else if (feedItem.title.textContent) {
                title = feedItem.title.textContent;
              }
            }
            
            // Extract description - handle CDATA sections
            let description = "";
            if (feedItem.description) {
              if (typeof feedItem.description === 'string') {
                description = feedItem.description;
              } else if (feedItem.description['#cdata-section']) {
                description = feedItem.description['#cdata-section'];
              } else if (feedItem.description.textContent) {
                description = feedItem.description.textContent;
              }
            }
            
            // Clean up HTML tags from description
            if (description) {
              const tempDiv = document.createElement("div");
              tempDiv.innerHTML = description;
              description = tempDiv.textContent || tempDiv.innerText || "";
            }
            
            // Extract link - handle CDATA sections
            let link = "";
            if (feedItem.link) {
              if (typeof feedItem.link === 'string') {
                link = feedItem.link;
              } else if (feedItem.link['#cdata-section']) {
                link = feedItem.link['#cdata-section'];
              } else if (feedItem.link.textContent) {
                link = feedItem.link.textContent;
              }
            }
            
            // Extract category - handle CDATA sections
            let category = "";
            if (feedItem.category) {
              if (typeof feedItem.category === 'string') {
                category = feedItem.category;
              } else if (feedItem.category['#cdata-section']) {
                category = feedItem.category['#cdata-section'];
              } else if (feedItem.category.textContent) {
                category = feedItem.category.textContent;
              }
            }
            
            // Extract date
            const pubDate = feedItem.pubDate || feedItem.date || "";
            
            const parsedItem = {
              title: title.trim(),
              description: description.trim(),
              link: link.trim(),
              category: category.trim(),
              pubDate: pubDate.trim(),
            };

            if (index < 3) { // Log first 3 items for debugging
              console.log(`fetchRssFeedItems: JSON Item ${index + 1}:`, {
                title: parsedItem.title.substring(0, 50) + (parsedItem.title.length > 50 ? '...' : ''),
                hasDescription: !!parsedItem.description,
                hasLink: !!parsedItem.link,
                category: parsedItem.category
              });
            }

            return parsedItem;
          }).filter((item) => item.title || item.description); // Only include items with content
        }
        
        console.log(`fetchRssFeedItems: Successfully parsed ${feedItems.length} JSON feed items from ${url}`);
        return feedItems;
        
      } catch (jsonError) {
        console.log("fetchRssFeedItems: Not JSON format, trying XML parsing...");
        
        // Parse the XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(feedData, "text/xml");

        // Check for parsing errors
        const parseError = xmlDoc.querySelector("parsererror");
        if (parseError) {
          console.error("fetchRssFeedItems: XML parsing failed. Parse error details:", parseError.textContent);
          console.error("fetchRssFeedItems: Raw feed data (first 500 chars):", feedData.substring(0, 500));
          throw new Error(`XML parsing failed: ${parseError.textContent}`);
        }

        // Try different RSS/Atom/RDF selectors
        let items = xmlDoc.querySelectorAll("item");
        let feedType = "RSS 2.0";
        
        if (items.length === 0) {
          items = xmlDoc.querySelectorAll("entry"); // Atom format
          feedType = "Atom";
          console.log(`fetchRssFeedItems: Found ${items.length} Atom entries`);
        } else {
          console.log(`fetchRssFeedItems: Found ${items.length} RSS 2.0 items`);
        }

        // Try RDF/RSS 1.0 format if no items found
        if (items.length === 0) {
          // Try different RDF selectors
          items = xmlDoc.querySelectorAll("rdf\\:li, li, rdf\\:item, item"); // RDF/RSS 1.0 format
          if (items.length > 0) {
            feedType = "RDF/RSS 1.0";
            console.log(`fetchRssFeedItems: Found ${items.length} RDF items`);
          }
        }

        if (items.length === 0) {
          console.warn("fetchRssFeedItems: No RSS items, Atom entries, or RDF items found in feed");
          console.log("fetchRssFeedItems: Available elements in XML:", Array.from(xmlDoc.documentElement.children).map(el => el.tagName));
          console.log("fetchRssFeedItems: Root element:", xmlDoc.documentElement.tagName);
          console.log("fetchRssFeedItems: Root namespace:", xmlDoc.documentElement.namespaceURI);
        } else {
          console.log(`fetchRssFeedItems: Successfully detected ${feedType} format with ${items.length} items`);
        }

        const feedItems = Array.from(items)
          .map((item, index) => {
            // Helper function to get text content from various selectors
            const getTextContent = (selectors) => {
              for (const selector of selectors) {
                const element = item.querySelector(selector);
                if (element && element.textContent) {
                  return element.textContent;
                }
              }
              return "";
            };

            // Try different ways to get title (support CDATA and various formats)
            let title = getTextContent([
              "title",
              "name", 
              "dc\\:title"
            ]);

            // Try different ways to get description (support CDATA and various formats)
            let description = getTextContent([
              "description",
              "summary",
              "content",
              "dc\\:description"
            ]);

            // Clean up HTML tags from description
            if (description) {
              const tempDiv = document.createElement("div");
              tempDiv.innerHTML = description;
              description = tempDiv.textContent || tempDiv.innerText || "";
            }

            // Try different ways to get link (support various link formats)
            let link = getTextContent([
              "link",
              "guid",
              "dc\\:identifier"
            ]);
            
            // Also try link href attribute
            if (!link) {
              const linkElement = item.querySelector("link");
              link = linkElement?.getAttribute("href") || "";
            }

            // Try different ways to get date (support various date formats)
            let pubDate = getTextContent([
              "pubDate",
              "published",
              "updated",
              "dc\\:date",
              "lastBuildDate"
            ]);

            const feedItem = {
              title: title.trim(),
              description: description.trim(),
              link: link.trim(),
              pubDate: pubDate.trim(),
            };

            if (index < 3) { // Log first 3 items for debugging
              console.log(`fetchRssFeedItems: Item ${index + 1}:`, {
                title: feedItem.title.substring(0, 50) + (feedItem.title.length > 50 ? '...' : ''),
                hasDescription: !!feedItem.description,
                hasLink: !!feedItem.link
              });
            }

            return feedItem;
          })
          .filter((item) => item.title || item.description); // Only include items with content

        console.log(`fetchRssFeedItems: Successfully parsed ${feedItems.length} feed items from ${url}`);
        
        // Log detailed content of each feed item
        feedItems.forEach((item, index) => {
          console.log(`📄 Feed Item ${index + 1} Content:`, {
            title: item.title,
            titleLength: item.title?.length || 0,
            description: item.description,
            descriptionLength: item.description?.length || 0,
            link: item.link,
            pubDate: item.pubDate
          });
        });
        
        return feedItems;
      }
    } catch (error) {
      console.error(`fetchRssFeedItems: Error fetching RSS feed from ${url}:`, error);
      console.error("fetchRssFeedItems: Error details:", {
        message: error.message,
        stack: error.stack,
        url: url
      });
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
    console.log('Feed loading effect triggered. Total feeds:', feeds.length);
    
    if (feeds.length > 0) {
      const timeoutId = setTimeout(() => {
        // Fetch all enabled and visible feeds in order
        const enabledFeeds = feeds.filter(feed => 
          feed.isEnabled !== false && 
          feed.isVisible !== false && 
          feed.url && 
          feed.url.trim() !== ''
        );
        
        console.log('Processing enabled feeds:', enabledFeeds.map(f => ({ id: f.id, name: f.name, url: f.url })));
        
        const feedPromises = enabledFeeds.map(async (feed, index) => {
          console.log(`Processing feed ${index + 1}/${enabledFeeds.length}: ${feed.name} (${feed.url})`);
          try {
            const items = await fetchRssFeedItems(feed.url);
            console.log(`✅ Feed ${feed.name} returned ${items.length} items`);
            
            // Limit items to maxPosts and add feed metadata
            const limitedItems = (items || []).slice(0, feed.maxPosts || 5).map(item => ({
              ...item,
              dynamicDuration: calculateReadingTime(item.title, item.description),
              feedId: feed.id,
              feedName: feed.name,
              maxPosts: feed.maxPosts || 5
            }));
            
            // Log processed items to check for content changes
            console.log(`🔄 Processed ${feed.name} items:`, limitedItems.map(item => ({
              title: item.title,
              titleLength: item.title?.length || 0,
              description: item.description,
              descriptionLength: item.description?.length || 0,
              dynamicDuration: item.dynamicDuration
            })));
            
            return { ...feed, items: limitedItems };
          } catch (error) {
            console.error(`❌ Error processing feed ${feed.name} (${feed.url}):`, error.message);
            
            // Provide specific error messages based on error type
            if (error.message.includes('CORS')) {
              console.error(`❌ CORS issue: The RSS feed is blocked by CORS policy.`);
              console.error(`💡 Try using a different RSS feed URL or contact the feed provider.`);
            } else if (error.message.includes('HTML instead of RSS')) {
              console.error(`❌ Feed URL returns HTML instead of RSS/XML format.`);
              console.error(`💡 Make sure you're using the correct RSS feed URL.`);
            } else {
              console.error(`❌ Feed URL might be incorrect or the feed is temporarily unavailable.`);
            }
            
            return { ...feed, items: [], error: error.message };
          }
        });
        
        Promise.all(feedPromises).then(feedResults => {
          // Combine all feed items while preserving order
          const allItems = feedResults.flatMap(result => result.items);
          const totalFeeds = feedResults.length;
          const feedsWithItems = feedResults.filter(result => result.items.length > 0).length;
          const failedFeeds = feedResults.filter(result => result.error);
          
          console.log(`📊 Feed loading complete: ${allItems.length} total items from ${feedsWithItems}/${totalFeeds} feeds`);
          
          // Log failed feeds
          if (failedFeeds.length > 0) {
            console.warn(`⚠️ Failed feeds:`, failedFeeds.map(f => ({ name: f.name, url: f.url, error: f.error })));
          }
          
          // Log final RSS feed content to check for truncation
          console.log(`📋 Final RSS Feed Array:`, allItems.map((item, index) => ({
            index: index,
            feedName: item.feedName,
            title: item.title,
            titleLength: item.title?.length || 0,
            description: item.description,
            descriptionLength: item.description?.length || 0,
            dynamicDuration: item.dynamicDuration
          })));
          
          if (allItems.length === 0) {
            console.warn('❌ No feed items loaded. Check feed URLs and network connectivity.');
            console.warn('💡 Make sure you are using correct RSS/XML feed URLs, not HTML pages.');
            console.warn('🧪 Test working RSS feeds at: http://localhost:3000/test');
          }
          
          setRssFeed(allItems);
          setCurrentFeedIndex(0);
        }).catch(error => {
          console.error('❌ Error in Promise.all for multiple feeds:', error);
          setRssFeed([]);
        });
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    } else {
      console.log('No feeds configured, clearing RSS feed');
      setRssFeed([]);
    }
  }, [feeds, fetchRssFeedItems, calculateReadingTime]);

  // Rotate through RSS feed items with dynamic duration
  useEffect(() => {
    if (rssFeed.length === 0) return;

    let currentIndex = 0;
    
    const rotateFeeds = () => {
      const currentItem = rssFeed[currentIndex];
      const duration = (currentItem.dynamicDuration || 10) * 1000;

      console.log(`Feed item "${currentItem?.title || 'No title'}" will display for ${duration/1000} seconds`);

      // Update the current feed index for display
      setCurrentFeedIndex(currentIndex);

      // Set up next rotation
      setTimeout(() => {
        currentIndex = (currentIndex + 1) % rssFeed.length;
        rotateFeeds();
      }, duration);
    };

    // Start the rotation
    rotateFeeds();
  }, [rssFeed]);

  if (rssFeed.length === 0) {
    return (
      <div className="feed-container">
        <div 
          className="rss-placeholder"
          style={{ color: settings.foregroundColor }}
        >
          RSS feeds aan het laden...
        </div>
      </div>
    );
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

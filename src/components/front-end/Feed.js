import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import { sanitizeHTMLContent } from "../../utils/sanitize";
import { parseFeed, validateFeedItems } from "../../utils/rssParser";

function Feed({ feeds, settings }) {
  const [rssFeed, setRssFeed] = useState([]);
  const [currentFeedIndex, setCurrentFeedIndex] = useState(0);
  const descriptionRef = useRef(null);

  // Fetch RSS feed and return items (for multiple feeds support)
  const fetchRssFeedItems = useCallback(async (url) => {
    if (!url) {
      console.warn("📋 fetchRssFeedItems: No URL provided");
      return [];
    }

    console.log(`📋 fetchRssFeedItems: Starting fetch for URL: ${url}`);

    try {
      // Try multiple CORS proxies for better reliability
      // Ordered by reliability based on testing
      const proxies = [
        {
          name: "CORSProxy.io",
          url: `https://corsproxy.io/?${encodeURIComponent(url)}`,
          extractData: (data) => data,
        },
        {
          name: "CodeTabs",
          url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
          extractData: (data) => data,
        },
        {
          name: "AllOrigins",
          url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
          extractData: (data) => JSON.parse(data).contents,
        },
        {
          name: "ThingProxy",
          url: `https://thingproxy.freeboard.io/fetch/${url}`,
          extractData: (data) => data,
        },
        {
          name: "CORS Anywhere",
          url: `https://cors-anywhere.herokuapp.com/${url}`,
          extractData: (data) => data,
        },
      ];

      let feedData = null;
      let lastError = null;
      let successfulProxy = null;

      // Try each proxy
      for (const proxy of proxies) {
        try {
          console.log(`  🔄 Trying ${proxy.name}...`);

          // Add timeout to prevent waiting too long (15 seconds per proxy)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);

          const response = await fetch(proxy.url, {
            method: "GET",
            headers: {
              Accept:
                "application/rss+xml, application/xml, text/xml, application/json, */*",
              "User-Agent": "Mozilla/5.0 (compatible; RSSReader/1.0)",
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          // Try to get content type
          const contentType = response.headers.get("content-type") || "";
          let data;

          if (contentType.includes("application/json")) {
            const jsonResponse = await response.json();
            data = proxy.extractData(JSON.stringify(jsonResponse));
          } else {
            data = await response.text();
            data = proxy.extractData(data);
          }

          // Handle base64 data URLs (some proxies return data this way)
          if (data && data.startsWith("data:application/rss+xml;")) {
            console.log("  🔄 Decoding base64 data URL...");
            const base64Data = data.split(",")[1];
            data = atob(base64Data);
          }

          if (data && data.trim().length > 0) {
            feedData = data;
            successfulProxy = proxy.name;
            console.log(`  ✅ Successfully fetched from ${proxy.name}`);
            break;
          } else {
            console.warn(`  ⚠️ Empty data from ${proxy.name}`);
          }
        } catch (error) {
          lastError = error;
          console.warn(`  ❌ ${proxy.name} failed:`, error.message);
          continue;
        }
      }

      // Try direct fetch as last resort
      if (!feedData) {
        console.warn("  🔄 All proxies failed, trying direct fetch...");
        try {
          const directResponse = await fetch(url, {
            method: "GET",
            headers: {
              Accept:
                "application/rss+xml, application/xml, text/xml, application/json, */*",
              "User-Agent": "Mozilla/5.0 (compatible; RSSReader/1.0)",
            },
          });

          if (directResponse.ok) {
            feedData = await directResponse.text();
            successfulProxy = "direct";
            console.log("  ✅ Direct fetch succeeded!");
          } else {
            throw new Error(`Direct fetch failed: ${directResponse.status}`);
          }
        } catch (directError) {
          console.error(
            "❌ All fetch methods failed:",
            lastError?.message || directError.message,
          );
          throw new Error(
            `All CORS proxies and direct fetch failed. Last error: ${lastError?.message || "Unknown error"}`,
          );
        }
      }

      console.log(
        `📋 Parsing feed data (${feedData.length} bytes) from ${successfulProxy}...`,
      );

      // Check if we got HTML instead of feed data
      const trimmedData = feedData.trim().toLowerCase();
      if (
        trimmedData.startsWith("<!doctype html") ||
        trimmedData.startsWith("<html")
      ) {
        console.error("❌ Received HTML instead of feed data");
        throw new Error(
          "Received HTML instead of RSS/XML/JSON feed. Please check the URL.",
        );
      }

      // Parse feed using new robust parser
      const { format, items } = parseFeed(feedData);
      console.log(`✅ Detected ${format} format with ${items.length} items`);

      // Validate and clean items
      const validItems = validateFeedItems(items);
      console.log(
        `✅ ${validItems.length} valid items (${items.length - validItems.length} filtered out)`,
      );

      // Log sample items for debugging
      validItems.slice(0, 3).forEach((item, index) => {
        console.log(`  📄 Item ${index + 1}:`, {
          title: item.title
            ? item.title.substring(0, 50) + "..."
            : "(no title)",
          hasDescription: !!item.description,
          hasLink: !!item.link,
          hasDate: !!item.pubDate,
        });
      });

      return validItems;
    } catch (error) {
      console.error(`❌ Error fetching feed from ${url}:`, error.message);
      return [];
    }
  }, []);

  // Calculate reading time based on content length
  const calculateReadingTime = useCallback((title, description) => {
    const wordsPerMinute = 200; // Average reading speed
    const titleWords = (title || "").split(/\s+/).length;
    const descriptionWords = (description || "").split(/\s+/).length;
    const totalWords = titleWords + descriptionWords;

    // Calculate reading time in seconds
    const readingTimeSeconds = (totalWords / wordsPerMinute) * 60;

    // Make duration 50% longer by multiplying by 1.5
    const extendedReadingTime = readingTimeSeconds * 1.5;

    // Set minimum duration of 3 seconds and maximum of 45 seconds (increased from 30 to accommodate 50% longer)
    const minDuration = 3;
    const maxDuration = 45;

    return Math.max(
      minDuration,
      Math.min(maxDuration, Math.ceil(extendedReadingTime)),
    );
  }, []);

  // Load RSS feeds when feeds change with debouncing
  useEffect(() => {
    console.log("Feed loading effect triggered. Total feeds:", feeds.length);

    if (feeds.length > 0) {
      const timeoutId = setTimeout(() => {
        // Fetch all enabled and visible feeds in order
        const enabledFeeds = feeds.filter(
          (feed) =>
            feed.isEnabled !== false &&
            feed.isVisible !== false &&
            feed.url &&
            feed.url.trim() !== "",
        );

        console.log(
          "Processing enabled feeds:",
          enabledFeeds.map((f) => ({ id: f.id, name: f.name, url: f.url })),
        );

        const feedPromises = enabledFeeds.map(async (feed, index) => {
          console.log(
            `Processing feed ${index + 1}/${enabledFeeds.length}: ${feed.name} (${feed.url})`,
          );
          try {
            const items = await fetchRssFeedItems(feed.url);
            console.log(`✅ Feed ${feed.name} returned ${items.length} items`);

            // Limit items to maxPosts and add feed metadata
            const limitedItems = (items || [])
              .slice(0, feed.maxPosts || 5)
              .map((item) => ({
                ...item,
                dynamicDuration: calculateReadingTime(
                  item.title,
                  item.description,
                ),
                feedId: feed.id,
                feedName: feed.name,
                maxPosts: feed.maxPosts || 5,
              }));

            // Log processed items to check for content changes
            console.log(
              `🔄 Processed ${feed.name} items:`,
              limitedItems.map((item) => ({
                title: item.title,
                titleLength: item.title?.length || 0,
                description: item.description,
                descriptionLength: item.description?.length || 0,
                dynamicDuration: item.dynamicDuration,
              })),
            );

            return { ...feed, items: limitedItems };
          } catch (error) {
            console.error(
              `❌ Error processing feed ${feed.name} (${feed.url}):`,
              error.message,
            );

            // Provide specific error messages based on error type
            if (error.message.includes("CORS")) {
              console.error(
                `❌ CORS issue: The RSS feed is blocked by CORS policy.`,
              );
              console.error(
                `💡 Try using a different RSS feed URL or contact the feed provider.`,
              );
            } else if (error.message.includes("HTML instead of RSS")) {
              console.error(
                `❌ Feed URL returns HTML instead of RSS/XML format.`,
              );
              console.error(
                `💡 Make sure you're using the correct RSS feed URL.`,
              );
            } else {
              console.error(
                `❌ Feed URL might be incorrect or the feed is temporarily unavailable.`,
              );
            }

            return { ...feed, items: [], error: error.message };
          }
        });

        Promise.all(feedPromises)
          .then((feedResults) => {
            // Combine all feed items while preserving order
            const allItems = feedResults.flatMap((result) => result.items);
            const totalFeeds = feedResults.length;
            const feedsWithItems = feedResults.filter(
              (result) => result.items.length > 0,
            ).length;
            const failedFeeds = feedResults.filter((result) => result.error);

            console.log(
              `📊 Feed loading complete: ${allItems.length} total items from ${feedsWithItems}/${totalFeeds} feeds`,
            );

            // Log failed feeds
            if (failedFeeds.length > 0) {
              console.warn(
                `⚠️ Failed feeds:`,
                failedFeeds.map((f) => ({
                  name: f.name,
                  url: f.url,
                  error: f.error,
                })),
              );
            }

            // Log final RSS feed content to check for truncation
            console.log(
              `📋 Final RSS Feed Array:`,
              allItems.map((item, index) => ({
                index: index,
                feedName: item.feedName,
                title: item.title,
                titleLength: item.title?.length || 0,
                description: item.description,
                descriptionLength: item.description?.length || 0,
                dynamicDuration: item.dynamicDuration,
              })),
            );

            if (allItems.length === 0) {
              console.warn(
                "❌ No feed items loaded. Check feed URLs and network connectivity.",
              );
              console.warn(
                "💡 Make sure you are using correct RSS/XML feed URLs, not HTML pages.",
              );
              console.warn(
                "🧪 Test working RSS feeds at: http://localhost:3000/test",
              );
            }

            setRssFeed(allItems);
            setCurrentFeedIndex(0);
          })
          .catch((error) => {
            console.error("❌ Error in Promise.all for multiple feeds:", error);
            setRssFeed([]);
          });
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    } else {
      console.log("No feeds configured, clearing RSS feed");
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

      console.log(
        `Feed item "${currentItem?.title || "No title"}" will display for ${duration / 1000} seconds`,
      );

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

  // Measure overflow and set up scroll animation whenever the displayed item changes.
  // Uses a stable ref + useEffect instead of an inline ref callback to avoid
  // racing requestAnimationFrames from re-renders scheduling measurements at
  // moments when the container has no layout (clientWidth/scrollWidth both 0).
  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;

    const currentItem = rssFeed[currentFeedIndex];
    if (!currentItem?.description) return;

    const rafId = requestAnimationFrame(() => {
      const originalStyle = el.style.cssText;
      el.style.webkitLineClamp = "unset";
      el.style.display = "block";
      el.style.whiteSpace = "nowrap";
      el.style.overflow = "visible";

      const containerWidth = el.parentElement.clientWidth;
      const textWidth = el.scrollWidth;

      // Skip measurement if the container has no layout yet (hidden slide, etc.)
      if (containerWidth === 0) {
        el.style.cssText = originalStyle;
        return;
      }

      const isOverflowing = textWidth > containerWidth;

      if (isOverflowing) {
        el.classList.add("scrolling-text");

        const scrollDistance = textWidth - containerWidth;
        const consistentScrollSpeed = 150;
        const scrollTime = (scrollDistance / consistentScrollSpeed) * 1000;
        const pauseTime = 1000;
        const totalAnimationDuration = scrollTime + pauseTime * 2;

        if (currentItem) {
          currentItem.dynamicDuration = Math.max(
            totalAnimationDuration / 1000,
            5,
          );
        }

        const startPauseRatio = pauseTime / totalAnimationDuration;
        const endPauseRatio =
          (totalAnimationDuration - pauseTime) / totalAnimationDuration;

        const keyframes = [
          { transform: "translateX(0)", offset: 0 },
          { transform: "translateX(0)", offset: startPauseRatio },
          {
            transform: `translateX(-${scrollDistance}px)`,
            offset: endPauseRatio,
          },
          {
            transform: `translateX(-${scrollDistance}px)`,
            offset: 1,
          },
        ];

        const animationOptions = {
          duration: totalAnimationDuration,
          easing: "linear",
          fill: "forwards",
        };

        const animationKey = `${currentItem?.title}-${scrollDistance}-${totalAnimationDuration}`;
        const hasAnimated = el.dataset.animationKey === animationKey;

        if (!hasAnimated) {
          el.getAnimations().forEach((anim) => anim.cancel());
          el.dataset.animationKey = animationKey;
          setTimeout(() => {
            el.animate(keyframes, animationOptions);
          }, 100);
        }
      } else {
        el.classList.remove("scrolling-text");
        el.getAnimations().forEach((anim) => anim.cancel());
      }

      el.style.cssText = originalStyle;
    });

    return () => cancelAnimationFrame(rafId);
  }, [currentFeedIndex, rssFeed]);

  if (rssFeed.length === 0) {
    return null;
  }

  const currentItem = rssFeed[currentFeedIndex];

  return (
    <div className="feed-container">
      <div className="rss-item">
        <div className="rss-title" style={{ color: settings.foregroundColor }}>
          {currentItem?.title || "No title"}
        </div>
        <div className="rss-description-container">
          <div
            className="rss-description"
            style={{ color: settings.foregroundColor }}
            ref={descriptionRef}
          >
            {currentItem?.description || "No description"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(Feed);

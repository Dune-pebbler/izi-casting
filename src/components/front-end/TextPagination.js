import React, { useState, useEffect, useRef, useCallback } from "react";
import { sanitizeHTMLContent } from "../../utils/sanitize";

function TextPagination({ 
  text, 
  maxHeight = 400, // Default max height in pixels
  readTimePerPage = 5000, // Default 5 seconds per page
  scrollStepRatio = 0.6, // Default scroll 60% of container height each time
  className = "",
  onPageChange = null // Callback when page changes
}) {
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const textRef = useRef(null);
  const measureRef = useRef(null);
  const timeoutRef = useRef(null);

  // Function to measure text height and split into pages
  const measureAndSplitText = useCallback(() => {
    console.log('TextPagination: measureAndSplitText called', { text: text?.substring(0, 100), maxHeight });
    
    if (!text) {
      console.log('TextPagination: No text provided');
      setPages([]);
      setIsInitialized(true);
      return;
    }

    const originalHTML = sanitizeHTMLContent(text);
    
    // If no maxHeight is set or it's 0, just show the full text
    if (!maxHeight || maxHeight <= 0) {
      setPages([{ content: originalHTML, height: 0 }]);
      setIsInitialized(true);
      return;
    }

    // Use a simpler approach: just show the text and let CSS handle overflow
    // We'll measure the actual rendered height after the component mounts
    setPages([{ content: originalHTML, height: 0 }]);
    setIsInitialized(true);
  }, [text, maxHeight]);

  // Auto-advance pages
  useEffect(() => {
    if (!isInitialized || pages.length <= 1) return;

    const advancePage = () => {
      setCurrentPageIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % pages.length;
        if (onPageChange) {
          onPageChange(nextIndex, pages.length);
        }
        return nextIndex;
      });
    };

    // Set timeout for current page
    timeoutRef.current = setTimeout(advancePage, readTimePerPage);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentPageIndex, pages.length, readTimePerPage, isInitialized, onPageChange]);

  // Measure text when component mounts or text changes
  useEffect(() => {
    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      measureAndSplitText();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [measureAndSplitText]);

  // Measure actual rendered height after component is mounted
  useEffect(() => {
    if (!isInitialized || !textRef.current || !maxHeight) return;

    const measureHeight = () => {
      const textElement = textRef.current;
      if (!textElement) return;

      const actualHeight = textElement.scrollHeight;
      console.log('TextPagination: Actual rendered height', { 
        actualHeight, 
        maxHeight, 
        needsPagination: actualHeight > maxHeight 
      });

      // If the text fits within the max height, no pagination needed
      if (actualHeight <= maxHeight) {
        console.log('TextPagination: Text fits in container, no pagination needed');
        return;
      }

      // If text is too tall, we need to implement pagination
      console.log('TextPagination: Text is too tall, implementing pagination');
      
      // Don't set maxHeight or overflow on the text element itself
      // The parent container (.text-pagination) already has overflow: hidden
      // This creates a "window" effect where we can scroll the content
      
      // Create a scrolling animation that moves through the content
      const totalScrollHeight = textElement.scrollHeight;
      const containerHeight = maxHeight;
      const scrollDistance = totalScrollHeight - containerHeight;
      
      console.log('TextPagination: Scrolling setup', {
        totalScrollHeight,
        containerHeight,
        scrollDistance
      });
      
      if (scrollDistance > 0) {
        // Animate scrolling through the content
        let currentScroll = 0;
        const scrollStep = containerHeight * scrollStepRatio; // Use configurable scroll step ratio
        const scrollDuration = readTimePerPage;
        
        console.log('TextPagination: Scroll settings', {
          scrollStepRatio,
          containerHeight,
          scrollStep,
          scrollDuration
        });
        
        const scrollInterval = setInterval(() => {
          currentScroll += scrollStep;
          
          if (currentScroll >= scrollDistance) {
            // Reached the end, reset to beginning
            currentScroll = 0;
            console.log('TextPagination: Reached end, resetting to beginning');
          }
          
          console.log('TextPagination: Scrolling to', currentScroll);
          textElement.style.transform = `translateY(-${currentScroll}px)`;
          textElement.style.transition = 'transform 1.5s ease-in-out';
        }, scrollDuration);
        
        // Store interval reference for cleanup
        timeoutRef.current = scrollInterval;
      }
    };

    // Measure after a short delay to ensure rendering is complete
    const measureTimer = setTimeout(measureHeight, 200);
    
    return () => {
      clearTimeout(measureTimer);
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
    };
  }, [isInitialized, maxHeight, readTimePerPage]);

  // Reset to first page when text changes
  useEffect(() => {
    setCurrentPageIndex(0);
    setIsInitialized(false);
  }, [text]);

  // Fallback: if not initialized after 2 seconds, just show the text
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!isInitialized && text) {
        console.log('TextPagination: Using fallback - showing text without pagination');
        const originalHTML = sanitizeHTMLContent(text);
        setPages([{ content: originalHTML, height: 0 }]);
        setIsInitialized(true);
      }
    }, 2000);

    return () => clearTimeout(fallbackTimer);
  }, [isInitialized, text]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!text) {
    return (
      <div className={`text-pagination ${className}`}>
        <div className="text-placeholder">
          <div className="placeholder-text">No Text Content</div>
        </div>
      </div>
    );
  }

  if (!isInitialized || pages.length === 0) {
    // If we have text but pagination failed, show it directly
    if (text) {
      console.log('TextPagination: Showing text directly due to pagination failure');
      return (
        <div className={`text-pagination ${className}`}>
          <div 
            className="text-content"
            dangerouslySetInnerHTML={{
              __html: sanitizeHTMLContent(text)
            }}
          />
        </div>
      );
    }
    
    return (
      <div className={`text-pagination ${className}`}>
        <div className="text-loading">Loading...</div>
      </div>
    );
  }

  const currentPage = pages[currentPageIndex];

  return (
    <div className={`text-pagination ${className}`}>
      {/* Hidden element for measuring text height */}
      <div 
        ref={measureRef}
        className="text-measure"
        style={{
          position: 'absolute',
          visibility: 'hidden',
          top: '-9999px',
          left: '-9999px',
          width: '100%',
          height: 'auto'
        }}
      />
      
      {/* Visible text content */}
      <div 
        ref={textRef}
        className="text-content"
        dangerouslySetInnerHTML={{
          __html: currentPage.content
        }}
      />
      
      {/* Page indicator (optional) */}
      {pages.length > 1 && (
        <div className="page-indicator">
          {currentPageIndex + 1} / {pages.length}
        </div>
      )}
    </div>
  );
}

export default TextPagination;

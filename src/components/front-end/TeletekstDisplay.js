import React, { useState, useEffect, useRef } from 'react';
import { Tv, RefreshCw, AlertCircle } from 'lucide-react';
import { TELETEKST_THEMES } from '../admin/slide-edit/TeletekstInput';

function TeletekstDisplay({ channel = '101', theme = 'classic', pageCount = 1, duration = 10, skipLines = 0 }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const contentRef = useRef(null);

  const selectedTheme = TELETEKST_THEMES.find(t => t.id === theme) || TELETEKST_THEMES[0];
  const totalPages = Math.max(1, pageCount);

  const fetchTeletekst = async (page) => {
    try {
      setLoading(true);
      setError(null);

      const key = page > 1 ? `${channel}-${page}` : channel;
      const response = await fetch(`/api/teletekst/${key}`);

      if (!response.ok) {
        throw new Error(`Failed to load page ${channel}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Pagina ${channel} niet beschikbaar`);
      }

      const data = await response.json();

      // Extract text content from the JSON response
      if (data && data.content) {
        setContent(data.content);
      } else {
        throw new Error('No content available');
      }
    } catch (err) {
      console.error('Error fetching teletekst:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and 60-second refresh
  const fetchTeletekstRef = useRef(fetchTeletekst);
  fetchTeletekstRef.current = fetchTeletekst;

  useEffect(() => {
    if (channel) {
      setCurrentPage(1);
      fetchTeletekstRef.current(1);

      const interval = setInterval(() => fetchTeletekstRef.current(currentPageRef.current), 60000);
      return () => clearInterval(interval);
    }
  }, [channel]);

  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;

  // Cycle through sub-pages when pageCount > 1
  useEffect(() => {
    if (totalPages <= 1) return;

    const perPage = duration / totalPages;
    const timer = setTimeout(() => {
      const next = currentPage >= totalPages ? 1 : currentPage + 1;
      setCurrentPage(next);
      fetchTeletekstRef.current(next);
    }, perPage * 1000);

    return () => clearTimeout(timer);
  }, [currentPage, totalPages, duration]);

  // Check if content overflows and should scroll
  useEffect(() => {
    if (contentRef.current && content) {
      const checkOverflow = () => {
        const container = contentRef.current.parentElement;
        const contentHeight = contentRef.current.scrollHeight;
        const containerHeight = container?.clientHeight || 0;

        console.log('Teletekst heights:', { contentHeight, containerHeight });

        if (contentHeight > containerHeight) {
          setShouldScroll(true);
          // Calculate scroll distance and duration based on content height
          // Add extra 200px to scroll further so the end appears higher on screen
          const scrollDistance = contentHeight - containerHeight + 200;
          const duration = scrollDistance / 30; // 30px per second max scroll speed

          if (contentRef.current) {
            contentRef.current.style.setProperty('--scroll-distance', `-${scrollDistance}px`);
            contentRef.current.style.setProperty('--scroll-duration', `${duration}s`);
          }
        } else {
          setShouldScroll(false);
        }
      };

      // Check after a short delay to ensure content is rendered
      const timer = setTimeout(checkOverflow, 100);
      return () => clearTimeout(timer);
    }
  }, [content]);

  if (loading && !content) {
    return (
      <div
        className="teletekst-display teletekst-loading"
        style={{ backgroundColor: selectedTheme.bg, color: selectedTheme.colors.green }}
      >
        <Tv size={48} />
        <p>Teletekst pagina {channel} laden...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="teletekst-display teletekst-error"
        style={{ backgroundColor: selectedTheme.bg, color: selectedTheme.colors.red }}
      >
        <AlertCircle size={48} />
        <h3>Kan Teletekst niet laden</h3>
        <p style={{ color: selectedTheme.colors.yellow }}>{error}</p>
        <button
          onClick={fetchTeletekst}
          className="retry-btn"
          style={{ borderColor: selectedTheme.colors.green, color: selectedTheme.colors.green }}
        >
          <RefreshCw size={16} />
          Opnieuw proberen
        </button>
      </div>
    );
  }

  return (
    <div
      className="teletekst-display"
      style={{
        backgroundColor: selectedTheme.bg,
        color: selectedTheme.text,
        '--theme-bg': selectedTheme.bg,
        '--theme-text': selectedTheme.text,
        '--color-red': selectedTheme.colors.red,
        '--color-green': selectedTheme.colors.green,
        '--color-yellow': selectedTheme.colors.yellow,
        '--color-blue': selectedTheme.colors.blue,
        '--color-cyan': selectedTheme.colors.cyan,
        '--color-magenta': selectedTheme.colors.magenta,
        '--color-white': selectedTheme.colors.white,
        '--color-black': selectedTheme.colors.black
      }}
    >
      <div
        key={currentPage}
        ref={contentRef}
        className={`teletekst-content ${shouldScroll ? 'auto-scroll' : ''}`}
        style={skipLines > 0 ? { marginTop: `${skipLines * -2.8}rem` } : undefined}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}

export default TeletekstDisplay;

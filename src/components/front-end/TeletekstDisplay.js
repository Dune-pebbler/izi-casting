import React, { useState, useEffect, useRef } from 'react';
import { Tv, RefreshCw, AlertCircle } from 'lucide-react';
import { TELETEKST_THEMES } from '../admin/slide-edit/TeletekstInput';

function TeletekstDisplay({ channel = '101', theme = 'classic' }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const contentRef = useRef(null);

  const selectedTheme = TELETEKST_THEMES.find(t => t.id === theme) || TELETEKST_THEMES[0];

  const fetchTeletekst = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/teletekst/${channel}`);

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

  useEffect(() => {
    if (channel) {
      fetchTeletekst();

      // Refresh every 60 seconds
      const interval = setInterval(fetchTeletekst, 60000);
      return () => clearInterval(interval);
    }
  }, [channel]);

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
          const duration = Math.max(20, (scrollDistance / 30)); // ~30px per second

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
        ref={contentRef}
        className={`teletekst-content ${shouldScroll ? 'auto-scroll' : ''}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}

export default TeletekstDisplay;

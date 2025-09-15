import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

function FeedEditModal({ feed, onClose, onSave }) {
  const [feedName, setFeedName] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [feedDuration, setFeedDuration] = useState(10);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (feed) {
      setFeedName(feed.name || '');
      setFeedUrl(feed.url || '');
      setFeedDuration(feed.duration || 10);
      setIsEnabled(feed.isEnabled !== false);
      setIsVisible(feed.isVisible !== false);
    }
  }, [feed]);

  const handleSave = () => {
    if (!feedName.trim()) {
      alert('Please enter a feed name');
      return;
    }

    if (!feedUrl.trim()) {
      alert('Please enter a feed URL');
      return;
    }

    // Validate URL format
    try {
      new URL(feedUrl);
    } catch (error) {
      alert('Please enter a valid URL');
      return;
    }

    const updatedFeed = {
      ...feed,
      name: feedName.trim(),
      url: feedUrl.trim(),
      duration: parseInt(feedDuration) || 10,
      isEnabled,
      isVisible
    };

    onSave(updatedFeed);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const popularFeeds = [
    { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml' },
    { name: 'CNN', url: 'https://rss.cnn.com/rss/edition.rss' },
    { name: 'Reuters', url: 'https://feeds.reuters.com/reuters/topNews' },
    { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml' },
    { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss' },
    { name: 'Informanagement (JSON)', url: 'https://nl.informanagement.com/rss/customfeed.aspx?command=rss&mode=xml&nr=24&length=200&sjabloon=confianza052025' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content feed-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Feed</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="feedName">Feed Name</label>
            <input
              type="text"
              id="feedName"
              value={feedName}
              onChange={(e) => setFeedName(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter feed name"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="feedUrl">Feed URL</label>
            <input
              type="url"
              id="feedUrl"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="https://example.com/feed.xml"
              className="form-input"
            />
            <small className="input-help">
              Enter the URL of your RSS feed
            </small>
          </div>

          <div className="form-group">
            <label>Popular Feeds</label>
            <div className="popular-feeds">
              {popularFeeds.map((popularFeed, index) => (
                <button
                  key={index}
                  type="button"
                  className="popular-feed-btn"
                  onClick={() => {
                    setFeedName(popularFeed.name);
                    setFeedUrl(popularFeed.url);
                  }}
                >
                  {popularFeed.name}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="feedDuration">Display Duration (seconds)</label>
            <input
              type="number"
              id="feedDuration"
              min="1"
              max="300"
              value={feedDuration}
              onChange={(e) => setFeedDuration(parseInt(e.target.value) || 10)}
              onKeyDown={handleKeyPress}
              className="form-input"
            />
            <small className="input-help">
              How long each feed item should be displayed (1-300 seconds)
            </small>
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                />
                <span className="checkbox-text">Enable this feed</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={(e) => setIsVisible(e.target.checked)}
                />
                <span className="checkbox-text">Show in display</span>
              </label>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default FeedEditModal;

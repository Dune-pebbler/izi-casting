import React, { useState, useEffect } from 'react';
import Feed from './Feed';

// Test component to verify RSS feed functionality
function FeedTest() {
  const [testFeeds, setTestFeeds] = useState([
    {
      id: 'nu-tech',
      name: 'NU.nl Tech & Wetenschap',
      url: 'https://www.nu.nl/rss/tech-wetenschap',
      isEnabled: true,
      duration: 10,
      isVisible: true
    },
    {
      id: 'nos-economie',
      name: 'NOS Nieuws Economie',
      url: 'https://feeds.nos.nl/nosnieuwseconomie',
      isEnabled: true,
      duration: 10,
      isVisible: true
    },
    {
      id: 'speciaalreiniging',
      name: 'Speciaalreiniging',
      url: 'https://speciaalreiniging.nl/feed/',
      isEnabled: true,
      duration: 10,
      isVisible: true
    }
  ]);

  const [currentFeedIndex, setCurrentFeedIndex] = useState(0);

  const settings = {
    backgroundColor: "#FAFAFA",
    foregroundColor: "#212121"
  };

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: settings.backgroundColor, 
      color: settings.foregroundColor,
      minHeight: '100vh'
    }}>
      <h1>RSS Feed Test</h1>
      <p>Testing RSS feed functionality with the provided examples:</p>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Current Feed: {testFeeds[currentFeedIndex]?.name}</h3>
        <p>URL: {testFeeds[currentFeedIndex]?.url}</p>
        <button 
          onClick={() => setCurrentFeedIndex((prev) => (prev + 1) % testFeeds.length)}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Switch Feed
        </button>
      </div>

      <div style={{ 
        border: '1px solid #ccc', 
        padding: '20px', 
        borderRadius: '5px',
        backgroundColor: 'white'
      }}>
        <h3>Feed Display:</h3>
        <Feed feeds={[testFeeds[currentFeedIndex]]} settings={settings} />
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>All Test Feeds:</h3>
        <ul>
          {testFeeds.map((feed, index) => (
            <li key={feed.id} style={{ 
              padding: '5px 0',
              backgroundColor: index === currentFeedIndex ? '#e3f2fd' : 'transparent',
              padding: '10px',
              borderRadius: '3px'
            }}>
              <strong>{feed.name}</strong><br />
              <small>{feed.url}</small>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default FeedTest;

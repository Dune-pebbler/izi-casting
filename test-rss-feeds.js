/**
 * RSS Feed Testing Script
 *
 * This script tests RSS feed endpoints to identify parsing issues.
 * Run with: node test-rss-feeds.js
 *
 * Add your RSS feed URLs to the testFeeds array below.
 */

const fetch = require('node-fetch');
const { DOMParser } = require('@xmldom/xmldom');

// Test RSS feed URLs
const testFeeds = [
  // User-specific feeds to test
  { name: 'Dune Pebbler', url: 'https://dunepebbler.nl/feed' },
  { name: 'NOS Nieuws Algemeen', url: 'https://feeds.nos.nl/nosnieuwsalgemeen' },
  { name: 'NOS Nieuws Opmerkelijk', url: 'https://feeds.nos.nl/nosnieuwsopmerkelijk' },
  { name: 'Megaphone Podcast', url: 'https://feeds.megaphone.fm/GLT1412515089' },
];

// CORS proxies to try
const proxies = [
  {
    name: 'AllOrigins',
    format: (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    extract: (data) => JSON.parse(data).contents
  },
  {
    name: 'CORSProxy.io',
    format: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    extract: (data) => data
  },
  {
    name: 'CodeTabs',
    format: (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    extract: (data) => data
  },
];

/**
 * Fetch RSS feed through proxy
 */
async function fetchThroughProxy(url, proxy) {
  try {
    const proxyUrl = proxy.format(url);
    console.log(`  Trying ${proxy.name}...`);

    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': 'Mozilla/5.0 (compatible; RSSReader/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let data;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const jsonData = await response.json();
      data = proxy.extract(JSON.stringify(jsonData));
    } else {
      data = await response.text();
      data = proxy.extract(data);
    }

    // Handle base64 data URLs (some proxies return data this way)
    if (data && data.startsWith('data:application/rss+xml;')) {
      console.log('  🔄 Decoding base64 data URL...');
      const base64Data = data.split(',')[1];
      if (base64Data) {
        data = Buffer.from(base64Data, 'base64').toString('utf-8');
      }
    }

    return { success: true, data, proxy: proxy.name };
  } catch (error) {
    return { success: false, error: error.message, proxy: proxy.name };
  }
}

/**
 * Try to detect feed format
 */
function detectFeedFormat(data) {
  // Try JSON first
  try {
    JSON.parse(data);
    return 'JSON';
  } catch (e) {
    // Not JSON
  }

  // Check for XML/RSS markers
  if (data.trim().toLowerCase().startsWith('<?xml')) {
    if (data.includes('<rss')) return 'RSS 2.0';
    if (data.includes('<feed')) return 'Atom';
    if (data.includes('<rdf:RDF')) return 'RDF/RSS 1.0';
    return 'XML (Unknown format)';
  }

  if (data.trim().toLowerCase().startsWith('<!doctype html')) {
    return 'HTML (Not a feed!)';
  }

  return 'Unknown format';
}

/**
 * Parse RSS feed items from XML
 */
function parseXMLFeed(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // Check for parsing errors
  const parseError = xmlDoc.getElementsByTagName('parsererror')[0];
  if (parseError) {
    throw new Error(`XML parsing failed: ${parseError.textContent}`);
  }

  // Try different item selectors
  let items = xmlDoc.getElementsByTagName('item'); // RSS 2.0
  let feedType = 'RSS 2.0';

  if (items.length === 0) {
    items = xmlDoc.getElementsByTagName('entry'); // Atom
    feedType = 'Atom';
  }

  const results = [];
  const itemCount = Math.min(items.length, 5); // Parse first 5 items

  for (let i = 0; i < itemCount; i++) {
    const item = items[i];

    // Helper to get text content
    const getText = (tagNames) => {
      for (const tagName of tagNames) {
        const elements = item.getElementsByTagName(tagName);
        if (elements.length > 0 && elements[0].textContent) {
          return elements[0].textContent.trim();
        }
      }
      return null;
    };

    // Extract fields
    const title = getText(['title', 'name', 'dc:title']);
    const description = getText(['description', 'summary', 'content', 'dc:description']);
    const link = getText(['link', 'guid', 'dc:identifier']);
    const pubDate = getText(['pubDate', 'published', 'updated', 'dc:date']);

    // Check for link href attribute (Atom format)
    let linkHref = link;
    if (!linkHref) {
      const linkElements = item.getElementsByTagName('link');
      if (linkElements.length > 0) {
        linkHref = linkElements[0].getAttribute('href') || '';
      }
    }

    results.push({
      title: title || '(No title)',
      description: description ? description.substring(0, 100) + '...' : '(No description)',
      link: linkHref || '(No link)',
      pubDate: pubDate || '(No date)',
      hasTitle: !!title,
      hasDescription: !!description,
      hasLink: !!(link || linkHref),
      hasPubDate: !!pubDate,
    });
  }

  return { feedType, itemCount: items.length, items: results };
}

/**
 * Parse JSON feed
 */
function parseJSONFeed(jsonString) {
  const data = JSON.parse(jsonString);

  let items = [];
  if (Array.isArray(data)) {
    items = data;
  } else if (data.items && Array.isArray(data.items)) {
    items = data.items;
  } else if (data.feed && data.feed.entry) {
    items = data.feed.entry;
  }

  const results = [];
  const itemCount = Math.min(items.length, 5);

  for (let i = 0; i < itemCount; i++) {
    const item = items[i].item || items[i];

    // Extract title
    let title = '';
    if (typeof item.title === 'string') {
      title = item.title;
    } else if (item.title && item.title['#cdata-section']) {
      title = item.title['#cdata-section'];
    } else if (item.title && item.title.textContent) {
      title = item.title.textContent;
    }

    // Extract description
    let description = '';
    if (typeof item.description === 'string') {
      description = item.description;
    } else if (item.description && item.description['#cdata-section']) {
      description = item.description['#cdata-section'];
    } else if (item.content) {
      description = typeof item.content === 'string' ? item.content : item.content.textContent;
    }

    // Extract link
    let link = '';
    if (typeof item.link === 'string') {
      link = item.link;
    } else if (item.link && item.link.href) {
      link = item.link.href;
    } else if (item.url) {
      link = item.url;
    }

    // Extract date
    const pubDate = item.pubDate || item.published || item.date_published || '';

    results.push({
      title: title || '(No title)',
      description: description ? description.substring(0, 100) + '...' : '(No description)',
      link: link || '(No link)',
      pubDate: pubDate || '(No date)',
      hasTitle: !!title,
      hasDescription: !!description,
      hasLink: !!link,
      hasPubDate: !!pubDate,
    });
  }

  return { feedType: 'JSON', itemCount: items.length, items: results };
}

/**
 * Analyze feed structure
 */
async function analyzeFeed(feedConfig) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${feedConfig.name}`);
  console.log(`URL: ${feedConfig.url}`);
  console.log(`${'='.repeat(80)}`);

  // Try each proxy
  let successfulFetch = null;
  for (const proxy of proxies) {
    const result = await fetchThroughProxy(feedConfig.url, proxy);
    if (result.success) {
      successfulFetch = result;
      console.log(`  ✅ Success with ${result.proxy}`);
      break;
    } else {
      console.log(`  ❌ Failed with ${result.proxy}: ${result.error}`);
    }
  }

  if (!successfulFetch) {
    console.log('\n❌ All proxies failed. Cannot analyze this feed.');
    return;
  }

  // Detect format
  const format = detectFeedFormat(successfulFetch.data);
  console.log(`\nFeed Format: ${format}`);
  console.log(`Data Length: ${successfulFetch.data.length} bytes`);
  console.log(`First 200 chars: ${successfulFetch.data.substring(0, 200)}`);

  // Parse feed
  try {
    let parseResult;
    if (format.includes('JSON')) {
      parseResult = parseJSONFeed(successfulFetch.data);
    } else if (format.includes('RSS') || format.includes('Atom') || format.includes('XML')) {
      parseResult = parseXMLFeed(successfulFetch.data);
    } else {
      console.log('\n❌ Cannot parse this format.');
      return;
    }

    console.log(`\nParsed Feed Type: ${parseResult.feedType}`);
    console.log(`Total Items: ${parseResult.itemCount}`);
    console.log(`\nFirst ${parseResult.items.length} items:`);

    parseResult.items.forEach((item, index) => {
      console.log(`\n  Item ${index + 1}:`);
      console.log(`    Title: ${item.title}`);
      console.log(`    Description: ${item.description}`);
      console.log(`    Link: ${item.link}`);
      console.log(`    Date: ${item.pubDate}`);
      console.log(`    Fields Present: ${[
        item.hasTitle && 'title',
        item.hasDescription && 'description',
        item.hasLink && 'link',
        item.hasPubDate && 'date'
      ].filter(Boolean).join(', ') || 'None'}`);
    });

    // Summary
    console.log(`\n${'─'.repeat(80)}`);
    console.log('Summary:');
    const allHaveTitle = parseResult.items.every(item => item.hasTitle);
    const allHaveDescription = parseResult.items.every(item => item.hasDescription);
    const allHaveLink = parseResult.items.every(item => item.hasLink);
    const allHaveDate = parseResult.items.every(item => item.hasPubDate);

    console.log(`  ${allHaveTitle ? '✅' : '❌'} All items have titles`);
    console.log(`  ${allHaveDescription ? '✅' : '❌'} All items have descriptions`);
    console.log(`  ${allHaveLink ? '✅' : '❌'} All items have links`);
    console.log(`  ${allHaveDate ? '✅' : '❌'} All items have dates`);

  } catch (error) {
    console.log(`\n❌ Parsing error: ${error.message}`);
    console.log('Stack:', error.stack);
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('RSS Feed Testing Script');
  console.log('=======================\n');
  console.log(`Testing ${testFeeds.length} feeds...\n`);

  for (const feed of testFeeds) {
    await analyzeFeed(feed);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('Testing complete!');
  console.log(`${'='.repeat(80)}\n`);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

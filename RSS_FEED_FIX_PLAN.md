# RSS Feed Fix Plan

## Executive Summary

The current RSS feed implementation in `src/components/front-end/Feed.js` has several issues that prevent it from reliably parsing different RSS feed formats. This document outlines the problems and provides a comprehensive plan to fix them.

## Current Architecture

```
DisplayView.js
  └─ StatusBar.js
      └─ Feed.js (RSS feed fetching and display)
          ├─ fetchRssFeedItems() - Fetches and parses RSS feeds
          ├─ calculateReadingTime() - Calculates display duration
          └─ Rotation logic - Cycles through feed items
```

## Problems Identified

### 1. Inconsistent Feed Structure Handling

**Location**: `Feed.js:133-361`

**Issue**: The code attempts to parse both JSON and XML feeds but makes assumptions about structure:

- JSON parsing assumes specific nested structures (`item.title['#cdata-section']`)
- XML parsing uses limited selectors that may miss content
- No robust fallback mechanism when expected fields are missing

**Example Failure Scenarios**:
```javascript
// Current code expects:
item.title['#cdata-section']

// But some feeds have:
item.title._text
item.title.$t
item['media:title']
```

### 2. Field Name Assumptions

**Location**: `Feed.js:272-344`

**Issue**: Different RSS feed formats use different field names:

| Feed Format | Title Field | Description Field | Link Field | Date Field |
|------------|-------------|-------------------|------------|------------|
| RSS 2.0 | `title` | `description` | `link` | `pubDate` |
| Atom | `title` | `summary` or `content` | `link[@href]` | `published` or `updated` |
| JSON Feed | `title` | `content_text` or `content_html` | `url` | `date_published` |
| Dublin Core | `dc:title` | `dc:description` | `dc:identifier` | `dc:date` |

The current code doesn't handle all these variations consistently.

### 3. CDATA Section Handling

**Location**: Throughout `Feed.js`

**Issue**: CDATA sections are handled differently:
- In JSON parsing: attempts to access `['#cdata-section']`
- In XML parsing: relies on `textContent` (which should work but may have edge cases)
- Inconsistent between the two approaches

### 4. Link Extraction Issues

**Location**: `Feed.js:305-316`

**Issue**:
- Atom feeds use `<link href="...">` (attribute, not text content)
- Some feeds have multiple link elements
- Current code may miss links or get incorrect ones

### 5. Description vs Content

**Location**: `Feed.js:290-303`

**Issue**:
- RSS 2.0 uses `description` (often truncated)
- Atom uses `summary` (short) and `content` (full)
- JSON feeds use `content_text` or `content_html`
- Current code doesn't prioritize full content over summary

### 6. HTML in Content

**Location**: `Feed.js:298-303, 167-171`

**Issue**:
- Feed descriptions often contain HTML
- Current code strips ALL HTML using `textContent`
- This removes formatting and can make content unreadable

## Proposed Solutions

### Phase 1: Improve Feed Format Detection

**Create a robust format detector**:
```javascript
function detectFeedFormat(data) {
  // Try JSON first
  try {
    const json = JSON.parse(data);
    if (json.version && json.version.includes('https://jsonfeed.org/'))
      return { type: 'json-feed', data: json };
    if (Array.isArray(json) || json.items)
      return { type: 'json-rss', data: json };
  } catch (e) {}

  // Parse as XML
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(data, 'text/xml');

  if (xmlDoc.querySelector('rss')) return { type: 'rss-2.0', doc: xmlDoc };
  if (xmlDoc.querySelector('feed')) return { type: 'atom', doc: xmlDoc };
  if (xmlDoc.querySelector('RDF')) return { type: 'rss-1.0', doc: xmlDoc };

  return { type: 'unknown', data };
}
```

### Phase 2: Create Format-Specific Parsers

**RSS 2.0 Parser**:
```javascript
function parseRSS20(xmlDoc) {
  const items = xmlDoc.querySelectorAll('item');
  return Array.from(items).map(item => ({
    title: getElementText(item, ['title']),
    description: getElementText(item, ['content:encoded', 'description']),
    link: getElementText(item, ['link', 'guid']),
    pubDate: getElementText(item, ['pubDate', 'dc:date']),
  }));
}
```

**Atom Parser**:
```javascript
function parseAtom(xmlDoc) {
  const entries = xmlDoc.querySelectorAll('entry');
  return Array.from(entries).map(entry => ({
    title: getElementText(entry, ['title']),
    description: getElementText(entry, ['content', 'summary']),
    link: getLinkHref(entry),
    pubDate: getElementText(entry, ['published', 'updated']),
  }));
}
```

**JSON Parser**:
```javascript
function parseJSON(jsonData) {
  const items = Array.isArray(jsonData) ? jsonData : (jsonData.items || []);
  return items.map(item => ({
    title: extractField(item, ['title', 'name']),
    description: extractField(item, ['content_html', 'content_text', 'description', 'summary']),
    link: extractField(item, ['url', 'link', 'id']),
    pubDate: extractField(item, ['date_published', 'date_modified', 'pubDate']),
  }));
}
```

### Phase 3: Create Robust Field Extractors

**XML Field Extractor** (handles namespaces and CDATA):
```javascript
function getElementText(parentElement, tagNames) {
  for (const tagName of tagNames) {
    // Try direct tag name
    let element = parentElement.querySelector(tagName);

    // Try with namespace
    if (!element) {
      const nsTag = tagName.replace(':', '\\:');
      element = parentElement.querySelector(nsTag);
    }

    if (element && element.textContent) {
      return element.textContent.trim();
    }
  }
  return null;
}

function getLinkHref(element) {
  const linkElements = element.querySelectorAll('link');
  for (const link of linkElements) {
    // Atom: <link href="..." rel="alternate">
    const href = link.getAttribute('href');
    if (href) return href;

    // RSS: <link>http://...</link>
    if (link.textContent) return link.textContent.trim();
  }
  return null;
}
```

**JSON Field Extractor** (handles nested structures):
```javascript
function extractField(item, fieldNames) {
  for (const fieldName of fieldNames) {
    const value = item[fieldName];

    if (typeof value === 'string') return value;

    // Handle CDATA-like structures
    if (value && value['#cdata-section']) return value['#cdata-section'];
    if (value && value._text) return value._text;
    if (value && value.$t) return value.$t;
    if (value && value.textContent) return value.textContent;

    // Handle nested content
    if (value && typeof value === 'object') {
      const nested = extractField(value, ['_', 'content', 'value', 'text']);
      if (nested) return nested;
    }
  }
  return null;
}
```

### Phase 4: Improve Content Processing

**Smart HTML Handling**:
```javascript
function sanitizeDescription(description) {
  if (!description) return '';

  // Create a temporary element
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = description;

  // Remove scripts and dangerous elements
  const dangerousTags = ['script', 'iframe', 'object', 'embed'];
  dangerousTags.forEach(tag => {
    const elements = tempDiv.querySelectorAll(tag);
    elements.forEach(el => el.remove());
  });

  // Get text content while preserving some formatting
  let text = tempDiv.textContent || tempDiv.innerText || '';

  // Clean up excessive whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}
```

### Phase 5: Add Better Error Handling and Logging

**Comprehensive Error Handling**:
```javascript
async function fetchRssFeedItems(url) {
  try {
    // Fetch data through proxies
    const { data, proxy } = await fetchThroughProxies(url);
    console.log(`✅ Fetched from ${proxy}`);

    // Detect format
    const format = detectFeedFormat(data);
    console.log(`📋 Detected format: ${format.type}`);

    // Parse based on format
    let items;
    switch (format.type) {
      case 'rss-2.0':
        items = parseRSS20(format.doc);
        break;
      case 'atom':
        items = parseAtom(format.doc);
        break;
      case 'json-feed':
      case 'json-rss':
        items = parseJSON(format.data);
        break;
      default:
        throw new Error(`Unsupported feed format: ${format.type}`);
    }

    console.log(`✅ Parsed ${items.length} items`);

    // Validate items
    const validItems = items.filter(item => item.title || item.description);
    console.log(`✅ ${validItems.length} valid items (${items.length - validItems.length} skipped)`);

    return validItems;

  } catch (error) {
    console.error(`❌ Error fetching feed from ${url}:`, error);

    // Return detailed error info
    return {
      error: true,
      message: error.message,
      url,
      timestamp: new Date().toISOString()
    };
  }
}
```

## Implementation Plan

### Step 1: Create Utility Functions
- Create `src/utils/rssParser.js` with all parsing functions
- Create `src/utils/feedFormatDetector.js` for format detection
- Create `src/utils/contentSanitizer.js` for HTML handling

### Step 2: Refactor Feed.js
- Replace inline parsing with utility functions
- Add comprehensive error handling
- Improve logging for debugging

### Step 3: Test with Multiple Feed Types
- Test with RSS 2.0 feeds
- Test with Atom feeds
- Test with JSON feeds
- Test with feeds that have unusual structures

### Step 4: Add Feed Validation UI
- Show feed health status in admin panel
- Display parsing errors
- Provide feed testing tool

## Testing Strategy

### Test Feeds

Use the `test-rss-feeds.js` script with these feeds:

**RSS 2.0**:
- BBC News: `https://feeds.bbci.co.uk/news/rss.xml`
- CNN: `https://rss.cnn.com/rss/edition.rss`
- Reuters: `https://feeds.reuters.com/reuters/topNews`

**Atom**:
- GitHub: `https://github.com/facebook/react/commits/main.atom`
- YouTube: `https://www.youtube.com/feeds/videos.xml?channel_id=...`

**JSON**:
- Informanagement: `https://nl.informanagement.com/rss/customfeed.aspx?command=rss&mode=xml&nr=24&length=200&sjabloon=confianza052025`

### Test Checklist

For each feed:
- [ ] Feed fetches successfully through at least one proxy
- [ ] Format is correctly detected
- [ ] All items have titles
- [ ] All items have descriptions
- [ ] Links are extracted correctly
- [ ] Dates are extracted correctly
- [ ] Content displays properly in UI
- [ ] No console errors

## Success Metrics

1. **Compatibility**: Support 95% of standard RSS/Atom/JSON feeds
2. **Error Rate**: Reduce feed parsing errors to < 5%
3. **Field Extraction**: Extract title and description from 100% of items
4. **Performance**: Parse feeds in < 2 seconds
5. **User Experience**: Display meaningful error messages

## Next Steps

1. Run `test-rss-feeds.js` with your problematic feeds
2. Document specific parsing failures
3. Implement Phase 1 (Format Detection)
4. Implement Phase 2 (Format-Specific Parsers)
5. Test and iterate

## Notes

- Keep backward compatibility with existing feeds
- Add migration path for old single-feed configuration
- Consider caching parsed feeds to reduce proxy calls
- Add retry logic for transient failures

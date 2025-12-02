/**
 * RSS Feed Parser Utilities
 *
 * Robust parsing for RSS 2.0, Atom, and JSON feeds with support for:
 * - Missing fields (graceful degradation)
 * - CDATA sections
 * - Nested structures
 * - Multiple field name variations
 * - HTML content sanitization
 */

/**
 * Extract text from nested JSON structures
 * Handles CDATA sections, nested objects, and various field formats
 */
export function extractJSONField(item, fieldNames) {
  for (const fieldName of fieldNames) {
    let value = item[fieldName];

    if (!value) continue;

    // Direct string value
    if (typeof value === 'string') {
      return value.trim();
    }

    // CDATA section format: {"#cdata-section": "content"}
    if (value['#cdata-section']) {
      return value['#cdata-section'].trim();
    }

    // Common alternative formats
    if (value._text) return value._text.trim();
    if (value.$t) return value.$t.trim();
    if (value.textContent) return value.textContent.trim();
    if (value.content) {
      const content = extractJSONField({ content: value.content }, ['content']);
      if (content) return content;
    }

    // Nested object - try common text fields
    if (typeof value === 'object') {
      const nested = extractJSONField(value, ['_', 'value', 'text', 'data']);
      if (nested) return nested;
    }
  }

  return null;
}

/**
 * Extract link from JSON item
 * Handles various link formats including href attributes
 */
export function extractJSONLink(item) {
  // Try common link field names
  const fieldNames = ['link', 'url', 'guid', 'id', 'permalink'];

  for (const fieldName of fieldNames) {
    const value = item[fieldName];

    if (!value) continue;

    // Direct string
    if (typeof value === 'string') {
      return value.trim();
    }

    // Link as object with href: {"href": "...", "rel": "..."}
    if (value.href) {
      return value.href.trim();
    }

    // CDATA or nested
    const extracted = extractJSONField({ [fieldName]: value }, [fieldName]);
    if (extracted) return extracted;
  }

  return null;
}

/**
 * Parse JSON feed items
 * Supports multiple JSON feed formats
 */
export function parseJSONFeed(data) {
  let jsonData;

  // Parse if string
  if (typeof data === 'string') {
    try {
      jsonData = JSON.parse(data);
    } catch (error) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
  } else {
    jsonData = data;
  }

  // Extract items array from various formats
  let items = [];
  if (Array.isArray(jsonData)) {
    items = jsonData;
  } else if (jsonData.items && Array.isArray(jsonData.items)) {
    items = jsonData.items;
  } else if (jsonData.feed && jsonData.feed.entry) {
    items = Array.isArray(jsonData.feed.entry) ? jsonData.feed.entry : [jsonData.feed.entry];
  } else if (jsonData.rss && jsonData.rss.channel && jsonData.rss.channel.item) {
    items = Array.isArray(jsonData.rss.channel.item) ? jsonData.rss.channel.item : [jsonData.rss.channel.item];
  }

  return items.map(rawItem => {
    // Handle wrapped items: {"item": {...}}
    const item = rawItem.item || rawItem;

    // Extract title
    const title = extractJSONField(item, ['title', 'name', 'heading']);

    // Extract description - prefer full content over summary
    const description = extractJSONField(item, [
      'content_html',
      'content_text',
      'content',
      'description',
      'summary',
      'excerpt',
      'body'
    ]);

    // Extract link
    const link = extractJSONLink(item);

    // Extract date
    const pubDate = extractJSONField(item, [
      'date_published',
      'date_modified',
      'published',
      'pubDate',
      'date',
      'updated',
      'created'
    ]);

    // Extract category
    const category = extractJSONField(item, ['category', 'categories', 'tags', 'tag']);

    return {
      title: title || null,
      description: description || null,
      link: link || null,
      pubDate: pubDate || null,
      category: category || null,
    };
  });
}

/**
 * Get text content from XML element
 * Handles namespaces and CDATA automatically
 */
export function getXMLElementText(parentElement, tagNames) {
  if (!parentElement) return null;

  for (const tagName of tagNames) {
    let element = null;

    // For namespaced tags (e.g., 'content:encoded', 'dc:title'),
    // skip querySelector and use getElementsByTagName directly
    // as querySelector throws errors with unescaped colons
    if (tagName.includes(':')) {
      const elements = parentElement.getElementsByTagName(tagName);
      if (elements.length > 0) {
        element = elements[0];
      }
    } else {
      // For non-namespaced tags, try querySelector first
      try {
        element = parentElement.querySelector(tagName);
      } catch (e) {
        // If querySelector fails, fall back to getElementsByTagName
        const elements = parentElement.getElementsByTagName(tagName);
        if (elements.length > 0) {
          element = elements[0];
        }
      }
    }

    // If still no element, try getElementsByTagName as final fallback
    if (!element) {
      const elements = parentElement.getElementsByTagName(tagName);
      if (elements.length > 0) {
        element = elements[0];
      }
    }

    if (element && element.textContent) {
      return element.textContent.trim();
    }
  }

  return null;
}

/**
 * Extract link from XML element
 * Handles both text content and href attributes (Atom format)
 */
export function getXMLLink(element) {
  if (!element) return null;

  // Get all link elements
  const linkElements = element.getElementsByTagName('link');

  for (let i = 0; i < linkElements.length; i++) {
    const link = linkElements[i];

    // Atom format: <link href="..." rel="alternate">
    const href = link.getAttribute('href');
    if (href) {
      // Prefer alternate link, but accept any if no alternate found
      const rel = link.getAttribute('rel');
      if (!rel || rel === 'alternate') {
        return href.trim();
      }
    }

    // RSS format: <link>http://...</link>
    if (link.textContent && link.textContent.trim()) {
      return link.textContent.trim();
    }
  }

  // Fallback to guid
  return getXMLElementText(element, ['guid', 'id']);
}

/**
 * Parse RSS 2.0 feed
 */
export function parseRSS20(xmlDoc) {
  const items = xmlDoc.querySelectorAll('item');

  return Array.from(items).map(item => ({
    title: getXMLElementText(item, ['title', 'dc:title']),
    description: getXMLElementText(item, [
      'content:encoded',
      'content',
      'description',
      'dc:description',
      'summary'
    ]),
    link: getXMLLink(item),
    pubDate: getXMLElementText(item, [
      'pubDate',
      'dc:date',
      'date',
      'published',
      'updated'
    ]),
    category: getXMLElementText(item, ['category', 'dc:subject']),
  }));
}

/**
 * Parse Atom feed
 */
export function parseAtom(xmlDoc) {
  const entries = xmlDoc.querySelectorAll('entry');

  return Array.from(entries).map(entry => ({
    title: getXMLElementText(entry, ['title']),
    description: getXMLElementText(entry, ['content', 'summary']),
    link: getXMLLink(entry),
    pubDate: getXMLElementText(entry, ['published', 'updated']),
    category: getXMLElementText(entry, ['category']),
  }));
}

/**
 * Parse RDF/RSS 1.0 feed
 */
export function parseRDF(xmlDoc) {
  // RDF uses different selectors
  const items = xmlDoc.querySelectorAll('item, rdf\\:li');

  return Array.from(items).map(item => ({
    title: getXMLElementText(item, ['title', 'dc:title', 'rdf:title']),
    description: getXMLElementText(item, [
      'description',
      'dc:description',
      'content:encoded'
    ]),
    link: getXMLElementText(item, ['link', 'rdf:about', 'dc:identifier']),
    pubDate: getXMLElementText(item, ['dc:date', 'pubDate', 'date']),
    category: getXMLElementText(item, ['dc:subject', 'category']),
  }));
}

/**
 * Detect feed format and return parsed items
 */
export function parseFeed(data) {
  // Try JSON first
  try {
    const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
    const items = parseJSONFeed(jsonData);

    if (items.length > 0) {
      return {
        format: 'JSON',
        items,
      };
    }
  } catch (e) {
    // Not JSON or invalid, continue to XML parsing
  }

  // Parse as XML
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(data, 'text/xml');

  // Check for parsing errors
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`XML parsing failed: ${parseError.textContent}`);
  }

  // Detect XML format and parse
  let items = [];
  let format = 'Unknown';

  if (xmlDoc.querySelector('rss')) {
    format = 'RSS 2.0';
    items = parseRSS20(xmlDoc);
  } else if (xmlDoc.querySelector('feed')) {
    format = 'Atom';
    items = parseAtom(xmlDoc);
  } else if (xmlDoc.querySelector('RDF, rdf\\:RDF')) {
    format = 'RDF/RSS 1.0';
    items = parseRDF(xmlDoc);
  } else {
    throw new Error('Unknown feed format');
  }

  return {
    format,
    items,
  };
}

/**
 * Sanitize HTML content for display
 * Removes dangerous tags but preserves basic formatting
 */
export function sanitizeDescription(description) {
  if (!description) return '';

  // Create temporary element
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = description;

  // Remove dangerous elements
  const dangerousTags = ['script', 'iframe', 'object', 'embed', 'style', 'link'];
  dangerousTags.forEach(tag => {
    const elements = tempDiv.querySelectorAll(tag);
    elements.forEach(el => el.remove());
  });

  // Get text content (strips all HTML)
  let text = tempDiv.textContent || tempDiv.innerText || '';

  // Clean up excessive whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Validate and filter feed items
 * Returns only items with at least a title or description
 */
export function validateFeedItems(items) {
  return items
    .filter(item => item.title || item.description)
    .map(item => ({
      ...item,
      // Sanitize description
      description: item.description ? sanitizeDescription(item.description) : null,
      // Ensure we have displayable content
      hasContent: !!(item.title || item.description),
    }));
}

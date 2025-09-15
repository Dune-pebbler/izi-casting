# Text Pagination Feature

## Overview

The Text Pagination feature automatically checks the height of text content and splits it across multiple pages when it exceeds a configurable maximum height. Each page is displayed for a set amount of time (default: 5 seconds) before automatically advancing to the next page.

## Features

- **Automatic Height Detection**: Measures the actual rendered height of text content
- **Smart Text Splitting**: Intelligently splits text at word boundaries to avoid cutting words
- **Configurable Settings**: Easy-to-modify height limits and timing per layout
- **Page Indicators**: Shows current page number when content spans multiple pages
- **Layout-Specific Configuration**: Different settings for different slide layouts

## Configuration

### File: `src/config/textPagination.js`

This file contains all configurable settings for text pagination:

```javascript
export const TEXT_PAGINATION_CONFIG = {
  // Global settings for text pagination (not layout-specific)
  maxHeight: 400, // pixels
  readTimePerPage: 5000, // milliseconds (5 seconds)
  scrollStepRatio: 0.6, // Scroll 60% of container height each time
  
  // Layouts that should use text pagination
  enabledLayouts: ['side-by-side', 'text-only'],
  
  // Layouts that should be excluded from text pagination
  excludedLayouts: ['image-only', 'text-over-image'],
};
```

### How to Modify Settings

1. **Change Maximum Height**: Modify the `maxHeight` value (in pixels) - applies to all enabled layouts
2. **Change Read Time**: Modify the `readTimePerPage` value (in milliseconds) - applies to all enabled layouts
3. **Change Scroll Distance**: Modify the `scrollStepRatio` value (0.1 = 10%, 1.0 = 100% of container height) - applies to all enabled layouts
4. **Enable/Disable Layouts**: Add or remove layouts from the `enabledLayouts` array

## Usage

The TextPagination component is automatically used in the SlideDisplay component for all text content. No additional setup is required.

### Component Props

```javascript
<TextPagination
  text={currentSlide.text}           // The text content to paginate
  maxHeight={textConfig.maxHeight}   // Maximum height before pagination
  readTimePerPage={textConfig.readTimePerPage} // Time per page in milliseconds
  className="display-text"           // CSS class for styling
  onPageChange={callback}            // Optional callback when page changes
/>
```

## Layout Behavior

### Enabled Layouts (Use Text Pagination)
- **Side-by-Side Layout**: Text alongside images with pagination
- **Text-Only Layout**: Full-screen text presentations with pagination

### Excluded Layouts (No Pagination)
- **Image-Only Layout**: No text content, pagination not applicable
- **Text-Over-Image Layout**: Text overlaid on background images, no pagination (preserves overlay design)

## Technical Details

### How It Works

1. **Measurement**: Creates a hidden element with the full text to measure actual height
2. **Splitting**: If height exceeds limit, splits text at word boundaries
3. **Pagination**: Creates multiple pages with content that fits within the height limit
4. **Auto-Advance**: Automatically advances to next page after the specified time
5. **Looping**: Cycles through all pages and repeats

### Performance Considerations

- Uses efficient DOM measurement techniques
- Minimal re-renders with proper React hooks
- Automatic cleanup of timeouts and intervals
- Responsive to text content changes

## Customization Examples

### Increase Read Time for All Enabled Layouts

```javascript
// In textPagination.js
export const TEXT_PAGINATION_CONFIG = {
  maxHeight: 400,
  readTimePerPage: 8000, // 8 seconds instead of 5
  scrollStepRatio: 0.6,
  enabledLayouts: ['side-by-side', 'text-only'],
  excludedLayouts: ['image-only', 'text-over-image'],
};
```

### Adjust Scroll Distance

```javascript
// In textPagination.js
export const TEXT_PAGINATION_CONFIG = {
  maxHeight: 400,
  readTimePerPage: 5000,
  scrollStepRatio: 0.3, // Scroll only 30% of container height each time (slower scrolling)
  enabledLayouts: ['side-by-side', 'text-only'],
  excludedLayouts: ['image-only', 'text-over-image'],
};
```

### Enable Pagination for Additional Layouts

```javascript
// In textPagination.js
export const TEXT_PAGINATION_CONFIG = {
  maxHeight: 400,
  readTimePerPage: 5000,
  scrollStepRatio: 0.6,
  enabledLayouts: ['side-by-side', 'text-only', 'custom-layout'], // Add new layout here
  excludedLayouts: ['image-only', 'text-over-image'],
};
```

### Disable Pagination for Specific Layout

```javascript
// In textPagination.js
export const TEXT_PAGINATION_CONFIG = {
  maxHeight: 400,
  readTimePerPage: 5000,
  scrollStepRatio: 0.6,
  enabledLayouts: ['side-by-side'], // Remove 'text-only' to disable pagination for it
  excludedLayouts: ['image-only', 'text-over-image', 'text-only'], // Add layout to excluded list
};
```

## Troubleshooting

### Text Not Paginating
- Check if `maxHeight` is set too high
- Verify text content is being passed correctly
- Check browser console for any JavaScript errors

### Pages Advancing Too Fast/Slow
- Adjust `readTimePerPage` value in configuration
- Values are in milliseconds (1000ms = 1 second)

### Text Being Cut Off
- Increase `maxHeight` value for the specific layout
- Check if text contains very long words that can't be split

## Future Enhancements

Potential improvements that could be added:

- Responsive breakpoints for different screen sizes
- Manual page navigation controls
- Smooth transitions between pages
- Custom page break markers in content
- Analytics tracking for page views

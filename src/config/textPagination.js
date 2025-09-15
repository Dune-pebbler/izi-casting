// Text Pagination Configuration
// This file contains configurable settings for text pagination

export const TEXT_PAGINATION_CONFIG = {
  // Global settings for text pagination (not layout-specific)
  maxHeight: 500, // pixels
  readTimePerPage:  8000, // milliseconds (5 seconds)
  scrollStepRatio: 1, // Scroll 60% of container height each time (0.1 = 10%, 1.0 = 100%)
  
  // Layouts that should use text pagination
  enabledLayouts: ['side-by-side', 'text-only'],
  
  // Layouts that should be excluded from text pagination
  excludedLayouts: ['image-only', 'text-over-image'],
};

// Helper function to check if a layout should use text pagination
export const shouldUseTextPagination = (layout) => {
  return TEXT_PAGINATION_CONFIG.enabledLayouts.includes(layout);
};

// Helper function to get text pagination config (same for all enabled layouts)
export const getTextPaginationConfig = (layout) => {
  // Check if this layout should use pagination
  if (!shouldUseTextPagination(layout)) {
    return null; // Return null to indicate no pagination should be used
  }
  
  // Return the global config for all enabled layouts
  return {
    maxHeight: TEXT_PAGINATION_CONFIG.maxHeight,
    readTimePerPage: TEXT_PAGINATION_CONFIG.readTimePerPage,
    scrollStepRatio: TEXT_PAGINATION_CONFIG.scrollStepRatio,
  };
};
// Function to sanitize and prepare HTML content for display
export const sanitizeHTMLContent = (htmlContent) => {
  if (!htmlContent) return '';
  
  // Basic sanitization - you might want to use a library like DOMPurify for production
  return htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Get thumbnail URL from main image filename
 * @param {string} filename - Main image filename
 * @returns {string} - Thumbnail URL
 */
export const getThumbnailUrl = (filename) => {
  if (!filename) return null;
  // Replace the extension with _thumb.jpg
  const baseName = filename.replace(/\.[^/.]+$/, '');
  return `${API_URL}/thumbnails/${baseName}_thumb.jpg`;
};

/**
 * Get full image URL
 * @param {string} filename - Image filename
 * @returns {string} - Full image URL
 */
export const getImageUrl = (filename) => {
  if (!filename) return null;
  return `${API_URL}/uploads/${filename}`;
};

/**
 * Smart image component that falls back to full image if thumbnail fails
 * Returns the appropriate URL - tries thumbnail first, but can fallback
 */
export const getSmartImageUrl = (filename, preferThumbnail = true) => {
  if (!filename) return null;
  
  // For existing images that don't have .jpg extension, use full image directly
  // New optimized images will have .jpg extension
  if (!filename.toLowerCase().endsWith('.jpg') && !filename.toLowerCase().endsWith('.jpeg')) {
    return getImageUrl(filename);
  }
  
  // Prefer thumbnail if requested, otherwise use full image
  return preferThumbnail ? getThumbnailUrl(filename) : getImageUrl(filename);
};


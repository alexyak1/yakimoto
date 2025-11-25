import React, { useState } from 'react';
import { getThumbnailUrl, getImageUrl } from '../utils/imageUtils';

/**
 * Smart image component that tries to load thumbnail first,
 * then falls back to full image if thumbnail fails
 */
export const SmartImage = ({ src, alt, className, loading = 'lazy', ...props }) => {
  const [imageSrc, setImageSrc] = useState(() => {
    if (!src) return null;
    
    // For existing images that don't have .jpg extension, use full image directly
    if (!src.toLowerCase().endsWith('.jpg') && !src.toLowerCase().endsWith('.jpeg')) {
      return getImageUrl(src);
    }
    
    // Try thumbnail first for optimized images
    return getThumbnailUrl(src);
  });
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError && src) {
      // Fallback to full image if thumbnail fails
      setHasError(true);
      setImageSrc(getImageUrl(src));
    }
  };

  if (!imageSrc) return null;

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      loading={loading}
      onError={handleError}
      {...props}
    />
  );
};


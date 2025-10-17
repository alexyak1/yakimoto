// SEO utilities for structured data

// Generate structured data for individual product pages
export const generateProductStructuredData = (product) => {
  const images = product.images || [];
  const sizes = JSON.parse(product.sizes || '{}');
  const totalStock = Object.values(sizes).reduce((sum, qty) => sum + qty, 0);
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description || `${product.name} - Högkvalitativ judo utrustning från Yakimoto Dojo`,
    "image": images.map(img => `https://yakimoto.se/uploads/${img}`),
    "brand": {
      "@type": "Brand",
      "name": "Yakimoto Dojo"
    },
    "category": "Judo Equipment",
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": "SEK",
      "availability": totalStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "url": `https://yakimoto.se/products/${product.id}`,
      "seller": {
        "@type": "Organization",
        "name": "Yakimoto Dojo",
        "url": "https://yakimoto.se"
      }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "127",
      "bestRating": "5",
      "worstRating": "1"
    }
  };

  return structuredData;
};

// Generate structured data for store/homepage
export const generateStructuredData = (products = []) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Store",
    "name": "Yakimoto Dojo",
    "description": "Officiell butik för Alingsås Judoklubb. Vi säljer högkvalitativa judo gi, judo dräkt och judo suit.",
    "url": "https://yakimoto.se",
    "logo": "https://yakimoto.se/yakimotologo.png",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Alingsås",
      "addressCountry": "SE"
    },
    "sameAs": [
      "https://yakimoto.se"
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "127",
      "bestRating": "5",
      "worstRating": "1"
    },
    "offers": products.map(product => {
      const sizes = JSON.parse(product.sizes || '{}');
      const totalStock = Object.values(sizes).reduce((sum, qty) => sum + qty, 0);
      
      return {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Product",
          "name": product.name,
          "description": product.description || `${product.name} - Högkvalitativ judo utrustning`,
          "image": product.image_url ? `https://yakimoto.se${product.image_url}` : "https://yakimoto.se/yakimotologo.png",
          "brand": {
            "@type": "Brand",
            "name": "Yakimoto Dojo"
          },
          "category": "Judo Equipment"
        },
        "price": product.price,
        "priceCurrency": "SEK",
        "availability": totalStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "url": `https://yakimoto.se/products/${product.id}`,
        "seller": {
          "@type": "Organization",
          "name": "Yakimoto Dojo",
          "url": "https://yakimoto.se"
        }
      };
    })
  };

  return structuredData;
};

export const addStructuredDataToHead = (structuredData) => {
  // Remove existing structured data
  const existingScript = document.querySelector('script[type="application/ld+json"]');
  if (existingScript) {
    existingScript.remove();
  }

  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(structuredData);
  document.head.appendChild(script);
};

// URL normalization utility
export const normalizeUrl = (url) => {
  // Remove query parameters and fragments
  const urlObj = new URL(url);
  urlObj.search = '';
  urlObj.hash = '';
  
  // Remove trailing slash except for root
  let pathname = urlObj.pathname;
  if (pathname !== '/' && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }
  urlObj.pathname = pathname;
  
  return urlObj.toString();
};

// Canonical URL management
export const updateCanonicalUrl = (url) => {
  // Normalize the URL to ensure consistency
  const normalizedUrl = normalizeUrl(url);
  
  // Remove existing canonical link
  const existingCanonical = document.querySelector('link[rel="canonical"]');
  if (existingCanonical) {
    existingCanonical.remove();
  }

  // Remove existing hreflang links
  const existingHreflang = document.querySelectorAll('link[hreflang]');
  existingHreflang.forEach(link => link.remove());

  // Add new canonical link
  const canonicalLink = document.createElement('link');
  canonicalLink.rel = 'canonical';
  canonicalLink.href = normalizedUrl;
  document.head.appendChild(canonicalLink);
  
  // Also add hreflang for Swedish content
  const hreflangLink = document.createElement('link');
  hreflangLink.rel = 'alternate';
  hreflangLink.hreflang = 'sv';
  hreflangLink.href = normalizedUrl;
  document.head.appendChild(hreflangLink);
};

// Update page title and meta description
export const updatePageMeta = (title, description, url, robots = "index, follow") => {
  // Update title
  document.title = title;
  
  // Update meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.content = description;
  }

  // Update robots meta tag
  const robotsMeta = document.querySelector('meta[name="robots"]');
  if (robotsMeta) {
    robotsMeta.content = robots;
  }

  // Update canonical URL
  updateCanonicalUrl(url);

  // Update Open Graph URL
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) {
    ogUrl.content = url;
  }

  // Update Twitter URL
  const twitterUrl = document.querySelector('meta[property="twitter:url"]');
  if (twitterUrl) {
    twitterUrl.content = url;
  }
};

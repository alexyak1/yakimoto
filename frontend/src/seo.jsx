// SEO utilities for structured data

// Generate structured data for individual product pages
export const generateProductStructuredData = (product) => {
  const images = product.images || [];
  const sizes = JSON.parse(product.sizes || '{}');
  const totalStock = Object.values(sizes).reduce((sum, qty) => sum + qty, 0);
  
  // Generate SEO-friendly description
  let description = product.description;
  if (!description) {
    const parts = [];
    if (product.category) {
      if (product.category.toLowerCase().includes('gi')) {
        parts.push('Judogi');
      } else if (product.category.toLowerCase().includes('dräkt')) {
        parts.push('Judodräkt');
      } else if (product.category.toLowerCase().includes('bälte')) {
        parts.push('Judo bälte');
      } else {
        parts.push(product.category);
      }
    }
    if (product.color) parts.push(product.color);
    if (product.age_group) {
      parts.push(product.age_group === 'barn' || product.age_group === 'children' ? 'för barn' : 'för vuxna');
    }
    if (product.gsm) parts.push(`${product.gsm} GSM`);
    
    description = `${product.name}${parts.length > 0 ? ' - ' + parts.join(', ') : ''}. Högkvalitativ judo utrustning från Yakimoto Dojo. Snabb leverans från Sverige. Perfekt för träning och tävling.`;
  }
  
  // Determine product category for schema
  let productCategory = "Judo Equipment";
  if (product.category) {
    if (product.category.toLowerCase().includes('gi') || product.category.toLowerCase().includes('kimono')) {
      productCategory = "Judogi / Kimono";
    } else if (product.category.toLowerCase().includes('dräkt')) {
      productCategory = "Judodräkt";
    } else if (product.category.toLowerCase().includes('bälte')) {
      productCategory = "Judo Bälte";
    }
  }
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": description,
    "image": images.map(img => `https://yakimoto.se/uploads/${img}`),
    "brand": {
      "@type": "Brand",
      "name": "Yakimoto Dojo"
    },
    "category": productCategory,
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
    }
  };
  
  // Only add aggregateRating if we have real reviews (remove fake ratings for better SEO)
  // Uncomment when you have real reviews:
  // structuredData.aggregateRating = {
  //   "@type": "AggregateRating",
  //   "ratingValue": "4.8",
  //   "reviewCount": "127",
  //   "bestRating": "5",
  //   "worstRating": "1"
  // };

  return structuredData;
};

// Generate structured data for store/homepage
export const generateStructuredData = (products = []) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Store",
    "name": "Yakimoto Dojo",
    "description": "Judodräkter för barn och vuxna, bälten, träningsoveraller. Snabb leverans från Sverige. Köp judo dräkt barn, judo dräkt vuxen, judogi sverige, bjj gi sverige, judo bälte. Kimono judo Alingsås.",
    "url": "https://yakimoto.se",
    "logo": "https://yakimoto.se/yakimotologo.png",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Alingsås",
      "addressRegion": "Västra Götaland",
      "addressCountry": "SE"
    },
    "sameAs": [
      "https://yakimoto.se"
    ],
    "offers": products.map(product => {
      const sizes = JSON.parse(product.sizes || '{}');
      const totalStock = Object.values(sizes).reduce((sum, qty) => sum + qty, 0);
      
      // Generate description
      let description = product.description;
      if (!description) {
        const parts = [];
        if (product.category) parts.push(product.category);
        if (product.color) parts.push(product.color);
        if (product.age_group) {
          parts.push(product.age_group === 'barn' || product.age_group === 'children' ? 'för barn' : 'för vuxna');
        }
        description = `${product.name}${parts.length > 0 ? ' - ' + parts.join(', ') : ''}. Högkvalitativ judo utrustning.`;
      }
      
      // Determine category
      let productCategory = "Judo Equipment";
      if (product.category) {
        if (product.category.toLowerCase().includes('gi') || product.category.toLowerCase().includes('kimono')) {
          productCategory = "Judogi / Kimono";
        } else if (product.category.toLowerCase().includes('dräkt')) {
          productCategory = "Judodräkt";
        } else if (product.category.toLowerCase().includes('bälte')) {
          productCategory = "Judo Bälte";
        }
      }
      
      return {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Product",
          "name": product.name,
          "description": description,
          "image": product.main_image ? `https://yakimoto.se/uploads/${product.main_image}` : (product.images && product.images[0] ? `https://yakimoto.se/uploads/${product.images[0]}` : "https://yakimoto.se/yakimotologo.png"),
          "brand": {
            "@type": "Brand",
            "name": "Yakimoto Dojo"
          },
          "category": productCategory
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

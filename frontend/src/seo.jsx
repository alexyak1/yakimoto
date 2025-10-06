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

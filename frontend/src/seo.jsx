// SEO utilities for structured data
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
    "offers": products.map(product => ({
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
      "availability": "https://schema.org/InStock",
      "url": `https://yakimoto.se/products/${product.id}`
    }))
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

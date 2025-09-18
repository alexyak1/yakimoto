import ReactGA from 'react-ga4';

// Initialize Google Analytics and Google Ads
export const initGA = () => {
  const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
  const GOOGLE_ADS_ID = import.meta.env.VITE_GOOGLE_ADS_ID;
  
  // Load Google Analytics script
  if (GA_MEASUREMENT_ID) {
    const gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(gaScript);
    
    // Initialize ReactGA
    ReactGA.initialize(GA_MEASUREMENT_ID);
    console.log('Google Analytics initialized with ID:', GA_MEASUREMENT_ID);
  } else {
    console.warn('Google Analytics not initialized: VITE_GA_MEASUREMENT_ID not found');
  }
  
  // Load Google Ads script
  if (GOOGLE_ADS_ID) {
    const adsScript = document.createElement('script');
    adsScript.async = true;
    adsScript.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
    document.head.appendChild(adsScript);
    
    // Configure Google Ads
    if (typeof gtag !== 'undefined') {
      gtag('config', GOOGLE_ADS_ID);
    }
    console.log('Google Ads initialized with ID:', GOOGLE_ADS_ID);
  } else {
    console.warn('Google Ads not initialized: VITE_GOOGLE_ADS_ID not found');
  }
};

// Track page views
export const trackPageView = (page) => {
  ReactGA.send({ hitType: 'pageview', page });
};

// Track custom events
export const trackEvent = (action, category, label, value) => {
  ReactGA.event({
    action,
    category,
    label,
    value,
  });
};

// Track e-commerce events
export const trackPurchase = (transactionId, value, currency = 'SEK', items = []) => {
  // Track in Google Analytics
  ReactGA.event('purchase', {
    transaction_id: transactionId,
    value: value,
    currency: currency,
    items: items,
  });

  // Track in Google Ads
  const googleAdsId = import.meta.env.VITE_GOOGLE_ADS_ID;
  if (typeof gtag !== 'undefined' && googleAdsId) {
    gtag('event', 'conversion', {
      'send_to': googleAdsId,
      'value': value,
      'currency': currency,
      'transaction_id': transactionId
    });
  }
};

export const trackAddToCart = (item) => {
  ReactGA.event('add_to_cart', {
    currency: 'SEK',
    value: item.price * item.quantity,
    items: [{
      item_id: item.id,
      item_name: item.name,
      item_category: item.category || 'Product',
      quantity: item.quantity,
      price: item.price,
    }],
  });
};

export const trackRemoveFromCart = (item) => {
  ReactGA.event('remove_from_cart', {
    currency: 'SEK',
    value: item.price * item.quantity,
    items: [{
      item_id: item.id,
      item_name: item.name,
      item_category: item.category || 'Product',
      quantity: item.quantity,
      price: item.price,
    }],
  });
};

export const trackBeginCheckout = (value, items = []) => {
  ReactGA.event('begin_checkout', {
    currency: 'SEK',
    value: value,
    items: items,
  });
};

// Google Ads specific tracking functions
export const trackGoogleAdsConversion = (conversionLabel, value, currency = 'SEK', transactionId = null) => {
  const googleAdsId = import.meta.env.VITE_GOOGLE_ADS_ID;
  if (typeof gtag !== 'undefined' && googleAdsId) {
    gtag('event', 'conversion', {
      'send_to': `${googleAdsId}/${conversionLabel}`,
      'value': value,
      'currency': currency,
      'transaction_id': transactionId
    });
  }
};

export const trackGoogleAdsEvent = (eventName, parameters = {}) => {
  const googleAdsId = import.meta.env.VITE_GOOGLE_ADS_ID;
  if (typeof gtag !== 'undefined' && googleAdsId) {
    gtag('event', eventName, {
      'send_to': googleAdsId,
      ...parameters
    });
  }
};

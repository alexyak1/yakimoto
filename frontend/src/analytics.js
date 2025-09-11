import ReactGA from 'react-ga4';

// Initialize Google Analytics
export const initGA = () => {
  const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
  
  if (GA_MEASUREMENT_ID) {
    // Load the Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
    
    // Initialize ReactGA
    ReactGA.initialize(GA_MEASUREMENT_ID);
    console.log('Google Analytics initialized with ID:', GA_MEASUREMENT_ID);
  } else {
    console.warn('Google Analytics not initialized: VITE_GA_MEASUREMENT_ID not found');
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
  ReactGA.event('purchase', {
    transaction_id: transactionId,
    value: value,
    currency: currency,
    items: items,
  });
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

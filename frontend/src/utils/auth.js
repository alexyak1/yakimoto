/**
 * JWT Token utility functions for authentication
 */

/**
 * Decode JWT token without verification (for client-side expiration check)
 * @param {string} token - JWT token string
 * @returns {object|null} - Decoded payload or null if invalid
 */
export function decodeToken(token) {
    if (!token) return null;
    
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        
        const payload = parts[1];
        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        return decoded;
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
}

/**
 * Check if token is expired
 * @param {string} token - JWT token string
 * @returns {boolean} - True if token is expired or invalid
 */
export function isTokenExpired(token) {
    if (!token) return true;
    
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    // Check if expiration time (in seconds) is less than current time (in seconds)
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
}

/**
 * Get token expiration time
 * @param {string} token - JWT token string
 * @returns {number|null} - Expiration timestamp in milliseconds, or null if invalid
 */
export function getTokenExpiration(token) {
    if (!token) return null;
    
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return null;
    
    return decoded.exp * 1000; // Convert to milliseconds
}

/**
 * Check if token is valid (exists and not expired)
 * @param {string} token - JWT token string
 * @returns {boolean} - True if token is valid
 */
export function isTokenValid(token) {
    return token && !isTokenExpired(token);
}


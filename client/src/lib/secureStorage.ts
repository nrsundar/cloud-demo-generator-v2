// Secure storage utilities to prevent user ID exposure
import { User } from 'firebase/auth';

/**
 * Generates a session-based hash for user identification without exposing Firebase UID
 */
export function generateSecureUserHash(user: User): string {
  if (!user.uid) return 'anonymous';
  
  // Create a secure hash that changes per session
  const sessionId = sessionStorage.getItem('app-session-id') || Date.now().toString();
  
  // Simple hash function that doesn't expose the actual UID
  let hash = 0;
  const input = user.uid + sessionId;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16).substring(0, 8);
}

/**
 * Initialize secure session without exposing user data
 */
export function initializeSecureSession(): void {
  if (!sessionStorage.getItem('app-session-id')) {
    sessionStorage.setItem('app-session-id', Date.now().toString());
  }
}

/**
 * Clean up session data on logout
 */
export function clearSecureSession(): void {
  sessionStorage.removeItem('app-session-id');
  
  // Clear any cached user data that might contain sensitive information
  const keysToRemove = Object.keys(sessionStorage).filter(key => 
    key.includes('firebase') || 
    key.includes('user') || 
    key.includes('auth')
  );
  
  keysToRemove.forEach(key => sessionStorage.removeItem(key));
}

/**
 * Sanitize URLs to remove any user identifiers
 */
export function sanitizeURL(url: string): string {
  // Remove common patterns that might expose user IDs
  return url
    .replace(/[?&]uid=[^&]+/g, '')
    .replace(/[?&]user_id=[^&]+/g, '')
    .replace(/[?&]firebase_uid=[^&]+/g, '')
    .replace(/\/users\/[a-zA-Z0-9]{20,}/g, '/users/[hidden]');
}

/**
 * Override browser history to prevent user ID exposure in URLs
 */
export function setupSecureNavigation(): void {
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(state: any, title: string, url?: string | URL | null) {
    const sanitizedUrl = url ? sanitizeURL(url.toString()) : url;
    return originalPushState.call(history, state, title, sanitizedUrl);
  };
  
  history.replaceState = function(state: any, title: string, url?: string | URL | null) {
    const sanitizedUrl = url ? sanitizeURL(url.toString()) : url;
    return originalReplaceState.call(history, state, title, sanitizedUrl);
  };
}
// Network request privacy utilities
import { User } from 'firebase/auth';

/**
 * Intercept and sanitize network requests to prevent user ID exposure
 */
export function setupNetworkPrivacy(): void {
  // Override fetch to sanitize requests
  const originalFetch = window.fetch;
  
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    
    // Sanitize URL parameters that might contain user IDs
    const sanitizedUrl = sanitizeNetworkUrl(url);
    
    // Sanitize request body if it contains user data
    const sanitizedInit = sanitizeRequestInit(init);
    
    // Use sanitized parameters for the request
    const sanitizedInput = typeof input === 'string' ? sanitizedUrl : 
                          input instanceof URL ? new URL(sanitizedUrl) : 
                          { ...input, url: sanitizedUrl };
    
    return originalFetch.call(window, sanitizedInput, sanitizedInit);
  };
}

function sanitizeNetworkUrl(url: string): string {
  try {
    const urlObj = new URL(url, window.location.origin);
    
    // Remove sensitive query parameters
    const sensitiveParams = ['uid', 'user_id', 'firebase_uid', 'auth_token'];
    sensitiveParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    return urlObj.toString();
  } catch {
    // If URL parsing fails, return original URL
    return url;
  }
}

function sanitizeRequestInit(init?: RequestInit): RequestInit | undefined {
  if (!init) return init;
  
  const sanitized = { ...init };
  
  // Sanitize request body if it's JSON
  if (sanitized.body && typeof sanitized.body === 'string') {
    try {
      const parsed = JSON.parse(sanitized.body);
      const sanitizedBody = sanitizeRequestBody(parsed);
      sanitized.body = JSON.stringify(sanitizedBody);
    } catch {
      // If parsing fails, leave body as is
    }
  }
  
  return sanitized;
}

function sanitizeRequestBody(body: any): any {
  if (typeof body !== 'object' || body === null) return body;
  
  if (Array.isArray(body)) {
    return body.map(item => sanitizeRequestBody(item));
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(body)) {
    // Replace sensitive fields with hashed versions
    if (key === 'uid' || key === 'user_id' || key === 'firebase_uid') {
      sanitized[key] = hashUserIdentifier(value as string);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeRequestBody(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

function hashUserIdentifier(uid: string): string {
  // Create a consistent but non-reversible hash
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    const char = uid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `hashed_${Math.abs(hash).toString(16)}`;
}

/**
 * Sanitize user object for API requests
 */
export function sanitizeUserForAPI(user: User | null): any {
  if (!user) return null;
  
  return {
    // Use hashed identifier instead of real UID
    id: hashUserIdentifier(user.uid),
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified
    // Never include: uid, accessToken, refreshToken, etc.
  };
}
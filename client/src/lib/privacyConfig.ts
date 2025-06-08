// Privacy configuration for the application
export const PRIVACY_CONFIG = {
  // Never log these Firebase properties
  FIREBASE_BLACKLIST: [
    'uid',
    'accessToken',
    'refreshToken',
    'stsTokenManager',
    'apiKey',
    'authDomain',
    'providerId'
  ],
  
  // Safe properties to display
  SAFE_USER_PROPERTIES: [
    'displayName',
    'email',
    'photoURL',
    'emailVerified'
  ],
  
  // Console logging controls
  DISABLE_CONSOLE_LOGGING_IN_PRODUCTION: true,
  
  // URL privacy controls
  MASK_USER_IDS_IN_URLS: true
};

// Override console methods in production to prevent accidental logging
if (import.meta.env.PROD && PRIVACY_CONFIG.DISABLE_CONSOLE_LOGGING_IN_PRODUCTION) {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.log = (...args: any[]) => {
    const filteredArgs = args.map(arg => sanitizeForLogging(arg));
    originalLog(...filteredArgs);
  };
  
  console.error = (...args: any[]) => {
    const filteredArgs = args.map(arg => sanitizeForLogging(arg));
    originalError(...filteredArgs);
  };
  
  console.warn = (...args: any[]) => {
    const filteredArgs = args.map(arg => sanitizeForLogging(arg));
    originalWarn(...filteredArgs);
  };
}

function sanitizeForLogging(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForLogging(item));
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (PRIVACY_CONFIG.FIREBASE_BLACKLIST.includes(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}
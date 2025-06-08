// User privacy utilities
import { User } from 'firebase/auth';

/**
 * Creates a safe user object without exposing sensitive data
 */
export function createSafeUserProfile(user: User | null) {
  if (!user) return null;

  return {
    displayName: user.displayName || 'User',
    email: user.email,
    photoURL: user.photoURL,
    // Don't expose uid or other sensitive Firebase data
    isAuthenticated: true
  };
}

/**
 * Generates a user-friendly identifier without exposing the actual Firebase UID
 */
export function getUserDisplayId(user: User | null): string | null {
  if (!user) return null;
  
  // Create a hash-based identifier that doesn't expose the real UID
  const email = user.email || '';
  const name = user.displayName || '';
  
  // Use first part of email + random suffix for display purposes
  if (email) {
    const emailPrefix = email.split('@')[0];
    return emailPrefix.length > 3 ? emailPrefix.substring(0, 3) + '***' : 'user***';
  }
  
  if (name) {
    return name.split(' ')[0] || 'User';
  }
  
  return 'User';
}

/**
 * Anonymizes user data for logging purposes
 */
export function anonymizeUserForLogging(user: User | null) {
  if (!user) return null;
  
  return {
    hasEmail: !!user.email,
    hasDisplayName: !!user.displayName,
    hasPhoto: !!user.photoURL,
    // Never log actual UID, email, or other PII
  };
}
import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { anonymizeUserForLogging } from '@/lib/userUtils';
import { clearSecureSession } from '@/lib/secureStorage';
import { apiRequest } from '@/lib/queryClient';

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      
      // Track user sign-in for analytics
      if (user && user.email) {
        try {
          await apiRequest('POST', '/api/track-signin', { email: user.email });
        } catch (error) {
          // Silent fail - analytics tracking shouldn't block user experience
          console.log('Sign-in tracking failed:', error);
        }
      }
      
      // Log authentication state without exposing sensitive data
      if (import.meta.env.DEV) {
        console.log('Auth state changed:', anonymizeUserForLogging(user));
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      // Clear all session data that might contain user identifiers
      clearSecureSession();
      if (import.meta.env.DEV) {
        console.log('User signed out successfully');
      }
    } catch (error) {
      // Log error without exposing sensitive information
      if (import.meta.env.DEV) {
        console.error('Error signing out:', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    logout
  };
}
/**
 * User ID Management for Browser-Based User Isolation
 * 
 * This utility manages unique user identifiers stored in browser localStorage
 * to provide user-level session isolation without requiring authentication.
 */

const USER_ID_KEY = 'swift-ai-user-id';

/**
 * Generates a UUID v4 compatible unique identifier
 */
function generateUserId(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback UUID v4 generation for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Retrieves the current user ID from localStorage, generating one if it doesn't exist
 * @returns {string} The user's unique identifier
 */
export function getUserId(): string {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    // Server-side or localStorage unavailable - return a temporary ID
    console.warn('localStorage unavailable, using temporary user ID');
    return 'temp-user-' + Date.now();
  }

  try {
    let userId = localStorage.getItem(USER_ID_KEY);
    
    if (!userId) {
      // Generate new user ID and store it
      userId = generateUserId();
      localStorage.setItem(USER_ID_KEY, userId);
      console.log('Generated new user ID:', userId);
    }
    
    return userId;
  } catch (error) {
    // Handle localStorage access errors (e.g., private browsing mode)
    console.error('Error accessing localStorage for user ID:', error);
    return 'temp-user-' + Date.now();
  }
}

/**
 * Clears the current user ID from localStorage (useful for debugging/testing)
 * This will cause a new user ID to be generated on next access
 */
export function clearUserId(): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(USER_ID_KEY);
      console.log('User ID cleared from localStorage');
    } catch (error) {
      console.error('Error clearing user ID from localStorage:', error);
    }
  }
}

/**
 * Checks if a user ID exists in localStorage
 * @returns {boolean} True if user ID exists, false otherwise
 */
export function hasUserId(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }
  
  try {
    return localStorage.getItem(USER_ID_KEY) !== null;
  } catch (error) {
    console.error('Error checking for user ID in localStorage:', error);
    return false;
  }
}

/**
 * Gets user ID info for debugging
 * @returns {object} User ID information
 */
export function getUserIdInfo(): {
  userId: string;
  exists: boolean;
  isTemporary: boolean;
} {
  const userId = getUserId();
  const exists = hasUserId();
  const isTemporary = userId.startsWith('temp-user-');
  
  return {
    userId,
    exists,
    isTemporary
  };
}
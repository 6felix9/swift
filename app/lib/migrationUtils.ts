/**
 * Migration utilities for handling existing sessions without user_id
 * 
 * This utility provides functions to handle sessions that were created
 * before the user isolation feature was implemented.
 */

import { DatabaseService } from './databaseService';

/**
 * Gets count of legacy sessions (sessions without user_id)
 */
export async function getLegacySessionCount(): Promise<number> {
  try {
    const result = await fetch('/api/sessions/legacy/count');
    if (!result.ok) {
      throw new Error('Failed to get legacy session count');
    }
    const data = await result.json();
    return data.count || 0;
  } catch (error) {
    console.error('Error getting legacy session count:', error);
    return 0;
  }
}

/**
 * Assigns all legacy sessions (sessions without user_id) to a specific user
 * This is useful for migrating existing data to a user's account
 */
export async function assignLegacySessionsToUser(userId: string): Promise<number> {
  try {
    const response = await fetch('/api/sessions/legacy/assign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to assign legacy sessions');
    }
    
    const data = await response.json();
    console.log(`Assigned ${data.assignedCount} legacy sessions to user ${userId}`);
    return data.assignedCount || 0;
  } catch (error) {
    console.error('Error assigning legacy sessions:', error);
    throw error;
  }
}

/**
 * Deletes all legacy sessions (sessions without user_id)
 * This provides a clean slate but permanently removes old data
 */
export async function deleteLegacySessions(): Promise<number> {
  try {
    const response = await fetch('/api/sessions/legacy/delete', {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete legacy sessions');
    }
    
    const data = await response.json();
    console.log(`Deleted ${data.deletedCount} legacy sessions`);
    return data.deletedCount || 0;
  } catch (error) {
    console.error('Error deleting legacy sessions:', error);
    throw error;
  }
}

/**
 * Migration strategies for existing sessions
 */
export const MIGRATION_STRATEGIES = {
  /**
   * Do nothing - legacy sessions will be filtered out by user queries
   * They will eventually be cleaned up by the automatic cleanup process
   */
  IGNORE: 'ignore',
  
  /**
   * Assign legacy sessions to the current user
   * Useful when you want to migrate existing data to the current browser user
   */
  ASSIGN_TO_CURRENT_USER: 'assign_to_current_user',
  
  /**
   * Delete all legacy sessions
   * Clean slate approach, permanently removes old data
   */
  DELETE_LEGACY: 'delete_legacy',
} as const;

export type MigrationStrategy = typeof MIGRATION_STRATEGIES[keyof typeof MIGRATION_STRATEGIES];

/**
 * Executes a migration strategy for legacy sessions
 */
export async function executeMigrationStrategy(
  strategy: MigrationStrategy,
  currentUserId?: string
): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    switch (strategy) {
      case MIGRATION_STRATEGIES.IGNORE:
        return {
          success: true,
          message: 'Legacy sessions will be filtered out and eventually cleaned up automatically',
        };
        
      case MIGRATION_STRATEGIES.ASSIGN_TO_CURRENT_USER:
        if (!currentUserId) {
          throw new Error('Current user ID is required for assignment strategy');
        }
        const assignedCount = await assignLegacySessionsToUser(currentUserId);
        return {
          success: true,
          message: `Successfully assigned ${assignedCount} legacy sessions to current user`,
          count: assignedCount,
        };
        
      case MIGRATION_STRATEGIES.DELETE_LEGACY:
        const deletedCount = await deleteLegacySessions();
        return {
          success: true,
          message: `Successfully deleted ${deletedCount} legacy sessions`,
          count: deletedCount,
        };
        
      default:
        throw new Error(`Unknown migration strategy: ${strategy}`);
    }
  } catch (error) {
    console.error('Migration strategy execution failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Migration failed',
    };
  }
}
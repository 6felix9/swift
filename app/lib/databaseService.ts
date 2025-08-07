import { createClient } from '@libsql/client';
import { StoredSession } from './sessionStorage';
import { Message } from './types';
import { EvaluationResponse } from './evaluationTypes';
import { Persona } from './personas';
import { ScenarioDefinition } from './scenarios';
import { Difficulty } from './difficultyTypes';

// Database client - initialized lazily
let dbClient: ReturnType<typeof createClient> | null = null;

function getDbClient() {
  if (!dbClient) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    
    if (!url || !authToken) {
      throw new Error('Missing required Turso environment variables: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN');
    }
    
    dbClient = createClient({
      url,
      authToken,
    });
  }
  
  return dbClient;
}

/**
 * Database operations for session storage
 */
export class DatabaseService {
  private static async execute<T = any>(query: string, params?: any[]): Promise<T> {
    const client = getDbClient();
    const result = await client.execute({
      sql: query,
      args: params || [],
    });
    return result as T;
  }

  /**
   * Retrieve all sessions for a specific user, ordered by most recent first, limited to maxCount
   */
  static async getAllSessions(userId: string, maxCount: number = 10): Promise<StoredSession[]> {
    try {
      const result = await this.execute<any>(
        'SELECT * FROM sessions WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
        [userId, maxCount]
      );
      
      return result.rows.map((row: any) => ({
        id: row.id,
        timestamp: new Date(row.timestamp),
        scenario: JSON.parse(row.scenario_data),
        persona: JSON.parse(row.persona_data),
        difficulty: JSON.parse(row.difficulty_data),
        evaluationData: JSON.parse(row.evaluation_data),
        transcript: JSON.parse(row.transcript),
        callDuration: row.call_duration,
        conversationScores: JSON.parse(row.conversation_scores),
      }));
    } catch (error) {
      console.error('Error retrieving sessions from database:', error);
      throw error;
    }
  }

  /**
   * Retrieve a specific session by ID for a specific user
   */
  static async getSessionById(userId: string, sessionId: string): Promise<StoredSession | null> {
    try {
      const result = await this.execute<any>(
        'SELECT * FROM sessions WHERE id = ? AND user_id = ? LIMIT 1',
        [sessionId, userId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        timestamp: new Date(row.timestamp),
        scenario: JSON.parse(row.scenario_data),
        persona: JSON.parse(row.persona_data),
        difficulty: JSON.parse(row.difficulty_data),
        evaluationData: JSON.parse(row.evaluation_data),
        transcript: JSON.parse(row.transcript),
        callDuration: row.call_duration,
        conversationScores: JSON.parse(row.conversation_scores),
      };
    } catch (error) {
      console.error(`Error retrieving session ${sessionId} from database:`, error);
      throw error;
    }
  }

  /**
   * Save a new session to the database for a specific user
   */
  static async saveSession(userId: string, sessionData: {
    scenario: ScenarioDefinition;
    persona: Persona;
    difficulty: Difficulty;
    evaluationData: EvaluationResponse;
    transcript: Message[];
    callDuration: number;
    conversationScores: Array<{
      turn: number;
      score: number;
      timestamp: number;
    }>;
  }): Promise<StoredSession> {
    try {
      const sessionId = this.generateSessionId();
      const timestamp = new Date().toISOString();
      
      await this.execute(
        `INSERT INTO sessions (
          id, user_id, timestamp, scenario_data, persona_data, difficulty_data,
          evaluation_data, transcript, call_duration, conversation_scores,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          userId,
          timestamp,
          JSON.stringify(sessionData.scenario),
          JSON.stringify(sessionData.persona),
          JSON.stringify(sessionData.difficulty),
          JSON.stringify(sessionData.evaluationData),
          JSON.stringify(sessionData.transcript),
          sessionData.callDuration,
          JSON.stringify(sessionData.conversationScores),
          timestamp, // created_at
          timestamp, // updated_at
        ]
      );

      // Ensure we don't exceed the maximum number of stored sessions for this user
      await this.cleanupOldSessions(userId, 10);

      console.log(`Session ${sessionId} saved successfully to database`);
      
      return {
        id: sessionId,
        timestamp: new Date(timestamp),
        ...sessionData,
      };
    } catch (error) {
      console.error('Error saving session to database:', error);
      throw error;
    }
  }

  /**
   * Delete a specific session by ID for a specific user
   */
  static async deleteSession(userId: string, sessionId: string): Promise<boolean> {
    try {
      const result = await this.execute<any>(
        'DELETE FROM sessions WHERE id = ? AND user_id = ?',
        [sessionId, userId]
      );
      
      const deleted = result.rowsAffected > 0;
      if (deleted) {
        console.log(`Session ${sessionId} deleted successfully from database`);
      }
      
      return deleted;
    } catch (error) {
      console.error(`Error deleting session ${sessionId} from database:`, error);
      throw error;
    }
  }

  /**
   * Delete all sessions for a specific user
   */
  static async clearAllSessions(userId: string): Promise<number> {
    try {
      const result = await this.execute<any>('DELETE FROM sessions WHERE user_id = ?', [userId]);
      const deletedCount = result.rowsAffected;
      console.log(`${deletedCount} sessions cleared from database for user ${userId}`);
      return deletedCount;
    } catch (error) {
      console.error('Error clearing all sessions from database:', error);
      throw error;
    }
  }

  /**
   * Remove old sessions for a specific user to maintain the maximum count
   */
  private static async cleanupOldSessions(userId: string, maxSessions: number): Promise<void> {
    try {
      await this.execute(
        `DELETE FROM sessions WHERE user_id = ? AND id NOT IN (
          SELECT id FROM sessions WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?
        )`,
        [userId, userId, maxSessions]
      );
    } catch (error) {
      console.error('Error cleaning up old sessions:', error);
      // Don't throw - this is a cleanup operation
    }
  }

  /**
   * Generate a unique session ID
   */
  private static generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `session_${timestamp}_${random}`;
  }
}
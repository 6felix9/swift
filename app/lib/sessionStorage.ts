import { Message } from './types';
import { EvaluationResponse } from './evaluationTypes';
import { Persona } from './personas';
import { ScenarioDefinition } from './scenarios';
import { Difficulty } from './difficultyTypes';
import { getUserId } from './userIdManager';

export interface StoredSession {
  id: string;
  timestamp: Date;
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
}

// API endpoints
const API_BASE = '/api/sessions';
const MAX_STORED_SESSIONS = 10;

/**
 * Retrieves all stored sessions from database for the current user
 * Returns an empty array if no sessions are found or if there's an error
 */
export const getStoredSessions = async (): Promise<StoredSession[]> => {
  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE}?limit=${MAX_STORED_SESSIONS}&userId=${encodeURIComponent(userId)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Convert timestamp strings back to Date objects
    return data.sessions.map((session: any) => ({
      ...session,
      timestamp: new Date(session.timestamp)
    }));
  } catch (error) {
    console.error('Error retrieving stored sessions:', error);
    throw error;
  }
};

/**
 * Saves a new session to database for the current user
 * Returns the saved session with generated ID and timestamp
 */
export const saveSession = async (sessionData: {
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
}): Promise<StoredSession> => {
  try {
    const userId = getUserId();
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...sessionData, userId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to save session: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    console.log(`Session saved successfully to database. ID: ${data.session.id}`);
    
    // Convert timestamp string back to Date object
    return {
      ...data.session,
      timestamp: new Date(data.session.timestamp)
    };
  } catch (error) {
    console.error('Error saving session:', error);
    throw error;
  }
};

/**
 * Retrieves a specific session by ID from database for the current user
 * Returns null if session is not found
 */
export const getSessionById = async (sessionId: string): Promise<StoredSession | null> => {
  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE}/${sessionId}?userId=${encodeURIComponent(userId)}`);
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch session: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Convert timestamp string back to Date object
    return {
      ...data.session,
      timestamp: new Date(data.session.timestamp)
    };
  } catch (error) {
    console.error(`Error retrieving session ${sessionId}:`, error);
    throw error;
  }
};

/**
 * Deletes a specific session by ID from database for the current user
 * Returns true if session was deleted, false if not found
 */
export const deleteSession = async (sessionId: string): Promise<boolean> => {
  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE}/${sessionId}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
    
    if (response.status === 404) {
      return false;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to delete session: ${response.status} ${response.statusText}`);
    }

    console.log(`Session ${sessionId} deleted successfully from database`);
    return true;
  } catch (error) {
    console.error(`Error deleting session ${sessionId}:`, error);
    throw error;
  }
};

/**
 * Clears all stored sessions from database for the current user
 * Returns the number of sessions that were deleted
 */
export const clearAllSessions = async (): Promise<number> => {
  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE}/clear?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to clear sessions: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('All sessions cleared successfully from database');
    return data.deletedCount || 0;
  } catch (error) {
    console.error('Error clearing sessions:', error);
    throw error;
  }
};

/**
 * Formats a session timestamp for display
 */
export const formatSessionTimestamp = (timestamp: Date): string => {
  return timestamp.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Gets a summary description for a session (for list display)
 */
export const getSessionSummary = (session: StoredSession): string => {
  const score = session.evaluationData.evaluationSummary.totalScore;
  const maxScore = session.evaluationData.evaluationSummary.maxPossibleScore;
  const percentage = Math.round((score / maxScore) * 100);
  
  return `${session.scenario.name} with ${session.persona.name} - Score: ${score}/${maxScore} (${percentage}%)`;
};
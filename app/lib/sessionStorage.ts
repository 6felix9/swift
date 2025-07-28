import { Message } from './types';
import { EvaluationResponse } from './evaluationTypes';
import { Persona } from './personas';
import { ScenarioDefinition } from './scenarios';
import { Difficulty } from './difficultyTypes';

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

const STORAGE_KEY = 'swift_ai_session_history';
const MAX_STORED_SESSIONS = 10;

/**
 * Retrieves all stored sessions from localStorage
 * Returns an empty array if no sessions are found or if there's an error
 */
export const getStoredSessions = (): StoredSession[] => {
  try {
    if (typeof window === 'undefined') {
      return []; // Server-side rendering protection
    }
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    
    const sessions = JSON.parse(stored) as StoredSession[];
    
    // Convert timestamp strings back to Date objects
    return sessions.map(session => ({
      ...session,
      timestamp: new Date(session.timestamp)
    }));
  } catch (error) {
    console.error('Error retrieving stored sessions:', error);
    return [];
  }
};

/**
 * Saves a new session to localStorage
 * Automatically manages the maximum number of stored sessions (keeps latest 10)
 */
export const saveSession = (sessionData: {
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
}): void => {
  try {
    if (typeof window === 'undefined') {
      return; // Server-side rendering protection
    }

    const newSession: StoredSession = {
      id: generateSessionId(),
      timestamp: new Date(),
      ...sessionData
    };

    const existingSessions = getStoredSessions();
    
    // Add new session to the beginning of the array (most recent first)
    const updatedSessions = [newSession, ...existingSessions];
    
    // Keep only the most recent MAX_STORED_SESSIONS sessions
    const sessionsToStore = updatedSessions.slice(0, MAX_STORED_SESSIONS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionsToStore));
    
    console.log(`Session saved successfully. Total sessions: ${sessionsToStore.length}`);
  } catch (error) {
    console.error('Error saving session:', error);
    // Could show a toast notification here if needed
  }
};

/**
 * Retrieves a specific session by ID
 */
export const getSessionById = (sessionId: string): StoredSession | null => {
  const sessions = getStoredSessions();
  return sessions.find(session => session.id === sessionId) || null;
};

/**
 * Deletes a specific session by ID
 */
export const deleteSession = (sessionId: string): void => {
  try {
    if (typeof window === 'undefined') {
      return;
    }

    const sessions = getStoredSessions();
    const filteredSessions = sessions.filter(session => session.id !== sessionId);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredSessions));
    
    console.log(`Session ${sessionId} deleted successfully`);
  } catch (error) {
    console.error('Error deleting session:', error);
  }
};

/**
 * Clears all stored sessions
 */
export const clearAllSessions = (): void => {
  try {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    console.log('All sessions cleared successfully');
  } catch (error) {
    console.error('Error clearing sessions:', error);
  }
};

/**
 * Generates a unique session ID
 */
const generateSessionId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `session_${timestamp}_${random}`;
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
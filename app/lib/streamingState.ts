/**
 * Global streaming state manager for ElevenLabs TTS interruption handling
 * This singleton manages the streaming state across all sessions
 */

interface StreamingSessionState {
  stopStream: boolean;
  isInterrupting: boolean;
  isStreaming: boolean;
}

class StreamingStateManager {
  private static instance: StreamingStateManager;
  private sessionStates: Map<string, StreamingSessionState> = new Map();

  private constructor() {}

  public static getInstance(): StreamingStateManager {
    if (!StreamingStateManager.instance) {
      StreamingStateManager.instance = new StreamingStateManager();
    }
    return StreamingStateManager.instance;
  }

  /**
   * Initialize or reset streaming state for a session
   */
  public initializeSession(sessionId: string): void {
    this.sessionStates.set(sessionId, {
      stopStream: false,
      isInterrupting: false,
      isStreaming: false
    });
  }

  /**
   * Get streaming state for a session
   */
  public getSessionState(sessionId: string): StreamingSessionState {
    if (!this.sessionStates.has(sessionId)) {
      this.initializeSession(sessionId);
    }
    return this.sessionStates.get(sessionId)!;
  }

  /**
   * Set stop stream flag for a session
   */
  public setStopStream(sessionId: string, value: boolean): void {
    const state = this.getSessionState(sessionId);
    state.stopStream = value;
  }

  /**
   * Get stop stream flag for a session
   */
  public getStopStream(sessionId: string): boolean {
    return this.getSessionState(sessionId).stopStream;
  }

  /**
   * Set interrupting flag for a session
   */
  public setIsInterrupting(sessionId: string, value: boolean): void {
    const state = this.getSessionState(sessionId);
    state.isInterrupting = value;
  }

  /**
   * Get interrupting flag for a session
   */
  public getIsInterrupting(sessionId: string): boolean {
    return this.getSessionState(sessionId).isInterrupting;
  }

  /**
   * Set streaming flag for a session
   */
  public setIsStreaming(sessionId: string, value: boolean): void {
    const state = this.getSessionState(sessionId);
    state.isStreaming = value;
  }

  /**
   * Get streaming flag for a session
   */
  public getIsStreaming(sessionId: string): boolean {
    return this.getSessionState(sessionId).isStreaming;
  }

  /**
   * Trigger interrupt for a session
   * Returns true if interrupt was actually triggered, false if already interrupted
   */
  public interrupt(sessionId: string): boolean {
    const state = this.getSessionState(sessionId);
    
    // Check if already interrupted to avoid redundant operations
    if (state.stopStream && state.isInterrupting) {
      console.log(`[StreamingState] Session ${sessionId} already interrupted - ignoring duplicate interrupt`);
      return false;
    }
    
    state.stopStream = true;
    state.isInterrupting = true;
    console.log(`[StreamingState] Interrupt triggered for session ${sessionId}`);
    return true;
  }

  /**
   * Reset all flags for a session (typically called when streaming ends)
   */
  public resetSession(sessionId: string): void {
    const state = this.getSessionState(sessionId);
    state.stopStream = false;
    state.isInterrupting = false;
    state.isStreaming = false;
  }

  /**
   * Clean up session state (call when session ends)
   */
  public cleanupSession(sessionId: string): void {
    this.sessionStates.delete(sessionId);
    console.log(`[StreamingState] Session ${sessionId} cleaned up`);
  }
}

// Export the singleton instance
export const streamingStateManager = StreamingStateManager.getInstance();
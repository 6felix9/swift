/**
 * Global streaming state manager for ElevenLabs TTS interruption handling
 * This singleton manages the streaming state across all sessions
 */

interface StreamingSessionState {
  stopStream: boolean;
  isInterrupting: boolean;
  isStreaming: boolean;
  activeStreamReader: ReadableStreamDefaultReader<Uint8Array> | null;
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
      isStreaming: false,
      activeStreamReader: null
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
   * Set active stream reader for a session
   */
  public setActiveStreamReader(sessionId: string, reader: ReadableStreamDefaultReader<Uint8Array> | null): void {
    const state = this.getSessionState(sessionId);
    state.activeStreamReader = reader;
  }

  /**
   * Get active stream reader for a session
   */
  public getActiveStreamReader(sessionId: string): ReadableStreamDefaultReader<Uint8Array> | null {
    return this.getSessionState(sessionId).activeStreamReader;
  }

  /**
   * Force stop current stream by canceling the active reader
   */
  public async forceStopCurrentStream(sessionId: string): Promise<void> {
    const state = this.getSessionState(sessionId);
    
    if (state.activeStreamReader) {
      console.log(`[StreamingState] Force stopping current stream for session ${sessionId}`);
      try {
        await state.activeStreamReader.cancel();
        console.log(`[StreamingState] Successfully canceled stream reader for session ${sessionId}`);
      } catch (error) {
        console.warn(`[StreamingState] Error canceling stream reader for session ${sessionId}:`, error);
      }
      state.activeStreamReader = null;
    }
    
    // Set interrupt flags to ensure cleanup
    state.stopStream = true;
    state.isInterrupting = true;
  }

  /**
   * Reset all flags for a session (typically called when streaming ends)
   */
  public resetSession(sessionId: string): void {
    const state = this.getSessionState(sessionId);
    state.stopStream = false;
    state.isInterrupting = false;
    state.isStreaming = false;
    state.activeStreamReader = null;
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
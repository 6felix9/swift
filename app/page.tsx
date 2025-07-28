"use client";

import clsx from "clsx";
import { useEffect, useRef, useState, useCallback } from "react";
import { LoadingIcon } from "@/lib/icons";
import { usePlayer } from "@/lib/usePlayer";
import { useMicVAD, utils } from "@ricky0123/vad-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartLineLinear } from "@/components/ui/chart-line-linear";
import { Message } from "@/lib/types";
import { ConversationScore } from "@/lib/scoringService";
import { brandColors } from "@/lib/constants";
import { SummaryDisplay } from '@/components/ui/SummaryDisplay';
import { PhoneOff, Mic, MicOff, MessageSquare, MessageSquareOff, User, Target, CheckCircle, Info, Eye, EyeOff } from 'lucide-react'; // CheckCircle2 moved to ScenarioSelection
import { ScenarioSelection } from '@/components/ui/ScenarioSelection';
import { PersonaSelection } from '@/components/ui/PersonaSelection';
import { DifficultySelection } from "@/components/ui/DifficultySelection";
import { EvaluationDisplay } from '@/components/ui/EvaluationDisplay'; // Added
import { SessionHistory } from '@/components/ui/SessionHistory';
import { StoredSession, getSessionById, saveSession } from '@/lib/sessionStorage';
import { toast } from 'sonner';

import { Persona, personas, getPersonaById } from '@/lib/personas';
import { ScenarioDefinition, scenarioDefinitions, getScenarioDefinitionById } from '@/lib/scenarios';
import { TrainingDomain } from '@/lib/types';
import { EVALUATION_PROMPTS } from '@/lib/prompt';
import { EvaluationResponse } from "@/lib/evaluationTypes";
import { Difficulty } from '@/lib/difficultyTypes';
import { initializeAndJoinRoom, leaveAndDestroyRoom } from '@/lib/rtcService';

export default function Home() {
  const mainContainerStyle = {
    background: 'transparent',
    minHeight: '100vh',
    color: brandColors.white,
    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
  };
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const endCallRef = useRef<HTMLButtonElement>(null);
  const endCalledRef = useRef(false);
  const player = usePlayer();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [manualListening, setManualListening] = useState(false);
  const [isAvatarConnected, setIsAvatarConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isApiLoading, setIsApiLoading] = useState(false);
  // const apiLoadingEndTimeRef = useRef<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Voice-only interaction state management
  const [interruptTimeoutId, setInterruptTimeoutId] = useState<NodeJS.Timeout | null>(null);
  // Configurable minimum speech time before sending interrupt (in milliseconds)
  // This prevents very brief sounds from interrupting the avatar
  const [minSpeechTimeForInterrupt, setMinSpeechTimeForInterrupt] = useState(200);

  const pendingEndCall = useRef(false);
  const handleEndCallRef = useRef<(() => void) | null>(null);
  const vadRef = useRef<any>(null);

  // State for evaluation
  const [evaluationData, setEvaluationData] = useState<EvaluationResponse | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  // State to track if user has initiated listening
  const [listeningInitiated, setListeningInitiated] = useState<boolean>(false);
  
  // State for mute/unmute functionality
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Add this state variable at the top of your component
  const [isMessagesPanelVisible, setIsMessagesPanelVisible] = useState(true);
  const [isSuggestionsPanelVisible, setIsSuggestionsPanelVisible] = useState(true);

  // State for new Scenario-based training
  const [scenarioDefinitionsData, setScenarioDefinitionsData] = useState<ScenarioDefinition[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<TrainingDomain>('financial-advisor');
  const [personasData, setPersonasData] = useState<Persona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null); 
  const [difficultyProfile, setDifficultyProfile] = useState<string | null>(null);
  const [isPreparingSession, setIsPreparingSession] = useState<boolean>(false);
  const [tempID, setTempID] = useState<string | null>(null);

  // Call duration tracking state
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [callDurationInterval, setCallDurationInterval] = useState<NodeJS.Timeout | null>(null);

  // Wizard Step State for new flow
  const [selectionStep, setSelectionStep] = useState<'selectScenario' | 'selectPersona' | 'selectDifficulty' | 'summary' | 'evaluationResults' | 'sessionHistory' | 'viewHistoricalSession' | null>('selectScenario'); // Added session history steps
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Session History state
  const [selectedHistoricalSession, setSelectedHistoricalSession] = useState<StoredSession | null>(null);

  // Development mode state
  const [isDevelopmentMode, setIsDevelopmentMode] = useState<boolean>(false);

  // Conversation Effectiveness Scoring state
  const [conversationScores, setConversationScores] = useState<Array<{
    turn: number;
    score: number; // Conversation Effectiveness Score (0-100)
    timestamp: number;
  }>>([]);

  // Scoring queue for real-time updates
  const scoringQueueRef = useRef<Array<{
    turnNumber: number;
    conversationHistory: Message[];
    timestamp: number;
  }>>([]);
  const isProcessingQueueRef = useRef<boolean>(false);

  const toggleMessagesPanel = () => {
    setIsMessagesPanelVisible(!isMessagesPanelVisible);
  };

  const toggleSuggestionsPanel = () => {
    setIsSuggestionsPanelVisible(!isSuggestionsPanelVisible);
  };

  // Process scoring queue continuously
  const processScoreQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || scoringQueueRef.current.length === 0) {
      return;
    }
    
    isProcessingQueueRef.current = true;
    console.log(`[ScoringQueue] Processing ${scoringQueueRef.current.length} queued score requests`);
    
    // Process all queued requests
    while (scoringQueueRef.current.length > 0) {
      const queueItem = scoringQueueRef.current.shift();
      if (!queueItem) continue;
      
      try {
        console.log(`[ScoringQueue] Processing turn ${queueItem.turnNumber} with ${queueItem.conversationHistory.length} messages`);
        console.log(`[ScoringQueue] Message roles: ${queueItem.conversationHistory.map(m => m.role).join(', ')}`);
        
        // Fire-and-forget API call
        const response = await fetch('/api/score-turn', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationHistory: queueItem.conversationHistory,
            turnNumber: queueItem.turnNumber,
          }),
        });
        
        if (response.ok) {
          const scoreData: ConversationScore = await response.json();
          console.log(`[ScoringQueue] Turn ${scoreData.turn} scored: ${scoreData.score}/100`);
          
          // Update conversation scores state for chart
          setConversationScores(prevScores => {
            const newScores = [...prevScores];
            const existingIndex = newScores.findIndex(s => s.turn === scoreData.turn);
            
            if (existingIndex >= 0) {
              // Update existing score
              newScores[existingIndex] = scoreData;
            } else {
              // Add new score and sort by turn number
              newScores.push(scoreData);
              newScores.sort((a, b) => a.turn - b.turn);
            }
            
            return newScores;
          });
        } else {
          console.warn(`[ScoringQueue] Failed to score turn ${queueItem.turnNumber}:`, response.statusText);
          // Graceful degradation - chart will show no change for this turn
        }
      } catch (error) {
        console.error(`[ScoringQueue] Error scoring turn ${queueItem.turnNumber}:`, error);
        // Graceful degradation - chart continues without this score
      }
      
      // Small delay between requests to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    isProcessingQueueRef.current = false;
    console.log('[ScoringQueue] Queue processing complete');
  }, []);

  useEffect(() => {
    // Load scenario definitions and personas from the imported data
    setScenarioDefinitionsData(scenarioDefinitions);
    setPersonasData(personas);
  }, []);

  // Development mode setup
  const setupDevelopmentMode = () => {
    // Mock data for development
    const mockScenarioId = 'REFERRAL_SEEKING'; // Default to first available scenario
    const mockPersonaId = 'SARAH_LEE'; // Default to first available persona
    const mockDifficulty: Difficulty = 'medium';
    const mockSessionId = 'dev-session-' + Date.now();

    // Set up mock state
    setSelectedScenarioId(mockScenarioId);
    setSelectedPersonaId(mockPersonaId);
    setSelectedDifficulty(mockDifficulty);
    setSelectedDomain('financial-advisor');
    setSessionId(mockSessionId);
    setIsAvatarConnected(true);
    setListeningInitiated(true);
    setSelectionStep(null);

    // Mock conversation for UI testing
    const mockMessages: Message[] = [
      { role: 'client', content: 'Hi there! I was hoping you could help me understand some investment options.' },
      { role: 'advisor', content: 'Of course! I\'d be happy to help you explore your investment options. What are your main financial goals?' },
      { role: 'client', content: 'I\'m looking to save for retirement, but I\'m not sure where to start.' },
      { role: 'advisor', content: 'That\'s a great goal to have. Let\'s start by discussing your current financial situation and risk tolerance.' },
      { role: 'client', content: 'Hi there! I was hoping you could help me understand some investment options.' },
      { role: 'advisor', content: 'Of course! I\'d be happy to help you explore your investment options. What are your main financial goals?' },
      { role: 'client', content: 'I\'m looking to save for retirement, but I\'m not sure where to start.' },
      { role: 'advisor', content: 'That\'s a great goal to have. Let\'s start by discussing your current financial situation and risk tolerance.' }
    ];
    setMessages(mockMessages);

    // Mock suggestions
    const mockSuggestions = [
      'What\'s your current age and target retirement age? What\'s your current age and target retirement age? What\'s your current age and target retirement age?',
      'What\'s your current age and target retirement age? What\'s your current age and target retirement age? What\'s your current age and target retirement age?',
    ];
    setSuggestions(mockSuggestions);

    console.log('[DEV MODE] Development mode activated with mock data and suggestions');
  };

  // Check for development mode on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const devMode = urlParams.get('dev');
    
    if (devMode === 'true') {
      setIsDevelopmentMode(true);
      setupDevelopmentMode();
    }
  }, []);

  // Phase 2: Session recovery on page load
  useEffect(() => {
    const recoverSession = async () => {
      try {
        const storedSessionId = sessionStorage.getItem('swift_ai_session_id');
        const storedConnectedState = sessionStorage.getItem('swift_ai_avatar_connected');
        
        if (storedSessionId && storedConnectedState === 'true') {
          console.log('[SessionRecovery] Found stored session:', storedSessionId);
          
          // Validate if session is still active on server
          const response = await fetch(`/api/digital-human?action=validate&sessionId=${storedSessionId}`);
          
          if (response.ok) {
            const result = await response.json();
            if (result.valid) {
              console.log('[SessionRecovery] Session is still valid, restoring state');
              setSessionId(storedSessionId);
              setIsAvatarConnected(true);
              toast.success('Session recovered successfully');
            } else {
              console.log('[SessionRecovery] Session is no longer valid, clearing storage');
              sessionStorage.removeItem('swift_ai_session_id');
              sessionStorage.removeItem('swift_ai_avatar_connected');
            }
          } else {
            console.log('[SessionRecovery] Session validation failed, clearing storage');
            sessionStorage.removeItem('swift_ai_session_id');
            sessionStorage.removeItem('swift_ai_avatar_connected');
          }
        }
      } catch (error) {
        console.error('[SessionRecovery] Error during session recovery:', error);
        // Clear potentially corrupted session data
        sessionStorage.removeItem('swift_ai_session_id');
        sessionStorage.removeItem('swift_ai_avatar_connected');
      }
    };

    recoverSession();
  }, []);


  const handleSubmit = useCallback(async (data: string | Blob, sid?: string) => {
    // If isPending, do not process the request.
    if (isApiLoading) {
      return;
    }
    // Ending phrases
    const END_REGEX = /\b(alright,\s*see you next time|great chatting—see you next time|that covers everything—talk soon|thanks\.?\s*have a good day!?)\b/i;
    
    setSuggestions([]); // Clear previous suggestions

    setIsApiLoading(true);

    // For Blob inputs, ensure it's an audio file
    if (data instanceof Blob && !data.type.startsWith('audio/')) {
      console.error('Invalid audio type:', data.type);
      toast.error('We can only process voice messages. Please try again.');
      return;
    }

    try {
      // 1️⃣ Send to /api → audio + text
      const submittedAt = Date.now();
      const formData = new FormData();
      formData.append("input", data);

      // Get sessionId
      const effectiveSessionId = sid ?? sessionId;
      if (effectiveSessionId) {
        formData.append("sessionId", effectiveSessionId);
      } else {
        toast.error("Session ID not found. Please try again.");
        return;
      }

      // Get selected persona and scenario
      const selectedPersona = personas.find(p => p.id === selectedPersonaId) || undefined;
      const selectedScenario = scenarioDefinitionsData.find(s => s.id === selectedScenarioId) || undefined;

      if (selectedPersona) {
        formData.append("roleplayProfile", JSON.stringify(selectedPersona));
      }
      if (selectedScenario) {
        formData.append("scenario", JSON.stringify(selectedScenario));
      }
      if (difficultyProfile) {
        formData.append("difficultyProfile", JSON.stringify(difficultyProfile));
      }
      
      formData.append("message", JSON.stringify(messages.slice(-10).map(m => ({ role: m.role, content: m.content }))));

      const response = await fetch("/api", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(await response.text() || "Main AI call failed");

      // 2️⃣ Parse audio + transcript + text
      const latency = Date.now() - submittedAt;
      const transcript = decodeURIComponent(response.headers.get("X-Transcript") || "");
      const text       = decodeURIComponent(response.headers.get("X-Response")   || "");

      // 3️⃣ Immediately render the new turn
      const userRoleKey = selectedScenario?.userRole || 'advisor';
      const personaRoleKey = selectedScenario?.personaRole || 'client';
      
      if (data === "START") {
        setMessages([{ role: personaRoleKey, content: text }]);
      } else {
        setMessages(msgs => [
          ...msgs,
          { role: userRoleKey, content: transcript },
          { role: personaRoleKey,  content: text, latency },
        ]);
      }

      // 3.5️⃣ Detect if AI's reply contains an end-session phrase
      const isEnding = END_REGEX.test(text);
      if (isEnding) {
        console.log('[handleSubmit] Ending phrase detected, will auto-end when stream finishes'); 
        pendingEndCall.current = true;
        
        // Calculate dynamic timeout based on message length for proper speech timing
        const wordCount = text.trim().split(/\s+/).length;
        const estimatedSpeechTime = Math.max(3000, (wordCount / 2.5) * 1000 + 2000); // ~2.5 words/sec + 2sec buffer, min 3sec
        console.log(`[handleSubmit] Message length: ${wordCount} words, estimated speech time: ${estimatedSpeechTime}ms`);
        
        setTimeout(() => {
          handleEndCallRef.current?.();
        }, estimatedSpeechTime);
      }

      // Clear input field
      setInput("");

      // 4️⃣ Fire-and-forget the suggestions fetch
      (async () => {
        try {
          let hist;
          const currentMessages = messages.slice(-10);
          
          const userRoleKey = selectedScenario?.userRole || 'advisor';
          const personaRoleKey = selectedScenario?.personaRole || 'client';
          
          if (data === "START") {
            hist = [{ role: personaRoleKey, content: text }];
          } else {
            hist = [
              ...currentMessages,
              { role: userRoleKey, content: transcript },
              { role: personaRoleKey, content: text }
            ];
          }
          
          const history = hist.map(m => ({ role: m.role, content: m.content }));
          const sugRes = await fetch("/api/suggestion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationHistory: history,
              requestId: crypto.randomUUID().slice(0,8),
              scenarioId: selectedScenario?.id,
            }),
          });
          if (!sugRes.ok) throw new Error(await sugRes.text());
          const { suggestions } = (await sugRes.json()) as { suggestions: string[] };
          setSuggestions(Array.isArray(suggestions) ? suggestions : []);
        } catch (e) {
          console.error("Failed to load suggestions:", e);
          setSuggestions([]);
        }
      })();

      // 5️⃣ Enqueue scoring request for real-time chart updates
      if (data !== "START") {
        const newTurnNumber = Math.floor((messages.length + 2) / 2);
        
        // Use same message construction pattern as suggestion service
        const currentMessages = messages.slice(-10);
        const conversationHistory = [
          ...currentMessages,
          { role: userRoleKey, content: transcript },
          { role: personaRoleKey, content: text }
        ].map(m => ({ role: m.role, content: m.content }));
        
        // Add to scoring queue
        scoringQueueRef.current.push({
          turnNumber: newTurnNumber,
          conversationHistory: conversationHistory,
          timestamp: Date.now()
        });
        
        // Process queue if not already processing
        if (!isProcessingQueueRef.current) {
          processScoreQueue();
        }
      }

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to send message");
    } finally {
      setIsApiLoading(false);
      // apiLoadingEndTimeRef.current = Date.now();
      // console.log("[API] Streaming finished and session cleared.");
    }
  }, [
    messages,
    selectedPersonaId, selectedScenarioId,
    difficultyProfile, scenarioDefinitionsData,
    isApiLoading, sessionId, isDevelopmentMode,
    processScoreQueue
  ]);

  /**
   * Disconnects from the Digital Human avatar using the client-side service.
   */
  const handleDisconnectAvatar = useCallback(async () => {
    if (!isAvatarConnected || !sessionId) return;
    try {
      const response = await fetch(`/api/digital-human?action=disconnect&sessionId=${sessionId}`);
      const result = await response.json();
      if (response.ok) {
        toast.success('Digital Human disconnected: ' + result.status);
        setIsAvatarConnected(false);
        setSessionId(null); // Clear sessionId on disconnect
        
        // Clear sessionStorage on successful disconnect
        try {
          sessionStorage.removeItem('swift_ai_session_id');
          sessionStorage.removeItem('swift_ai_avatar_connected');
          console.log('[SessionStorage] Cleared session data');
        } catch (error) {
          console.warn('[SessionStorage] Failed to clear session:', error);
        }
      } else {
        toast.error('Failed to disconnect: ' + result.status);
      }
    } catch (error: any) {
      toast.error('Error disconnecting: ' + error.message);
    }
  }, [isAvatarConnected, sessionId]);

  // Phase 1: Cleanup on page unload/refresh
  useEffect(() => {
    const handleBeforeUnload = async () => {
      // Clean up WebSocket connection if it exists
      if (isAvatarConnected && sessionId) {
        console.log('[Cleanup] Page unloading, disconnecting avatar');
        try {
          // Use sendBeacon for reliable cleanup during page unload
          const disconnectUrl = `/api/digital-human?action=disconnect&sessionId=${sessionId}`;
          navigator.sendBeacon(disconnectUrl, '');
        } catch (error) {
          console.error('[Cleanup] Error during page unload cleanup:', error);
        }
      }
    };

    // Add event listener for page unload
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup function for component unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Additional cleanup on component unmount
      if (isAvatarConnected && sessionId) {
        console.log('[Cleanup] Component unmounting, disconnecting avatar');
        handleDisconnectAvatar();
      }
    };
  }, [isAvatarConnected, sessionId, handleDisconnectAvatar]);

  const handleLeaveRoom = useCallback(async () => {
    await leaveAndDestroyRoom();
    console.log('[Page] Left and destroyed RTC room.');
  }, []);

  const handleEndCall = useCallback(async () => {

    // Development mode: skip end call
    if (isDevelopmentMode) {
      return;
    }

    /* 🚦 GUARD  */
    if (endCalledRef.current) return;     // already running once
    endCalledRef.current = true;          // mark as entered

    // Stop call duration tracking
    if (callDurationInterval) {
      clearInterval(callDurationInterval);
      setCallDurationInterval(null);
    }
    
    // Calculate final duration if we have a start time
    if (callStartTime) {
      const finalDuration = Date.now() - callStartTime;
      setCallDuration(finalDuration);
      console.log("[CallDuration] Call ended, final duration:", Math.round(finalDuration / 1000), "seconds");
    }

    player.stop(); // Stop any currently playing audio
    console.log("[handleEndCall] Ending call. Current selectionStep:", selectionStep);
    if (vadRef.current && typeof vadRef.current.pause === 'function') {
      console.log("[Debug] Ending call. Stopping VAD for evaluation.");
      vadRef.current.pause();
    }

    // Disconnect avatar and leave room
    await Promise.all([
      handleDisconnectAvatar(),
      handleLeaveRoom(),
    ]);

    setIsListening(false); // Stop active listening UI
    setListeningInitiated(false); // Crucial: Return to the wizard/results view
    // Don't clear messages yet, needed for evaluation

    setSelectionStep('evaluationResults');
    console.log('[handleEndCall] selectionStep set to evaluationResults');
    setIsEvaluating(true);
    setEvaluationError(null);
    setEvaluationData(null);
    toast.info("Call ended. Generating evaluation...");

    try {
      const conversationHistory = messages.map(({ role, content }) => ({ role, content }));
      let profileData = null;
      if (selectedPersonaId) {
        const persona = personasData.find(p => p.id === selectedPersonaId);
        if (persona) {
          profileData = persona; // Pass the whole persona object or a subset as needed by prompt
        }
      }
      
      const selectedScenario = scenarioDefinitionsData.find(s => s.id === selectedScenarioId);
      console.log('[handleEndCall] selectedScenarioId:', selectedScenarioId);
      const evaluationPromptContent = selectedScenario && selectedScenarioId 
        ? (EVALUATION_PROMPTS[selectedScenarioId] || EVALUATION_PROMPTS['GENERIC'] || '') 
        : '';
      const requestBody = {
        messages: conversationHistory,
        roleplayProfile: profileData,
        evaluationPrompt: evaluationPromptContent,
        scenarioContext: selectedScenario?.scenarioContext || "",
        scenarioId: selectedScenarioId,
      };
      console.log('[handleEndCall] Fetching /api/evaluate with body:', JSON.stringify(requestBody, null, 2).substring(0, 100));

      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response from API.' })); // Gracefully handle if error response isn't JSON
        console.error('[handleEndCall] API response not OK. Status:', response.status, 'Response body:', JSON.stringify(errorData, null, 2).substring(0, 100));
        const errorMessage = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
        toast.error(`Evaluation failed: ${errorMessage}`);
        setEvaluationError(errorMessage);
        // No need to throw here, error is handled, and finally block will run
        return; // Exit the try block
      }

      const result = await response.json();
      console.log('[handleEndCall] API response JSON:', JSON.stringify(result, null, 2).substring(0, 100));

      if (result.evaluation) {
        const evaluationResult = result.evaluation as EvaluationResponse;
        setEvaluationData(evaluationResult);
        console.log('[handleEndCall] Evaluation data set successfully.');
        
        // Save session to localStorage
        try {
          const selectedScenario = scenarioDefinitionsData.find(s => s.id === selectedScenarioId);
          const selectedPersona = personasData.find(p => p.id === selectedPersonaId);
          
          if (selectedScenario && selectedPersona && selectedDifficulty) {
            saveSession({
              scenario: selectedScenario,
              persona: selectedPersona,
              difficulty: selectedDifficulty,
              evaluationData: evaluationResult,
              transcript: messages,
              callDuration: callDuration,
              conversationScores: conversationScores
            });
            console.log('[handleEndCall] Session saved to localStorage successfully.');
          } else {
            console.warn('[handleEndCall] Missing data for session saving:', {
              hasScenario: !!selectedScenario,
              hasPersona: !!selectedPersona,
              hasDifficulty: !!selectedDifficulty
            });
          }
        } catch (sessionSaveError) {
          console.error('[handleEndCall] Error saving session to localStorage:', sessionSaveError);
          // Don't show user error for localStorage issues as evaluation still succeeded
        }
        
        toast.success("Evaluation generated!");
      } else {
        console.error('[handleEndCall] `result.evaluation` is missing. Full result:', JSON.stringify(result, null, 2));
        const errorMessage = "Evaluation response did not contain 'evaluation' data or it was empty.";
        setEvaluationError(errorMessage);
        toast.error(`Evaluation failed: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error("[handleEndCall] Exception in try block:", error);
      const message = error.message || "An unexpected error occurred.";
      toast.error(`Evaluation error: ${message}`);
      setEvaluationError(message);
    } finally {
      setIsEvaluating(false);
    }
  }, [
    endCalledRef,
    player,
    selectionStep,
    handleDisconnectAvatar,
    handleLeaveRoom,
    setIsListening,
    setListeningInitiated,
    setSelectionStep,
    setIsEvaluating,
    setEvaluationError,
    setEvaluationData,
    messages,
    selectedPersonaId,
    personasData,
    selectedScenarioId,
    scenarioDefinitionsData,
    callDuration,
    callDurationInterval,
    callStartTime,
    selectedDifficulty
  ]);

  // Update the ref whenever handleEndCall changes
  useEffect(() => {
    handleEndCallRef.current = handleEndCall;
  }, [handleEndCall]);

/**
 * Voice Activity Detection (VAD) Configuration
 * 
 * This configures real-time speech detection with smart interrupt handling:
 * 
 * 1. **Speech Detection**: Detects when user starts speaking
 * 2. **Smart Interrupts**: Automatically interrupts avatar after minimum speech time
 * 3. **Brief Sound Protection**: Cancels interrupts if speech is too short
 * 4. **Audio Processing**: Converts speech to audio files for API submission
 * 
 * Key Features:
 * - `minSpeechTimeForInterrupt` (200ms): Prevents brief sounds from interrupting
 * - `redemptionFrames` (31): Waits 1 second of silence before ending speech
 * - Configurable threshold for fine-tuning interrupt sensitivity
 * - Comprehensive logging for debugging interrupt behavior
 * - Firefox compatibility workarounds
 */
const vad = useMicVAD({
  // VAD model configuration
  model: "v5", // Silero VAD v5 model for accurate speech detection
  startOnLoad: false, // Manually control when VAD starts
  
  // Speech detection thresholds
  positiveSpeechThreshold: 0.6, // Confidence threshold for speech detection
  minSpeechFrames: 4, // Minimum consecutive frames for speech confirmation
  
  // Pause detection configuration
  redemptionFrames: 31, // Wait ~1 second (31 frames * 32ms) of silence before ending speech
  negativeSpeechThreshold: 0.35, // Threshold for detecting silence (default)
  
  // Frame configuration for v5 model
  frameSamples: 512, // Frame size for Silero v5 model
  
  // Event handlers
  onVADMisfire: () => {
    console.log("[VAD] Misfire - no speech detected within timeout");
    if (listeningInitiated && !manualListening) setIsListening(false);
  },
  
  onSpeechStart: async () => {
    // Skip VAD processing in development mode
    if (isDevelopmentMode) {
      console.log('[VAD] Development mode active, skipping VAD speech processing');
      return;
    }
    
    // Check if user is muted first
    if (isMuted) {
      console.log('[VAD] User is muted, ignoring speech start');
      return;
    }
    
    console.log('[VAD DEBUG] onSpeechStart triggered', {
      manualListening,
      listeningInitiated,
      sessionId: sessionId ? 'exists' : 'null',
      isMuted
    });
    
    if (!manualListening && listeningInitiated) { // Ensure listening was initiated
      setIsListening(true);
      console.log('[VAD DEBUG] Listening state set to true');
      
      // Smart interrupt mechanism: Always prepare to send interrupt when speech detected
      // This ensures any current avatar speech/animation is stopped for new user input
      if (sessionId) {
        console.log(`[VAD] Speech detected, preparing to interrupt avatar in ${minSpeechTimeForInterrupt}ms`);
        
        // Clear any existing timeout to reset the interrupt timer
        if (interruptTimeoutId) {
          clearTimeout(interruptTimeoutId);
          console.log('[VAD] Cleared previous interrupt timeout');
        }
        
        // Set timeout to send interrupt after minimum speech time
        // This prevents very brief sounds (coughs, clicks, etc.) from interrupting the avatar
        const timeoutId = setTimeout(async () => {
          try {
            console.log('[VAD] Minimum speech time reached, sending interrupt signal to avatar');
            
            // Send interrupt using PATCH endpoint
            await fetch('/api/digital-human', {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ sessionId }),
            });
            
            console.log('[VAD] Avatar interrupt signal sent successfully via client service');
          } catch (error) {
            console.error('[VAD] Error sending interrupt signal:', error);
          } finally {
            setInterruptTimeoutId(null);
          }
        }, minSpeechTimeForInterrupt);
        
        setInterruptTimeoutId(timeoutId);
        console.log(`[VAD] Interrupt timer set for ${minSpeechTimeForInterrupt}ms`);
      } else {
        console.warn('[VAD] No sessionId available, cannot send interrupt');
      }
    }
  },
  
  onSpeechEnd: async (audio) => {
    // Skip VAD processing in development mode
    if (isDevelopmentMode) {
      console.log('[VAD] Development mode active, skipping VAD speech end processing');
      return;
    }
    
    // Check if user is muted first
    if (isMuted) {
      console.log('[VAD] User is muted, ignoring speech end');
      return;
    }
    
    console.log('[VAD] Speech ended after 1 second pause detected');
    
    // Anti-brief-sound protection: Cancel interrupt if speech ended quickly
    // This prevents accidental interruptions from very short sounds
    if (interruptTimeoutId) {
      console.log(`[VAD] Speech ended before ${minSpeechTimeForInterrupt}ms threshold, cancelling interrupt`);
      clearTimeout(interruptTimeoutId);
      setInterruptTimeoutId(null);
    }
    
    // Process the speech audio for submission to the API
    player.stop();
    const wav = utils.encodeWAV(audio);
    // Create a File object instead of Blob to ensure proper handling
    const audioFile = new File([wav], 'voice-message.wav', { type: 'audio/wav' });
    console.log('[VAD] Processing speech audio:', {
      type: audioFile.type,
      size: audioFile.size,
      name: audioFile.name,
      duration: `${(audio.length / 16000).toFixed(2)}s` // Assuming 16kHz sample rate
    });
    
    // Submit the audio for processing
    handleSubmit(audioFile);
    
    // Update listening state
    if (!manualListening) {
      setIsListening(false);
    }
    
    // Firefox-specific VAD pause workaround
    const isFirefox = navigator.userAgent.includes("Firefox");
    if (isFirefox && listeningInitiated) {
      console.log('[VAD] Firefox detected, pausing VAD after speech end');
      vad.pause(); // Pause only if initiated
    }
  },
  
  // ONNX Runtime configuration for WebAssembly model execution
  ortConfig(ort) {
    const isSafari = /^((?!chrome|android).)*safari/i.test(
      navigator.userAgent
    );

    ort.env.wasm = {
      wasmPaths: {
        "ort-wasm-simd-threaded.wasm":
          "/ort-wasm-simd-threaded.wasm",
        "ort-wasm-simd.wasm": "/ort-wasm-simd.wasm",
        "ort-wasm.wasm": "/ort-wasm.wasm",
        "ort-wasm-threaded.wasm": "/ort-wasm-threaded.wasm",
      },
      numThreads: isSafari ? 1 : 4,
    };
  },
});

  // Effect to monitor VAD status changes - Defined AFTER vad initialization
  useEffect(() => {
    if (vad) { // Ensure vad is initialized
      console.log("[VAD Status Monitor] Status:", vad, "Loading:", vad.loading, "Errored:", vad.errored, "Listening:", vad.listening);
      if (vad.errored) {
        console.error("[VAD Status Monitor] VAD Errored:", vad.errored);
      }
      if (vad.listening) {
          console.log("[VAD Status Monitor] VAD model loaded successfully.");
      }
      
      // In development mode, pause VAD to avoid conflicts with text input
      if (isDevelopmentMode && vad.listening) {
        console.log("[VAD] Pausing VAD in development mode");
        vad.pause();
      }
    }
  }, [vad, vad?.loading, vad?.errored, vad?.listening, isDevelopmentMode]); // Added isDevelopmentMode dependency

  // Update the ref whenever vad changes
  useEffect(() => {
    vadRef.current = vad;
  }, [vad]);

  // Effect to verify ONNX files are accessible at runtime
  useEffect(() => {
    const checkFiles = async () => {
      const filesToCheck = [
        '/vad.worklet.bundle.min.js',
        '/silero_vad_v5.onnx',
        '/ort-wasm-simd-threaded.wasm',
        '/ort-wasm-simd.wasm',
        '/ort-wasm.wasm',
        '/ort-wasm-threaded.wasm'
      ];
      
      for (const file of filesToCheck) {
        try {
          const response = await fetch(file, { method: 'HEAD' });
          if (response.ok) {
            console.log(`[VAD File Check] ✓ ${file} is accessible`);
          } else {
            console.error(`[VAD File Check] ✗ ${file} returned ${response.status}`);
          }
        } catch (error) {
          console.error(`[VAD File Check] ✗ ${file} failed to load:`, error);
        }
      }
    };
    
    checkFiles();
  }, []); // Run once on mount

  /**
   * Handles mute/unmute functionality for the VAD system
   * Toggles between muted and unmuted states by pausing/starting VAD
   */
  const handleMuteToggle = useCallback(() => {
    // In development mode, mute functionality is simulated
    if (isDevelopmentMode) {
      console.log('[DEV MODE] Simulating mute toggle');
      setIsMuted(!isMuted);
      return;
    }
    
    if (!vad || vad.loading || vad.errored) {
      console.warn('[Mute Toggle] VAD not available or in error state');
      return;
    }

    if (isMuted) {
      // Unmute: Start VAD
      console.log('[Mute Toggle] Unmuting - starting VAD');
      vad.start();
      setIsMuted(false);
      setManualListening(false);
    } else {
      // Mute: Pause VAD
      console.log('[Mute Toggle] Muting - pausing VAD');
      vad.pause();
      setIsMuted(true);
      setManualListening(true);
      setIsListening(false);
    }
  }, [vad, isMuted, setIsMuted, setManualListening, setIsListening, isDevelopmentMode]);

  const handleRestartSession = () => {
    setMessages([]);
    setInput("");
    setEvaluationData(null);
    setEvaluationError(null);
    setIsEvaluating(false);
    setListeningInitiated(false);
    setManualListening(false);
    setIsMuted(false); // Reset mute state
    setSelectedScenarioId(null);
    setSelectedDomain('financial-advisor'); // Reset to default domain
    setSelectedPersonaId(null);
    setSelectedDifficulty(null);
    setDifficultyProfile(null);
    endCalledRef.current = false;
    setSelectionStep('selectScenario');
    setIsPreparingSession(false);
    setIsAvatarConnected(false);
    setSessionId(null);
    setTempID(null);
    
    // Reset call duration tracking
    if (callDurationInterval) {
      clearInterval(callDurationInterval);
      setCallDurationInterval(null);
    }
    setCallStartTime(null);
    setCallDuration(0);
    
    // Reset conversation scores
    setConversationScores([]);
    
    // Clear scoring queue
    scoringQueueRef.current = [];
    isProcessingQueueRef.current = false;
    
    toast.info("Session Reset. Please select a new scenario.");
  };
    
  const handleDifficultyProfileGeneration = useCallback(
    async (
      difficulty: Difficulty | null,
      scenarioId: string,
    ) => {
      try {
        const res = await fetch("/api/difficulty", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ difficulty, scenarioId }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || "Failed to fetch difficulty profile");
        }

        const { profile } = (await res.json()) as { profile: string };
        setDifficultyProfile(profile);
      } catch (err: any) {
        toast.error("Could not generate difficulty profile. Please try again.");
      }
    },
    [setDifficultyProfile]
  );

  /**
   * Connects to a Digital Human avatar using the server-side service.
   */
  /**
   * Validates WebSocket connection stability after initial handshake
   * Checks connection status multiple times over 2-3 seconds to ensure stability
   */
  const validateConnectionStability = useCallback(async (sessionId: string): Promise<boolean> => {
    const maxAttempts = 6; // 3 seconds of monitoring (6 attempts * 500ms)
    const pollInterval = 500; // Check every 500ms
    let consecutiveSuccesses = 0;
    const requiredSuccesses = 3; // Need 3 consecutive successes for stability
    
    console.log('[ConnectionValidation] Starting stability validation for session:', sessionId);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`/api/digital-human?action=validate&sessionId=${sessionId}`);
        const result = await response.json();
        
        console.log(`[ConnectionValidation] Attempt ${attempt + 1}/${maxAttempts}:`, result);
        
        if (result.valid && result.status === 'active') {
          consecutiveSuccesses++;
          console.log(`[ConnectionValidation] Success ${consecutiveSuccesses}/${requiredSuccesses}`);
          
          // If we have enough consecutive successes, connection is stable
          if (consecutiveSuccesses >= requiredSuccesses) {
            console.log('[ConnectionValidation] Connection validated as stable');
            return true;
          }
        } else {
          consecutiveSuccesses = 0; // Reset on failure
          console.log(`[ConnectionValidation] Connection not stable: ${result.status}`);
          
          // If we're past the initial attempts and still failing, give up
          if (attempt >= 2) {
            throw new Error(`Connection unstable: ${result.status || 'Unknown error'}`);
          }
        }
        
        // Wait before next check (except on last attempt)
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      } catch (error: any) {
        consecutiveSuccesses = 0;
        console.error(`[ConnectionValidation] Error on attempt ${attempt + 1}:`, error);
        
        // If this is the last attempt or we've had multiple failures, give up
        if (attempt === maxAttempts - 1 || attempt >= 2) {
          throw new Error(error.message || 'Connection validation failed');
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    console.log('[ConnectionValidation] Validation incomplete - not enough consecutive successes');
    return false;
  }, []);

  const handleConnectAvatar = async (selectedPersonaId: string): Promise<string> => {
    if (isAvatarConnected && sessionId) {
      console.log('[Page] Avatar already connected.');
      return sessionId;
    }
    try {
      const response = await fetch('/api/digital-human', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ personaId: selectedPersonaId })
      });
      const result = await response.json();
      if (response.ok) {
        toast.success('Digital Human connection initiated: ' + result.message);
        setIsAvatarConnected(true);
        setSessionId(result.sessionId);
        
        // Phase 2: Store session in sessionStorage for persistence
        try {
          sessionStorage.setItem('swift_ai_session_id', result.sessionId);
          sessionStorage.setItem('swift_ai_avatar_connected', 'true');
          console.log('[SessionStorage] Stored session ID:', result.sessionId);
        } catch (error) {
          console.warn('[SessionStorage] Failed to store session:', error);
        }
        
        return result.sessionId;
      } else {
        toast.error('Failed to connect: ' + result.error);
        setIsAvatarConnected(false);
        setSessionId(null);
        
        // Clear sessionStorage on error
        try {
          sessionStorage.removeItem('swift_ai_session_id');
          sessionStorage.removeItem('swift_ai_avatar_connected');
        } catch (error) {
          console.warn('[SessionStorage] Failed to clear session:', error);
        }
        
        throw new Error(result.error || 'Failed to connect to Digital Human');
      }
    } catch (error: any) {
      toast.error('Error connecting: ' + error.message);
      setIsAvatarConnected(false);
      throw error;
    }
  };

  const handleJoinRoom = useCallback(async () => {
    try {
      console.log('[Page] User attempting join room');
      await initializeAndJoinRoom({ videoContainerId: 'video-container' });
      console.log('[Page] Initialized and joined RTC room.');
    } catch (error) {
      console.error('[Page] Failed to join RTC room:', error);
      // Re-throw the error to be caught by Promise.all
      throw error;
    }
  }, []);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!manualListening) {
      setIsListening(vad.userSpeaking);
    }
  }, [vad.userSpeaking, manualListening]);

  useEffect(() => {
    function keyDown(e: KeyboardEvent) {
      if (e.key === "Enter") return inputRef.current?.focus();
      if (e.key === "Escape") return setInput("");
    }

    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, []);

  // Derive selected objects from IDs
  const selectedScenarioDefinition = scenarioDefinitionsData.find(s => s.id === selectedScenarioId);

  if (!listeningInitiated) {
    return (
      <div style={mainContainerStyle} className="flex flex-col items-center justify-center">
        <div className="mx-auto w-full max-w-7xl flex flex-col px-4 sm:px-6 lg:px-8 relative py-6">
          <div className="flex-1 flex flex-col justify-center items-center mb-20">
            <div className="w-full mb-10">

              {selectionStep === 'selectScenario' && (
                <ScenarioSelection 
                  scenarioDefinitions={scenarioDefinitionsData}
                  selectedScenarioId={selectedScenarioId}
                  selectedDomain={selectedDomain}
                  onSelectScenarioAndPersona={(scenarioId, defaultPersonaId) => {
                    setSelectedScenarioId(scenarioId);
                    setSelectedPersonaId(defaultPersonaId);
                    setSelectionStep('selectPersona');
                  }}
                  onShowSessionHistory={() => setSelectionStep('sessionHistory')}
                  onDomainChange={(domain) => {
                    setSelectedDomain(domain);
                    setSelectedScenarioId(null); // Clear selected scenario when domain changes
                    setSelectedPersonaId(null); // Clear selected persona when domain changes
                  }}
                />
              )}

              {/* New Persona Selection Step */}
              {selectionStep === 'selectPersona' && selectedScenarioId && (
                  <PersonaSelection
                    personas={selectedScenarioDefinition?.personas
                      ? personasData.filter(p => selectedScenarioDefinition.personas.includes(p.id))
                      : []}
                    selectedPersonaId={selectedPersonaId}
                    currentScenario={selectedScenarioDefinition} // Pass the derived scenario object
                    onSelectPersona={setSelectedPersonaId}
                    onBackToScenarioSelection={() => {
                      setSelectionStep('selectScenario');
                      // setSelectedPersonaId(null); // Optional: Clear persona if going back
                    }}
                    onNextToDifficulty={() => {
                      setSelectionStep('selectDifficulty')
                      setSelectedDifficulty('easy')
                    }}
                  />
              )}

              {/* New Difficulty Selection Step */}
              {selectionStep === 'selectDifficulty' && selectedScenarioId && selectedPersonaId && (
                <DifficultySelection 
                  selectedScenario={getScenarioDefinitionById(selectedScenarioId)}
                  selectedPersona={getPersonaById(selectedPersonaId)}
                  selectedDifficulty={selectedDifficulty}
                  onSelectDifficulty={setSelectedDifficulty}
                  onChangePersona={() => setSelectionStep('selectPersona')}
                  onChangeScenario={() => setSelectionStep('selectScenario')}
                  onNextToSummary={async () => {
                    setSelectionStep('summary');
                    setIsPreparingSession(true);
                    try {
                      await handleDifficultyProfileGeneration(selectedDifficulty, selectedScenarioId);
                      const id = await handleConnectAvatar(selectedPersonaId);
                      
                      // Validate connection stability after initial handshake
                      console.log('[onNextToSummary] Validating connection stability...');
                      toast.info('Validating connection stability...');
                      
                      const isStable = await validateConnectionStability(id);
                      if (!isStable) {
                        throw new Error('Connection validation failed - avatar may be busy or disconnected');
                      }
                      
                      setTempID(id);
                      console.log('[onNextToSummary] Session preparation complete with validated connection.');
                      toast.success('Connection validated successfully!');
                    } catch (error) {
                      console.error('[onNextToSummary] Session preparation failed:', error);
                      
                      // Clear connection state on validation failure
                      setIsAvatarConnected(false);
                      setSessionId(null);
                      try {
                        sessionStorage.removeItem('swift_ai_session_id');
                        sessionStorage.removeItem('swift_ai_avatar_connected');
                      } catch (storageError) {
                        console.warn('[SessionStorage] Failed to clear session on validation failure:', storageError);
                      }
                      
                      // Provide specific error message for connection issues
                      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                      if (errorMessage.includes('Connection validation failed') || errorMessage.includes('unstable')) {
                        toast.error('Avatar connection failed. The avatar may be busy with another user. Please try again in a moment.');
                      } else {
                        toast.error('Failed to prepare the session. Please check your connection and try again.');
                      }
                      
                      setSelectionStep('selectDifficulty');
                    } finally {
                      setIsPreparingSession(false);
                    }
                  }}
                  />
              )}

              {/* New Summary Step */}
              {selectionStep === 'summary' && selectedScenarioId && selectedPersonaId && !isEvaluating && selectedDifficulty && (
                // Ensure evaluation screen isn't trying to show at same time
                <SummaryDisplay
                  selectedScenario={getScenarioDefinitionById(selectedScenarioId)}
                  selectedPersona={getPersonaById(selectedPersonaId)}
                  selectedDifficulty={selectedDifficulty}
                  onStartSession={async () => {
                    const scenario = getScenarioDefinitionById(selectedScenarioId);
                    const persona = getPersonaById(selectedPersonaId);
                    if (!scenario || !persona) { 
                      toast.error("Error: Scenario or Persona not fully selected for session start. Please go back.");
                      return;
                    }
                    console.log("[Debug] Attempting to start session. Current VAD object:", vad);
                    
                    // Start call duration tracking
                    const startTime = Date.now();
                    setCallStartTime(startTime);
                    setCallDuration(0);
                    
                    // Clear any existing interval
                    if (callDurationInterval) {
                      clearInterval(callDurationInterval);
                    }
                    
                    // Start interval to update duration every second
                    const interval = setInterval(() => {
                      setCallDuration(Date.now() - startTime);
                    }, 1000);
                    setCallDurationInterval(interval);
                    
                    console.log("[CallDuration] Started tracking at:", new Date(startTime).toISOString());
                    
                    // Set states first to ensure video container is rendered
                    setListeningInitiated(true);
                    setManualListening(false);
                    setSelectionStep(null);
                    
                    // Initialize conversation scores with starting score of 0
                    setConversationScores([{
                      turn: 0,
                      score: 0,
                      timestamp: Date.now()
                    }]);
                    // Wait for state updates and DOM render
                    setTimeout(async () => {
                      try {
                        // const id = await handleConnectAvatar(selectedPersonaId);
                        await handleJoinRoom();
                        await handleSubmit("START", tempID!);
                        // Start VAD if needed
                        if (vad && !vad.listening) {
                          console.log("[Debug] VAD found, but not listening. Attempting to start VAD manually.");
                          vad.start();
                        }
                      } catch (err) {
                        console.error("[onStartSession] Error connecting avatar or joining RTC room:", err);
                        toast.error("Failed to start session. Please check your connection and try again.");
                      }
                    }, 500); // Small delay to ensure state updates and re-render
                  }}
                  onChangeDifficulty={() => {
                    setSelectionStep('selectDifficulty')
                    handleDisconnectAvatar();
                    setTempID(null);
                  }}
                  onChangePersona={() => {
                    setSelectionStep('selectPersona')
                    handleDisconnectAvatar();
                    setTempID(null);
                  }}
                  onChangeScenario={() => {
                    setSelectionStep('selectScenario')
                    handleDisconnectAvatar();
                    setTempID(null);
                  }}
                  loading={isPreparingSession}
                />
              )}

              {/* New Evaluation Display Step */}
              {selectionStep === 'evaluationResults' && (
                <EvaluationDisplay 
                  difficulty={selectedDifficulty}
                  evaluationData={evaluationData}
                  isLoading={isEvaluating}
                  error={evaluationError}
                  transcript={messages}
                  persona={getPersonaById(selectedPersonaId!)} 
                  scenario={getScenarioDefinitionById(selectedScenarioId!)} // Pass the entire scenario object
                  callDuration={callDuration}
                  mode="live"
                  conversationScores={conversationScores}
                  primaryAction={{
                    label: "Start New Session",
                    onClick: handleRestartSession,
                    className: "w-full bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-600 hover:to-sky-700 text-white font-semibold py-3 rounded-lg shadow-md transition-transform hover:scale-105"
                  }}
                />
              )}

              {/* Session History Step */}
              {selectionStep === 'sessionHistory' && (
                <SessionHistory 
                  onSelectSession={(sessionId) => {
                    const session = getSessionById(sessionId);
                    if (session) {
                      setSelectedHistoricalSession(session);
                      setSelectionStep('viewHistoricalSession');
                    } else {
                      toast.error('Session not found');
                    }
                  }}
                  onBackToScenarioSelection={() => setSelectionStep('selectScenario')}
                />
              )}

              {/* View Historical Session Step */}
              {selectionStep === 'viewHistoricalSession' && selectedHistoricalSession && (
                <EvaluationDisplay 
                  difficulty={selectedHistoricalSession.difficulty}
                  evaluationData={selectedHistoricalSession.evaluationData}
                  isLoading={false}
                  error={null}
                  transcript={selectedHistoricalSession.transcript}
                  persona={selectedHistoricalSession.persona}
                  scenario={selectedHistoricalSession.scenario}
                  callDuration={selectedHistoricalSession.callDuration}
                  mode="historical"
                  sessionTimestamp={selectedHistoricalSession.timestamp}
                  conversationScores={selectedHistoricalSession.conversationScores}
                  primaryAction={{
                    label: "Back to Session History",
                    onClick: () => {
                      setSelectedHistoricalSession(null);
                      setSelectionStep('sessionHistory');
                    },
                    className: "w-full bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-600 hover:to-sky-700 text-white font-semibold py-3 rounded-lg shadow-md transition-transform hover:scale-105"
                  }}
                  secondaryAction={{
                    label: "Back to History",
                    onClick: () => {
                      setSelectedHistoricalSession(null);
                      setSelectionStep('sessionHistory');
                    },
                    className: "flex items-center gap-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium py-2 px-4 rounded-lg shadow-md transition-all duration-200 hover:scale-105"
                  }}
                />
              )}

              {/* Display loader during model loading (common for both steps if needed) */}
              {vad.loading && (
                <div className="text-center mt-4 text-gray-400">
                  <LoadingIcon />
                  <p>Loading speech detection...</p>
                </div>
              )}

              {vad.errored && (
                <div className="text-center mt-4 text-red-400">
                  <p>Error loading speech detection model.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={mainContainerStyle} className="flex flex-col items-center">

      {/* Content for listeningInitiated, wrapped to ensure it's on top */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center relative"
        >
          {/* Development Mode Indicator */}
          {isDevelopmentMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="mx-auto mb-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold px-4 py-1 min-w-[100px] text-center rounded-full shadow-lg"
              style={{ display: 'inline-block' }}
            >
              DEV MODE
            </motion.div>
          )}
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-4xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#1D3B86] via-[#00A9E7] to-[#1D3B86]">
              <span className="font-light">{selectedScenarioDefinition?.name}</span>
            </h1>
          </div>
        </motion.div>

        {/* Real-time Conversation Effectiveness Chart - Fixed position above conversation */}
        <motion.div 
          className="w-[1000px] max-w-4xl mx-auto mb-6 px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <ChartLineLinear 
            className="backdrop-blur-md bg-gradient-to-r from-[#002B49]/40 to-[#001425]/50 border-2 border-[#00A9E7]/30 shadow-[0_0_20px_rgba(0,169,231,0.2)] hover:shadow-[0_0_30px_rgba(0,169,231,0.3)] transition-all duration-300" 
            data={conversationScores.map(score => ({
              turn: score.turn,
              score: score.score
            }))}
          />
        </motion.div>

        {/* Main Content Area - Two Column Grid Layout */}
        <div className="grid grid-cols-2 gap-0 w-full max-w-6xl mx-auto px-4 flex-1">
          {/* Left Column - Avatar Video */}
          <motion.div 
            className="flex flex-col items-center relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {sessionId ? (
              <motion.div 
                id="video-container" 
                ref={videoContainerRef} 
                className="h-150 max-w-md aspect-video bg-black rounded-xl shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              />
            ) : (
              <motion.div 
                className="h-150 max-w-md aspect-video bg-black rounded-xl shadow-lg flex items-center justify-center text-white text-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                {isDevelopmentMode ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-yellow-400 font-semibold">Mock Avatar</div>
                    <div className="text-sm text-gray-400">Development Mode</div>
                  </div>
                ) : (
                  "Connecting to Avatar..."
                )}
              </motion.div>
            )}
          </motion.div>

          {/* Right Column - Messages and Controls */}
          <motion.div 
            className="flex flex-col relative h-150"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {/* Messages Section with fixed height */}
            <motion.div 
              className="flex flex-col overflow-hidden"
              style={{ height: isMessagesPanelVisible ? 'calc(100% - 200px)' : '0px' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {isMessagesPanelVisible ? (
              <div className="flex-1 overflow-y-auto pr-2 flex flex-col" ref={messagesContainerRef}>
                <div className="flex-1"></div>
                <div className="space-y-3">
                  <AnimatePresence>
                    {messages.map((message, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card 
                        className={clsx(
                          "backdrop-blur-md shadow-lg transition-all duration-300 hover:shadow-xl",
                          (() => {
                            const selectedScenario = scenarioDefinitionsData.find(s => s.id === selectedScenarioId);
                            const personaRoleKey = selectedScenario?.personaRole || 'client';
                            return message.role === personaRoleKey
                              ? "bg-[#1D3B86]/60 border border-[#1D3B86]/60 hover:bg-[#1D3B86]/70" 
                              : "bg-[#00A9E7]/40 border border-[#00A9E7]/40 hover:bg-[#00A9E7]/50";
                          })()
                        )}>
                          <CardContent>
                            <p style={{
                                color: '#FFFFFF',
                                lineHeight: '1',
                                fontSize: '0.9rem'
                              }}>
                              {(() => {
                                const selectedScenario = scenarioDefinitionsData.find(s => s.id === selectedScenarioId);
                                const personaRoleKey = selectedScenario?.personaRole || 'client';
                                return message.role === personaRoleKey ? (selectedScenario?.personaRole || 'Customer') : 'You';
                              })()} 
                            </p>
                          </CardContent>
                          <CardContent>
                            <p className="whitespace-pre-wrap" 
                              style={{
                                color: '#FFFFFF',
                                lineHeight: '1.5',
                                fontSize: '0.9rem'
                              }}>
                                {message.content}
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              </div>
              ) : null}
            </motion.div>
          
            {/* Controls Section - Fixed at bottom with absolute positioning */}
            <motion.div 
              className="flex flex-col space-y-2 absolute bottom-0 left-0 right-0"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              {/* Control Buttons Row */}
              <div className="flex items-center justify-between gap-4">
                {/* Mute Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                >
                  <Button
                    onClick={handleMuteToggle}
                    disabled={!vad || !!vad.loading || !!vad.errored}
                    className={clsx(
                      "p-2 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl border-2",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      isMuted 
                        ? "bg-red-500 hover:bg-red-600 border-red-400 text-white hover:border-red-300" 
                        : "bg-[#00A9E7] hover:bg-[#0098D1] border-[#00A9E7] text-white hover:border-[#0098D1]"
                    )}
                    aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                    title={isMuted ? "Click to unmute" : "Click to mute"}
                  >
                    {isMuted ? (
                      <MicOff size={20} />
                    ) : (
                      <Mic size={20} />
                    )}
                  </Button>
                </motion.div>

                {/* Mute Status Indicator */}
                <div className="flex-1 flex justify-center">
                  {isMuted && (
                    <motion.div 
                      className="text-red-400 text-sm font-medium"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      You are muted
                    </motion.div>
                  )}
                </div>

                {/* Toggle Buttons */}
                <div className="flex gap-2">
                  {/* Messages Toggle Button */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    <Button
                      onClick={toggleMessagesPanel}
                      className={clsx(
                        "p-2 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl border-2",
                        "bg-[#00A9E7] hover:bg-[#0098D1] border-[#00A9E7] text-white hover:border-[#0098D1]"
                      )}
                      aria-label={isMessagesPanelVisible ? "Hide messages" : "Show messages"}
                      title={isMessagesPanelVisible ? "Hide messages" : "Show messages"}
                    >
                      {isMessagesPanelVisible ? (
                        <MessageSquareOff size={20} />
                      ) : (
                        <MessageSquare size={20} />
                      )}
                    </Button>
                  </motion.div>

                  {/* Suggestions Toggle Button */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.6 }}
                  >
                    <Button
                      onClick={toggleSuggestionsPanel}
                      className="p-2 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl border-2 bg-[#00A9E7] hover:bg-[#0098D1] border-[#00A9E7] text-white hover:border-[#0098D1]"
                      aria-label={isSuggestionsPanelVisible ? "Hide suggestions" : "Show suggestions"}
                      title={isSuggestionsPanelVisible ? "Hide suggestions" : "Show suggestions"}
                    >
                      {isSuggestionsPanelVisible ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </Button>
                  </motion.div>
                </div>
              </div>

              {/* Suggestions Display */}
              {isApiLoading ? (
                <motion.div 
                  className="flex justify-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <LoadingIcon />
                </motion.div>
              ) : suggestions && suggestions.length > 0 && isSuggestionsPanelVisible ? (
                <motion.div 
                  className="flex flex-col gap-2 max-h-32 overflow-y-auto"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {suggestions.map((suggestion, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="w-full"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-[#00385C]/80 border-sky-500/60 text-sky-200 hover:bg-sky-700/70 hover:text-sky-100 transition-all duration-50 px-3 py-2 text-xs rounded-lg shadow-md hover:shadow-lg focus:ring-2 focus:ring-sky-400/50 text-left justify-start whitespace-normal min-h-[2.5rem]"
                        onClick={() => {
                          if (isDevelopmentMode) {
                            return;
                          }
                          handleSubmit(suggestion);
                        }}
                      >
                        <span className="block break-words">{suggestion}</span>
                      </Button>
                    </motion.div>
                  ))}
                </motion.div>
              ) : null}
              
              {/* End Call Button */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.8 }}
              >
                <Button
                  ref={endCallRef}
                  type="button"
                  onClick={handleEndCall}
                  className="w-full bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl py-3 text-lg rounded-xl flex items-center justify-center gap-2"
                  aria-label="End call"
                >
                  <PhoneOff size={20} />
                  <span>End Call</span>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* Status Text */}
        <div className="text-center max-w-xl text-balance min-h-16 mx-auto" style={{ color: '#FFFFFF', fontSize: '0.95rem' }}>
                {messages.length === 0 && listeningInitiated && (
                  <AnimatePresence>
                    {vad.loading ? (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center gap-2"
                      >
                        <LoadingIcon/>
                        Loading speech detection...
                      </motion.p>
                    ) : vad.errored ? (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ color: '#FF6B6B' }}
                      >
                        Failed to load speech detection.
                      </motion.p>
                    ) : (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        {isDevelopmentMode 
                          ? "Development mode active - Use the text input below to test conversations"
                          : "Start talking to the avatar"
                        }
                      </motion.p>
                    )}
                  </AnimatePresence>
                )}
              </div>

        {/* Active Session Display (Scenario and Patient) */}
        {listeningInitiated ? (
          <motion.div 
            className="my-8 flex flex-col items-center w-full max-w-7xl mx-auto px-6"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            {/* Clean Title Section */}
            <motion.div 
              className="text-center mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 1.0 }}
            >
              <h2 className="text-2xl font-semibold text-white mb-2">Active Training Session</h2>
              <div className="w-16 h-0.5 bg-[#FFB800] mx-auto"></div>
            </motion.div>
            
            {/* Cards Container */}
            <div className="w-full flex flex-row gap-6 justify-between">
              {/* Scenario Card */}
              {selectedScenarioId && (
                <motion.div 
                  className="w-1/2"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 1.1 }}
                >
                  <Card className="bg-gradient-to-r from-[#002B49]/80 to-[#001425]/90 border-2 border-[#FFB800]/70 shadow-[0_0_15px_rgba(255,184,0,0.3)] min-h-[180px]">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#FFB800]/15 rounded-md">
                          <Target className="w-4 h-4 text-[#FFB800]" />
                        </div>
                        <CardTitle className="text-lg font-medium text-[#FFB800]">
                          Training Scenario
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-0">
                      <h3 className="text-base font-medium text-white mb-3">
                        {scenarioDefinitionsData.find(s => s.id === selectedScenarioId)?.name}
                      </h3>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {scenarioDefinitionsData.find(s => s.id === selectedScenarioId)?.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Persona Card */}
              {selectedScenarioId && scenarioDefinitionsData.find(s => s.id === selectedScenarioId)?.personas !== undefined && (
                <motion.div 
                  className="w-1/2"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 1.2 }}
                >
                  <Card className="bg-gradient-to-r from-[#002B49]/80 to-[#001425]/90 border-2 border-[#FFB800]/70 shadow-[0_0_15px_rgba(255,184,0,0.3)] min-h-[180px]">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#FFB800]/15 rounded-md">
                          <User className="w-4 h-4 text-[#FFB800]" />
                        </div>
                        <CardTitle className="text-lg font-medium text-[#FFB800]">
                          Role-Play Persona: {selectedPersonaId ? getPersonaById(selectedPersonaId)?.name : ""}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-0">
                      <p className="text-sm text-gray-300 mb-4">
                        {selectedPersonaId ? getPersonaById(selectedPersonaId)?.name : ""}
                      </p>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        <span className="text-[#FFB800] font-medium">Note:</span> You are the Financial Advisor. Interact with the AI as if it is {selectedPersonaId ? getPersonaById(selectedPersonaId)?.name : ""}.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : null}

      </div>
    </div>
  );
}
"use client";

import clsx from "clsx";
import { useEffect, useRef, useState, useCallback } from "react";
import { EnterIcon, LoadingIcon } from "@/lib/icons";
import { usePlayer } from "@/lib/usePlayer";
import { useMicVAD, utils } from "@ricky0123/vad-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Message } from "@/lib/types";
import { brandColors } from "@/lib/constants";
import { SummaryDisplay } from '@/components/ui/SummaryDisplay';
import { PhoneOff } from 'lucide-react'; // CheckCircle2 moved to ScenarioSelection
import { ScenarioSelection } from '@/components/ui/ScenarioSelection';
import { PersonaSelection } from '@/components/ui/PersonaSelection';
import { DifficultySelection } from "@/components/ui/DifficultySelection";
import { EvaluationDisplay } from '@/components/ui/EvaluationDisplay'; // Added
import { toast } from 'sonner';

import { Persona, personas, getPersonaById } from '@/lib/personas';
import { ScenarioDefinition, scenarioDefinitions, getScenarioDefinitionById } from '@/lib/scenarios';
import { PROMPTS } from '@/lib/prompt';
import { EvaluationResponse } from "./lib/evaluationTypes";
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
  const [isRoomJoined, setIsRoomJoined] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const pendingEndCall = useRef(false);

  const isPending = isApiLoading || isAvatarSpeaking;

  // State for evaluation
  const [evaluationData, setEvaluationData] = useState<EvaluationResponse | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  // State to track if user has initiated listening
  const [listeningInitiated, setListeningInitiated] = useState<boolean>(false);

  // State for new Scenario-based training
  const [scenarioDefinitionsData, setScenarioDefinitionsData] = useState<ScenarioDefinition[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [personasData, setPersonasData] = useState<Persona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null); 
  const [difficultyProfile, setDifficultyProfile] = useState<String | null>(null);
  const [isPreparingSession, setIsPreparingSession] = useState<boolean>(false);
  const [tempID, setTempID] = useState<string | null>(null);

  // Wizard Step State for new flow
  const [selectionStep, setSelectionStep] = useState<'selectScenario' | 'selectPersona' | 'selectDifficulty' | 'summary' | 'evaluationResults' | null>('selectScenario'); // Added 'evaluationResults' and null
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    // Load scenario definitions and personas from the imported data
    setScenarioDefinitionsData(scenarioDefinitions);
    setPersonasData(personas);
  }, []);

  // Effect to listen for digital human status events via SSE
  useEffect(() => {
    console.log('[StatusListener] Digital human status listener initialized');
    if (!sessionId) return;

    const es = new EventSource(`/api/digital-human-status?sessionId=${sessionId}`);
    es.addEventListener('voice_start', () => {
      console.log('[StatusListener] Digital human voice started');
      setIsAvatarSpeaking(true);
    });
    es.addEventListener('voice_end', () => {
      console.log('[StatusListener] Digital human voice ended');
      setIsAvatarSpeaking(false);
    });
    es.onerror = () => {
      // Don't close here, let it retry
      console.error('[StatusListener] EventSource error. It will attempt to reconnect.');
    };
    return () => es.close();
  }, [sessionId]);

  // Effect to end the call after the avatar finishes speaking
  useEffect(() => {
    if (!isAvatarSpeaking && pendingEndCall.current) {
      console.log('[handleEndCall] Avatar finished speaking, proceeding with end call.');
      // Use a timeout to ensure any final state updates are processed
      setTimeout(() => handleEndCall(), 500);
    }
  }, [isAvatarSpeaking]);

  // Define vad first before using it in submit
  const vad = useMicVAD({
    // IMPORTANT: vad object must be stable for useEffect dependency arrays.
    // If useMicVAD doesn't guarantee a stable object, consider wrapping its direct usages in useCallback or using refs.
    onVADMisfire: () => {
      console.log("[VAD] Misfire - no speech detected within timeout");
      if (listeningInitiated && !manualListening) setIsListening(false);
    },
    model:"v5",
    startOnLoad: false, // Explicitly call vad.load()
    onSpeechStart: () => {
      if (!manualListening && listeningInitiated) { // Ensure listening was initiated
        setIsListening(true);
      }
    },
    onSpeechEnd: async (audio) => {
      player.stop();
      const wav = utils.encodeWAV(audio);
      // Create a File object instead of Blob to ensure proper handling
      const audioFile = new File([wav], 'voice-message.wav', { type: 'audio/wav' });
      console.log('Sending audio file:', {
        type: audioFile.type,
        size: audioFile.size,
        name: audioFile.name
      });
      handleSubmit(audioFile);
      if (!manualListening) {
        setIsListening(false);
      }
      const isFirefox = navigator.userAgent.includes("Firefox");
      if (isFirefox && listeningInitiated) vad.pause(); // Pause only if initiated
    },
    // workletURL: "/vad.worklet.bundle.min.js", // Ensure this file is in /public
    // modelURL: "/silero_vad_v5.onnx",     // Ensure this file is in /public
    positiveSpeechThreshold: 0.6,
    minSpeechFrames: 4,
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
    }
  }, [vad, vad?.loading, vad?.errored, vad?.listening]); // Added vad itself and optional chaining for safety

  const handleEndCall = async () => {
    /* 🚦 GUARD  */
    if (endCalledRef.current) return;     // already running once
    endCalledRef.current = true;          // mark as entered

    player.stop(); // Stop any currently playing audio
    console.log("[handleEndCall] Ending call. Current selectionStep:", selectionStep);
    if (vad && typeof vad.pause === 'function') {
      console.log("[Debug] Ending call. Stopping VAD for evaluation.");
      vad.pause();
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
      const evaluationPromptContent = selectedScenario ? PROMPTS[selectedScenario.evaluationPromptKey as keyof typeof PROMPTS] : '';
      const requestBody = {
        messages: conversationHistory,
        roleplayProfile: profileData,
        evaluationPrompt: evaluationPromptContent,
        scenarioContext: selectedScenario?.scenarioContext || "",
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
        setEvaluationData(result.evaluation as EvaluationResponse);
        console.log('[handleEndCall] Evaluation data set successfully.');
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
  };

  const handleRestartSession = () => {
    setMessages([]);
    setInput("");
    setEvaluationData(null);
    setEvaluationError(null);
    setIsEvaluating(false);
    setListeningInitiated(false);
    setManualListening(false);
    setSelectedScenarioId(null);
    setSelectedPersonaId(null);
    setSelectedDifficulty(null);
    setDifficultyProfile(null);
    endCalledRef.current = false;
    pendingEndCall.current = false;
    setSelectionStep('selectScenario');
    setIsPreparingSession(false);
    setIsRoomJoined(false);
    setIsAvatarConnected(false);
    setSessionId(null);
    setTempID(null);
    toast.info("Session Reset. Please select a new scenario.");
  };

  // Ending phrases
  const END_REGEX = /\b(alright,\s*see you next time|great chatting—see you next time|that covers everything—talk soon|thanks\.?\s*have a good day!?)\b/i;

  const handleSubmit = useCallback(async (data: string | Blob, sid?: string) => {
    if (isPending) return; // Prevent multiple submissions
    setSuggestions([]); // Clear previous suggestions

    // For Blob inputs, ensure it's an audio file
    if (data instanceof Blob && !data.type.startsWith('audio/')) {
      console.error('Invalid audio type:', data.type);
      toast.error('We can only process voice messages. Please try again.');
      return;
    }

    setIsApiLoading(true);
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
        formData.append("difficultyProfile", JSON.stringify(difficultyProfile))
      };
      
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
      if (data === "START") {
        setMessages([{ role: "client", content: text }]);
      } else {
        setMessages(msgs => [
          ...msgs,
          { role: "advisor", content: transcript },
          { role: "client",  content: text, latency },
        ]);
      }

      // // // 3.5️⃣ Detect if AI’s reply contains an end-session phrase
      const isEnding = END_REGEX.test(text);
      if (isEnding) {
        pendingEndCall.current = true;
      }

      // Clear input field
      setInput("");

      // 4️⃣ Fire-and-forget the suggestions fetch
      (async () => {
        try {
          const hist = [
            ...(data === "START" ? [] : messages.slice(-10)),  
            { role: "client", content: text }
          ];
          const sugRes = await fetch("/api/suggestion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationHistory: hist,
              aiLastResponse: text,
              requestId: crypto.randomUUID().slice(0,8),
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

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to send message");
    } finally {
      setIsApiLoading(false);
    }
  }, [
    isPending, messages, player, vad,
    selectedPersonaId, selectedScenarioId,
    difficultyProfile, scenarioDefinitionsData
  ]);

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
        return result.sessionId;
      } else {
        toast.error('Failed to connect: ' + result.error);
        setIsAvatarConnected(false);
        setSessionId(null);
        throw new Error(result.error || 'Failed to connect to Digital Human');
      }
    } catch (error: any) {
      toast.error('Error connecting: ' + error.message);
      setIsAvatarConnected(false);
      throw error;
    }
  };

  const handleDisconnectAvatar = async () => {
    if (!isAvatarConnected || !sessionId) return;
    try {
      const response = await fetch(`/api/digital-human?action=disconnect&sessionId=${sessionId}`);
      const result = await response.json();
      if (response.ok) {
        toast.success('Digital Human disconnected: ' + result.status);
        setIsAvatarConnected(false);
        setSessionId(null); // Clear sessionId on disconnect
      } else {
        toast.error('Failed to disconnect: ' + result.status);
      }
    } catch (error: any) {
      toast.error('Error disconnecting: ' + error.message);
    }
  };

  const handleJoinRoom = async () => {
    try {
      console.log('[Page] User attempting join room');
      await initializeAndJoinRoom({ videoContainerId: 'video-container' });
      setIsRoomJoined(true);
      console.log('[Page] Initialized and joined RTC room.');
    } catch (error) {
      console.error('[Page] Failed to join RTC room:', error);
      // Re-throw the error to be caught by Promise.all
      throw error;
    }
  };

  const handleLeaveRoom = async () => {
    await leaveAndDestroyRoom();
    setIsRoomJoined(false);
    console.log('[Page] Left and destroyed RTC room.');
  };

  useEffect(() => {
    endCallRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [suggestions]);

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
                  onSelectScenarioAndPersona={(scenarioId, defaultPersonaId) => {
                    setSelectedScenarioId(scenarioId);
                    setSelectedPersonaId(defaultPersonaId);
                    setSelectionStep('selectPersona');
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
                    onNextToDifficulty={() => setSelectionStep('selectDifficulty')}
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
                      setTempID(id);
                      console.log('[onNextToSummary] Session preparation complete.');
                    } catch (error) {
                      console.error('[onNextToSummary] Session preparation failed:', error);
                      toast.error('Failed to prepare the session. Please check your connection and try again.');
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
                    // Set states first to ensure video container is rendered
                    setListeningInitiated(true);
                    setManualListening(true);
                    setSelectionStep(null);
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
                    }, 200); // Small delay to ensure state updates and re-render
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
                  onRestartSession={handleRestartSession}
                  transcript={messages}
                  persona={getPersonaById(selectedPersonaId!)} 
                  scenario={getScenarioDefinitionById(selectedScenarioId!)} // Pass the entire scenario object
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
          className="mb-8 text-center"
        >
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-4xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#1D3B86] via-[#00A9E7] to-[#1D3B86]">
              <span className="font-light">{selectedScenarioDefinition?.name}</span>
            </h1>
          </div>
        </motion.div>

        {/* Main Content Area - Avatar Left, Messages Right */}
        <div className="flex w-full max-w-6xl mx-auto px-4 gap-8 flex-1">
          {/* Left Side - Avatar Video */}
          <div className="w-1/2 flex flex-col items-center">
            {sessionId ? (
              <div id="video-container" ref={videoContainerRef} className="h-150 max-w-md aspect-video bg-black rounded-xl shadow-lg" />
            ) : (
              <div className="h-150 max-w-md aspect-video bg-black rounded-xl shadow-lg flex items-center justify-center text-white text-lg">
                Connecting to Avatar...
              </div>
            )}
          </div>

          {/* Right Side - Scrollable Messages */}
          <div className="w-1/2 flex flex-col">
            <div className="h-150 overflow-y-auto pr-2 flex flex-col" ref={messagesContainerRef}>
              <div className="flex-1"></div>
              <div className="space-y-4">
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
                        message.role === "client" 
                          ? "bg-[#1D3B86]/60 border border-[#1D3B86]/60 hover:bg-[#1D3B86]/70" 
                          : "bg-[#00A9E7]/40 border border-[#00A9E7]/40 hover:bg-[#00A9E7]/50"
                      )}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-white">
                            {message.role === "client" ? "Customer" : "You"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="whitespace-pre-wrap" style={{
                    color: '#FFFFFF',
                    lineHeight: '1.6',
                    fontSize: '1rem'
                  }}>{message.content}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Controls Section */}
        <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto mt-8">
          {isListening && (
            <div className="mb-4 text-sm font-medium animate-pulse" style={{ color: brandColors.secondary }}>
              Listening...
            </div>
          )}
          
          {suggestions && suggestions.length > 0 && (
            <div className="mt-4 mb-2 w-full max-w-3xl mx-auto flex flex-wrap justify-center gap-2 px-4">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="bg-[#00385C]/80 border-sky-500/60 text-sky-200 hover:bg-sky-700/70 hover:text-sky-100 transition-all duration-200 px-3 py-1.5 text-xs rounded-lg shadow-md hover:shadow-lg focus:ring-2 focus:ring-sky-400/50"
                  onClick={() => {
                    setInput(suggestion); // Set input field with suggestion
                    handleSubmit(suggestion); // Submit the suggestion
                  }}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}

          <form
            className="flex items-center w-full max-w-3xl mx-4 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(input);
            }}
          >
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              ref={inputRef}
              disabled={isPending}
              className="flex-1 bg-[#001F35]/50 border border-white/20 rounded-xl focus:ring-2 focus:ring-[#FFB800]/50 transition-all duration-300 text-white placeholder:text-white/70"
            />
            <Button
              type="submit"
              disabled={isPending || !input.trim()}
              className="bg-[#00A9E7] hover:bg-[#0098D1] text-white transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:hover:bg-[#FFB800] p-2 rounded-xl aspect-square flex items-center justify-center"
            >
              {isPending ? (
                <LoadingIcon/>
              ) : (
                <EnterIcon/>
              )}
            </Button>
          </form>
          
          {/* End Call Button - Moved below the form */}
          <div className="w-full max-w-3xl mx-4 mt-4">
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
          </div>

          <div className="pt-6 text-center max-w-xl text-balance min-h-16 mx-4" style={{ color: '#FFFFFF', fontSize: '0.95rem' }}>
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
                    Start talking or type your message
                  </motion.p>
                )}
              </AnimatePresence>
            )}
          </div>

        </div>

        {/* Active Session Display (Scenario and Patient) */}
        {listeningInitiated ? (
          <div className="mb-6 flex flex-col items-center">
            {/* Selected Scenario Display */}
            {selectedScenarioId && (
              <div className="w-full mb-4">
                <h2 className="text-2xl font-semibold text-center mb-4 text-white">Active Scenario</h2>
                <Card 
                  className="bg-gradient-to-r from-[#002B49]/80 to-[#001425]/90 border-2 border-[#FFB800]/70 shadow-[0_0_15px_rgba(255,184,0,0.3)] mb-4"
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-lg font-medium text-[#FFB800]">
                      {scenarioDefinitionsData.find(s => s.id === selectedScenarioId)?.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-gray-300">{scenarioDefinitionsData.find(s => s.id === selectedScenarioId)?.description}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Display Persona Details for Training Scenario */}
            {selectedScenarioId && scenarioDefinitionsData.find(s => s.id === selectedScenarioId)?.personas[0] && (
              <div className="w-full mb-4">
                <Card
                  className="bg-gradient-to-r from-[#002B49]/80 to-[#001425]/90 border-2 border-yellow-400/70 shadow-[0_0_15px_rgba(255,223,0,0.3)]"
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-lg font-medium text-yellow-400">
                      Role-Play Persona: {selectedPersonaId ? getPersonaById(selectedPersonaId)?.name : ""}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-gray-300 whitespace-pre-line">
                      {selectedPersonaId ? getPersonaById(selectedPersonaId)?.name : ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      (Note: You are the Financial Advisor. Interact with the AI as if it is {selectedPersonaId ? getPersonaById(selectedPersonaId)?.name : ""}.)
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

          </div>
        ) : null}

      </div>
    </div>
  );

  // return (
  //   <>
  //     <div style={{ padding: '20px', textAlign: 'center' }}>
  //       <h1 style={{ color: 'white', marginBottom: '20px' }}>Digital Human WebSocket Test</h1>
  //       <div className="flex justify-center items-center space-x-4">
  //         {!isAvatarConnected ? (
  //           <Button onClick={() => handleConnectAvatar(selectedPersonaId!)} className="bg-green-500 hover:bg-green-600 text-white">
  //             Connect to Digital Human
  //           </Button>
  //         ) : (
  //           <Button onClick={handleDisconnectAvatar} className="bg-red-500 hover:bg-red-600 text-white">
  //             Disconnect from Digital Human
  //           </Button>
  //         )}
  //         <Button
  //             onClick={isRoomJoined ? handleLeaveRoom : handleJoinRoom}
  //             className={`${isRoomJoined ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
  //           >
  //             {isRoomJoined ? 'Leave Room' : 'Join Room'}
  //           </Button>
  //       </div>
  //       <p style={{ color: 'white', marginTop: '10px' }}>
  //         Connection Status: {isAvatarConnected ? 'Connected' : 'Disconnected'}
  //       </p>

  //       <div id="video-container" className="w-80 h-100 bg-black rounded-xl shadow-lg mt-6 mx-auto" />
  //     </div>
  //   </>
  // );
}
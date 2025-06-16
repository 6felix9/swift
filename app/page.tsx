"use client";

import clsx from "clsx";
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { EnterIcon, LoadingIcon } from "@/lib/icons";
import { usePlayer } from "@/lib/usePlayer";
import { useMicVAD, utils } from "@ricky0123/vad-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { AIVoiceInput } from "@/components/ui/ai-voice-input";
import { Message } from "@/lib/types";
import { brandColors } from "@/lib/constants";
import { SummaryDisplay } from '@/components/ui/SummaryDisplay';
import { PhoneOff } from 'lucide-react'; // CheckCircle2 moved to ScenarioSelection
import { ScenarioSelection } from '@/components/ui/ScenarioSelection';
import { PersonaSelection } from '@/components/ui/PersonaSelection';
import { DifficultySelection } from "@/components/ui/DifficultySelection";
import { EvaluationDisplay } from '@/components/ui/EvaluationDisplay'; // Added

import { Persona, personas, getPersonaById } from '@/lib/personas';
import { ScenarioDefinition, scenarioDefinitions, getScenarioDefinitionById } from '@/lib/scenarios';
import { PROMPTS } from '@/lib/prompt';
import { EvaluationResponse } from "./lib/evaluationTypes";
import { Difficulty } from '@/lib/difficultyTypes';

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
  const player = usePlayer();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [manualListening, setManualListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const [isPending, setIsPending] = useState(false);

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
  const [loadingDifficulty, setLoadingDifficulty] = useState<boolean>(false);

  // Wizard Step State for new flow
  const [selectionStep, setSelectionStep] = useState<'selectScenario' | 'selectPersona' | 'selectDifficulty' | 'summary' | 'evaluationResults' | null>('selectScenario'); // Added 'evaluationResults' and null
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    // Load scenario definitions and personas from the imported data
    setScenarioDefinitionsData(scenarioDefinitions);
    setPersonasData(personas);
  }, []);

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
    player.stop(); // Stop any currently playing audio
    console.log("[handleEndCall] Ending call. Current selectionStep:", selectionStep);
    if (vad && typeof vad.pause === 'function') {
      console.log("[Debug] Ending call. Stopping VAD for evaluation.");
      vad.pause();
    }
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
      console.log('[handleEndCall] Evaluation prompt content:', evaluationPromptContent);
      const requestBody = {
        messages: conversationHistory,
        roleplayProfile: profileData,
        evaluationPrompt: evaluationPromptContent,
        scenarioContext: selectedScenario?.scenarioContext || "",
      };
      console.log('[handleEndCall] Fetching /api/evaluate with body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response from API.' })); // Gracefully handle if error response isn't JSON
        console.error('[handleEndCall] API response not OK. Status:', response.status, 'Response body:', JSON.stringify(errorData, null, 2));
        const errorMessage = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
        toast.error(`Evaluation failed: ${errorMessage}`);
        setEvaluationError(errorMessage);
        // No need to throw here, error is handled, and finally block will run
        return; // Exit the try block
      }

      const result = await response.json();
      console.log('[handleEndCall] API response JSON:', JSON.stringify(result, null, 2));

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
    setSelectionStep('selectScenario');
    toast.info("Session Reset. Please select a new scenario.");
  };

  const handleSubmit = useCallback(async (data: string | Blob) => {
    if (isPending) return; // Prevent multiple submissions
    setSuggestions([]); // Clear previous suggestions

    // For Blob inputs, ensure it's an audio file
    if (data instanceof Blob && !data.type.startsWith('audio/')) {
      console.error('Invalid audio type:', data.type);
      toast.error('We can only process voice messages. Please try again.');
      return;
    }

    setIsPending(true);
    try {
      // 1️⃣ Send to /api → audio + text
      const submittedAt = Date.now();
      const formData = new FormData();
      formData.append("input", data);

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
      const audioBlob = await response.blob();
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

      // 5️⃣ Play audio
      const contentType = response.headers.get("Content-Type") || undefined;
      const audioStream = audioBlob.stream();
      player.play(audioStream, () => {
        if (navigator.userAgent.includes("Firefox") && vad) vad.start();
      }, contentType);

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to send message");
    } finally {
      setIsPending(false);
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

  useEffect(() => {
    endCallRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, suggestions]);

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
  console.log('[Home Component Render] Current selectionStep:', selectionStep);
  console.log('[Home Component Render] Current listeningInitiated:', listeningInitiated);

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
                  personas={personasData}
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
                    setLoadingDifficulty(true);
                    try {
                      await handleDifficultyProfileGeneration(
                        selectedDifficulty,
                        selectedScenarioId,
                      );
                    } catch (error) {
                      console.error("Error generating difficulty profile:", error);
                    } finally {
                      setLoadingDifficulty(false);
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
                  onStartSession={() => {
                    const scenario = getScenarioDefinitionById(selectedScenarioId);
                    const persona = getPersonaById(selectedPersonaId);
                    if (!scenario || !persona) { 
                      toast.error("Error: Scenario or Persona not fully selected for session start. Please go back.");
                      return;
                    }
                    handleSubmit("START");
                    console.log("[Debug] Attempting to start session. Current VAD object:", vad);
                    setListeningInitiated(true);
                    if (vad && !vad.listening) {
                      console.log("[Debug] VAD found, but not listening. Attempting to start VAD manually.");
                      vad.start();
                    }
                    setManualListening(true);
                    setSelectionStep(null); 
                  }}
                  onChangeDifficulty={() => setSelectionStep('selectDifficulty')}
                  onChangePersona={() => setSelectionStep('selectPersona')}
                  onChangeScenario={() => setSelectionStep('selectScenario')}
                  loadingDifficulty={loadingDifficulty}
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

        <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4 space-y-6 w-full max-w-3xl mx-auto">
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

        <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto">
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
            {selectedScenarioId && scenarioDefinitionsData.find(s => s.id === selectedScenarioId)?.defaultPersonaId && (
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
}

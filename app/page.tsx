"use client";

import clsx from "clsx";
import { useActionState, useEffect, useRef, useState, useCallback, startTransition } from "react";
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
import { FlickeringGrid } from "@/components/ui/flickering-grid"; // Assuming named export
import { PhoneOff } from 'lucide-react'; // CheckCircle2 moved to ScenarioSelection
import { ScenarioSelection } from '@/components/ui/ScenarioSelection';
import { PersonaSelection } from '@/components/ui/PersonaSelection';
import { SummaryDisplay } from '@/components/ui/SummaryDisplay';
import { roleplayProfileCard as RoleplayProfileCard, roleplayProfile } from "@/components/ui/patient-profile-card";

import { Persona, personas as allPersonas, getPersonaById } from '@/lib/personas';
import { ScenarioDefinition, scenarioDefinitions as allScenarioDefinitions, getScenarioDefinitionById } from '@/lib/scenarios';

export default function Home() {
  const mainContainerStyle = {
    background: 'transparent',
    minHeight: '100vh',
    color: brandColors.white,
    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
  };
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const player = usePlayer();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [manualListening, setManualListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const [isPending, setIsPending] = useState(false);

  // State for summarization
  const [summaryText, setSummaryText] = useState<string>("");
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [summaryError, setSummaryError] = useState<string>("");

  // State to track if user has initiated listening
  const [listeningInitiated, setListeningInitiated] = useState<boolean>(false);

  // State for new Scenario-based training
  const [scenarioDefinitionsData, setScenarioDefinitionsData] = useState<ScenarioDefinition[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [personasData, setPersonasData] = useState<Persona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);

  // Wizard Step State for new flow
  const [selectionStep, setSelectionStep] = useState<'selectScenario' | 'selectPersona' | 'summary'>('selectScenario');

  useEffect(() => {
    // Load scenario definitions and personas from the imported data
    setScenarioDefinitionsData(allScenarioDefinitions);
    setPersonasData(allPersonas);
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



  const handleEndCall = () => {
    if (vad && typeof vad.pause === 'function') {
      console.log("[Debug] Ending call. Stopping VAD.");
      vad.pause();
    }
    setMessages([]);
    setInput("");
    setSummaryText("");
    setSummaryError("");
    setIsListening(false);
    setListeningInitiated(false);
    setSelectionStep('scenario');
    setSelectedPatientId(null); // Optional: Clear selections for a fresh start
    setSelectedScenarioId(null); // Optional: Clear selections for a fresh start
    toast.info("Call ended. Session cleared.");
  };

  const handleSubmit = useCallback(async (data: string | Blob) => {
    if (isPending) return; // Prevent multiple submissions

    // For Blob inputs, ensure it's an audio file
    if (data instanceof Blob && !data.type.startsWith('audio/')) {
      console.error('Invalid audio type:', data.type);
      toast.error('We can only process voice messages. Please try again.');
      return;
    }

    setIsPending(true);
    try {
      const submittedAt = Date.now();
      const formData = new FormData();
      formData.append("input", data);

      // Get selected patient and scenario
      const selectedPatient = patients.find(p => p.id === selectedPatientId) || null;
      const selectedScenario = scenarios.find(s => s.id === selectedScenarioId) || null;

      if (selectedPatient) {
        formData.append("roleplayProfile", JSON.stringify(selectedPatient));
      }
      if (selectedScenario) {
        formData.append("scenario", JSON.stringify(selectedScenario));
      }

      // Only send the last 10 messages to keep the payload size reasonable
      const recentMessages = messages.slice(-10);
      formData.append(
        "message",
        JSON.stringify(
          recentMessages.map(({ role, content }) => ({ role, content }))
        )
      );

      try {
        const response = await fetch("/api", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          if (response.status === 429) {
            toast.error("We're experiencing high traffic. Please try again in a moment.");
          } else {
            toast.error((await response.text()) || "We couldn't process your request. Please try again.");
          }
          return;
        }

        const audioBlob = await response.blob();
        const latency = Date.now() - submittedAt;
        const transcript = decodeURIComponent(response.headers.get("X-Transcript") || "");
        const text = decodeURIComponent(response.headers.get("X-Response") || "");

        if (!transcript || !text) {
          toast.error("We couldn't understand the response. Please try again.");
          return;
        }

        if (typeof data === "string") {
          setInput("");
        }

        const contentType = response.headers.get("Content-Type");

        // Play audio and handle browser-specific behavior
        try {
          player.play(audioBlob as any, () => {
            const isFirefox = navigator.userAgent.includes("Firefox");
            if (isFirefox && vad) vad.start();
          }, contentType || undefined);
        } catch (audioError) {
          console.error("Audio playback error:", audioError);
          toast.error("We couldn't play the audio response. Please check your sound settings.");
        }

        // Update messages with new content
        setMessages(messages => [
          ...messages,
          { role: "user", content: transcript },
          { role: "assistant", content: text, latency },
        ]);

      } catch (error) {
        console.error(error);
        toast.error("Failed to send message");
      } finally {
        setIsPending(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to send message");
    } finally {
      setIsPending(false);
    }
  }, [isPending, messages, player, selectedScenarioId, scenarioDefinitionsData, vad]);

  const handleGenerateSummary = async () => {
    if (isSummarizing || messages.length === 0) {
      return;
    }
    setIsSummarizing(true);
    setSummaryError("");
    setSummaryText(""); // Clear previous summary

    try {
      // Prepare only the role and content for the API
      const conversationHistory = messages.map(({ role, content }) => ({ role, content }));
      let roleplayProfile = null;
      if (selectedPatientId) {
        const patient = patients.find(p => p.id === selectedPatientId);
        if (patient) {
          roleplayProfile = {
            id: patient.id,
            name: patient.name,
            nric: patient.nric,
            phone: patient.phone,
            dob: patient.dob,
            age: patient.age,
            outstandingBalance: patient.outstandingBalance,
          };
        }
      } 

      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: conversationHistory, roleplayProfile }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.details || errorData.error || "Failed to generate summary.";
        console.error("Error generating summary:", errorMessage);
        toast.error(`Summarization failed: ${errorMessage}`);
        setSummaryError(errorMessage);
        setIsSummarizing(false);
        return;
      }

      const data = await response.json();
      if (data.summary) {
        setSummaryText(data.summary);
        toast.success("Summary generated!");
      } else {
        console.error("No summary content received");
        toast.error("Received empty summary from server.");
        setSummaryError("Received empty summary.");
      }
    } catch (error: any) {
      console.error("Exception during summary generation:", error);
      const message = error.message || "An unexpected error occurred.";
      toast.error(`Summarization error: ${message}`);
      setSummaryError(message);
    } finally {
      setIsSummarizing(false);
    }
  };

  const vadRef = useRef(vad); // Create a ref for VAD
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
              {/* 
              <h1 className="text-4xl font-bold text-center mb-2 text-white">Health Line</h1>
              <p className="text-center mb-8 text-gray-300">Powered by AI assistant</p> */}

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
                  onNextToSummary={() => setSelectionStep('summary')}
                />
              )}

              {/* New Summary Step */}
              {selectionStep === 'summary' && selectedScenarioId && selectedPersonaId && (
                <SummaryDisplay
                  selectedScenario={getScenarioDefinitionById(selectedScenarioId)}
                  selectedPersona={getPersonaById(selectedPersonaId)}
                  onStartSession={() => {
                    const scenario = getScenarioDefinitionById(selectedScenarioId);
                    const persona = getPersonaById(selectedPersonaId);
                    if (!scenario || !persona) { 
                      toast.error("Error: Scenario or Persona not fully selected for session start. Please go back.");
                      return;
                    }
                    console.log("[Debug] Attempting to start session. Current VAD object:", vad);
                    setListeningInitiated(true);
                    if (vad && !vad.listening) {
                      console.log("[Debug] VAD found, but not listening. Attempting to start VAD manually.");
                      vad.start();
                    }
                    setManualListening(true);
                    setSelectionStep(null); 
                    const personaMessage: Message = {
                      id: Date.now().toString(),
                      role: 'assistant',
                      content: scenario.personaOpeningLine,
                      timestamp: new Date().toISOString(),
                    };
                    setMessages([personaMessage]);
                  }}
                  onChangePersona={() => setSelectionStep('selectPersona')}
                  onChangeScenario={() => setSelectionStep('selectScenario')}
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
              HealthLine <span className="font-light">Voice Assistant</span>
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
                  message.role === "assistant" 
                    ? "bg-[#1D3B86]/60 border border-[#1D3B86]/60 hover:bg-[#1D3B86]/70" 
                    : "bg-[#00A9E7]/40 border border-[#00A9E7]/40 hover:bg-[#00A9E7]/50"
                )}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-white">
                      {message.role === "assistant" ? "Assistant" : "Patient"}
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
          
          <form
            className="flex items-center w-full max-w-3xl mx-4 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(input);
            }}
          >
            <Input
              type="text"
              placeholder="Ask me anything about Healthier SG services..."
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
                      {scenarios.find(s => s.id === selectedScenarioId)?.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-gray-300">{scenarios.find(s => s.id === selectedScenarioId)?.description}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Display Persona Details for Training Scenario */}
            {selectedScenarioId && scenarios.find(s => s.id === selectedScenarioId)?.personaDetails && (
              <div className="w-full mb-4">
                <Card
                  className="bg-gradient-to-r from-[#002B49]/80 to-[#001425]/90 border-2 border-yellow-400/70 shadow-[0_0_15px_rgba(255,223,0,0.3)]"
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-lg font-medium text-yellow-400">
                      Role-Play Persona: {scenarios.find(s => s.id === selectedScenarioId)?.personaName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-gray-300 whitespace-pre-line">
                      {scenarios.find(s => s.id === selectedScenarioId)?.personaDetails}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      (Note: You are the Financial Advisor. Interact with the AI as if it is Liang Chen.)
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Selected Patient Display */}
            {selectedPatientId && (
              <div className="w-full max-w-sm">
                <h2 className="text-2xl font-semibold text-center mb-4 text-white">Selected Patient</h2>
                <RoleplayProfileCard
                  patient={patients.find(p => p.id === selectedPatientId)!}
                  isSelected={true} // Visual cue that this is the active context
                  onSelect={() => {}} // No selection change during an active call
                />
              </div>
            )}
          </div>
        ) : null}


          {/* Summarization Section - only show if listening initiated */}
          {listeningInitiated && (
            <div className="w-full max-w-3xl mx-auto mt-6 mb-6">
              <Button
                onClick={handleGenerateSummary}
                disabled={isSummarizing || messages.length === 0}
                className="w-full bg-gradient-to-r from-[#FFB800] to-[#FFCC40] hover:from-[#EAA900] hover:to-[#FFB800] text-[#001425] font-semibold transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-[#FFB800] disabled:hover:to-[#FFCC40] py-3 text-base rounded-xl"
              >
                {isSummarizing ? (
                  <>
                    <LoadingIcon/> Summarizing...
                  </>
                ) : (
                  "Generate Call Summary"
                )}
              </Button>
              {summaryError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-gradient-to-br from-red-900/40 to-red-950/30 border border-red-700/50 text-red-200 rounded-md backdrop-blur-md shadow-inner"
                >
                  <p className="text-sm font-medium">Error generating summary:</p>
                  <p className="text-xs">{summaryError}</p>
                </motion.div>
              )}
              {summaryText && !summaryError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-gradient-to-br from-[#002B49]/80 to-[#001425]/90 border border-white/20 rounded-xl shadow-[0_4px_20px_rgba(0,15,30,0.4)] backdrop-blur-md"
                >
                  <h3 className="text-lg font-semibold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-[#FFB800] to-[#FFCC40]">Call Summary:</h3>
                  <pre className="whitespace-pre-wrap text-sm text-gray-100 leading-relaxed tracking-wide">
                    {summaryText}
                  </pre>
                </motion.div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}

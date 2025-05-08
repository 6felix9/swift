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
import { brandColors } from "@/lib/constants";
import { Message } from "@/lib/types";
import { FlickeringGrid } from "@/components/ui/flickering-grid"; // Assuming named export
import { PatientProfileCard } from "@/components/ui/patient-profile-card";

// Define PatientProfile interface
export interface PatientProfile {
  id: string;
  name: string;
  gender: string;
  nric: string; // Masked NRIC
  phone: string; // Masked phone number
  dob: string;   // Date of Birth
  outstandingBalance?: string; // e.g., "SGD 50.00" or "None"
}

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

  // Patient Profile State
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Simulate fetching patient data (could be an API call in a real app)
  useEffect(() => {
    const mockPatients: PatientProfile[] = [
      { id: '1', name: 'Kevin Yeap', gender: 'Male', nric: 'S****123A', phone: '+65 9093 3395', dob: '01 Jan 1980', outstandingBalance: 'SGD 175.50' },
      { id: '2', name: 'Peiru Teo', gender: 'Female', nric: 'S****567B', phone: '+65 9199 3563', dob: '15 May 1992', outstandingBalance: 'None' },
      { id: '3', name: 'Max Xu', gender: 'Male', nric: 'S****890C', phone: '+65 8288 8399', dob: '22 Nov 1975', outstandingBalance: 'SGD 230.00' },
    ];
    setPatients(mockPatients);
  }, []);

  // Define vad first before using it in submit
  const vad = useMicVAD({
    model:"v5",
    startOnLoad: false, // Changed from true
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
    // workletURL: "/vad.worklet.bundle.min.js",
    // modelURL: "/silero_vad_v5.onnx",
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

      // Add selected patient profile to formData if available
      if (selectedPatientId) {
        const patient = patients.find(p => p.id === selectedPatientId);
        if (patient) {
          formData.append("patientProfile", JSON.stringify(patient));
        }
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
  }, [isPending, messages, player, selectedPatientId, patients]);

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
      let patientProfile = null;
      if (selectedPatientId) {
        const patient = patients.find(p => p.id === selectedPatientId);
        if (patient) {
          patientProfile = {
            id: patient.id,
            name: patient.name,
            nric: patient.nric,
            phone: patient.phone,
            dob: patient.dob,
            outstandingBalance: patient.outstandingBalance,
          };
        }
      } 

      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: conversationHistory, patientProfile }),
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

  if (!listeningInitiated) {
    return (
      <div style={mainContainerStyle} className="flex flex-col items-center justify-center">
        {/* Content for !listeningInitiated, wrapped to ensure it's on top */}
        <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 text-center"
          >
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-4xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#1D3B86] via-[#00A9E7] to-[#1D3B86]">
                HealthLine <span className="font-light">Voice Assistant</span>
              </h1>
              <p className="text-lg text-white/80 mt-1">Please select a patient profile to continue.</p>
            </div>
          </motion.div>

          {/* Patient Profile Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 w-full max-w-4xl px-4">
            {patients.map((patient) => (
              <PatientProfileCard
                key={patient.id}
                patient={patient}
                isSelected={selectedPatientId === patient.id}
                onSelect={setSelectedPatientId}
              />
            ))}
          </div>

          <Button
            onClick={() => {
              handleSubmit('hi');
              vad.start();
              setListeningInitiated(true);
              toast.success("Call started, you can now ask questions!");
            }}
            disabled={vad.loading || !selectedPatientId}
            className="px-8 py-4 bg-gradient-to-r from-[#00A9E7] to-[#1D3B86] hover:from-[#1D3B86] hover:to-[#00A9E7] text-white text-xl font-semibold rounded-xl shadow-lg transition-all duration-300 hover:shadow-2xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {vad.loading ? <><LoadingIcon/> Initializing...</> : vad.errored ? "Voice Error" : "Start Session"}
          </Button>
          {!selectedPatientId && !vad.loading && !vad.errored && (
            <p className="mt-3 text-sm text-yellow-400">Please select a patient profile to start.</p>
          )}
          {vad.errored && (
            <p className="mt-4 text-red-400 text-sm">
              Failed to initialize microphone. Please check permissions and try again.
            </p>
          )}
          <motion.div
            className="fixed w-48 h-48 blur-3xl rounded-full bg-gradient-to-b from-[#1D3B86] to-[#00A9E7] opacity-10 -z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    );
  }

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

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
              className="bg-[#00A9E7] hover:bg-[#0098D1] text-white transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:hover:bg-[#FFB800]"
            >
              {isPending ? (
                <LoadingIcon/>
              ) : (
                <EnterIcon/>
              )}
            </Button>
          </form>

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

        {/* Patient Profile Display */}
        {listeningInitiated ? (
          selectedPatient ? (
            // Show only the selected patient card if listening and a patient is selected
            <div className="mb-6 flex flex-col items-center">
              <h2 className="text-2xl font-semibold text-center mb-4 text-white">Selected Patient</h2>
              <div className="w-full max-w-sm">
                 <PatientProfileCard
                    patient={selectedPatient}
                    isSelected={true} // Visual cue that this is the active context
                    onSelect={() => {}} // No selection change during an active call
                  />
              </div>
            </div>
          ) : null /* Optional: Handle case where isListening is true but no selectedPatient (should not happen with current logic) */
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

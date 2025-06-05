import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { PROMPTS } from "@/lib/prompt";
import { extractAppointmentDetails, sendWhatsAppConfirmation, roleplayProfile } from '@/lib/whatsappService';
import { generateSpeech } from '@/lib/elevenlabs';
import { Readable } from "stream";
import { getTranscript } from '@/lib/whisper';
import { allScenarioDefinitions, getScenarioDefinitionById, ScenarioDefinition } from '@/lib/scenarios'; // Added for START_SESSION

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ParsedRequestData {
  input: string;
  history: Message[];
  roleplayProfile: roleplayProfile | null;
  transcript: string;
  allMessages: Message[];
  scenarioId?: string;
  action?: string; // Added for START_SESSION
}

async function parseIncomingRequest(req: Request, requestId: string): Promise<ParsedRequestData> {
  console.log(`[${requestId}] Parsing incoming request...`);
  const formData = await req.formData();
  let input: any = formData.get("input");
  const historyString = formData.get("message") as string | null;
  const roleplayProfileString = formData.get("roleplayProfile") as string | null;
  const scenario = formData.get("scenario") as string | null || "";
  const action = formData.get("action") as string | null; // Added for START_SESSION

  let scenarioId = "";
  try {
    scenarioId = JSON.parse(scenario)?.id || "";
    console.log(`[${requestId}] Scenario ID: ${scenarioId}`);
  } catch (error) {
    console.error(`[${requestId}] Error parsing scenario ID:`, error);
  }

  if (!input) {
    console.error(`[${requestId}] No input found in formData.`);
    throw new Error("Input is required");
  }

  let history: Message[] = [];
  if (historyString) {
    try {
      history = JSON.parse(historyString);
    } catch (e) {
      console.warn(`[${requestId}] Error parsing history JSON, proceeding with empty history:`, e);
    }
  }

  let transcript: any = input;
  if (input instanceof File) {
    transcript = await getTranscript(input);
    input = transcript;
  }

  let allMessages: Message[] = [...history];
  allMessages.push({ role: "user", content: input });

  let roleplayProfile: roleplayProfile | null = null;
  if (roleplayProfileString) {
    try {
      roleplayProfile = JSON.parse(roleplayProfileString) as roleplayProfile;
      console.log(`[${requestId}] Parsed patient profile for: ${roleplayProfile.name}`);
    } catch (e) {
      console.warn(`[${requestId}] Error parsing patient profile JSON, proceeding without profile:`, e);
    }
  }

  console.log(`[${requestId}] Request parsed successfully. Action: ${action}`);
  return { input, history, roleplayProfile, transcript, allMessages, scenarioId, action }; // Added action
}

function buildCallerInfoString(roleplayProfile: roleplayProfile | null): string {
    if (!roleplayProfile) return "";
    return `\n\nCaller Information:\nName: ${roleplayProfile.name}\nMasked NRIC: ${roleplayProfile.nric}\nDOB: ${roleplayProfile.dob}\nOutstandingBalance: ${roleplayProfile.outstandingBalance || 'N/A'}`;
}

async function getIntentClassification(messages: Message[], roleplayProfile: roleplayProfile | null, requestId: string): Promise<string> {
  console.log(`[${requestId}] Getting intent classification...`);
  const classificationPrompt = `${PROMPTS.Classify}`;

  console.log(messages);

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: classificationPrompt },
        ...messages,
      ],
      model: "meta-llama/llama-4-maverick-17b-128e-instruct", // Use a smaller model for classification
      temperature: 0.1,
    });
    const intent = chatCompletion.choices[0]?.message?.content?.trim().toUpperCase() || "UNKNOWN";
    console.log(`[${requestId}] Classified intent: ${intent}`);
    return intent;
  } catch (error) {
    console.error(`[${requestId}] Error during intent classification:`, error);
    throw new Error("Failed to classify intent");
  }
}

async function generateMainAiTextResponse(messages: Message[], intent: string, roleplayProfile: roleplayProfile | null, originalQuery: string, requestId: string, scenarioId?: string): Promise<string> {
  console.log(`[${requestId}] Generating main AI text response for intent: ${intent}`);
  let systemPromptContent = "";
  const callerInfo = buildCallerInfoString(roleplayProfile);

  if (intent === "FAQ") {
    console.log(`[${requestId}] Building RAG prompt for FAQ query: "${originalQuery}"`);
    systemPromptContent = await PROMPTS.RAG(originalQuery); // RAG will include its own base prompt and context
  } else if (scenarioId === 'PREPARATION') {
    console.log(`[${requestId}] Using PREPARATION for scenario: ${scenarioId}`);
    systemPromptContent = `${PROMPTS.PREPARATION}${callerInfo}`;
  } else if (scenarioId === 'FOLLOW_UP') {
    console.log(`[${requestId}] Using FOLLOW_UP for scenario: ${scenarioId}`);
    systemPromptContent = `${PROMPTS.FOLLOW_UP}${callerInfo}`;
  } else {
    // Default to APPOINTMENT or other general intents if no specific scenario matches
    console.log(`[${requestId}] Using APPOINTMENT for intent: ${intent} (no specific scenario or scenario not matched: ${scenarioId})`);
    systemPromptContent = `${PROMPTS.APPOINTMENT}${callerInfo}`;
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPromptContent },
        ...messages,
      ],
      model: "meta-llama/llama-4-maverick-17b-128e-instruct",
      temperature: 0.7,
    });
    const aiResponse = chatCompletion.choices[0]?.message?.content || "";
    console.log(`[${requestId}] Main AI response generated: "${aiResponse.substring(0, 100)}..."`);
    if (!aiResponse.trim()) throw new Error("AI returned an empty main response.");
    return aiResponse;
  } catch (error) {
    console.error(`[${requestId}] Error generating main AI response:`, error);
    throw new Error("Failed to get main AI response");
  }
}

async function convertTextToSpeech(text: string, requestId: string): Promise<ReadableStream<Uint8Array>> {
  console.log(`[${requestId}] Converting text to speech using ElevenLabs...`);
  if (!ELEVENLABS_API_KEY) {
    console.error(`[${requestId}] ELEVENLABS_API_KEY is not set.`);
    throw new Error("TTS API key (ElevenLabs) not configured");
  }
  try {
    const audioStream = await generateSpeech(text);
    console.log(`[${requestId}] ElevenLabs audio stream obtained.`);
    return audioStream;
  } catch (error) {
    console.error(`[${requestId}] Error converting text to speech with ElevenLabs:`, error);
    throw new Error("Failed to generate audio with ElevenLabs");
  }
}

async function handleAppointmentWorkflowInBackground(fullTranscript: string, roleplayProfile: roleplayProfile | null, requestId: string): Promise<void> {
  if (!roleplayProfile) {
    console.log(`[${requestId}] No patient profile, skipping appointment workflow.`);
    return;
  }
  console.log(`[${requestId}] Starting appointment workflow (background)...`);
  try {
    const appointmentDetails = await extractAppointmentDetails(groq, fullTranscript, requestId);
    if (appointmentDetails && (appointmentDetails.appointment_date || appointmentDetails.appointment_time)) {
      console.log(`[${requestId}] Appointment details extracted for WhatsApp:`, appointmentDetails);
      await sendWhatsAppConfirmation(appointmentDetails, roleplayProfile);
    } else {
      console.log(`[${requestId}] No specific appointment details for WhatsApp.`);
    }
  } catch (error) {
    console.error(`[${requestId}] Error in background appointment workflow:`, error);
  }
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`\n--- [${requestId}] Received POST /api/route ---`);

  try {
    // Step 1: Parse and Validate Incoming Request
    const { input, roleplayProfile, transcript, allMessages, scenarioId, action } = await parseIncomingRequest(req, requestId);

    // Determine the AI text response based on action type
    let aiTextResponse: string;
    let effectiveTranscript = transcript;
    
    if (action === 'START_SESSION' && scenarioId) {
      console.log(`[${requestId}] Handling START_SESSION action for scenario ID: ${scenarioId}`);
      const scenario = getScenarioDefinitionById(scenarioId, allScenarioDefinitions);
      if (scenario && scenario.personaOpeningLine) {
        // Use the persona opening line as the AI response
        aiTextResponse = scenario.personaOpeningLine;
        effectiveTranscript = "SESSION_START"; // No actual user transcript for session start
        console.log(`[${requestId}] Using personaOpeningLine for START_SESSION: "${aiTextResponse.substring(0, 100)}..."`);
      } else {
        console.error(`[${requestId}] Scenario or personaOpeningLine not found for ID: ${scenarioId}`);
        return NextResponse.json({ error: 'Failed to start session. Scenario details missing.' }, { status: 400 });
      }
    } else {
      // If not START_SESSION, or if scenarioId was missing for START_SESSION, proceed with normal flow
      if (action === 'START_SESSION' && !scenarioId) {
        console.warn(`[${requestId}] START_SESSION action received without scenarioId. Proceeding to normal flow but this might be an error.`);
      }
      
      // Generate AI response for normal conversation flow
      aiTextResponse = await generateMainAiTextResponse(allMessages, scenarioId!, roleplayProfile, input, requestId, scenarioId);
    }
    
    // Step 4: Handle Appointment Workflow (Asynchronously - Fire and Forget)
    if (scenarioId === "APPOINTMENT") {
      if (aiTextResponse.includes('receive') || aiTextResponse.includes('confirm') || aiTextResponse.includes('whatsapp')) {
        const fullTranscriptForAppointment = allMessages.map(m => `${m.role}: ${m.content}`).join('\n');
        handleAppointmentWorkflowInBackground(fullTranscriptForAppointment, roleplayProfile, requestId);   
      }
    }

    // Step 5: Convert AI Text to Speech
    const audioStream = await convertTextToSpeech(aiTextResponse, requestId);

    // Step 6: Stream Audio Response
    console.log(`[${requestId}] Streaming audio response to client.`);

    return new Response(audioStream, {
      headers: {
        "X-Transcript": encodeURIComponent(transcript),
        "X-Response": encodeURIComponent(aiTextResponse!),
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error: any) {
    console.error(`[${requestId}] CRITICAL ERROR in POST handler:`, error.message, error.stack);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}

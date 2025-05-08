import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { PROMPTS } from "@/lib/prompt";
import { extractAppointmentDetails, sendWhatsAppConfirmation, PatientProfile } from '@/lib/whatsappService';
import { generateSpeech } from '@/lib/elevenlabs';
import { Readable } from "stream";
import { getTranscript } from '@/lib/whisper';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ParsedRequestData {
  input: string;
  history: Message[];
  patientProfile: PatientProfile | null;
  transcript: string;
  allMessages: Message[];
}

async function parseIncomingRequest(req: Request, requestId: string): Promise<ParsedRequestData> {
  console.log(`[${requestId}] Parsing incoming request...`);
  const formData = await req.formData();
  let input: any = formData.get("input");
  const historyString = formData.get("message") as string | null;
  const patientProfileString = formData.get("patientProfile") as string | null;

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

  let patientProfile: PatientProfile | null = null;
  if (patientProfileString) {
    try {
      patientProfile = JSON.parse(patientProfileString) as PatientProfile;
      console.log(`[${requestId}] Parsed patient profile for: ${patientProfile.name}`);
    } catch (e) {
      console.warn(`[${requestId}] Error parsing patient profile JSON, proceeding without profile:`, e);
    }
  }

  console.log(`[${requestId}] Request parsed successfully.`);
  return { input, history, patientProfile, transcript, allMessages };
}

function buildCallerInfoString(patientProfile: PatientProfile | null): string {
    if (!patientProfile) return "";
    return `\n\nCaller Information:\nName: ${patientProfile.name}\nMasked NRIC: ${patientProfile.nric}\nDOB: ${patientProfile.dob}\nOutstandingBalance: ${patientProfile.outstandingBalance || 'N/A'}`;
}

async function getIntentClassification(messages: Message[], patientProfile: PatientProfile | null, requestId: string): Promise<string> {
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

async function generateMainAiTextResponse(messages: Message[], intent: string, patientProfile: PatientProfile | null, originalQuery: string, requestId: string): Promise<string> {
  console.log(`[${requestId}] Generating main AI text response for intent: ${intent}`);
  let systemPromptContent = "";
  const callerInfo = buildCallerInfoString(patientProfile);

  if (intent === "FAQ") {
    console.log(`[${requestId}] Building RAG prompt for FAQ query: "${originalQuery}"`);
    systemPromptContent = await PROMPTS.RAG(originalQuery); // RAG will include its own base prompt and context
  } else {
    // For 'APPOINTMENT' or other direct conversation intents
    systemPromptContent = `${PROMPTS.Appointment}${callerInfo}`;
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

async function handleAppointmentWorkflowInBackground(fullTranscript: string, patientProfile: PatientProfile | null, requestId: string): Promise<void> {
  if (!patientProfile) {
    console.log(`[${requestId}] No patient profile, skipping appointment workflow.`);
    return;
  }
  console.log(`[${requestId}] Starting appointment workflow (background)...`);
  try {
    const appointmentDetails = await extractAppointmentDetails(groq, fullTranscript, requestId);
    if (appointmentDetails && (appointmentDetails.appointment_date || appointmentDetails.appointment_time)) {
      console.log(`[${requestId}] Appointment details extracted for WhatsApp:`, appointmentDetails);
      await sendWhatsAppConfirmation(appointmentDetails, patientProfile);
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
    const { input, patientProfile, transcript, allMessages } = await parseIncomingRequest(req, requestId);

    // Step 2: Get Intent Classification
    // Send allMessages for richer context for classification, but the helper might slice it.
    const intent = await getIntentClassification(allMessages, patientProfile, requestId);
    
    let aiTextResponse = "";
    if (input === "hi") {
      aiTextResponse = "Hi thank you for calling HealthLine, my name is Mei Ling, how can I help you today?";
    } else {
      aiTextResponse = await generateMainAiTextResponse(allMessages, intent, patientProfile, input, requestId);
    }

    // Step 4: Handle Appointment Workflow (Asynchronously - Fire and Forget)
    if (intent === "APPOINTMENT") {
      if (aiTextResponse.includes('receive') || aiTextResponse.includes('confirm') || aiTextResponse.includes('whatsapp')) {
        const fullTranscriptForAppointment = allMessages.map(m => `${m.role}: ${m.content}`).join('\n');
        handleAppointmentWorkflowInBackground(fullTranscriptForAppointment, patientProfile, requestId);   
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

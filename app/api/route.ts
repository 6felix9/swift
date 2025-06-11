import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { PROMPTS } from '@/lib/prompt';
import { extractAppointmentDetails, sendWhatsAppConfirmation, roleplayProfile as WhatsAppProfile } from '@/lib/whatsappService';
import { generateSpeech } from '@/lib/elevenlabs';
import { Readable } from "stream";
import { getTranscript } from '@/lib/whisper';
import { scenarioDefinitions, getScenarioDefinitionById, ScenarioDefinition } from '@/lib/scenarios'; // Added for START_SESSION
import { Persona, getPersonaById } from '@/lib/personas';
import { GoogleGenAI } from "@google/genai";
import { PERSONA_PROMPTS } from "@/lib/prompt/persona";

// Testing Gemini flash 2.5 model for evaluation
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

interface Message {
  role: "advisor" | "client" | "system";
  content: string;
}

interface ParsedRequestData {
  input: string;
  history: Message[];
  roleplayProfile: Persona | null;
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
  allMessages.push({ role: "advisor", content: input });

  let roleplayProfile: Persona | null = null;
  if (roleplayProfileString) {
    try {
      roleplayProfile = JSON.parse(roleplayProfileString) as Persona;
      console.log(`[${requestId}] Parsed persona profile for: ${roleplayProfile.name}`);
    } catch (e) {
      console.warn(`[${requestId}] Error parsing persona profile JSON, proceeding without profile:`, e);
    }
  }

  return { input, history, roleplayProfile, transcript, allMessages, scenarioId }; // Added action
}

function buildCallerInfoString(roleplayProfile: Persona | null): string {
    if (!roleplayProfile) return "";
    return `\n\nCaller Information:\nName: ${roleplayProfile.name}`;
}

// async function getIntentClassification(messages: Message[], roleplayProfile: roleplayProfile | null, requestId: string): Promise<string> {
//   console.log(`[${requestId}] Getting intent classification...`);
//   const classificationPrompt = `${PROMPTS.Classify}`;

//   console.log(messages);

//   try {
//     const chatCompletion = await groq.chat.completions.create({
//       messages: [
//         { role: "system", content: classificationPrompt },
//         ...messages,
//       ],
//       model: "meta-llama/llama-4-maverick-17b-128e-instruct", // Use a smaller model for classification
//       temperature: 0.1,
//     });
//     const intent = chatCompletion.choices[0]?.message?.content?.trim().toUpperCase() || "UNKNOWN";
//     console.log(`[${requestId}] Classified intent: ${intent}`);
//     return intent;
//   } catch (error) {
//     console.error(`[${requestId}] Error during intent classification:`, error);
//     throw new Error("Failed to classify intent");
//   }
// }

async function generateNextTurnSuggestions(
  conversationHistory: Message[],
  aiLastResponse: string,
  requestId: string
): Promise<string[]> {
  console.log(`[${requestId}] Generating next turn suggestions with Gemini...`);

  const historyString = conversationHistory
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const suggestionPrompt = `
You are an AI assistant coaching a Financial Advisor. Based on the transcript below, generate exactly two distinct, concise, and actionable prompts the Advisor can say next.  

Requirements:
- Perspective: Advisor (not the client)
- Format: Raw JSON array of two strings, e.g. ["…","…"]
- No markdown, fences, labels, or extra text
- ≤15 words per suggestion
- Address the client’s last concern directly

Conversation History (Advisor → Client):
---
${historyString}
---
Client’s Last Response:
${aiLastResponse}

Now provide two next-step suggestions for the Advisor.
`;

  try {
    // Call Gemini Flash 2.5
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents: suggestionPrompt
    });

    const rawSuggestions = response.text?.trim() ?? "";
    console.log(`[${requestId}] Raw suggestions from Gemini: ${rawSuggestions}`);

    // Try JSON parse first
    try {
      const suggestionsArray = JSON.parse(rawSuggestions);
      if (Array.isArray(suggestionsArray) &&
          suggestionsArray.length === 2 &&
          suggestionsArray.every(s => typeof s === 'string')) {
        console.log(`[${requestId}] Parsed suggestions:`, suggestionsArray);
        return suggestionsArray;
      }
    } catch (e) {
      console.warn(`[${requestId}] JSON parse failed, falling back to line split`);
    }

    // Fallback: extract first two non-empty lines
    const lines = rawSuggestions
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0);

    if (lines.length >= 2) {
      return [lines[0], lines[1]];
    }

    console.warn(`[${requestId}] Could not parse suggestions, returning empty array.`);
    return [];
  } catch (error) {
    console.error(`[${requestId}] Error generating next turn suggestions with Gemini:`, error);
    return [];
  }
}

async function generateMainAiTextResponse(
  messages: Message[],
  intent: string,
  roleplayProfile: Persona | null,
  originalQuery: string,
  requestId: string,
  scenarioId?: string
): Promise<string> {
  console.log(`[${requestId}] Generating main AI text response with Gemini, scenario: ${scenarioId}. Messages count: ${messages.length}`);

  // 1. pick the system prompt as you already do --------
  // let systemPromptContent = "";
  // if (scenarioId === 'REFERRAL_ANNUAL_REVIEW') {
  //   systemPromptContent = PROMPTS.trainingReferralPrompt;
  // } else if (scenarioId === 'INSURANCE_REJECTION_HANDLING') {
  //   systemPromptContent = PROMPTS.trainingInsuranceRejectionPrompt;
  // } else {
  //   systemPromptContent = PROMPTS.trainingReferralPrompt;
  // }
  let systemPromptContent = "";
  if (roleplayProfile?.id == "LIANG_CHEN") {
    systemPromptContent = PERSONA_PROMPTS.LIANG_CHEN;
  } else if (roleplayProfile?.id == "ELEANOR_VANCE") {
    systemPromptContent = PERSONA_PROMPTS.ELEANOR_VANCE;
  } else if (roleplayProfile?.id == "ALEX_MILLER") {
    systemPromptContent = PERSONA_PROMPTS.ALEX_MILLER;
  } else {
    systemPromptContent = PERSONA_PROMPTS.LIANG_CHEN; // Default system prompt
  }

  // 2. build full prompt (system + conversation) -------
  // const fullPrompt = [
  //   { role: "system", content: systemPromptContent },
  //   ...messages
  // ].map(m => `${m.role}: ${m.content}`).join("\n");

  // 3. call Gemini & time it ---------------------------
  // try {
  //   const resp = await ai.models.generateContent({
  //     model: "gemini-2.5-flash-preview-05-20",
  //     contents: fullPrompt
  //   });
  //   const latencyMs = Date.now() - t0;
  //   console.log(`[${requestId}] Gemini response latency: ${latencyMs} ms`);

  //   const aiResponse = resp.text?.trim() || "";
  //   if (!aiResponse) throw new Error("Gemini returned empty response");
  //   console.log(`[${requestId}] Gemini main response: "${aiResponse.substring(0, 100)}..."`);
  //   return aiResponse;
  // } catch (err) {
  //   console.error(`[${requestId}] Error from Gemini:`, err);
  //   throw new Error("Failed to get main AI response (Gemini)");
  // }

  // 1. Separate out the last message
  const lastMsgObj = messages[messages.length - 1];
  const priorMsgs = messages.slice(0, -1);

  // 2. Create the chat with the earlier history, mapping roles
  const t0 = Date.now();
  let chat; // Declare chat outside the try block for broader scope

  try {
    console.log(`[${requestId}] Creating Gemini chat session...`);
    chat = ai.chats.create({
      model: "gemini-2.5-flash-preview-05-20",
      history: priorMsgs.map(m => ({
        role: m.role === "advisor" ? "user" : "model",
        parts: [{ text: m.content }]
      })),
      config: {
        systemInstruction: systemPromptContent
      }
    });
    console.log(`[${requestId}] Gemini chat session created.`);

    // 3. Send the very last message as the user’s new turn, mapping its role
    console.log(`[${requestId}] Sending last message to Gemini chat...`);
    const resp = await chat.sendMessage({
      message: lastMsgObj.content
    });

    const latencyMs = Date.now() - t0;
    console.log(`[${requestId}] Gemini chat response latency: ${latencyMs} ms`);

    const aiResponse = resp.text?.trim() || "";
    if (!aiResponse) {
      console.error(`[${requestId}] Gemini returned an empty response for chat.sendMessage.`);
      throw new Error("Gemini chat returned empty response");
    }

    console.log(`[${requestId}] Gemini chat main response: "${aiResponse.substring(0, 100)}..."`);
    return aiResponse;

  } catch (err: any) {
    console.error(`[${requestId}] Error during Gemini chat interaction:`, err);
    throw new Error(`Failed to get main AI response (Gemini chat): ${err.message || 'Unknown error'}`);
  }
}

async function convertTextToSpeech(text: string, requestId: string, voice: string): Promise<ReadableStream<Uint8Array>> {
  console.log(`[${requestId}] Converting text to speech using ElevenLabs...`);
  if (!ELEVENLABS_API_KEY) {
    console.error(`[${requestId}] ELEVENLABS_API_KEY is not set.`);
    throw new Error("TTS API key (ElevenLabs) not configured");
  }
  try {
    const audioStream = await generateSpeech(text, voice);
    console.log(`[${requestId}] ElevenLabs audio stream obtained.`);
    return audioStream;
  } catch (error) {
    console.error(`[${requestId}] Error converting text to speech with ElevenLabs:`, error);
    throw new Error("Failed to generate audio with ElevenLabs");
  }
}

async function handleAppointmentWorkflowInBackground(fullTranscript: string, roleplayProfile: Persona | null, requestId: string): Promise<void> {
  if (!roleplayProfile) {
    console.log(`[${requestId}] No persona profile, skipping appointment workflow.`);
    return;
  }
  console.log(`[${requestId}] Starting appointment workflow (background)...`);
  try {
    const appointmentDetails = await extractAppointmentDetails(groq, fullTranscript, requestId);
    if (appointmentDetails && (appointmentDetails.appointment_date || appointmentDetails.appointment_time)) {
      console.log(`[${requestId}] Appointment details extracted for WhatsApp:`, appointmentDetails);
      await sendWhatsAppConfirmation(appointmentDetails, roleplayProfile as WhatsAppProfile);
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
    
    if (input === 'START' && scenarioId) {
      console.log(`[${requestId}] Handling START_SESSION action for scenario ID: ${scenarioId} for persona: ${roleplayProfile?.name}`);
      const scenario = getScenarioDefinitionById(scenarioId);
      if (scenario && scenario.personaOpeningLine) {
        // Use the persona opening line as the AI response
        aiTextResponse = scenario.personaOpeningLine;
        effectiveTranscript = "SESSION_START"; // No actual user transcript for session start
        console.log(`[${requestId}] Using personaOpeningLine for START_SESSION: "${aiTextResponse.substring(0, 100)}..."`);
        allMessages.push({ role: "client", content: aiTextResponse });
      } else {
        console.error(`[${requestId}] Scenario or personaOpeningLine not found for ID: ${scenarioId}`);
        return NextResponse.json({ error: 'Failed to start session. Scenario details missing.' }, { status: 400 });
      }
    } else {
      // Generate AI response for normal conversation flow
      aiTextResponse = await generateMainAiTextResponse(allMessages, scenarioId!, roleplayProfile, input, requestId, scenarioId);
    }

    // Step 5: Generate Next Turn Suggestions
    let suggestionsPromise: Promise<string[]>;
    // We need to ensure `allMessages` here includes the user's latest input and `aiTextResponse` is the AI's reply to that.
    // The current `allMessages` in scope is from `parseIncomingRequest` which is user's input + history *before* AI's current response.
    // So, we form a temporary history for suggestion generation.
    const historyForSuggestions = [...allMessages, { role: "client" as const, content: aiTextResponse }];
    suggestionsPromise = generateNextTurnSuggestions(historyForSuggestions, aiTextResponse, requestId);

    // Step 6: Convert AI Text to Speech
    let elevenLabsVoiceIdToUse: string;
    if (roleplayProfile?.elevenLabsVoiceId) {
      elevenLabsVoiceIdToUse = roleplayProfile.elevenLabsVoiceId;
      console.log(`[${requestId}] Using voice ID from roleplayProfile: ${elevenLabsVoiceIdToUse}`);
    } else {
      const scenarioForVoice = scenarioId ? getScenarioDefinitionById(scenarioId) : undefined;
      if (scenarioForVoice?.defaultPersonaId) {
        const defaultPersona = getPersonaById(scenarioForVoice.defaultPersonaId);
        if (defaultPersona?.elevenLabsVoiceId) {
          elevenLabsVoiceIdToUse = defaultPersona.elevenLabsVoiceId;
          console.log(`[${requestId}] Using voice ID from scenario's default persona (${defaultPersona.id}): ${elevenLabsVoiceIdToUse}`);
        } else {
          elevenLabsVoiceIdToUse = 'ZyIwtt7dzBKVYuXxaRw7'; // Fallback (e.g., Liang Chen's voice)
          console.warn(`[${requestId}] Default persona (${defaultPersona?.id}) missing elevenLabsVoiceId. Falling back to default voice ID: ${elevenLabsVoiceIdToUse}`);
        }
      } else {
        elevenLabsVoiceIdToUse = 'ZyIwtt7dzBKVYuXxaRw7'; // Fallback (e.g., Liang Chen's voice)
        console.warn(`[${requestId}] No roleplayProfile or scenario default persona with voice ID. Falling back to default voice ID: ${elevenLabsVoiceIdToUse}`);
      }
    }
    const audioStream = await convertTextToSpeech(aiTextResponse, requestId, elevenLabsVoiceIdToUse);

    // Step 7: Stream Audio Response
    console.log(`[${requestId}] Streaming audio response to client.`);
    const suggestions = await suggestionsPromise;
    
    const headers: Record<string, string> = {
      "X-Transcript": encodeURIComponent(transcript),
      "X-Response": encodeURIComponent(aiTextResponse!),
      "Content-Type": "audio/mpeg",
    };

    if (suggestions.length > 0) {
      headers["X-Recommendations"] = JSON.stringify(suggestions);
      console.log(`[${requestId}] Added X-Recommendations header:`, suggestions);
    }

    return new Response(audioStream, {
      headers,
    });
  } catch (error: any) {
    console.error(`[${requestId}] CRITICAL ERROR in POST handler:`, error.message, error.stack);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}

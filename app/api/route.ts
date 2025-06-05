import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { PROMPTS } from '@/lib/prompt';
import { extractAppointmentDetails, sendWhatsAppConfirmation, roleplayProfile as WhatsAppProfile } from '@/lib/whatsappService';
import { generateSpeech } from '@/lib/elevenlabs';
import { Readable } from "stream";
import { getTranscript } from '@/lib/whisper';
import { scenarioDefinitions, getScenarioDefinitionById, ScenarioDefinition } from '@/lib/scenarios'; // Added for START_SESSION
import { Persona, getPersonaById } from '@/lib/personas';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

interface Message {
  role: "user" | "assistant" | "system";
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
  allMessages.push({ role: "user", content: input });

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

async function generateNextTurnSuggestions(conversationHistory: Message[], aiLastResponse: string, requestId: string): Promise<string[]> {
  console.log(`[${requestId}] Generating next turn suggestions...`);
  const historyString = conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n');

  const suggestionPrompt = `You are an AI assistant helping a Financial Advisor in a role-play conversation with a client.
The client's persona is Liang Chen. The Financial Advisor is the 'user'. The client (AI) is the 'assistant'.

Below is the conversation history up to the client's latest response.
Your task is to provide two distinct, concise, and actionable suggestions for what the Financial Advisor (user) could say next to continue the conversation effectively.
The suggestions should be from the Financial Advisor's perspective and be suitable for quick selection (e.g., button text).
Keep the suggestions short, ideally under 15 words each.

Return your suggestions ONLY as a JSON array of two strings. For example:
["That's a good point, let's explore that.", "What are your thoughts on this alternative?"]

Conversation History (User is Financial Advisor, Assistant is Liang Chen):
---
${historyString}
---
Client's (Liang Chen's) Last Response:
${aiLastResponse}
---
Provide two distinct suggestions for the Financial Advisor's next response in JSON array format:`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are an AI assistant that provides response suggestions for a financial advisor." },
        { role: "user", content: suggestionPrompt }
      ],
      model: "meta-llama/llama-4-maverick-17b-128e-instruct", // Or a model suitable for this task
      temperature: 0.7,
      max_tokens: 100,
      stop: ["\n\n"],
    });

    const rawSuggestions = chatCompletion.choices[0]?.message?.content?.trim();
    console.log(`[${requestId}] Raw suggestions from LLM: ${rawSuggestions}`);

    if (rawSuggestions) {
      try {
        const suggestionsArray = JSON.parse(rawSuggestions);
        if (Array.isArray(suggestionsArray) && suggestionsArray.length === 2 && suggestionsArray.every(s => typeof s === 'string')) {
          console.log(`[${requestId}] Parsed suggestions:`, suggestionsArray);
          return suggestionsArray;
        }
      } catch (e) {
        console.error(`[${requestId}] Error parsing suggestions JSON: ${rawSuggestions}`, e);
        // Fallback: Try to extract from a numbered list if JSON parsing fails
        const lines = rawSuggestions.split('\n').map(line => line.replace(/^\d+\.\s*/, '').trim()).filter(line => line.length > 0);
        if (lines.length >= 2) return [lines[0], lines[1]];
      }
    }
    console.warn(`[${requestId}] Could not parse suggestions, returning empty array.`);
    return []; // Return empty array if parsing fails or no suggestions
  } catch (error) {
    console.error(`[${requestId}] Error generating next turn suggestions:`, error);
    return []; // Return empty array on error
  }
}

async function generateMainAiTextResponse(messages: Message[], intent: string, roleplayProfile: Persona | null, originalQuery: string, requestId: string, scenarioId?: string): Promise<string> {
  console.log(`[${requestId}] Generating main AI text response for scenario: ${scenarioId}. Messages count: ${messages.length}`);
  let systemPromptContent = "";
  const callerInfo = buildCallerInfoString(roleplayProfile);

  if (scenarioId) {
    console.log(`[${requestId}] Scenario ID: ${scenarioId}`);

    if (scenarioId === 'REFERRAL_ANNUAL_REVIEW') {
      systemPromptContent = PROMPTS.trainingReferralPrompt;
    } else if (scenarioId === 'INSURANCE_REJECTION_HANDLING') {
      systemPromptContent = PROMPTS.trainingInsuranceRejectionPrompt;
    } else {
      systemPromptContent = PROMPTS.trainingReferralPrompt;
    }
    
  } else {
    // If no scenarioId is provided, perhaps use a default prompt or handle error
    console.warn(`[${requestId}] No scenarioId provided. Using referral prompt as default.`);
    systemPromptContent = PROMPTS.trainingReferralPrompt; // Default if no scenario context
  }

  if (!systemPromptContent) {
    console.error(`[${requestId}] System prompt content is empty. This should not happen.`);
    // Fallback to a very basic default to prevent errors, though this indicates a logic flaw.
    systemPromptContent = "You are a helpful AI assistant."; 
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
      console.log(`[${requestId}] Handling START_SESSION action for scenario ID: ${scenarioId}`);
      const scenario = getScenarioDefinitionById(scenarioId);
      if (scenario && scenario.personaOpeningLine) {
        // Use the persona opening line as the AI response
        aiTextResponse = scenario.personaOpeningLine;
        effectiveTranscript = "SESSION_START"; // No actual user transcript for session start
        console.log(`[${requestId}] Using personaOpeningLine for START_SESSION: "${aiTextResponse.substring(0, 100)}..."`);
        allMessages.push({ role: "assistant", content: aiTextResponse });
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
    const historyForSuggestions = [...allMessages, { role: "assistant" as const, content: aiTextResponse }];
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

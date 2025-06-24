import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getTranscript } from '@/lib/whisper';
import { getScenarioDefinitionById,  } from '@/lib/scenarios'; // Added for START_SESSION
import { Persona, getPersonaById } from '@/lib/personas';
import { GoogleGenAI } from "@google/genai";
import { PERSONA_PROMPTS } from "@/lib/prompt/persona";
import { generateSpeech } from '@/lib/elevenlabs';
import { generateSpeechMinimax } from "@/lib/minimax";

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
  difficultyProfile?: string | null;
  scenarioId?: string;
  sessionId?: string; // Add sessionId to the interface
}

async function parseIncomingRequest(
  req: Request,
  requestId: string
): Promise<ParsedRequestData> {
  console.log(`[${requestId}] Parsing incoming request...`);
  const formData = await req.formData();

  // 1.5. `sessionId`
  const sessionId = (formData.get("sessionId") as string | null) || undefined;
  if (sessionId) {
    console.log(`[${requestId}] Received sessionId: ${sessionId}`);
  }

  // 1. `input`
  let input: any = formData.get("input");
  if (!input) {
    console.error(`[${requestId}] No input found in formData.`);
    throw new Error("Input is required");
  }

  // 2. `history`
  const historyString = formData.get("message") as string | null;
  let history: Message[] = [];
  if (historyString) {
    try {
      history = JSON.parse(historyString);
    } catch (e) {
      console.warn(
        `[${requestId}] Error parsing history JSON, proceeding with empty history:`,
        e
      );
    }
  }

  // 3. `roleplayProfile`
  const roleplayProfileString = formData.get(
    "roleplayProfile"
  ) as string | null;
  let roleplayProfile: Persona | null = null;
  if (roleplayProfileString) {
    try {
      roleplayProfile = JSON.parse(roleplayProfileString) as Persona;
      console.log(
        `[${requestId}] Parsed persona profile for: ${roleplayProfile.name}`
      );
    } catch (e) {
      console.warn(
        `[${requestId}] Error parsing persona profile JSON, proceeding without profile:`,
        e
      );
    }
  }

  // 4. `scenarioId`
  const scenarioString = (formData.get("scenario") as string | null) || "";
  let scenarioId = "";
  try {
    scenarioId = JSON.parse(scenarioString)?.id || "";
    console.log(`[${requestId}] Scenario ID: ${scenarioId}`);
  } catch (e) {
    console.error(`[${requestId}] Error parsing scenario ID:`, e);
  }

  // 5. `difficultyProfile` must be a non-empty string
  const diffRaw = formData.get("difficultyProfile");
  let difficultyProfile: string | null = null;
  if (typeof diffRaw === "string" && diffRaw.trim().length > 0) {
    difficultyProfile = diffRaw;
  } else {
    console.error(
      `[${requestId}] difficultyProfile missing or invalid in formData.`
    );
    throw new Error("difficultyProfile is required");
  }

  // 6. If `input` is a File, run STT
  let transcript: string = input;
  if (input instanceof File) {
    transcript = (await getTranscript(input)) ?? "";
    input = transcript;
  }

  // 7. Build `allMessages`
  const allMessages: Message[] = [...history, { role: "advisor", content: input }];

  return {
    input,
    history,
    roleplayProfile,
    transcript,
    allMessages,
    difficultyProfile,
    scenarioId,
    sessionId, // Include sessionId in the returned object
  };
}

async function generateMainAiTextResponse(
  messages: Message[],
  roleplayProfile: Persona | null,
  requestId: string,
  difficultyProfile: string,
  scenarioId: string,
): Promise<string> {
  console.log(`[${requestId}] Generating main AI text response with Gemini, scenario: ${scenarioId}. Messages count: ${messages.length}`);

  let roleplayProfilePrompt = 
  PERSONA_PROMPTS[roleplayProfile?.id ?? ""] || PERSONA_PROMPTS.LIANG_CHEN;
  console.log(`[${requestId}] Roleplay profile prompt: ${roleplayProfilePrompt}`.substring(0, 100));

  // Now append the profile with the difficulty profile
  let systemPromptContent = `
  ${roleplayProfilePrompt.trim()}

  ## Difficulty Profile:
  ${difficultyProfile.trim()}

  ## Response-Length & Brevity Rules

  1. **Mirror Turn-Length**  
    - If the user’s last turn is very short (< 10 words), keep your reply under 2 sentences.  
    - If the user speaks at medium length (10–30 words), limit your reply to 3–4 sentences.  
    - Only go beyond 4 sentences when introducing genuinely new information or critical context.

  2. **Balanced Turn-Taking**  
    - Don’t overwhelm a short user prompt with a long monologue.  
    - Match your response density to the user’s: brief in response to brief, more expansive when the user asks “why” or “how.”

  3. **Human Tone**  
    - Write as you would speak in a natural conversation—avoid overly formal or academic phrasing.  
    - Use contractions and everyday language.

  > **Remember:** brevity isn’t brevity’s enemy—be clear and concise, elaborating *only* when it truly adds value.  

  ## End-Session Phrases  
  When you decide the conversation is wrapping up (e.g. client has no more questions), choose exactly one of these to close the call naturally:

  - “Alright, see you next time”  
  - “Great chatting—see you next time.”  
  - “That covers everything—talk soon.”  
  - “Thanks. Have a good day!” 

  `;

  // Using Gemini for responses
  // 1. Separate out the last message
  const lastMsgObj = messages[messages.length - 1];
  const priorMsgs = messages.slice(0, -1);

  // 2. Create the chat with the earlier history, mapping roles
  const t0 = Date.now();
  let chat; // Declare chat outside the try block for broader scope

  try {
    console.log(`[${requestId}] Creating Gemini chat session...`);
    chat = ai.chats.create({
      // model: "gemini-2.5-flash-lite-preview-06-17",
      model: "gemini-2.5-flash",
      // model: "gemini-2.5-flash-preview-05-20",
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

export async function POST(req: Request) {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`\n--- [${requestId}] Received POST /api/route ---`);

  try {
    // 1) Parse the request
    const {
      input,
      roleplayProfile,
      transcript,
      allMessages,
      difficultyProfile,
      scenarioId,
      sessionId, // Extract sessionId
    } = await parseIncomingRequest(req, requestId);

    let aiTextResponse: string;

    if (input === "START" && scenarioId) {
      // Always generate a fresh profile on session start

      // Use scenario opening line for START
      const scenario = getScenarioDefinitionById(scenarioId);
      if (scenario?.personaOpeningLine) {
        aiTextResponse = scenario.personaOpeningLine;
        allMessages.push({ role: "client", content: aiTextResponse });
      } else {
        console.error(
          `[${requestId}] Scenario or personaOpeningLine not found for ID: ${scenarioId}`
        );
        return NextResponse.json(
          { error: 'Failed to start session. Scenario details missing.' },
          { status: 400 }
        );
      }
    } else {
      // If difficulty profile is not provided, throw error
      if (!difficultyProfile) {
        console.warn(
          `[${requestId}] No difficulty profile provided.`
        );
        throw new Error(
          "No difficulty profile found. Please start a new session."
        );
      }

      // Step 2: Generate main AI text response
      aiTextResponse = await generateMainAiTextResponse(
        allMessages,
        roleplayProfile,
        requestId,
        difficultyProfile,
        scenarioId!
      );
    }

    // Step 3: Send AI Text to ElevenLabs to generate Speech
    const voiceId =
      roleplayProfile?.elevenLabsVoiceId ||
      getPersonaById(getScenarioDefinitionById(scenarioId!)!.personas[0])
        ?.elevenLabsVoiceId ||
      'ZyIwtt7dzBKVYuXxaRw7';
    // Pass sessionId to convertTextToSpeech
    // Stream audio directly to Digital Human; no stream returned here
    // Don't wait for speech generation to complete. Stream audio in the background.

    // Using ElevenLabs
    generateSpeech(
      sessionId!,
      aiTextResponse,
      voiceId
    );

    // // Using MiniMax
    // generateSpeechMinimax(
    //   sessionId!,
    //   aiTextResponse,
    //   'English_radiant_girl'
    // );

    // Step 4: Respond to client (audio already streaming to Digital Human)
    console.log(`[${requestId}] Responding to client (audio handled separately).`);
    const headers: Record<string, string> = {
      "X-Transcript": encodeURIComponent(transcript),
      "X-Response": encodeURIComponent(aiTextResponse!),
    };

    return NextResponse.json({ success: true }, { headers });
  } catch (error: any) {
    console.error(
      `[${requestId}] CRITICAL ERROR in POST handler:`,
      error.message,
      error.stack
    );
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
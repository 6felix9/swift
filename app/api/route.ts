import { NextResponse } from "next/server";
import { getTranscript } from '@/lib/whisper';
import { getScenarioDefinitionById,  } from '@/lib/scenarios'; // Added for START_SESSION
import { Persona, getPersonaById } from '@/lib/personas';
import { generateSpeech } from '@/lib/elevenlabs';
import { generateMainAiTextResponse } from '@/lib/aiResponseService';

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
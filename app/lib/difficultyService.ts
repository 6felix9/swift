import { Difficulty } from "@/lib/difficultyTypes";
import { DIFFICULTY_PROFILE_TEMPLATES } from "@/lib/prompt/difficulty-profiles";
import { GoogleGenAI } from "@google/genai";

// Testing Gemini flash 2.5 model for evaluation
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function callGeminiFlashLite(prompt: string, requestId: string): Promise<string> {
  console.log(`[${requestId}] Attempting difficulty profile generation with Gemini Flash Lite`);
  const t0 = Date.now();
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: [prompt],
  });

  const latencyMs = Date.now() - t0;
  console.log(`[${requestId}] Gemini Flash Lite difficulty profile response latency: ${latencyMs} ms`);

  const rawProfile = response.text?.trim() ?? "";
  if (!rawProfile) {
    throw new Error("Gemini Flash Lite returned empty response");
  }
  
  return rawProfile;
}

async function callGeminiFlash(prompt: string, requestId: string): Promise<string> {
  console.log(`[${requestId}] Attempting difficulty profile generation with Gemini Flash`);
  const t0 = Date.now();
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [prompt],
  });

  const latencyMs = Date.now() - t0;
  console.log(`[${requestId}] Gemini Flash difficulty profile response latency: ${latencyMs} ms`);

  const rawProfile = response.text?.trim() ?? "";
  if (!rawProfile) {
    throw new Error("Gemini Flash returned empty response");
  }
  
  return rawProfile;
}

function isValidDifficultyProfile(rawProfile: string, requestId: string): boolean {
  if (!rawProfile || typeof rawProfile !== 'string') {
    return false;
  }

  const trimmed = rawProfile.trim();
  
  // Must have some content
  if (trimmed.length === 0) {
    return false;
  }

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(trimmed);
    
    // Must be an object
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      return false;
    }
    
    // Must have required top-level keys
    const requiredKeys = ['difficulty', 'relationalDynamics', 'psychologicalState', 'situationalContext', 'coreVariables'];
    const hasAllKeys = requiredKeys.every(key => key in parsed);
    
    if (!hasAllKeys) {
      console.warn(`[${requestId}] Difficulty profile missing required keys`);
      return false;
    }
    
    console.log(`[${requestId}] Difficulty profile parsed as valid JSON`);
    return true;
    
  } catch (parseError) {
    console.warn(`[${requestId}] Difficulty profile JSON parse error:`, parseError);
    return false;
  }
}

async function tryGeminiProviders(prompt: string, requestId: string): Promise<string> {
  const providers = [
    { name: "Gemini Flash Lite", fn: () => callGeminiFlashLite(prompt, requestId) },
    { name: "Gemini Flash", fn: () => callGeminiFlash(prompt, requestId) }
  ];

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      console.log(`[${requestId}] Trying ${provider.name} for difficulty profile generation`);
      const rawResponse = await provider.fn();
      
      // Sanitize response
      const sanitized = rawResponse
        .replace(/^```(?:\w+)?\s*/g, "")
        .replace(/```$/, "")
        .trim();
      
      // Validate response before accepting it
      if (isValidDifficultyProfile(sanitized, requestId)) {
        console.log(`[${requestId}] ${provider.name} returned valid difficulty profile`);
        return sanitized;
      } else {
        console.warn(`[${requestId}] ${provider.name} returned invalid difficulty profile, trying next provider`);
        errors.push(`${provider.name}: Invalid difficulty profile format`);
        continue; // Try next provider
      }
    } catch (error: any) {
      console.error(`[${requestId}] ${provider.name} failed:`, error.message);
      errors.push(`${provider.name}: ${error.message}`);
      continue; // Try next provider
    }
  }

  throw new Error(`Difficulty profile generation failed with all models: ${errors.join(" → ")}`);
}

export async function generateDifficultyProfile(
  difficulty: Difficulty,
  scenarioId: string,
  requestId: string
): Promise<string> {
  console.log(
    `[${requestId}] Generating difficulty profile for scenario ${scenarioId} at difficulty=${difficulty}`
  );

  // 1) Get the scenario-specific template and inject the difficulty
  const templateData = DIFFICULTY_PROFILE_TEMPLATES[scenarioId] || DIFFICULTY_PROFILE_TEMPLATES['GENERIC'];
  const prompt = templateData.template.replace(
    '<<DIFFICULTY>>',
    difficulty
  );

  try {
    const sanitizedProfile = await tryGeminiProviders(prompt, requestId);
    
    console.log(
      `[${requestId}] Generated difficulty profile:\n${sanitizedProfile.substring(0, 100)}...`
    );

    return sanitizedProfile;
  } catch (err) {
    console.error(
      `[${requestId}] Error generating difficulty profile:`,
      err
    );
    throw err;
  }
}


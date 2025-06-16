import { Difficulty } from "@/lib/difficultyTypes";
import { difficultyProfileInstructions } from "@/lib/prompt/difficulty-profile-template";
import { GoogleGenAI } from "@google/genai";

// Testing Gemini flash 2.5 model for evaluation
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateDifficultyProfile(
  difficulty: Difficulty,
  scenarioId: string,
  requestId: string
): Promise<string> {
  console.log(
    `[${requestId}] Generating difficulty profile for scenario ${scenarioId} at difficulty=${difficulty}`
  );

  // 1) Inject the difficulty into the prompt
  const prompt = difficultyProfileInstructions.replace(
    '<<DIFFICULTY>>',
    difficulty
  );

  try {
    // 2) Call Gemini
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents: [prompt],
    });

    const rawProfile = response.text?.trim() ?? "";
    let sanitized = rawProfile
    // remove any triple-backtick fence with optional language tag
    .replace(/^```(?:\w+)?\s*/g, "")
    .replace(/```$/, "")
    .trim();
    console.log(
      `[${requestId}] Sanitized difficulty profile:\n${sanitized}`
    );

    // 3) Validate JSON
    try {
      JSON.parse(sanitized);
      console.log(`[${requestId}] Difficulty profile parsed as valid JSON.`);
    } catch (e) {
      console.error(
        `[${requestId}] Difficulty profile JSON parse error:`,
        e
      );
    }

    // 4) Return the raw JSON string
    return sanitized;
  } catch (err) {
    console.error(
      `[${requestId}] Error generating difficulty profile:`,
      err
    );
    throw err;
  }
}


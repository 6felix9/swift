import { GoogleGenAI } from "@google/genai";
import { Persona } from "./personas";
import { EvaluationResponse } from "./evaluationTypes";
import Groq from "groq-sdk";

// Lazy initialization of AI clients
let geminiClient: GoogleGenAI | null = null;
let groqClient: Groq | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

function getGroqClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

interface Message {
  role: "advisor" | "client" | "system";
  content: string;
}

export async function generateCallEvaluation(
  messages: Message[],
  roleplayProfile: Persona | null,
  evaluationPrompt: string, // This is the rubric text
  scenarioContext: string
): Promise<EvaluationResponse> {
  console.log("[EvaluationService] Generating call evaluation...");
  // For speed testing
  const startTime = Date.now(); // record start
  console.log("[EvaluationService] Scenario Context:", scenarioContext);
  console.log(
    "[EvaluationService] Evaluation Prompt (first 100 chars):",
    evaluationPrompt.substring(0, 100)
  );

  // Construct the system message prompt
  const systemMessage = `
You are an expert call analyst. Evaluate the following call transcript using the rubric supplied in “## Evaluation Criteria”. Your output must be a single valid JSON object.

## Scenario Context:
${scenarioContext}

## Evaluation Criteria:
${evaluationPrompt}

## Client Profile:
Name: ${roleplayProfile?.name || "N/A"}
Details: ${roleplayProfile?.profileDetails || "N/A"}

## Instructions
Analyze the transcript strictly against the evaluation criteria above.  
Populate every field in the JSON schema above.  
All numeric fields (score, subtotal, totalScore, maxPossibleScore) must be numbers, **not strings**.  
Your response must be only the JSON object, with no additional text, commentary, or explanations.
`;

  // Build the full text prompt
  const transcript = messages
    .filter((msg) => msg.role === "advisor" || msg.role === "client")
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n");

  const fullPrompt = `${systemMessage}\n\n${transcript}`;

  // Helper function to process LLM response
  const processLLMResponse = (raw: string | undefined | null): EvaluationResponse => {
    if (!raw) {
      console.error("[EvaluationService] No content in LLM response");
      throw new Error("LLM response was empty.");
    }
    
    console.log(
      "[EvaluationService] Raw LLM response (first 500 chars):",
      raw.substring(0, 500)
    );

    // Clean any markdown fences
    const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
    
    try {
      const evaluation: EvaluationResponse = JSON.parse(cleaned);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[EvaluationService] Evaluation completed in ${elapsed}s`);
      console.log("[EvaluationService] Evaluation JSON parsed successfully.");
      return evaluation;
    } catch (parseError) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[EvaluationService] Evaluation failed after ${elapsed}s`);
      console.error("[EvaluationService] Error parsing LLM JSON response:", parseError);
      console.error("[EvaluationService] Failing LLM response snippet:", raw.substring(0, 1000));
      throw new Error("Failed to parse evaluation JSON from LLM. The response was not valid JSON.");
    }
  };

  // Try with Gemini first
  try {
    const response = await getGeminiClient().models.generateContent({
      // model: "gemini-2.5-flash",
      model: "gemini-2.5-pro",
      contents: fullPrompt,
    });
    
    return processLLMResponse(response.text);
  } catch (error: any) {
    // Fall back to Groq if Gemini fails
    console.error("[EvaluationService] Error generating evaluation with Gemini:", error);
    console.log("[EvaluationService] Falling back to Groq model");

    try {
      const response = await getGroqClient().chat.completions.create({
        model: "qwen-qwq-32b",
        messages: [{ role: "system", content: fullPrompt }],
        stream: false,
        reasoning_format: "hidden",
        response_format: { type: "json_object" },
      });

      return processLLMResponse(response.choices[0].message.content);
    } catch (groqError: any) {
      console.error("[EvaluationService] Error generating evaluation with Groq:", groqError);
      throw groqError;
    }
  }
}

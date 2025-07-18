import { GoogleGenAI } from "@google/genai";
import { Persona } from "./personas";
import { EvaluationResponse } from "./evaluationTypes";
import { getScenarioDefinitionById } from "./scenarios";
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
  role: string; // Dynamic role based on scenario
  content: string;
}

function buildSystemPrompt(
  scenarioContext: string,
  evaluationPrompt: string,
  roleplayProfile: Persona | null
): string {
  return `
You are an expert call analyst. Evaluate the following call transcript using the rubric supplied in "## Evaluation Criteria". Your output must be a single valid JSON object.

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
}

function buildTranscript(messages: Message[], scenarioId?: string): string {
  // Get role names directly from scenario
  const scenario = scenarioId ? getScenarioDefinitionById(scenarioId) : null;
  const userRole = scenario?.userRole || "advisor";
  const personaRole = scenario?.personaRole || "client";
  
  return messages
    .filter((msg) => {
      // Include only user and persona messages, exclude system messages
      return msg.role === userRole || msg.role === personaRole;
    })
    .map((msg) => {
      const displayRole = msg.role === userRole ? userRole : personaRole;
      return `${displayRole}: ${msg.content}`;
    })
    .join("\n");
}

function processLLMResponse(raw: string | undefined | null): EvaluationResponse {
  if (!raw) {
    console.error("[EvaluationService] No content in LLM response");
    throw new Error("LLM response was empty.");
  }

  const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
  
  try {
    const evaluation: EvaluationResponse = JSON.parse(cleaned);
    return evaluation;
  } catch (parseError) {
    console.error("[EvaluationService] JSON parse error:", parseError);
    throw new Error("Failed to parse evaluation JSON from LLM. The response was not valid JSON.");
  }
}

async function callGeminiPro(fullPrompt: string): Promise<string> {
  const response = await getGeminiClient().models.generateContent({
    model: "gemini-2.5-pro",
    contents: fullPrompt,
  });
  return response.text || "";
}

async function callGeminiFlash(fullPrompt: string): Promise<string> {
  const response = await getGeminiClient().models.generateContent({
    model: "gemini-2.5-flash",
    contents: fullPrompt,
  });
  return response.text || "";
}

async function callGroq(fullPrompt: string): Promise<string> {
  const response = await getGroqClient().chat.completions.create({
    model: "meta-llama/llama-4-maverick-17b-128e-instruct",
    messages: [{ role: "system", content: fullPrompt }],
    stream: false,
    response_format: { type: "json_object" },
  });
  return response.choices[0].message.content || "";
}

async function tryAIProviders(fullPrompt: string): Promise<string> {
  const providers = [
    { name: "Gemini 2.5 Pro", fn: callGeminiPro },
    { name: "Gemini 2.5 Flash", fn: callGeminiFlash },
    { name: "Groq", fn: callGroq },
  ];

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      console.log(`[EvaluationService] Attempting evaluation with ${provider.name}`);
      return await provider.fn(fullPrompt);
    } catch (error: any) {
      console.error(`[EvaluationService] ${provider.name} failed:`, error.message);
      errors.push(`${provider.name}: ${error.message}`);
    }
  }

  throw new Error(`Evaluation failed with all models: ${errors.join(" → ")}`);
}

export async function generateCallEvaluation(
  messages: Message[],
  roleplayProfile: Persona | null,
  evaluationPrompt: string,
  scenarioContext: string,
  scenarioId?: string
): Promise<EvaluationResponse> {
  console.log(`[EvaluationService] Generating call evaluation for scenario: ${scenarioId || 'unknown'}...`);
  const startTime = Date.now();

  const systemMessage = buildSystemPrompt(scenarioContext, evaluationPrompt, roleplayProfile);
  const transcript = buildTranscript(messages, scenarioId);
  const fullPrompt = `${systemMessage}\n\n${transcript}`;

  const rawResponse = await tryAIProviders(fullPrompt);
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[EvaluationService] Evaluation completed in ${elapsed}s`);
  
  return processLLMResponse(rawResponse);
}
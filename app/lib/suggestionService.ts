import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { getSuggestionPromptBuilder } from "@/lib/prompt/suggestions";

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

export interface Message {
  role: "advisor" | "client" | "system";
  content: string;
}

function buildSuggestionPrompt(
  messages: Message[],
  aiLastResponse: string,
  scenarioId: string
): string {
  const promptBuilder = getSuggestionPromptBuilder(scenarioId);
  return promptBuilder.buildPrompt(messages, aiLastResponse);
}

function isValidJSONArray(rawResponse: string): boolean {
  if (!rawResponse || typeof rawResponse !== 'string') {
    return false;
  }

  const trimmed = rawResponse.trim();
  
  // Must have some content
  if (trimmed.length === 0) {
    return false;
  }

  // Should not contain markdown artifacts
  if (trimmed.includes('```') || trimmed.includes('json') || trimmed.includes('JSON')) {
    return false;
  }

  // Should not be obviously an error message
  if (trimmed.toLowerCase().includes('error') || trimmed.toLowerCase().includes('failed')) {
    return false;
  }

  // Try to parse as JSON array
  try {
    const parsed = JSON.parse(trimmed);
    
    // Must be an array
    if (!Array.isArray(parsed)) {
      return false;
    }
    
    // Must have exactly 2 elements
    if (parsed.length !== 2) {
      return false;
    }
    
    // Both elements must be strings
    if (!parsed.every(item => typeof item === 'string')) {
      return false;
    }
    
    // Validate each suggestion
    return parsed.every(suggestion => isValidSuggestion(suggestion));
    
  } catch (parseError) {
    return false;
  }
}

function isValidSuggestion(suggestion: string): boolean {
  if (!suggestion || typeof suggestion !== 'string') {
    return false;
  }

  const trimmed = suggestion.trim();
  
  // Reject empty or whitespace-only suggestions
  if (trimmed.length === 0) {
    return false;
  }

  // Reject suggestions containing markdown artifacts
  if (trimmed.includes('```') || trimmed.includes('json') || trimmed.includes('JSON')) {
    return false;
  }

  // Reject suggestions with technical artifacts or formatting
  // Allow quotes at the start, but reject obvious JSON/array structures
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return false;
  }
  
  // Only reject quotes if they look like JSON string artifacts (e.g., standalone quoted strings)
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.includes('",') || trimmed === '""') {
    return false;
  }

  // Reject suggestions that are just punctuation or symbols
  if (/^[^a-zA-Z]*$/.test(trimmed)) {
    return false;
  }

  // Validate word count (≤18 words as specified in prompt)
  const wordCount = trimmed.split(/\s+/).filter(word => word.length > 0).length;
  if (wordCount > 18) {
    return false;
  }

  // Reject suggestions that are too short to be meaningful
  if (wordCount < 3) {
    return false;
  }

  return true;
}

function processSuggestionResponse(rawText: string | undefined | null, requestId: string): string[] {
  if (!rawText) {
    console.warn(`[${requestId}] FINAL VALIDATION: No content in suggestion response`);
    return [];
  }

  const cleaned = rawText.trim();
  
  // Strict JSON-only processing
  try {
    const suggestionsArray = JSON.parse(cleaned);
    
    // Final validation should pass since we already validated in provider selection
    if (Array.isArray(suggestionsArray) && suggestionsArray.length === 2) {
      console.log(`[${requestId}] FINAL VALIDATION: Successfully parsed ${suggestionsArray.length} valid suggestions:`, suggestionsArray);
      return suggestionsArray;
    }
    
  } catch (parseError) {
    console.warn(`[${requestId}] FINAL VALIDATION: JSON parse failed, returning empty array`);
  }
  
  console.warn(`[${requestId}] FINAL VALIDATION: Invalid response format, returning empty array`);
  return [];
}

async function callGeminiFlash(fullPrompt: string): Promise<string> {
  const response = await getGeminiClient().models.generateContent({
    model: "gemini-2.5-flash",
    contents: fullPrompt,
  });
  return response.text || "";
}

async function callGeminiFlashLite(fullPrompt: string): Promise<string> {
  const response = await getGeminiClient().models.generateContent({
    model: "gemini-2.5-flash-lite-preview-06-17",
    contents: fullPrompt,
  });
  return response.text || "";
}

async function callGroq(fullPrompt: string): Promise<string> {
  const response = await getGroqClient().chat.completions.create({
    model: "meta-llama/llama-4-maverick-17b-128e-instruct",
    messages: [{ role: "system", content: fullPrompt }],
    stream: false,
  });
  return response.choices[0].message.content || "";
}

async function tryAIProviders(fullPrompt: string, requestId: string): Promise<string> {
  const providers = [
    { name: "Gemini 2.5 Flash", fn: callGeminiFlash },
    { name: "Gemini 2.5 Flash Lite", fn: callGeminiFlashLite },
    { name: "Groq", fn: callGroq },
  ];

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      console.log(`[${requestId}] Attempting suggestion generation with ${provider.name}`);
      const rawResponse = await provider.fn(fullPrompt);
      
      // Strict validation - must be valid JSON array format
      if (isValidJSONArray(rawResponse)) {
        console.log(`[${requestId}] ${provider.name} returned valid JSON array format`);
        return rawResponse;
      } else {
        console.warn(`[${requestId}] ${provider.name} returned invalid JSON array format, trying next provider`);
        errors.push(`${provider.name}: Invalid JSON array format`);
        continue; // Try next provider
      }
    } catch (error: any) {
      console.error(`[${requestId}] ${provider.name} failed:`, error.message);
      errors.push(`${provider.name}: ${error.message}`);
    }
  }

  throw new Error(`Suggestion generation failed with all models: ${errors.join(" → ")}`);
}

export async function generateNextTurnSuggestions(
  messages: Message[],
  aiLastResponse: string,
  requestId: string,
  scenarioId: string = 'REFERRAL_ANNUAL_REVIEW'
): Promise<string[]> {
  console.log(`[${requestId}] Generating next turn suggestions...`);
  const startTime = Date.now();

  const fullPrompt = buildSuggestionPrompt(messages, aiLastResponse, scenarioId);
  
  try {
    const rawResponse = await tryAIProviders(fullPrompt, requestId);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[${requestId}] Suggestion generation completed in ${elapsed}s`);
    
    return processSuggestionResponse(rawResponse, requestId);
  } catch (error: any) {
    console.error(`[${requestId}] Error generating suggestions:`, error);
    return [];
  }
}
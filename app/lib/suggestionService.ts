import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { SUGGESTION_PROMPTS } from "@/lib/prompt/suggestions";
import { getScenarioDefinitionById } from "./scenarios";

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
  role: string; // Dynamic role based on scenario
  content: string;
}

interface ConversationPrompt {
  conversationPrompt: string;
  systemPrompt?: string;
}

function buildConversationPrompt(
  messages: Message[], 
  systemPrompt?: string, 
  includeSystemInPrompt: boolean = false,
  scenarioId?: string
): ConversationPrompt {
  // Get role names directly from scenario
  const scenario = scenarioId ? getScenarioDefinitionById(scenarioId) : null;
  const userRole = scenario?.userRole || "Advisor";
  const personaRole = scenario?.personaRole || "Client";
  
  let conversationPrompt = "Here is the transcript so far:\n";
  
  // Build conversation history with scenario-specific roles
  for (const message of messages) {
    const displayRole = message.role === userRole ? userRole : personaRole;
    conversationPrompt += `${displayRole}: ${message.content}\n`;
  }
  
  // Extract the latest persona message for emphasis
  const latestPersonaMessage = messages
    .filter(msg => msg.role === personaRole)
    .slice(-1)[0];
  
  if (latestPersonaMessage) {
    conversationPrompt += `\nThe ${personaRole.toLowerCase()} said:\n${latestPersonaMessage.content}\n`;
  }
  
  // Add clear task instruction with dynamic role
  conversationPrompt += `\nSuggests what the ${userRole.toLowerCase()} should say next`;

  // Handle system prompt integration for different providers
  if (includeSystemInPrompt && systemPrompt) {
    // For Groq: prepend system prompt to conversation prompt
    conversationPrompt = `${systemPrompt}\n\n${conversationPrompt}`;
    return { conversationPrompt };
  } else {
    // For Gemini: keep system prompt separate
    return { conversationPrompt, systemPrompt };
  }
}

function isValidJSONArray(rawResponse: string, requestId?: string): boolean {
  const debug = true; // Enable debug logging
  
  if (!rawResponse || typeof rawResponse !== 'string') {
    if (debug) console.log(`[${requestId}] JSON validation failed: Not a string`);
    return false;
  }

  const trimmed = rawResponse.trim();
  
  // Must have some content
  if (trimmed.length === 0) {
    if (debug) console.log(`[${requestId}] JSON validation failed: Empty content`);
    return false;
  }

  // Try to parse as JSON array
  try {
    const parsed = JSON.parse(trimmed);
    
    // Must be an array
    if (!Array.isArray(parsed)) {
      if (debug) console.log(`[${requestId}] JSON validation failed: Not an array`);
      return false;
    }
    
    // Must have exactly 2 elements
    if (parsed.length !== 2) {
      if (debug) console.log(`[${requestId}] JSON validation failed: Array length ${parsed.length} !== 2`);
      return false;
    }
    
    // Both elements must be strings
    if (!parsed.every(item => typeof item === 'string')) {
      if (debug) console.log(`[${requestId}] JSON validation failed: Not all elements are strings`);
      return false;
    }
    
    // Validate each suggestion with debug logging
    if (debug) console.log(`[${requestId}] Validating individual suggestions:`);
    const isValid = parsed.every((suggestion, index) => {
      if (debug) console.log(`[${requestId}] Validating suggestion ${index + 1}:`);
      return isValidSuggestion(suggestion, debug);
    });
    
    if (debug && isValid) console.log(`[${requestId}] All suggestions passed validation`);
    return isValid;
    
  } catch (parseError) {
    // if (debug) console.log(`[${requestId}] JSON validation failed: Parse error - ${parseError.message}`);
    return false;
  }
}

function isValidSuggestion(suggestion: string, debug: boolean = false): boolean {
  if (!suggestion || typeof suggestion !== 'string') {
    if (debug) console.log(`Validation failed: Not a string - ${typeof suggestion}`);
    return false;
  }

  const trimmed = suggestion.trim();
  
  // Reject empty or whitespace-only suggestions
  if (trimmed.length === 0) {
    if (debug) console.log(`Validation failed: Empty or whitespace-only suggestion`);
    return false;
  }

  // Reject obvious JSON/array structure artifacts
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    if (debug) console.log(`Validation failed: Starts with JSON bracket/brace - "${trimmed.substring(0, 20)}..."`);
    return false;
  }
  
  // Only reject quotes if they look like JSON artifacts (containing commas)
  if (trimmed.includes('",') || trimmed === '""') {
    if (debug) console.log(`Validation failed: Contains JSON quote artifacts - "${trimmed.substring(0, 20)}..."`);
    return false;
  }

  // Reject suggestions that are only punctuation or symbols (no letters)
  if (!/[a-zA-Z]/.test(trimmed)) {
    if (debug) console.log(`Validation failed: No letters found - "${trimmed.substring(0, 20)}..."`);
    return false;
  }

  // Validate word count (≤30 words to allow more natural responses)
  const wordCount = trimmed.split(/\s+/).filter(word => word.length > 0).length;
  if (wordCount > 30) {
    if (debug) console.log(`Validation failed: Too many words (${wordCount} > 30) - "${trimmed.substring(0, 50)}..."`);
    return false;
  }

  // Reject suggestions that are too short (at least 2 words)
  if (wordCount < 2) {
    if (debug) console.log(`Validation failed: Too few words (${wordCount} < 2) - "${trimmed}"`);
    return false;
  }

  if (debug) console.log(`Validation passed: ${wordCount} words - "${trimmed.substring(0, 50)}..."`);
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

async function callGeminiFlash(messages: Message[], systemPrompt: string, requestId: string, scenarioId?: string): Promise<string> {
  const t0 = Date.now();
  
  // Build conversation prompt using shared function
  const promptData = buildConversationPrompt(messages, systemPrompt, false, scenarioId);
  
  console.log(`[${requestId}] Gemini Flash conversation prompt prepared`);

  // Generate content with system instruction
  const response = await getGeminiClient().models.generateContent({
    model: "gemini-2.5-flash",
    contents: promptData.conversationPrompt,
    config: {
      systemInstruction: promptData.systemPrompt
    }
  });
  
  const latencyMs = Date.now() - t0;
  console.log(`[${requestId}] Gemini Flash response latency: ${latencyMs} ms`);
  
  const result = response.text?.trim() || "";
  if (!result) {
    throw new Error("Gemini Flash returned empty response");
  }
  
  console.log(`[${requestId}] Gemini Flash response: "${result}"`);
  return result;
}

async function callGeminiFlashLite(messages: Message[], systemPrompt: string, requestId: string, scenarioId?: string): Promise<string> {
  const t0 = Date.now();
  
  // Build conversation prompt using shared function
  const promptData = buildConversationPrompt(messages, systemPrompt, false, scenarioId);
  
  console.log(`[${requestId}] Gemini Flash Lite conversation prompt prepared`);
  
  // Generate content with system instruction
  const response = await getGeminiClient().models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: promptData.conversationPrompt,
    config: {
      systemInstruction: promptData.systemPrompt
    }
  });
  
  const latencyMs = Date.now() - t0;
  console.log(`[${requestId}] Gemini Flash Lite response latency: ${latencyMs} ms`);
  
  const result = response.text?.trim() || "";
  if (!result) {
    throw new Error("Gemini Flash Lite returned empty response");
  }
  
  console.log(`[${requestId}] Gemini Flash Lite response: "${result.substring(0, 100)}..."`);
  return result;
}

async function callGroq(messages: Message[], systemPrompt: string, requestId: string, scenarioId?: string): Promise<string> {
  const t0 = Date.now();
  
  // Build unified context prompt using shared function
  const promptData = buildConversationPrompt(messages, systemPrompt, true, scenarioId);
  
  console.log(`[${requestId}] Groq context prompt prepared`);
  
  const response = await getGroqClient().chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [{ role: "user", content: promptData.conversationPrompt }],
    stream: false,
  });
  
  const latencyMs = Date.now() - t0;
  console.log(`[${requestId}] Groq response latency: ${latencyMs} ms`);
  
  const result = response.choices[0].message.content || "";
  if (!result) {
    throw new Error("Groq returned empty response");
  }
  
  console.log(`[${requestId}] Groq response: "${result.substring(0, 100)}..."`);
  return result;
}

async function tryAIProviders(messages: Message[], systemPrompt: string, requestId: string, scenarioId?: string): Promise<string> {
  const providers = [
    { name: "Gemini 2.5 Flash", fn: () => callGeminiFlash(messages, systemPrompt, requestId, scenarioId) },
    { name: "Groq", fn: () => callGroq(messages, systemPrompt, requestId, scenarioId) },
    { name: "Gemini 2.5 Flash Lite", fn: () => callGeminiFlashLite(messages, systemPrompt, requestId, scenarioId) },
  ];

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      console.log(`[${requestId}] Attempting suggestion generation with ${provider.name}`);
      const rawResponse = await provider.fn();
      
      // Strict validation - must be valid JSON array format
      if (isValidJSONArray(rawResponse, requestId)) {
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
  requestId: string,
  scenarioId: string = 'REFERRAL_ANNUAL_REVIEW'
): Promise<string[]> {
  console.log(`[${requestId}] Generating next turn suggestions for scenario: ${scenarioId}...`);
  const startTime = Date.now();

  const systemPromptContent = SUGGESTION_PROMPTS[scenarioId] || SUGGESTION_PROMPTS['GENERIC'];
  
  try {
    const rawResponse = await tryAIProviders(messages, systemPromptContent, requestId, scenarioId);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[${requestId}] Suggestion generation completed in ${elapsed}s`);
    
    return processSuggestionResponse(rawResponse, requestId);
  } catch (error: any) {
    console.error(`[${requestId}] Error generating suggestions:`, error);
    return [];
  }
}
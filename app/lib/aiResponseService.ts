import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { Persona } from '@/lib/personas';
import { PERSONA_PROMPTS } from "@/lib/prompt/persona";

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

function isValidResponse(rawResponse: string): boolean {
  if (!rawResponse || typeof rawResponse !== 'string') {
    return false;
  }

  const trimmed = rawResponse.trim();
  
  // Must have some content
  if (trimmed.length === 0) {
    return false;
  }

  // Should not contain markdown artifacts
  if (trimmed.includes('```') || trimmed.includes('markdown') || trimmed.includes('Markdown')) {
    return false;
  }

  // Should not be just technical artifacts
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return false;
  }

  return true;
}

function processMainResponse(rawText: string | undefined | null, requestId: string): string {
  if (!rawText) {
    console.warn(`[${requestId}] FINAL VALIDATION: No content in main response`);
    return "";
  }

  const cleaned = rawText.trim();
  
  // Simple validation and cleanup
  if (cleaned.length === 0) {
    console.warn(`[${requestId}] FINAL VALIDATION: Empty response after cleanup`);
    return "";
  }

  console.log(`[${requestId}] FINAL VALIDATION: Valid response with ${cleaned.split(/\s+/).length} words`);
  return cleaned;
}

async function callGeminiFlash(
  systemPromptContent: string,
  messages: Message[],
  requestId: string
): Promise<string> {
  console.log(`[${requestId}] Attempting response generation with Gemini 2.5 Flash`);
  const t0 = Date.now();
  
  const lastMsgObj = messages[messages.length - 1];
  const priorMsgs = messages.slice(0, -1);
  
  const chat = getGeminiClient().chats.create({
    model: "gemini-2.5-flash",
    history: priorMsgs.map(m => ({
      role: m.role === "advisor" ? "user" : "model",
      parts: [{ text: m.content }]
    })),
    config: {
      systemInstruction: systemPromptContent
    }
  });
  
  console.log(`[${requestId}] Gemini Flash chat session created`);
  
  const resp = await chat.sendMessage({
    message: lastMsgObj.content
  });
  
  const latencyMs = Date.now() - t0;
  console.log(`[${requestId}] Gemini Flash response latency: ${latencyMs} ms`);
  
  const aiResponse = resp.text?.trim() || "";
  if (!aiResponse) {
    throw new Error("Gemini Flash returned empty response");
  }
  
  console.log(`[${requestId}] Gemini Flash response: "${aiResponse.substring(0, 100)}..."`);
  return aiResponse;
}

async function callGeminiFlashLite(
  systemPromptContent: string,
  messages: Message[],
  requestId: string
): Promise<string> {
  console.log(`[${requestId}] Attempting response generation with Gemini 2.5 Flash Lite`);
  const t0 = Date.now();
  
  const lastMsgObj = messages[messages.length - 1];
  const priorMsgs = messages.slice(0, -1);
  
  const chat = getGeminiClient().chats.create({
    model: "gemini-2.5-flash-lite-preview-06-17",
    history: priorMsgs.map(m => ({
      role: m.role === "advisor" ? "user" : "model",
      parts: [{ text: m.content }]
    })),
    config: {
      systemInstruction: systemPromptContent
    }
  });
  
  console.log(`[${requestId}] Gemini Flash Lite chat session created`);
  
  const resp = await chat.sendMessage({
    message: lastMsgObj.content
  });
  
  const latencyMs = Date.now() - t0;
  console.log(`[${requestId}] Gemini Flash Lite response latency: ${latencyMs} ms`);
  
  const aiResponse = resp.text?.trim() || "";
  if (!aiResponse) {
    throw new Error("Gemini Flash Lite returned empty response");
  }
  
  console.log(`[${requestId}] Gemini Flash Lite response: "${aiResponse.substring(0, 100)}..."`);
  return aiResponse;
}

async function callGroq(
  systemPromptContent: string,
  messages: Message[],
  requestId: string
): Promise<string> {
  console.log(`[${requestId}] Attempting response generation with Groq`);
  const t0 = Date.now();
  
  // Define a mini‐type alias for Groq's roles
  type GroqRole = "system" | "user" | "assistant";
  
  // Annotate the chat array
  const chat: { role: GroqRole; content: string }[] = [
    { role: "system", content: systemPromptContent }
  ];
  
  // Push all messages, casting to the literal types
  chat.push(
    ...messages.map(m => ({
      role: (m.role === "advisor" ? "user" : "assistant") as GroqRole,
      content: m.content
    }))
  );
  
  console.log(`[${requestId}] Groq chat messages prepared`);
  
  const completion = await getGroqClient().chat.completions.create({
    messages: chat,
    model: "meta-llama/llama-4-maverick-17b-128e-instruct",
  });
  
  const latencyMs = Date.now() - t0;
  console.log(`[${requestId}] Groq response latency: ${latencyMs} ms`);
  
  const aiResponse = completion.choices[0]?.message?.content?.trim() || "";
  if (!aiResponse) {
    throw new Error("Groq returned empty response");
  }
  
  console.log(`[${requestId}] Groq response: "${aiResponse.substring(0, 100)}..."`);
  return aiResponse;
}

async function tryAIProviders(
  systemPromptContent: string,
  messages: Message[],
  requestId: string
): Promise<string> {
  const providers = [
    { name: "Gemini 2.5 Flash", fn: () => callGeminiFlash(systemPromptContent, messages, requestId) },
    { name: "Gemini 2.5 Flash Lite", fn: () => callGeminiFlashLite(systemPromptContent, messages, requestId) },
    { name: "Groq", fn: () => callGroq(systemPromptContent, messages, requestId) }
  ];

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      console.log(`[${requestId}] Trying ${provider.name} for main response generation`);
      const rawResponse = await provider.fn();
      
      // Validate response before accepting it
      if (isValidResponse(rawResponse)) {
        console.log(`[${requestId}] ${provider.name} returned valid response`);
        return rawResponse;
      } else {
        console.warn(`[${requestId}] ${provider.name} returned invalid response, trying next provider`);
        errors.push(`${provider.name}: Invalid response format`);
        continue; // Try next provider
      }
    } catch (error: any) {
      console.error(`[${requestId}] ${provider.name} failed:`, error.message);
      errors.push(`${provider.name}: ${error.message}`);
      continue; // Try next provider
    }
  }

  throw new Error(`Main response generation failed with all models: ${errors.join(" → ")}`);
}

export async function generateMainAiTextResponse(
  messages: Message[],
  roleplayProfile: Persona | null,
  requestId: string,
  difficultyProfile: string,
  scenarioId: string
): Promise<string> {
  console.log(`[${requestId}] Generating main AI text response, scenario: ${scenarioId}. Messages count: ${messages.length}`);

  let roleplayProfilePrompt = 
  PERSONA_PROMPTS[roleplayProfile?.id ?? ""] || PERSONA_PROMPTS.LIANG_CHEN;
  console.log(`[${requestId}] Roleplay profile prompt: ${roleplayProfilePrompt}`.substring(0, 100));

  // Now append the profile with the difficulty profile
  let systemPromptContent = `
  ${roleplayProfilePrompt.trim()}

  ## Difficulty Profile:
  ${difficultyProfile.trim()}      

  ## Formatting Rules
  - Do not use asterisks (*) in your replies.

  ## Response-Length & Brevity Rules
  1. MIRROR TURN-LENGTH  
    • If the user's last turn is very short (<10 words), keep your reply under 2 sentences.  
    • If the user speaks 10–30 words, reply in 3–4 sentences.  
    • Go beyond 4 sentences only for new or critical information.

  2. BALANCED TURN-TAKING  
    • Match response density to the user: brief for brief, detailed for "why" or "how."

  3. HUMAN TONE  
    • Write conversationally—use contractions and everyday language.

  ## End-Session Phrases  
  When you decide the conversation is wrapping up (e.g. client has no more questions), respond with ONLY one of these phrases as your complete response:
    • "Alright, see you next time"  
    • "Great chatting—see you next time."  
    • "That covers everything—talk soon."  
    • "Thanks. Have a good day!"
  
  CRITICAL: Use the goodbye phrase as your ENTIRE response. Do NOT add any additional content, questions, or explanations before or after the goodbye phrase. The goodbye phrase should be the complete and final message.
  `;

  try {
    const rawResponse = await tryAIProviders(systemPromptContent, messages, requestId);
    return processMainResponse(rawResponse, requestId);
  } catch (error: any) {
    console.error(`[${requestId}] Error generating main AI response:`, error);
    throw new Error(`Failed to get main AI response: ${error.message || 'Unknown error'}`);
  }
}
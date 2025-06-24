import { GoogleGenAI } from "@google/genai";
import { generateText } from "ai";
import { groq } from '@ai-sdk/groq';

// Using Gemini flash 2.5 model for suggestion generation
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Using Groq for for suggestion generation
// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface Message {
  role: "advisor" | "client" | "system";
  content: string;
}

export async function generateNextTurnSuggestions(
  conversationHistory: Message[],
  aiLastResponse: string,
  requestId: string
): Promise<string[]> {
  console.log(`[${requestId}] Generating next turn suggestions Groq...`);

  const historyString = conversationHistory
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const suggestionPrompt = `
You are an AI assistant coaching a Financial Advisor. Based on the transcript below, output **only** a raw JSON array of exactly two strings—no markdown, no fences, no commentary, no tags, nothing else.

**Output Format**  
- Exactly one line: [“suggestion1”,”suggestion2”]  
- Double quotes around each suggestion  
- Comma separated, no trailing comma  
- ≤15 words per suggestion  

**Example**  
["Would you like to schedule a follow-up next week?","Can I send you today’s meeting summary?"]

Conversation History (Advisor → Client):
${historyString}

Client’s Last Response:
${aiLastResponse}

Now generate exactly two next-step suggestions as a JSON array.
`;

// For benchmarking latency
const t0 = Date.now();

  try {
    // // Call Gemini Flash 2.5
    // const response = await ai.models.generateContent({
    //   // model: "gemini-2.5-flash-preview-05-20",
    //   model: "gemini-2.5-flash-preview-05-20",
    //   contents: suggestionPrompt
    // });

    // Call Groq
    const { text } = await generateText({
        model: groq('meta-llama/llama-4-maverick-17b-128e-instruct'),
        prompt: suggestionPrompt,
    });
    const response = { text };

    // Log latency
    const latencyMs = Date.now() - t0;
    console.log(`[${requestId}] Suggestion response latency: ${latencyMs} ms`);

    const rawSuggestions = response.text?.trim() ?? "";
    console.log(`[${requestId}] Raw suggestions from model: ${rawSuggestions}`);

    // Try JSON parse first
    try {
      const suggestionsArray = JSON.parse(rawSuggestions);
      if (Array.isArray(suggestionsArray) &&
          suggestionsArray.length === 2 &&
          suggestionsArray.every(s => typeof s === 'string')) {
        console.log(`[${requestId}] Parsed suggestions:`, suggestionsArray);
        return suggestionsArray;
      }
    } catch (e) {
      console.warn(`[${requestId}] JSON parse failed, falling back to line split`);
    }

    // Fallback: extract first two non-empty lines
    const lines = rawSuggestions
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0);

    if (lines.length >= 2) {
      return [lines[0], lines[1]];
    }

    console.warn(`[${requestId}] Could not parse suggestions, returning empty array.`);
    return [];
  } catch (error) {
    console.error(`[${requestId}] Error generating next turn suggestions with Groq:`, error);
    return [];
  }
}

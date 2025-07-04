import { GoogleGenAI } from "@google/genai";
import { generateText } from "ai";
import { groq } from '@ai-sdk/groq';

// Lazy initialization of Gemini client
let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

// Using Groq for for suggestion generation
// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface Message {
  role: "advisor" | "client" | "system";
  content: string;
}

export async function generateNextTurnSuggestions(
  messages: Message[],
  aiLastResponse: string,
  requestId: string
): Promise<string[]> {
  console.log(`[${requestId}] Generating next turn suggestions...`);

  // Build conversation history string
  const historyString = messages
    .filter((msg) => msg.role === "advisor" || msg.role === "client")
    .map((msg) => `${msg.role === "advisor" ? "Advisor" : "Client"}: ${msg.content}`)
    .join("\n\n");

  // Create the suggestion prompt
  const suggestionPrompt = `
SYSTEM: Referral-Coach v3

Goal  
Advance the client’s agenda (answer their request) first; if natural, guide toward a warm referral.

Quality gate (all must be true)  
A. Provide at least one concrete answer to the client’s direct question.  
B. Do not pressure; tone stays appreciative and low-key.

Bonus points (hit ≥1)  
1. Reference shared history or recent success the client praised.  
2. Name who might benefit or why the friend would care.  
3. Offer an easy step (email draft, joint call, calendar link).

Output format
Return one line containing a raw JSON array with exactly two strings.  
• ≤ 18 words each.  
• If you include a referral bridge it must follow after the concrete answer.  
• No markdown, commentary, or asterisks.  
• Avoid empty “let’s schedule” lines with no value or referral context.

Conversation History (Advisor → Client):  
${historyString}

Client’s Last Response:  
${aiLastResponse}

---  
Craft two diverse options that pass the quality gate, then output the JSON array on one line, nothing else.
`;

  

  // For benchmarking latency
  const t0 = Date.now();

  try {
    let rawText = "";
    let modelUsed = "";
    
    // Try Gemini Flash 2.5 first
    try {
      console.log(`[${requestId}] Attempting to generate suggestions with Gemini Flash`);
      const geminiResponse = await getGeminiClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: suggestionPrompt
      });
      
      rawText = geminiResponse.text?.trim() ?? "";
      modelUsed = "Gemini Flash";
      console.log(`[${requestId}] Successfully received response from Gemini Flash`);
      
      // Try to parse the response - if it fails, we'll fall back to next model
      JSON.parse(rawText);
      
    } catch (geminiError: any) {
      // Gemini Flash failed or returned invalid JSON, try Gemini Flash Lite Preview
      console.log(`[${requestId}] Gemini Flash failed or returned invalid JSON: ${geminiError.message}`);
      console.log(`[${requestId}] Falling back to Gemini Flash Lite Preview...`);
      
      try {
        // Call Gemini Flash Lite Preview as first fallback
        const geminiLiteResponse = await getGeminiClient().models.generateContent({
          model: "gemini-2.5-flash-lite-preview-06-17",
          contents: suggestionPrompt
        });
        
        rawText = geminiLiteResponse.text?.trim() ?? "";
        modelUsed = "Gemini Flash Lite";
        console.log(`[${requestId}] Successfully received response from Gemini Flash Lite`);
        
        // Try to parse the response - if it fails, we'll fall back to Groq
        JSON.parse(rawText);
        
      } catch (geminiLiteError: any) {
        // Gemini Flash Lite Preview failed or returned invalid JSON, try Groq
        console.log(`[${requestId}] Gemini Flash Lite failed or returned invalid JSON: ${geminiLiteError.message}`);
        console.log(`[${requestId}] Falling back to Groq...`);
        
        try {
          // Call Groq as final fallback
          const groqResponse = await generateText({
            model: groq('meta-llama/llama-4-maverick-17b-128e-instruct'),
            prompt: suggestionPrompt,
          });
          
          rawText = groqResponse.text?.trim() ?? "";
          modelUsed = "Groq";
          console.log(`[${requestId}] Successfully received response from Groq`);
        } catch (groqError: any) {
          console.error(`[${requestId}] All models failed. Groq error: ${groqError.message}`);
          throw new Error(`All models failed: Gemini Flash → Gemini Flash Lite → Groq`);
        }
      }
    }

    // Log latency
    const latencyMs = Date.now() - t0;
    console.log(`[${requestId}] Suggestion response latency: ${latencyMs} ms`);
    console.log(`[${requestId}] Raw suggestions from model (${modelUsed}): ${rawText}`);

    // Process the response - try JSON first, then fallback to text extraction
    try {
      const suggestionsArray = JSON.parse(rawText);
      if (Array.isArray(suggestionsArray) &&
          suggestionsArray.length === 2 &&
          suggestionsArray.every(s => typeof s === 'string')) {
        console.log(`[${requestId}] Parsed suggestions:`, suggestionsArray);
        return suggestionsArray;
      } else {
        console.warn(`[${requestId}] JSON parsed but format is incorrect, trying text extraction`);
        throw new Error("Invalid JSON format");
      }
    } catch (parseError) {
      // If JSON parse fails, try to extract from text
      console.log(`[${requestId}] JSON parse failed, trying to extract from text`);
      
      // Try to extract suggestions from text
      const lines = rawText.split('\n')
        .map((line: string) => line.replace(/^\d+\.\s*/, '').trim()) // Remove numbering if present
        .filter((line: string) => line.length > 0);
      
      if (lines.length >= 2) {
        const suggestions = lines.slice(0, 2);
        console.log(`[${requestId}] Extracted suggestions from text:`, suggestions);
        return suggestions;
      }
      
      console.warn(`[${requestId}] Could not extract suggestions from text, returning empty array`);
      return [];
    }
  } catch (error: any) {
    console.error(`[${requestId}] Error generating suggestions:`, error);
    return [];
  }
}

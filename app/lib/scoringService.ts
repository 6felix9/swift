import { GoogleGenAI } from "@google/genai";
import { Message } from "./types";

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

export interface ConversationScore {
  turn: number;
  score: number; // Universal Conversation Effectiveness Score (0-100)
  timestamp: number;
}

const UNIVERSAL_SCORING_PROMPT = 
`Please score the conversation on five dimensions (0–20 each, total 0–100):

1. Rapport & Empathy:
   - Acknowledges feelings
   - Uses respectful language
   - Builds trust and maintains a calm tone

2. Problem Assessment & Clarity:
   - Asks clarifying questions
   - Explains concepts clearly
   - Summarizes and checks understanding

3. Solution Quality & Value:
   - Provides actionable next steps
   - Offers tailored advice
   - States benefits and risks, shows expertise

4. Client Engagement & Empowerment:
   - Encourages participation
   - Respects client autonomy
   - Builds confidence and shares resources

5. Professionalism & Closure:
   - Follows professional etiquette
   - Provides a clear follow-up plan
   - Concludes confidently and documents next steps

Scoring Rules:
- Base scores strictly on what’s said—no assumptions.
- Assign an integer 0–20 for each dimension.
- If a behavior isn’t observed, assign 0.
- Sum all five scores for the final effectiveness score.

Output Format:
- Return only the final numeric score.`;

function buildTranscript(messages: Message[]): string {
  return messages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');
}

export async function calculateConversationEffectiveness(
  messages: Message[],
  turnNumber: number
): Promise<ConversationScore> {
  console.log(`[ScoringService] Calculating effectiveness for turn ${turnNumber}...`);
  const startTime = Date.now();

  try {
    console.log(`[ScoringService] Received ${messages.length} messages for turn ${turnNumber}`);
    console.log(`[ScoringService] Message roles: ${messages.map(m => m.role).join(', ')}`);
    
    const transcript = buildTranscript(messages);
    console.log(`[ScoringService] Built transcript length: ${transcript.length} characters`);
    
    if (transcript.trim().length === 0) {
      console.warn(`[ScoringService] Empty transcript for turn ${turnNumber}!`);
    }
    
    const fullPrompt = `${UNIVERSAL_SCORING_PROMPT}\n\nConversation:\n${transcript}`;

    console.log(`[ScoringService] Full prompt for turn ${turnNumber}:\n${fullPrompt}`);

    const response = await getGeminiClient().models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: fullPrompt,
    });

    const scoreText = response.text?.trim() || "0";
    const score = Math.max(0, Math.min(100, parseInt(scoreText) || 0));

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[ScoringService] Turn ${turnNumber} scored ${score}/100 in ${elapsed}s`);

    return {
      turn: turnNumber,
      score,
      timestamp: Date.now(),
    };
  } catch (error: any) {
    console.error(`[ScoringService] Error calculating effectiveness for turn ${turnNumber}:`, error.message);
    
    // Return previous score or 0 on error
    return {
      turn: turnNumber,
      score: 0,
      timestamp: Date.now(),
    };
  }
}
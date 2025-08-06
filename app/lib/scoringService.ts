import { Message } from "./types";
import Groq from "groq-sdk";

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

export interface ConversationScore {
  turn: number;
  score: number; // Universal Conversation Effectiveness Score (0-100)
  timestamp: number;
}

const UNIVERSAL_SCORING_PROMPT = 
`SYSTEM: Referral-Skills Evaluator

You will receive a full client–advisor transcript.  
Score the advisor’s performance using the rubric below, then output **one integer** (0–85) — the total score.  
Return nothing else.

──────────── RUBRIC ────────────
For every criterion, assign 1-5 points (0 if not observed).  
Cap each categor¬y at its stated maximum.

1. Relationship Quality & Trust  (max 15)  
   1.1 Advisor references shared history or client progress  
   1.2 Tone shows genuine rapport / emotional connection  
   1.3 Client expresses appreciation or confidence  

2. Timing & Context  (max 15)  
   2.1 Referral ask is well-timed (milestone, compliment, etc.)  
   2.2 Ask is not rushed or awkward  
   2.3 Client appears emotionally available and focused  

3. Language & Framing  (max 15)  
   3.1 Uses respectful, soft language  
   3.2 Frames referral as helpful, not a sales pitch  
   3.3 Avoids pressure or self-centred wording  

4. Value Articulation  (max 15)  
   4.1 Explains who would benefit from a referral  
   4.2 Describes what the initial conversation looks like  
   4.3 Links referral to value the client experienced  

5. Client Comfort & Response  (max 15)  
   5.1 Client shows comfort or interest  
   5.2 Advisor handles hesitation appropriately  
   5.3 Conversation ends on a positive, professional note  

6. Follow-Through Facilitation  (max 10)  
   6.1 Offers easy referral options (email, intro, etc.)  
   6.2 Reiterates no pressure or obligation for the referred person  

Scoring notes  
• Use transcript evidence only.  
• Sum all capped subtotals → totalScore (0-85).  
• Output must be a single integer with no label or JSON.

──────────── TRANSCRIPT ────────────
<<PASTE FULL CONVERSATION HERE>>

`;

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

    const response = await getGroqClient().chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "system", content: fullPrompt }],
      stream: false,
    });

    const scoreText = response.choices[0]?.message?.content?.trim() || "0";
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
import { GoogleGenAI } from "@google/genai";

// Testing Gemini flash 2.5 model for summarization
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const summarizationSystemPrompt = `You are an expert call script summarizer. Based on the following phone call transcript, write a summary in bullet points. Focus on key decisions, questions, and outcomes.`;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function generateCallSummary(
  conversationHistory: Message[],
  roleplayProfile?: any,
  customSystemPrompt?: string
): Promise<string> {
  if (!conversationHistory || conversationHistory.length === 0) {
    console.log("summarizationService: Conversation history is empty. Returning empty summary.");
    return "";
  }

  const systemPrompt = customSystemPrompt || summarizationSystemPrompt;
  const fullSystemPrompt = roleplayProfile
    ? `${systemPrompt}\nPatient Profile: ${JSON.stringify(roleplayProfile)}`
    : systemPrompt;

  // Build the contents for the Gemini request
  const contents = [
    { role: "system", content: fullSystemPrompt },
    ...conversationHistory
  ]
    .map(msg => `${msg.role}: ${msg.content}`)
    .join("\n");

  console.log(
    `summarizationService: Calling Gemini Flash 2.5 for ${
      customSystemPrompt ? "evaluation" : "summarization"
    } with history length:`,
    conversationHistory.length
  );

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents
    });

    const summaryText = response.text?.trim() || "";
    console.log("summarizationService: Summary generated successfully.");
    return summaryText;
  } catch (error: any) {
    console.error("summarizationService: Error calling Gemini Flash 2.5 for summarization:", error);
    throw new Error(`Failed to generate summary: ${error.message}`);
  }
}

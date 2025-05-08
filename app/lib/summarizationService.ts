import Groq from 'groq-sdk';

// Ensure GROQ_API_KEY is available in your environment variables
const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) {
  throw new Error('GROQ_API_KEY is not set in environment variables for summarizationService');
}
const groq = new Groq({ apiKey: groqApiKey });

const summarizationSystemPrompt = `You are an expert call script summarizer. Based on the following phone call transcript, write a summary in bullet points. Focus on key decisions, questions, and outcomes.`;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function generateCallSummary(conversationHistory: Message[], patientProfile: PatientProfile | null): Promise<string> {
  if (!conversationHistory || conversationHistory.length === 0) {
    console.log("summarizationService: Conversation history is empty. Returning empty summary.");
    return "";
  }

  const groqMessages = [
    ...conversationHistory,
    { role: "system" as const, content: summarizationSystemPrompt + (patientProfile ? `\nPatient Profile: ${JSON.stringify(patientProfile)}` : "") },
  ];

  console.log("summarizationService: Calling Groq AI for summarization with history length:", conversationHistory.length);

  try {
    const summaryCompletion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-maverick-17b-128e-instruct", // Or your preferred model for summarization
      messages: groqMessages,
      temperature: 0.3, // Adjust for desired creativity/factuality
    });

    const summaryText = summaryCompletion.choices[0].message.content?.trim() || "";
    console.log("summarizationService: Summary generated successfully.");
    return summaryText;
  } catch (error: any) {
    console.error("summarizationService: Error calling Groq AI for summarization:", error);
    // Consider re-throwing or returning a specific error message / null
    throw new Error(`Failed to generate summary: ${error.message}`); 
  }
}

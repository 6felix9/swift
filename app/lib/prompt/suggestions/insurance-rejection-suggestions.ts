import type { Message } from "@/lib/suggestionService";

export function buildInsuranceRejectionSuggestionPrompt(
  messages: Message[],
  aiLastResponse: string
): string {
  const historyString = messages
    .filter((msg) => msg.role === "advisor" || msg.role === "client")
    .map((msg) => `${msg.role === "advisor" ? "Advisor" : "Client"}: ${msg.content}`)
    .join("\n\n");

  return `
SYSTEM: Insurance-Rejection-Coach v1
• You are helping a client navigate an insurance claim rejection.

Goal  
• Provide empathetic, actionable guidance to address the client's concerns about their rejected claim.

Quality gate (all must be true)  
• Provide at least one concrete answer to the client's direct question.  
• Maintain a supportive, professional tone throughout.

Bonus points (hit ≥1)  
• Reference specific policy terms or claim details mentioned.  
• Offer to help with documentation or appeals process.  
• Provide reassurance about potential outcomes or alternative options.

Conversation History (Advisor → Client):  
${historyString}

Client's Last Response:  
${aiLastResponse}

Output format
• Reply with exactly one line, nothing before or after it.  
• That line must be valid JSON: an array of two strings.  
• Each string ≤ 18 words.  
• Focus on empathy and actionable next steps.  
• After drafting, verify internally that the line parses as JSON, has two strings, and respects the word limit.  
• Do not include placeholders like <name>, {policy}, [amount], or "___".  
• If verification fails, correct the response before sending.
`;
}
import Groq from "groq-sdk";
import { Persona } from "./personas";
import { EvaluationResponse } from "./evaluationTypes";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function generateCallEvaluation(
  messages: Message[],
  roleplayProfile: Persona | null,
  evaluationPrompt: string, // This is the rubric text
  scenarioContext: string
): Promise<EvaluationResponse> {
  console.log("[EvaluationService] Generating call evaluation...");
  console.log("[EvaluationService] Scenario Context:", scenarioContext);
  console.log("[EvaluationService] Evaluation Prompt (first 100 chars):", evaluationPrompt.substring(0,100));

  // Construct a detailed prompt for the LLM
  const systemMessage = `You are an expert call analyst. Evaluate the following call transcript based on the provided evaluation criteria and scenario context. Provide a structured evaluation.

## Scenario Context:
${scenarioContext}

## Evaluation Criteria (from Prompt):
${evaluationPrompt}

## Caller Profile (if available):
Name: ${roleplayProfile?.name || 'N/A'}
Details: ${roleplayProfile?.profileDetails || 'N/A'}

## Instructions:
Analyze the conversation provided in the transcript. Based *only* on the transcript and the evaluation criteria (rubric) provided in the '## Evaluation Criteria (from Prompt)' section, provide a detailed, fair, and constructive evaluation.

**IMPORTANT: Your response MUST be a single, valid JSON object that strictly adheres to the following TypeScript interface structure for \`EvaluationResponse\`:**
\`\`\`typescript
interface CriterionEvaluation {
  criterionId: string; // e.g., "1.1", "2.3"
  criterionText: string; // The text of the criterion from the rubric
  score: number; // 1-5
  commentsAndExamples: string; // Justification and examples from transcript
}

interface RedFlagCheck {
  raised: boolean;
  comment: string | null;
}

interface DetailedEvaluationCategory {
  categoryName: string; // e.g., "1. Relationship Quality & Trust"
  subtotal: number; // Sum of scores for criteria in this category
  redFlagCheck: RedFlagCheck;
  criteria: CriterionEvaluation[];
}

interface ReferralContextSuccessfullyCreated {
  answer: string; // e.g., "Partially", "Yes", "No"
  justification: string;
}

interface EvaluationSummary {
  totalScore: number; // Sum of all subtotals
  maxPossibleScore: number; // Max possible score based on the rubric
  keyStrengths: string;
  keyAreasForImprovement: string;
  referralContextSuccessfullyCreated: ReferralContextSuccessfullyCreated;
}

interface EvaluationResponse {
  evaluationSummary: EvaluationSummary;
  detailedEvaluation: DetailedEvaluationCategory[];
}
\`\`\`

**Ensure your entire output is ONLY this JSON object, with no other text before or after it.**
Fill in all fields accurately based on the rubric and the conversation transcript. The rubric details (criterion text, category names) should be used to structure the JSON.
Refer to the content of '## Evaluation Criteria (from Prompt)' to populate \`criterionText\` and \`categoryName\` fields accurately.
Calculate \`totalScore\` and \`subtotal\` based on the scores you assign.
Determine \`maxPossibleScore\` based on the rubric (e.g., 5 points per criterion, sum across all criteria).
Provide concise \`keyStrengths\` and \`keyAreasForImprovement\`.
For \`referralContextSuccessfullyCreated\`, provide an \`answer\` (e.g., "Yes", "No", "Partially") and a \`justification\`.
Identify \`RedFlags\` as per the rubric.

Output the JSON object directly.`;

  const transcript = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant').map(msg => `${msg.role}: ${msg.content}`).join('\n');

  const conversationForLlm = [
    { role: "system", content: systemMessage },
    { role: "user", content: transcript },
  ];

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: conversationForLlm as any, // Cast to any if Groq SDK types are too strict for mixed roles
      model: "meta-llama/llama-4-maverick-17b-128e-instruct",
      temperature: 0.2, // Lower temperature for more deterministic JSON output
      // Attempt to enable JSON mode if available (syntax might vary by SDK version)
      // response_format: { type: "json_object" }, // Example for OpenAI, check Groq docs
      // max_tokens: 1500, // Adjust as needed
    });

    console.log("[EvaluationService] Chat completion response:", chatCompletion.choices[0]?.message);
    const rawResponse = chatCompletion.choices[0]?.message?.content;
    if (!rawResponse) {
      console.error("[EvaluationService] No content in LLM response");
      throw new Error("LLM response was empty.");
    }

    console.log("[EvaluationService] Raw LLM response (first 500 chars):", rawResponse.substring(0, 500));

    try {
      // Attempt to parse the JSON response
      // The LLM should output ONLY the JSON string. Remove potential markdown backticks if present.
      const cleanedJsonResponse = rawResponse.replace(/^```json\n?|\n?```$/g, '');
      const evaluation: EvaluationResponse = JSON.parse(cleanedJsonResponse);
      console.log("[EvaluationService] Evaluation JSON parsed successfully.");
      return evaluation;
    } catch (parseError) {
      console.error("[EvaluationService] Error parsing LLM JSON response:", parseError);
      console.error("[EvaluationService] Failing LLM response snippet:", rawResponse.substring(0, 1000)); // Log more for debugging
      throw new Error("Failed to parse evaluation JSON from LLM. The response was not valid JSON.");
    }
  } catch (error) {
    console.error("[EvaluationService] Error generating evaluation:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate evaluation due to an LLM error: ${error.message}`);
    }
    throw new Error("Failed to generate evaluation due to an unknown LLM error.");
  }
}

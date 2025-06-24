import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateCallEvaluation } from '@/lib/evaluationService';
import { PersonaSchema, getPersonaById, Persona } from '@/lib/personas';

// Maximum duration for the evaluation process in seconds
export const maxDuration = 60;

// Define the schema for the request body
const EvaluateRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['advisor', 'client', 'system']),
      content: z.string(),
    })
  ),
  roleplayProfile: PersonaSchema.optional().nullable(),
  evaluationPrompt: z.string(),
  scenarioContext: z.string(),
});

export async function POST(request: Request) {
  const requestId = Date.now(); // Simple request ID for logging
  console.log(`[${requestId}] /api/evaluate: Received evaluation request.`);

  let parsedBody;
  try {
    const body = await request.json();
    parsedBody = EvaluateRequestSchema.parse(body);
    console.log(`[${requestId}] /api/evaluate: Request body parsed successfully.`);
  } catch (error) {
    console.error(`[${requestId}] /api/evaluate: Invalid request body:`, error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { messages, roleplayProfile, evaluationPrompt, scenarioContext } = parsedBody;

  try {
    console.log(`[${requestId}] /api/evaluate: Calling generateCallEvaluation service...`);
    // Ensure roleplayProfile is a full Persona (with avatarRole)
    let persona: Persona | null = null;
    if (roleplayProfile?.id) {
      // Look up full Persona object by id
      persona = getPersonaById(roleplayProfile.id) || null;
    }
    const evaluation = await generateCallEvaluation(
      messages,
      persona,
      evaluationPrompt,
      scenarioContext
    );
    console.log(`[${requestId}] /api/evaluate: Evaluation generated successfully.`);
    return NextResponse.json({ evaluation });
  } catch (error: any) {
    console.error(`[${requestId}] /api/evaluate: Error generating evaluation:`, error);
    return NextResponse.json({ error: 'Failed to generate evaluation', details: error.message || 'Unknown error' }, { status: 500 });
  }
}

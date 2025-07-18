import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateCallEvaluation } from '@/lib/evaluationService';
import { PersonaSchema, getPersonaById, Persona } from '@/lib/personas';
import { getScenarioDefinitionById } from '@/lib/scenarios';

// Maximum duration for the evaluation process in seconds
export const maxDuration = 60;

// Helper function to validate message roles based on scenario
function createRoleValidator(scenarioId: string) {
  const scenario = getScenarioDefinitionById(scenarioId);
  if (!scenario) {
    // Fallback to original roles if scenario not found
    return z.enum(['advisor', 'client', 'system']);
  }
  
  // Create enum with scenario-specific roles plus system
  return z.enum([scenario.userRole, scenario.personaRole, 'system'] as [string, string, string]);
}

// Define the schema for the request body
const EvaluateRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.string(), // Will be validated dynamically based on scenario
      content: z.string(),
    })
  ),
  roleplayProfile: PersonaSchema.optional().nullable(),
  evaluationPrompt: z.string(),
  scenarioContext: z.string(),
  scenarioId: z.string(),
});

export async function POST(request: Request) {
  const requestId = Date.now(); // Simple request ID for logging
  console.log(`[${requestId}] /api/evaluate: Received evaluation request.`);

  let parsedBody;
  try {
    const body = await request.json();
    parsedBody = EvaluateRequestSchema.parse(body);
    
    // Additional role validation based on scenario
    const { scenarioId, messages } = parsedBody;
    const scenario = getScenarioDefinitionById(scenarioId);
    if (scenario) {
      const roleValidator = createRoleValidator(scenarioId);
      for (const message of messages) {
        try {
          roleValidator.parse(message.role);
        } catch (roleError) {
          console.error(`[${requestId}] /api/evaluate: Invalid role "${message.role}" for scenario ${scenarioId}`);
          return NextResponse.json({ 
            error: 'Invalid message role for scenario', 
            details: `Expected roles: ${scenario.userRole}, ${scenario.personaRole}, or system. Got: ${message.role}` 
          }, { status: 400 });
        }
      }
    }
    
    console.log(`[${requestId}] /api/evaluate: Request body parsed and validated successfully.`);
  } catch (error) {
    console.error(`[${requestId}] /api/evaluate: Invalid request body:`, error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { messages, roleplayProfile, evaluationPrompt, scenarioContext, scenarioId } = parsedBody;

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
      scenarioContext,
      scenarioId
    );
    console.log(`[${requestId}] /api/evaluate: Evaluation generated successfully.`);
    return NextResponse.json({ evaluation });
  } catch (error: any) {
    console.error(`[${requestId}] /api/evaluate: Error generating evaluation:`, error);
    return NextResponse.json({ error: 'Failed to generate evaluation', details: error.message || 'Unknown error' }, { status: 500 });
  }
}

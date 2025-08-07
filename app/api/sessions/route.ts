import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DatabaseService } from '@/lib/databaseService';
import { PersonaSchema } from '@/lib/personas';
import { Message, TrainingDomain } from '@/lib/types';

// Define the schema for saving a session
const SaveSessionRequestSchema = z.object({
  scenario: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    domain: z.enum(['financial-advisor', 'healthcare', 'customer-service']),
    userRole: z.string(),
    personaRole: z.string(),
    scenarioContext: z.string(),
    personas: z.array(z.string()),
    personaOpeningLine: z.string(),
    evaluationPromptKey: z.string(),
  }).passthrough(), // Allow additional properties
  persona: PersonaSchema,
  difficulty: z.enum(['easy', 'medium', 'hard']),
  evaluationData: z.any(), // Accept any evaluation data structure
  transcript: z.array(z.object({
    role: z.string(),
    content: z.string(),
    latency: z.number().optional(),
  })),
  callDuration: z.number(),
  conversationScores: z.array(z.object({
    turn: z.number(),
    score: z.number(),
    timestamp: z.number(),
  })),
});

/**
 * GET /api/sessions
 * Retrieves all stored sessions for a specific user, limited to the most recent 10
 */
export async function GET(request: Request) {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${requestId}] GET /api/sessions: Retrieving stored sessions`);

  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const userId = searchParams.get('userId');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 10; // Max 50 sessions

    if (!userId) {
      console.error(`[${requestId}] GET /api/sessions: Missing userId parameter`);
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const sessions = await DatabaseService.getAllSessions(userId, limit);
    
    console.log(`[${requestId}] GET /api/sessions: Retrieved ${sessions.length} sessions for user ${userId}`);
    return NextResponse.json({ sessions });
  } catch (error: any) {
    console.error(`[${requestId}] GET /api/sessions: Error retrieving sessions:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve sessions', 
        details: error.message || 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions
 * Saves a new session to the database for a specific user
 */
export async function POST(request: Request) {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${requestId}] POST /api/sessions: Saving new session`);

  let parsedBody;
  let userId: string;
  try {
    const body = await request.json();
    userId = body.userId;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Remove userId from body before validation as it's not part of the schema
    const { userId: _, ...sessionData } = body;
    parsedBody = SaveSessionRequestSchema.parse(sessionData);
    console.log(`[${requestId}] POST /api/sessions: Request body validated successfully`);
  } catch (error) {
    console.error(`[${requestId}] POST /api/sessions: Invalid request body:`, error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request body', 
        details: error.flatten() 
      }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const savedSession = await DatabaseService.saveSession(userId, parsedBody as any);
    console.log(`[${requestId}] POST /api/sessions: Session saved with ID ${savedSession.id} for user ${userId}`);
    
    return NextResponse.json({ 
      session: savedSession,
      message: 'Session saved successfully'
    }, { status: 201 });
  } catch (error: any) {
    console.error(`[${requestId}] POST /api/sessions: Error saving session:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to save session', 
        details: error.message || 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@libsql/client';

const AssignLegacyRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

function getDbClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  
  if (!url || !authToken) {
    throw new Error('Missing required Turso environment variables: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN');
  }
  
  return createClient({
    url,
    authToken,
  });
}

/**
 * POST /api/sessions/legacy/assign
 * Assigns all legacy sessions (sessions without user_id) to a specific user
 */
export async function POST(request: Request) {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${requestId}] POST /api/sessions/legacy/assign: Assigning legacy sessions`);

  let parsedBody;
  try {
    const body = await request.json();
    parsedBody = AssignLegacyRequestSchema.parse(body);
    console.log(`[${requestId}] POST /api/sessions/legacy/assign: Request validated for user ${parsedBody.userId}`);
  } catch (error) {
    console.error(`[${requestId}] POST /api/sessions/legacy/assign: Invalid request body:`, error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request body', 
        details: error.flatten() 
      }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const client = getDbClient();
    const result = await client.execute({
      sql: 'UPDATE sessions SET user_id = ? WHERE user_id IS NULL',
      args: [parsedBody.userId],
    });
    
    const assignedCount = result.rowsAffected || 0;
    console.log(`[${requestId}] POST /api/sessions/legacy/assign: Assigned ${assignedCount} sessions to user ${parsedBody.userId}`);
    
    return NextResponse.json({ 
      assignedCount,
      message: `Successfully assigned ${assignedCount} legacy sessions to user ${parsedBody.userId}`
    });
  } catch (error: any) {
    console.error(`[${requestId}] POST /api/sessions/legacy/assign: Error:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to assign legacy sessions', 
        details: error.message || 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/databaseService';

/**
 * GET /api/sessions/[id]
 * Retrieves a specific session by ID for a specific user
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const requestId = crypto.randomUUID().substring(0, 8);
  
  console.log(`[${requestId}] GET /api/sessions/${sessionId}: Retrieving session`);

  // Get userId from query parameters
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  // Validate session ID format
  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
    console.error(`[${requestId}] GET /api/sessions/${sessionId}: Invalid session ID`);
    return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
  }

  if (!userId) {
    console.error(`[${requestId}] GET /api/sessions/${sessionId}: Missing userId parameter`);
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const session = await DatabaseService.getSessionById(userId, sessionId);
    
    if (!session) {
      console.log(`[${requestId}] GET /api/sessions/${sessionId}: Session not found`);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    console.log(`[${requestId}] GET /api/sessions/${sessionId}: Session retrieved successfully for user ${userId}`);
    return NextResponse.json({ session });
  } catch (error: any) {
    console.error(`[${requestId}] GET /api/sessions/${sessionId}: Error retrieving session:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve session', 
        details: error.message || 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/[id]
 * Deletes a specific session by ID for a specific user
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const requestId = crypto.randomUUID().substring(0, 8);
  
  console.log(`[${requestId}] DELETE /api/sessions/${sessionId}: Deleting session`);

  // Get userId from query parameters
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  // Validate session ID format
  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
    console.error(`[${requestId}] DELETE /api/sessions/${sessionId}: Invalid session ID`);
    return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
  }

  if (!userId) {
    console.error(`[${requestId}] DELETE /api/sessions/${sessionId}: Missing userId parameter`);
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const deleted = await DatabaseService.deleteSession(userId, sessionId);
    
    if (!deleted) {
      console.log(`[${requestId}] DELETE /api/sessions/${sessionId}: Session not found`);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    console.log(`[${requestId}] DELETE /api/sessions/${sessionId}: Session deleted successfully for user ${userId}`);
    return NextResponse.json({ 
      message: 'Session deleted successfully',
      sessionId 
    });
  } catch (error: any) {
    console.error(`[${requestId}] DELETE /api/sessions/${sessionId}: Error deleting session:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to delete session', 
        details: error.message || 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
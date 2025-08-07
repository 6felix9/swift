import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/databaseService';

/**
 * DELETE /api/sessions/clear
 * Deletes all stored sessions for a specific user from the database
 */
export async function DELETE(request: Request) {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${requestId}] DELETE /api/sessions/clear: Clearing all sessions`);

  try {
    // Get userId from query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      console.error(`[${requestId}] DELETE /api/sessions/clear: Missing userId parameter`);
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const deletedCount = await DatabaseService.clearAllSessions(userId);
    
    console.log(`[${requestId}] DELETE /api/sessions/clear: ${deletedCount} sessions cleared successfully for user ${userId}`);
    return NextResponse.json({ 
      message: 'All sessions cleared successfully',
      deletedCount 
    });
  } catch (error: any) {
    console.error(`[${requestId}] DELETE /api/sessions/clear: Error clearing sessions:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to clear sessions', 
        details: error.message || 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
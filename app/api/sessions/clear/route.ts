import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/databaseService';

/**
 * DELETE /api/sessions/clear
 * Deletes all stored sessions from the database
 */
export async function DELETE(request: Request) {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${requestId}] DELETE /api/sessions/clear: Clearing all sessions`);

  try {
    const deletedCount = await DatabaseService.clearAllSessions();
    
    console.log(`[${requestId}] DELETE /api/sessions/clear: ${deletedCount} sessions cleared successfully`);
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
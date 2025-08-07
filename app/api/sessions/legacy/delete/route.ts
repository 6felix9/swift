import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

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
 * DELETE /api/sessions/legacy/delete
 * Deletes all legacy sessions (sessions without user_id)
 */
export async function DELETE(request: Request) {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${requestId}] DELETE /api/sessions/legacy/delete: Deleting legacy sessions`);

  try {
    const client = getDbClient();
    const result = await client.execute({
      sql: 'DELETE FROM sessions WHERE user_id IS NULL',
      args: [],
    });
    
    const deletedCount = result.rowsAffected || 0;
    console.log(`[${requestId}] DELETE /api/sessions/legacy/delete: Deleted ${deletedCount} legacy sessions`);
    
    return NextResponse.json({ 
      deletedCount,
      message: `Successfully deleted ${deletedCount} legacy sessions`
    });
  } catch (error: any) {
    console.error(`[${requestId}] DELETE /api/sessions/legacy/delete: Error:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to delete legacy sessions', 
        details: error.message || 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
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
 * GET /api/sessions/legacy/count
 * Returns the count of legacy sessions (sessions without user_id)
 */
export async function GET(request: Request) {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${requestId}] GET /api/sessions/legacy/count: Getting legacy session count`);

  try {
    const client = getDbClient();
    const result = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM sessions WHERE user_id IS NULL',
      args: [],
    });
    
    const count = result.rows[0]?.count || 0;
    console.log(`[${requestId}] GET /api/sessions/legacy/count: Found ${count} legacy sessions`);
    
    return NextResponse.json({ count });
  } catch (error: any) {
    console.error(`[${requestId}] GET /api/sessions/legacy/count: Error:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to get legacy session count', 
        details: error.message || 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
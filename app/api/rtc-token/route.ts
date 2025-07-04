import { NextResponse } from 'next/server';
import { generateRtcToken } from '@/lib/generateToken';

/**
 * API route to securely provide RTC credentials to the client.
 * Reads sensitive information from server-side environment variables.
 */
export async function GET() {
  console.log('[API/rtc-token] Starting RTC token generation...');
  
  // These variables are only accessed on the server, keeping them secret.
  const rtcAppId = process.env.RTC_APP_ID!;
  const rtcAppKey = process.env.RTC_APP_KEY!;
  const rtcRoomId = process.env.RTC_ROOM_ID!;
  const rtcUserId = process.env.USER_RTC_ID!;
  const fallbackToken = process.env.USER_RTC_TOKEN!;

  // Log environment variable status (without exposing sensitive values)
  console.log('[API/rtc-token] Environment variables check:', {
    rtcAppId: rtcAppId ? `Set (${rtcAppId.substring(0, 8)}...)` : 'MISSING',
    rtcAppKey: rtcAppKey ? `Set (${rtcAppKey.substring(0, 8)}...)` : 'MISSING',
    rtcRoomId: rtcRoomId ? `Set (${rtcRoomId})` : 'MISSING',
    rtcUserId: rtcUserId ? `Set (${rtcUserId})` : 'MISSING',
    fallbackToken: fallbackToken ? `Set (${fallbackToken.substring(0, 8)}...)` : 'MISSING'
  });

  // Validate core environment variables first
  if (!rtcAppId || !rtcAppKey || !rtcRoomId || !rtcUserId) {
    const missingVars = [];
    if (!rtcAppId) missingVars.push('RTC_APP_ID');
    if (!rtcAppKey) missingVars.push('RTC_APP_KEY');
    if (!rtcRoomId) missingVars.push('RTC_ROOM_ID');
    if (!rtcUserId) missingVars.push('USER_RTC_ID');
    
    console.error('[API/rtc-token] Missing required environment variables:', missingVars);
    return NextResponse.json(
      { error: `Missing required environment variables: ${missingVars.join(', ')}` },
      { status: 500 }
    );
  }

  // Attempt token generation
  const tokenExpiry = Math.floor(Date.now() / 1000) + 3600;
  console.log('[API/rtc-token] Attempting token generation with expiry:', new Date(tokenExpiry * 1000).toISOString());
  
  let rtcToken;
  try {
    rtcToken = generateRtcToken(rtcAppId, rtcAppKey, rtcRoomId, rtcUserId, tokenExpiry);
    console.log('[API/rtc-token] Token generation result:', rtcToken ? 'SUCCESS' : 'FAILED (returned falsy)');
  } catch (error) {
    console.error('[API/rtc-token] Token generation threw error:', error);
    rtcToken = null;
  }

  // Use fallback if generation failed
  if (!rtcToken) {
    console.log('[API/rtc-token] Using fallback token:', fallbackToken ? 'Available' : 'MISSING');
    rtcToken = fallbackToken;
  }

  // Final validation
  if (!rtcToken) {
    console.error('[API/rtc-token] No valid token available (neither generated nor fallback)');
    return NextResponse.json(
      { error: 'Unable to generate RTC token. Both token generation and fallback failed.' },
      { status: 500 }
    );
  }

  console.log('[API/rtc-token] Successfully prepared RTC credentials');
  
  // Return the necessary credentials to the client.
  // Only return what the client absolutely needs to initialize the RTC engine.
  return NextResponse.json({
    rtcAppId,
    rtcRoomId,
    rtcUserId,
    rtcToken,
  });
}
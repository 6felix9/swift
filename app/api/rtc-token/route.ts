import { NextResponse } from 'next/server';

/**
 * API route to securely provide RTC credentials to the client.
 * Reads sensitive information from server-side environment variables.
 */
export async function GET() {
  // These variables are only accessed on the server, keeping them secret.
  const rtcAppId = process.env.RTC_APP_ID;
  const userRtcToken = process.env.USER_RTC_TOKEN;
  const rtcRoomId = process.env.RTC_ROOM_ID;
  const userRtcId = process.env.USER_RTC_ID;

  // Validate that all required environment variables are set.
  if (!rtcAppId || !userRtcToken || !rtcRoomId || !userRtcId) {
    console.error('[API/rtc-token] Missing one or more required RTC environment variables on the server.');
    return NextResponse.json(
      { error: 'Server configuration error. Please contact an administrator.' },
      { status: 500 }
    );
  }

  // Return the necessary credentials to the client.
  // Only return what the client absolutely needs to initialize the RTC engine.
  return NextResponse.json({
    rtcAppId,
    userRtcToken,
    rtcRoomId,
    userRtcId,
  });
}

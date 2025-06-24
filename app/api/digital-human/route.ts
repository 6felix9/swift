import { NextRequest, NextResponse } from 'next/server';
import {
  connectDigitalHuman,
  sendDigitalHumanMessage,
  closeDigitalHumanConnection,
} from '@/lib/digitalHumanService';
import { generateRtcToken } from "@/lib/generateAvatarToken";
import { getPersonaById } from '@/lib/personas';

/**
 * Handles POST requests to /api/digital-human.
 * Initiates a WebSocket connection to the Digital Human backend.
 */
export async function POST(req: NextRequest) {
  // Ignore any body from the client, use server-side values only
  // const avatarRtcToken = generateRtcToken(process.env.RTC_APP_ID!, process.env.RTC_APP_KEY!, process.env.RTC_ROOM_ID!, process.env.AVATAR_RTC_USER_ID!, 3600);

  // Parse personaId from JSON body
  const { personaId } = await req.json();
  const persona = getPersonaById(personaId as string);
  
  // Use 'let' for avatarRole as it might be reassigned
  let avatarRole = persona?.avatarRole; 
  if (!avatarRole) { // If persona-specific role is not available, use default
    avatarRole = process.env.AVATAR_ROLE!; 
  }

  const params = {
    live: { live_id: `keyreply-live-${Date.now()}` }, 
    auth: { 
      appid: process.env.BYTEPLUS_APP_ID!, 
      token: process.env.BYTEPLUS_ACCESS_TOKEN! 
    },
    avatar: {
      avatar_type: '3min' as const,
      input_mode: 'audio' as const,
      role: avatarRole, 
      video: {
        bitrate: 8000,
      }
    },
    streaming: {
      type: 'bytertc' as const,
      rtc_app_id: process.env.RTC_APP_ID!,
      rtc_room_id: process.env.RTC_ROOM_ID!,
      rtc_uid: process.env.AVATAR_RTC_USER_ID!,
      rtc_token: process.env.AVATAR_RTC_TOKEN!
    }
  };

  try {
    const sessionId = crypto.randomUUID();
    await connectDigitalHuman(sessionId, params);
    return NextResponse.json({ message: 'Digital Human connection initiated.', sessionId });
  } catch (error: any) {
    // Ensure error message is a string for safe JSON serialization
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to connect to Digital Human.' }, { status: 500 });
  }
}

/**
 * Handles GET requests to /api/digital-human.
 * Can be used to check WebSocket status or send a test message.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: '`sessionId` query parameter is required.' }, { status: 400 });
  }

  if (action === 'send_test') {
    const header = searchParams.get('header');
    const message = searchParams.get('message');
    if (!header) {
      return NextResponse.json({ error: '`header` query parameter is required for send_test action.' }, { status: 400 });
    }
    try {
      const body = message ? JSON.parse(message) : undefined;
      sendDigitalHumanMessage(sessionId, header, body);
      return NextResponse.json({ status: `Test message with header '${header}' sent to session ${sessionId}.` });
    } catch (e: any) {
      return NextResponse.json({ error: 'Invalid JSON in `message` query parameter.' }, { status: 400 });
    }
  } else if (action === 'disconnect') {
    closeDigitalHumanConnection(sessionId);
    return NextResponse.json({ status: `Digital Human WebSocket connection for session ${sessionId} closed successfully.` });
  } else {
    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  }
}


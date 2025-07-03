import { NextRequest, NextResponse } from 'next/server';
import {
  connectDigitalHuman,
  closeDigitalHumanConnection,
  forceDigitalHumanInterrupt,
} from '@/lib/digitalHumanService';
import { generateRtcToken } from "@/lib/generateToken";
import { getPersonaById } from '@/lib/personas';
import { streamingStateManager } from '@/lib/streamingState';

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

  // Generate Avatar RTC Token
  const avatarRtcToken = generateRtcToken(process.env.RTC_APP_ID!, process.env.RTC_APP_KEY!, process.env.RTC_ROOM_ID!, process.env.AVATAR_RTC_USER_ID!, Math.floor(Date.now() / 1000) + 3600 ) || process.env.AVATAR_RTC_TOKEN!;

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
      rtc_token: avatarRtcToken,
    }
  };

  try {
    const sessionId = crypto.randomUUID();
    await connectDigitalHuman(sessionId, params);
    return NextResponse.json({ message: 'Digital Human session connected.', sessionId });
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

  if (action === 'disconnect') {
    closeDigitalHumanConnection(sessionId);
    return NextResponse.json({ status: `Digital Human session disconnected.` });
  } else {
    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  }
}

/**
 * Handles PATCH requests to /api/digital-human.
 * Used to interrupt the digital human's current speech.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required in the request body' }, { status: 400 });
    }
    
    // Check if connection exists before attempting interrupt
    const instance = globalThis.digitalHumanMap.get(sessionId);
    if (!instance) {
      return NextResponse.json({ 
        error: `No active WebSocket connection found for sessionId: ${sessionId}` 
      }, { status: 404 });
    }
    
    if (instance.ws.readyState !== WebSocket.OPEN) {
      return NextResponse.json({ 
        error: `WebSocket connection for sessionId ${sessionId} is not open (state: ${instance.ws.readyState})` 
      }, { status: 400 });
    }
    
    console.log(`[API] Interrupting digital human for sessionId: ${sessionId}`);
    
    // Use singleton to trigger interrupt (returns false if already interrupted)
    const wasNewInterrupt = streamingStateManager.interrupt(sessionId);
    
    // Only send WebSocket interrupt if this is a new interrupt to avoid redundant messages
    if (wasNewInterrupt) {
      forceDigitalHumanInterrupt(sessionId);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Interrupt signal sent to digital human` 
    });
  } catch (error: any) {
    console.error(`[API] Error interrupting digital human:`, error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to interrupt digital human' 
    }, { status: 500 });
  }
}


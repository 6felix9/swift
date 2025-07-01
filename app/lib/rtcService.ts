import BytePlusRTC, { type IRTCEngine, StreamIndex, MediaType } from '@byteplus/rtc';

let engine: IRTCEngine | null = null;

/**
 * Configuration for the RTC service when initializing and joining a room.
 */
export interface RTCInitializeConfig {
  videoContainerId: string; // ID of the DOM element for video rendering
}

/**
 * Initializes the BytePlusRTC engine by fetching secure credentials from the server,
 * setting up event listeners, and joining the specified room.
 * @param config - Configuration object for UI-specific details like videoContainerId.
 */
export const initializeAndJoinRoom = async (config: RTCInitializeConfig): Promise<void> => {
  if (engine) {
    console.info('[RTCService] Engine already initialized. Skipping initialization.');
    return;
  }

  // Step 1: Fetch credentials from the secure API endpoint
  let rtcCredentials;
  try {
    console.info('[RTCService] Fetching RTC credentials from /api/rtc-token...');
    const response = await fetch('/api/rtc-token');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
      throw new Error(`Failed to fetch RTC credentials: ${response.status} ${response.statusText} - ${errorData.error}`);
    }
    rtcCredentials = await response.json();
    console.info('[RTCService] Successfully fetched RTC credentials.');
  } catch (error) {
    console.error('[RTCService] Could not fetch RTC credentials from server.', error);
    throw error; // Re-throw so the UI can handle it
  }

  const { rtcAppId, rtcRoomId, rtcUserId, rtcToken } = rtcCredentials;

  // Step 2: Initialize the RTC Engine
  console.info(`[RTCService] Initializing BytePlusRTC engine with App ID: ${rtcAppId}`);
  try {
    engine = BytePlusRTC.createEngine(rtcAppId);
    console.info('[RTCService] Engine created successfully.');
  } catch (error) {
    console.error('[RTCService] Failed to create RTC engine:', error);
    return; // Cannot proceed without an engine
  }

  // --- Event Listeners --- 

  // General engine errors
  engine.on(BytePlusRTC.events.onError, (event: any) => { 
    console.error(`[RTCService] Engine error: code=${event.errorCode}, message=${event.message}`);
  });

  // Remote user publishes a stream
  engine.on(BytePlusRTC.events.onUserPublishStream, async (e: {
    userId: string;
    mediaType: MediaType;
  }) => { 
    console.info(`[RTCService] User ${e.userId} published stream. Media type: ${e.mediaType}`);

    // Only attempt to set up video player for video streams
    const playerContainer = document.getElementById(config.videoContainerId);
    if (playerContainer) {
      console.info(`[RTCService] Setting remote video for user ${e.userId} in container #${config.videoContainerId}.`);
      if (engine) {
        try {
          await engine.setRemoteVideoPlayer(StreamIndex.STREAM_INDEX_MAIN, {
            userId: e.userId,
            renderDom: playerContainer,
          });
          console.info(`[RTCService] Remote video player set successfully for user ${e.userId}.`);
        } catch (err: any) {
          console.error(`[RTCService] Error setting remote video player for user ${e.userId}:`, err);
        }
      } else {
        console.warn('[RTCService] RTC Engine is null. Cannot set remote video player.');
      }
    } else {
      console.warn(`[RTCService] Video container element #${config.videoContainerId} not found. Cannot render remote video for user ${e.userId}.`);
    }
  });

  console.info('[RTCService] All event listeners attached.');

  // Step 3: Join the Room
  try {
    console.info(`[RTCService] Attempting to join room: ${rtcRoomId} as user: ${rtcUserId}`);
    await engine.joinRoom(
      "001684f9f8e5298ce0177f40133OgASw/hng+RcaIP+q2gFAHJvb20xBQB1c2VyMQUAAACD/qtoAQCD/qtoAgCD/qtoAwCD/qtoBACD/qtoIAA0ADQIeXXHpPPFaVUcGGQuhEZUpWx76KKbsoy1r2LAxQ==",
      rtcRoomId,
      { userId: rtcUserId },
      {
        isAutoPublish: true,        // Automatically publish local audio/video streams upon joining
        isAutoSubscribeAudio: true, // Automatically subscribe to remote audio streams
        isAutoSubscribeVideo: true, // Automatically subscribe to remote video streams
      }
    );
    console.info(`[RTCService] Successfully joined room: ${rtcRoomId} with User ID: ${rtcUserId}.`);
  } catch (error) {
    console.error('[RTCService] Failed to join room:', error);
    // Consider destroying the engine if joinRoom fails critically
    BytePlusRTC.destroyEngine(engine);
    engine = null;
    throw error; // Re-throw to allow the caller to handle UI updates or further actions
  }
};

/**
 * Leaves the current RTC room and destroys the engine instance.
 */
export const leaveAndDestroyRoom = async (): Promise<void> => {
  if (!engine) {
    console.info('[RTCService] No RTC engine instance to destroy.');
    return;
  }
  try {
    console.info('[RTCService] Attempting to leave room...');
    await engine.leaveRoom();
    console.info('[RTCService] Successfully left RTC room.');
  } catch (err) {
    console.error('[RTCService] Failed to leave room:', err);
    // Proceed to destroy engine even if leaveRoom fails, as per typical cleanup logic
  }
  
  console.info('[RTCService] Destroying RTC engine...');
  BytePlusRTC.destroyEngine(engine);
  console.info('[RTCService] RTC engine destroyed.');
  engine = null;
};

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { sendDigitalHumanBinaryData, sendDigitalHumanMessage, Protocol } from '@/lib/digitalHumanService';
import { streamingStateManager } from '@/lib/streamingState';

// Initialize the ElevenLabs client
export const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// Default voice to use if not specified
const DEFAULT_VOICE = 'English'; 
// Default model to use
// const DEFAULT_MODEL = 'eleven_v3';
const DEFAULT_MODEL = 'eleven_flash_v2_5';

/**
 * Generate speech from text using ElevenLabs
 * @param sessionId The session ID for managing streaming state
 * @param text The text to convert to speech
 * @param voice_id The voice ID to use (defaults to DEFAULT_VOICE)
 * @returns A Promise that resolves when speech generation is complete
 */
export async function generateSpeech(
  sessionId: string,
  text: string,
  voice_id: string = DEFAULT_VOICE,
): Promise<void> {

  // remove text within brackets
  text = text.replace(/\(.*?\)/g, '');

  try {
    console.log(`Generating speech with ElevenLabs - Voice: ${voice_id}, Model: ${DEFAULT_MODEL}, Text length: ${text.length}`);
    console.log(`API Key present: ${!!process.env.ELEVENLABS_API_KEY}`);
    
    console.log(`Using voice_id: ${voice_id}`);

    // Initialize session state
    streamingStateManager.initializeSession(sessionId);
    let wasInterrupted = false;
    
    const audioStream = await elevenlabs.textToSpeech.stream(
      voice_id,
      {
        text,
        modelId: DEFAULT_MODEL,
        outputFormat: 'pcm_16000',
      }
    );

    // Indicate start of PCM audio stream
    sendDigitalHumanMessage(sessionId, Protocol.DAT_PCM_START);
    console.log(`[ElevenLabs] Indicated start of PCM audio stream for sessionId ${sessionId}.`);

    // Set streaming state
    streamingStateManager.setIsStreaming(sessionId, true);

    let leftover = new Uint8Array(0);
    const reader = audioStream.getReader();
    
    while (true) {
      // Check for interrupt request
      if (streamingStateManager.getStopStream(sessionId)) {
        console.log('[ElevenLabs] 🛑 Stream interrupted - stopping PCM production...');
        wasInterrupted = true;
        break;
      }

      const { done, value: chunk } = await reader.read();
      if (done) {
        break;
      }

      const inBuf = new Uint8Array(leftover.length + chunk.byteLength);
      inBuf.set(leftover, 0);
      inBuf.set(new Uint8Array(chunk), leftover.length);

      let offset = 0;
      while (inBuf.byteLength - offset >= 1280) {
        // Check for interrupt even within chunk processing
        if (streamingStateManager.getStopStream(sessionId)) {
          console.log('[ElevenLabs] 🛑 Stream interrupted during chunk processing - stopping...');
          wasInterrupted = true;
          break;
        }

        const slice = inBuf.slice(offset, offset + 1280);
        sendDigitalHumanBinaryData(sessionId, slice);
        offset += 1280;
        await new Promise(r => setTimeout(r, 40)); // Faster pacing for 16kHz
      }
      
      if (wasInterrupted) break;
      leftover = inBuf.slice(offset);
    }

    // Handle interrupt coordination
    if (wasInterrupted && streamingStateManager.getIsInterrupting(sessionId)) {
      console.log('[ElevenLabs] CLIENT SENT FORCE INTERRUPT.');
      sendDigitalHumanMessage(sessionId, Protocol.CTL_INTERRUPT);
      
      // Wait for WebSocket buffer to drain
      console.log('[ElevenLabs] Waiting for WebSocket buffer to drain...');
      await new Promise(r => setTimeout(r, 50));
      
      console.log('[ElevenLabs] CLIENT SENT END OF STREAM.');
      sendDigitalHumanMessage(sessionId, Protocol.CTL_END_OF_STREAM);
      console.log('[ElevenLabs] ✅ Force interrupt completed.');
    } else if (!wasInterrupted) {
      // Normal completion - send any remaining data
      if (leftover.byteLength > 0) {
        const padded = new Uint8Array(1280);
        padded.set(leftover, 0);
        // console.log('[ElevenLabs] Sending final binary data.');
        sendDigitalHumanBinaryData(sessionId, padded);
      }
      
      console.log('[ElevenLabs] CLIENT SENT END OF STREAM.');
      sendDigitalHumanMessage(sessionId, Protocol.CTL_END_OF_STREAM);
      console.log('[ElevenLabs] ✅ Finished streaming from ElevenLabs.');
    }
    
  } catch (error: any) {
    console.error('[ElevenLabs] ElevenLabs TTS error:', error);
    console.error('[ElevenLabs] Error details:', JSON.stringify(error, null, 2));
    console.error('[ElevenLabs] ElevenLabs error:', error.message ?? String(error));
  } finally {
    // Reset all flags on exit
    streamingStateManager.resetSession(sessionId);
  }
}

/**
 * Get all available voices from ElevenLabs
 * @returns Array of voice objects
 */
export async function getVoices() {
  try {
    return await elevenlabs.voices.getAll();
  } catch (error) {
    console.error('[ElevenLabs] Error fetching ElevenLabs voices:', error);
    throw error;
  }
}
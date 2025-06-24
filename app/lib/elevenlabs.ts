import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { sendDigitalHumanBinaryData, sendDigitalHumanMessage, Protocol } from './digitalHumanService';
import { stopStreamRef } from './digitalHumanService';

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
 * @param text The text to convert to speech
 * @param voice The voice to use (defaults to Adam)
 * @returns A ReadableStream of the audio data
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
    
    const audioStream  = await elevenlabs.textToSpeech.stream(
      voice_id,
      {
        text,
        modelId: DEFAULT_MODEL,
        outputFormat: 'pcm_16000',
      }
    );

    // Indicate start of PCM audio stream
    sendDigitalHumanMessage(sessionId, Protocol.DAT_PCM_START);

    // Reset stopStreamRef at the start of a new stream
    stopStreamRef.current = false;

    try {
      let leftover = new Uint8Array(0);
      const reader = audioStream.getReader();
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) {
          break;
        }

        if (stopStreamRef?.current) {
          console.log('Streaming interrupted by user.');
          sendDigitalHumanMessage(sessionId, Protocol.CTL_END_OF_STREAM);
          reader.cancel(); // Cancel the stream
          break;
        }

        const inBuf = new Uint8Array(leftover.length + chunk.byteLength);
        inBuf.set(leftover, 0);
        inBuf.set(new Uint8Array(chunk), leftover.length);

        let offset = 0;
        while (inBuf.byteLength - offset >= 1280) {
          const slice = inBuf.slice(offset, offset + 1280);
          sendDigitalHumanBinaryData(sessionId, slice);
          offset += 1280;
          await new Promise(r => setTimeout(r, 40)); // Pacing
        }
        leftover = inBuf.slice(offset);
      }

      if (leftover.byteLength > 0 && !stopStreamRef?.current) {
        const padded = new Uint8Array(1280);
        padded.set(leftover, 0);
        sendDigitalHumanBinaryData(sessionId, padded);
      }

      if (!stopStreamRef?.current) {
        sendDigitalHumanMessage(sessionId, Protocol.CTL_END_OF_STREAM);
        console.log('✅ Finished streaming from ElevenLabs.');
      }
    } catch (error) {
      console.error('Error during audio stream processing:', error);
      throw error;
    }
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
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
    console.error('Error fetching ElevenLabs voices:', error);
    throw error;
  }
}

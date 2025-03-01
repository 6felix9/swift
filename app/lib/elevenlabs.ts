import { ElevenLabsClient } from 'elevenlabs';
import { Readable } from 'stream';

// Initialize the ElevenLabs client
export const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// Default voice to use if not specified
const DEFAULT_VOICE = 'Afifah';
// Default model to use
const DEFAULT_MODEL = 'eleven_flash_v2_5';

// Voice ID mapping - Add more as needed
const VOICE_IDS: Record<string, string> = {
  'Afifah': 'UcqZLa941Kkt8ZhEEybf',
};

/**
 * Generate speech from text using ElevenLabs
 * @param text The text to convert to speech
 * @param voice The voice to use (defaults to Adam)
 * @param streamOutput Whether to stream the audio (defaults to true)
 * @returns A ReadableStream of the audio data
 */
export async function generateSpeech(
  text: string, 
  voice: string = DEFAULT_VOICE, 
  streamOutput: boolean = true
): Promise<ReadableStream<Uint8Array>> {
  try {
    console.log(`Generating speech with ElevenLabs - Voice: ${voice}, Model: ${DEFAULT_MODEL}, Text length: ${text.length}`);
    console.log(`API Key present: ${!!process.env.ELEVENLABS_API_KEY}`);
    
    // Get the voice ID from the mapping or use the provided voice as an ID
    const voice_id = VOICE_IDS[voice] || voice;
    console.log(`Using voice_id: ${voice_id}`);
    
    // Using the textToSpeech API endpoint
    const audioStream = await elevenlabs.textToSpeech.convertAsStream(voice_id, {
      text,
      model_id: DEFAULT_MODEL,
    });
    
    console.log('ElevenLabs audio stream generated successfully');
    
    // Convert the async iterable to a ReadableStream
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of audioStream) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });
    
    return readableStream;
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
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

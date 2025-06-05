import { ElevenLabsClient } from 'elevenlabs';
import { Readable } from 'stream';

// Initialize the ElevenLabs client
export const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// Default voice to use if not specified
const DEFAULT_VOICE = 'English'; 
// Default model to use
const DEFAULT_MODEL = 'eleven_flash_v2_5';

// Voice ID mapping - Add more as needed
const VOICE_IDS: Record<string, string> = {
  'Insurance': 'ZyIwtt7dzBKVYuXxaRw7',
  'English': '7QwDAfHpHjPD14XYTSiq', //'Auntie';
  'Malay': 'UcqZLa941Kkt8ZhEEybf',
  'Chinese': 'FjfxJryh105iTLL4ktHB', // Liang
  'Tamil': 'EaBs7G1VibMrNAuz2Na7', // Temporary 'gCr8TeSJgJaeaIoV4RWH', //Meera
  'Indonesian': 'iWydkXKoiVtvdn4vLKp9', //'Afifah';
  'Unknown': 'iWydkXKoiVtvdn4vLKp9', 
  'Multiple': 'iWydkXKoiVtvdn4vLKp9',
};

// Define an enum for the languages we want to detect
enum DetectedLanguage {
  Insurance = "Insurance",
  English = "English",
  Chinese = "Chinese",
  Tamil = "Tamil",
  Unknown = "Unknown",
  Multiple = "Multiple" // Added for cases where multiple scripts are detected
}

/**
 * Detects the primary language of a given text string.
 * It checks for English, Chinese, and Tamil characters.
 *
 * @param text The text string to analyze.
 * @returns DetectedLanguage enum value.
 */
function detectLanguage(text: string): DetectedLanguage {
  return DetectedLanguage.Insurance;

  if (!text || text.trim() === "") {
    return DetectedLanguage.Unknown; // Handle empty or whitespace-only strings
  }

  // Regular expressions for character ranges
  // English: Basic Latin alphabet (A-Z, a-z)
  const englishRegex = /[a-zA-Z]/;
  // Chinese: Common CJK Unified Ideographs. This range covers most common Chinese characters.
  // For a more comprehensive check, you might need to include other CJK ranges.
  const chineseRegex = /[\u4E00-\u9FFF]/;
  // Tamil: Tamil script characters
  const tamilRegex = /[\u0B80-\u0BFF]/;

  // Test for the presence of characters from each language
  const hasEnglish = englishRegex.test(text);
  const hasChinese = chineseRegex.test(text);
  const hasTamil = tamilRegex.test(text);

  let detectedCount = 0;
  if (hasEnglish) detectedCount++;
  if (hasChinese) detectedCount++;
  if (hasTamil) detectedCount++;

  // If multiple scripts are present, classify as 'Multiple'
  // You might want to refine this logic based on character counts or percentages
  // for more nuanced mixed-language detection.
  if (detectedCount > 1) {
    // Simple heuristic: if Chinese or Tamil is present, prioritize them over English in mixed contexts
    // This is a common scenario (e.g., English words in Chinese/Tamil text).
    // You can adjust this prioritization as needed.
    if (hasTamil && hasChinese) return DetectedLanguage.Multiple; // Or a specific "Chinese+Tamil"
    if (hasTamil) return DetectedLanguage.Tamil; // Prioritize if mixed with English
    if (hasChinese) return DetectedLanguage.Chinese; // Prioritize if mixed with English
    return DetectedLanguage.Multiple;
  }

  // Prioritize Tamil and Chinese detection due to their distinct scripts
  if (hasTamil) {
    return DetectedLanguage.Tamil;
  }
  if (hasChinese) {
    return DetectedLanguage.Chinese;
  }
  if (hasEnglish) {
    return DetectedLanguage.English;
  }

  return DetectedLanguage.Unknown; // If none of the specific scripts are found
}

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

  const language = detectLanguage(text);

  voice = VOICE_IDS[language];

  // remove text within brackets
  text = text.replace(/\(.*?\)/g, '');

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

import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function getTranscript(input: string | File) {
	console.log("Received input:", input);

	// Validate input type
	if (typeof input === "string") {
		console.log("Processing string input");
		return input;
	}

	try {
		// Check if input is File or Blob and has a valid audio type
		const validAudioTypes = [
			"audio/flac",
			"audio/mp3",
			"audio/mp4",
			"audio/mpeg",
			"audio/mpga",
			"audio/m4a",
			"audio/ogg",
			"audio/opus",
			"audio/wav",
			"audio/webm",
		];
		const fileType = input.type;

		if (!validAudioTypes.includes(fileType)) {
			console.error(
				`Invalid audio type: ${fileType}. Must be one of: ${
					validAudioTypes.join(", ")
				}`,
			);
			return null;
		}

		// Create a new File with proper MIME type if needed
		let file = input;
		// Measure latency for the Groq Whisper API call
		const sttStart = Date.now();
		const { text } = await groq.audio.transcriptions.create({
			file,
			prompt: "English only",
			model: "distil-whisper-large-v3-en",
			// model: "whisper-large-v3-en",
		});
		const sttEnd = Date.now();
		console.log(`Groq Whisper STT API latency: ${sttEnd - sttStart} ms`);

		return text.trim() || null;
	} catch (e) {
		console.error("Transcription error:", e);
		return null; // Empty audio file
    }
}
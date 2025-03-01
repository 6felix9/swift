import Groq from "groq-sdk";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { after } from "next/server";
import voices from "@/lib/embedding";
import { PROMPTS } from "@/lib/prompt";
import { generateSpeech } from "@/lib/elevenlabs";

const groq = new Groq();

const schema = zfd.formData({
	input: z.union([
		zfd.text(),
		zfd.file(),
	]),
	message: z.string(),
});

export async function POST(request: Request) {
	const requestId = request.headers.get("x-vercel-id") ||
		Date.now().toString();
	const transcribeLabel = `transcribe-${requestId}`;
	const completionLabel = `completion-${requestId}`;

	console.time(transcribeLabel);
	const formData = await request.formData();
	const { data, success, error } = schema.safeParse(formData);
	if (!success) return new Response("Invalid request", { status: 400 });

	const transcript = await getTranscript(data.input);
	if (!transcript) return new Response("Invalid audio", { status: 400 });
	console.log("\x1b[32m%s\x1b[0m", transcript); // Sets the color to green

	console.timeEnd(transcribeLabel);
	console.time(completionLabel);

	let response =
		(transcript == "Hello"
			? "Hello, this is CelcomDigi's Customer Service. I'm Christine, How may I assist you today?"
			: null)!;

	if (!response) {
		const completion = await groq.chat.completions.create({
			model: "llama-3.3-70b-versatile", // "mistral-saba-24b",
			messages: [
				{
					role: "system",
					content: PROMPTS.CELCOMDIGI,
				},
				...JSON.parse(data.message),
				{
					role: "user",
					content: transcript,
				},
			],
		});

		response = completion.choices[0].message.content;
	}

	console.log("\x1b[32m%s\x1b[0m", response);
	// "send you a link"
	if (response?.match(/WhatsApp/)) {
		fetch("https://omni.keyreply.com/api/v1/whatsapp/sendLink");
	}

	console.timeEnd(completionLabel);

	// remove * from response
	response = response.replace(/\*/g, "");

	// Try ElevenLabs first
	try {
		const elevenLabsLabel = `elevenlabs-${requestId}`;
		console.log(
			`[${requestId}] Calling ElevenLabs with text length: ${response.length}`,
		);
		console.log(
			`[${requestId}] Using default voice: ${
				process.env.ELEVENLABS_DEFAULT_VOICE || "Adam"
			}`,
		);
		console.log(
			`[${requestId}] API Key present: ${!!process.env
				.ELEVENLABS_API_KEY}`,
		);

		try {
			const audioStream = await generateSpeech(response);

			return new Response(audioStream, {
				headers: {
					"X-Transcript": encodeURIComponent(transcript),
					"X-Response": encodeURIComponent(response!),
					"Content-Type": "audio/mpeg",
				},
			});
		} catch (elevenLabsError) {
			console.error(`[${requestId}] ElevenLabs error:`, elevenLabsError);
			console.log(
				`[${requestId}] Error details:`,
				JSON.stringify(elevenLabsError, null, 2),
			);
			throw elevenLabsError;
		}
	} catch (error) {
		// If ElevenLabs fails, fall back to Cartesia
		console.error(
			"ElevenLabs TTS failed, falling back to Cartesia:",
			error,
		);

		const cartesiaLabel = `cartesia-${requestId}`;
		console.time(cartesiaLabel);

		const useMultilingual = response?.match(
			/[\u3400-\u9FBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/,
		);

		const voice = await fetch("https://api.cartesia.ai/tts/bytes", {
			method: "POST",
			headers: {
				"Cartesia-Version": "2024-06-10",
				"Content-Type": "application/json",
				"X-API-Key": process.env.CARTESIA_API_KEY!,
			},
			body: JSON.stringify({
				model_id: useMultilingual
					? "sonic-multilingual"
					: "sonic-english",
				transcript: response,
				voice: {
					mode: "embedding",
					embedding: voices.singapore,
					"__experimental_controls": {
						"speed": "normal",
						"emotion": [
							"positivity",
						],
					},
				},
				output_format: {
					container: "raw",
					encoding: "pcm_f32le",
					sample_rate: 24000,
				},
			}),
		});

		console.timeEnd(cartesiaLabel);

		if (!voice.ok) {
			console.error(await voice.text());
			return new Response("Voice synthesis failed", { status: 500 });
		}

		console.time(
			"stream " + (request.headers.get("x-vercel-id") || "local"),
		);
		after(() => {
			console.timeEnd(
				"stream " + (request.headers.get("x-vercel-id") || "local"),
			);
		});

		return new Response(voice.body, {
			headers: {
				"X-Transcript": encodeURIComponent(transcript),
				"X-Response": encodeURIComponent(response!),
			},
		});
	}
}

async function getTranscript(input: string | Groq.Uploadable) {
	console.log("Received input:", input);

	// Validate input type
	if (typeof input === "string") {
		console.log("Processing string input");
		return input;
	}

	// Log input details for debugging
	console.log("Input type", {
		type: typeof input,
		constructorName: input?.constructor?.name,
		isFile: input instanceof File,
		isBlob: input instanceof Blob,
		properties: Object.keys(input || {}),
		fileType: input instanceof File
			? input.type
			: input instanceof Blob
			? input.type
			: "unknown",
	});

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
		const fileType = input instanceof File || input instanceof Blob
			? input.type
			: "";

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
		if (input instanceof Blob && !(input instanceof File)) {
			file = new File([input], "audio.wav", { type: input.type });
		}

		const { text } = await groq.audio.transcriptions.create({
			file,
			prompt: "Can be in either English, Chinese, or Malay",
			model: "whisper-large-v3",
		});

		return text.trim() || null;
	} catch (e) {
		console.error("Transcription error:", e);
		return null; // Empty audio file
	}
}

import Groq from "groq-sdk";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { unstable_after as after } from "next/server";
import voices from "@/lib/embedding";
import { prompt, RAG } from "@/lib/prompt";

const groq = new Groq();

const schema = zfd.formData({
	input: z.union([zfd.text(), zfd.file()]),
	message: zfd.repeatableOfType(
		zfd.json(
			z.object({
				role: z.enum(["user", "assistant"]),
				content: z.string(),
			})
		)
	),
});

export async function POST(request: Request) {
	console.time("transcribe " + (request.headers.get("x-vercel-id") || "local"));

	const { data, success } = schema.safeParse(await request.formData());
	if (!success) return new Response("Invalid request", { status: 400 });

	const transcript = await getTranscript(data.input);
	if (!transcript) return new Response("Invalid audio", { status: 400 });
	console.log('\x1b[32m%s\x1b[0m', transcript); // Sets the color to green


	console.timeEnd(
		"transcribe " + (request.headers.get("x-vercel-id") || "local")
	);
	console.time(
		"text completion " + (request.headers.get("x-vercel-id") || "local")
	);

	const completion = await groq.chat.completions.create({
		model: "gemma2-9b-it",
		messages: [
			{
				role: "system",
				content: RAG(transcript),
			},
			...data.message,
			{
				role: "user",
				content: transcript,
			},
		],
	});

	let response = (transcript == "Hello" ? 'Hi, my name is Lisa, I can answer your questions regarding Healthier SG. What would you like to know about the program?' : completion.choices[0].message.content)!;

	console.log('\x1b[32m%s\x1b[0m', response);
	// "send you a link"
	if (response?.match(/WhatsApp/)) {
		fetch("https://omni.keyreply.com/api/v1/whatsapp/sendLink");
	}

	console.timeEnd(
		"text completion " + (request.headers.get("x-vercel-id") || "local")
	);

	console.time(
		"cartesia request " + (request.headers.get("x-vercel-id") || "local")
	);

	const useMultilingual = response?.match(/[\u3400-\u9FBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/);

	// remove * from response
	response = response.replace(/\*/g, '');

	const voice = await fetch("https://api.cartesia.ai/tts/bytes", {
		method: "POST",
		headers: {
			"Cartesia-Version": "2024-06-10",
			"Content-Type": "application/json",
			"X-API-Key": process.env.CARTESIA_API_KEY!,
		},
		body: JSON.stringify({
			model_id: useMultilingual ? "sonic-multilingual" : "sonic-english",
			transcript: response,
			voice: {
				mode: "embedding",
				embedding: voices.singapore,
				"__experimental_controls": {
					"speed": "normal",
					"emotion": [
						"positivity"
					]
				}
			},
			output_format: {
				container: "raw",
				encoding: "pcm_f32le",
				sample_rate: 24000,
			},
		}),
	});

	console.timeEnd(
		"cartesia request " + (request.headers.get("x-vercel-id") || "local")
	);

	if (!voice.ok) {
		console.error(await voice.text());
		return new Response("Voice synthesis failed", { status: 500 });
	}

	console.time("stream " + (request.headers.get("x-vercel-id") || "local"));
	after(() => {
		console.timeEnd(
			"stream " + (request.headers.get("x-vercel-id") || "local")
		);
	});

	return new Response(voice.body, {
		headers: {
			"X-Transcript": encodeURIComponent(transcript),
			"X-Response": encodeURIComponent(response!),
		},
	});
}

async function getTranscript(input: string | File) {
	if (typeof input === "string") return input;

	try {
		const { text } = await groq.audio.transcriptions.create({
			file: input,
			model: "whisper-large-v3",
			language: "en",
		});

		return text.trim() || null;
	} catch {
		return null; // Empty audio file
	}
}

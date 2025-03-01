"use client";

import clsx from "clsx";
import { useActionState, useEffect, useRef, useState, useCallback, startTransition } from "react";
import { toast } from "sonner";
import { EnterIcon, LoadingIcon } from "@/lib/icons";
import { usePlayer } from "@/lib/usePlayer";
import { useMicVAD, utils } from "@ricky0123/vad-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { AIVoiceInput } from "@/components/ui/ai-voice-input";

const brandColors = {
  primary: '#002B49',
  secondary: '#FFB800',
  white: '#FFFFFF',
  gray: '#F5F5F5',
  text: '#333333',
  lightBlue: '#E5F0FF',
  lightYellow: '#FFF3D6'
};

type Message = {
	role: "user" | "assistant";
	content: string;
	latency?: number;
};

export default function Home() {
  const mainContainerStyle = {
    background: 'transparent',
    minHeight: '100vh',
    padding: '2rem',
    color: brandColors.white
  };
	const [input, setInput] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const player = usePlayer();
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const [isListening, setIsListening] = useState(false);
	const [manualListening, setManualListening] = useState(false);

	const [messages, setMessages] = useState<Message[]>([]);
	const [isPending, setIsPending] = useState(false);


	// Define vad first before using it in submit
	const vad = useMicVAD({
		model:"v5",
		startOnLoad: true,
		onSpeechStart: () => {
			if (!manualListening) {
				setIsListening(true);
			}
		},
		onSpeechEnd: async (audio) => {
			player.stop();
			const wav = utils.encodeWAV(audio);
			// Create a File object instead of Blob to ensure proper handling
			const audioFile = new File([wav], 'voice-message.wav', { type: 'audio/wav' });
			console.log('Sending audio file:', {
				type: audioFile.type,
				size: audioFile.size,
				name: audioFile.name
			});
			handleSubmit(audioFile);
			if (!manualListening) {
				setIsListening(false);
			}
			const isFirefox = navigator.userAgent.includes("Firefox");
			if (isFirefox) vad.pause();
		},
		workletURL: "/vad.worklet.bundle.min.js",
		modelURL: "/silero_vad_v5.onnx",
		positiveSpeechThreshold: 0.6,
		minSpeechFrames: 4,
		ortConfig(ort) {
			const isSafari = /^((?!chrome|android).)*safari/i.test(
				navigator.userAgent
			);

			ort.env.wasm = {
				wasmPaths: {
					"ort-wasm-simd-threaded.wasm":
						"/ort-wasm-simd-threaded.wasm",
					"ort-wasm-simd.wasm": "/ort-wasm-simd.wasm",
					"ort-wasm.wasm": "/ort-wasm.wasm",
					"ort-wasm-threaded.wasm": "/ort-wasm-threaded.wasm",
				},
				numThreads: isSafari ? 1 : 4,
			};
		},
	});

	const handleSubmit = useCallback(async (data: string | Blob) => {
		if (isPending) return; // Prevent multiple submissions

		// Validate input type
		if (!(typeof data === 'string' || data instanceof Blob)) {
			console.error('Invalid input type:', {
				type: typeof data,
				constructorName: data?.constructor?.name,
				isBlob: data instanceof Blob
			});
			toast.error('We couldn\'t process this type of input. Please try text or voice.');
			return;
		}

		// For Blob inputs, ensure it's an audio file
		if (data instanceof Blob && !data.type.startsWith('audio/')) {
			console.error('Invalid audio type:', data.type);
			toast.error('We can only process voice messages. Please try again.');
			return;
		}

		setIsPending(true);
		try {
			const submittedAt = Date.now();
			const formData = new FormData();
			formData.append("input", data);

			// Only send the last 10 messages to keep the payload size reasonable
			const recentMessages = messages.slice(-10);
			formData.append(
				"message",
				JSON.stringify(
					recentMessages.map(({ role, content }) => ({ role, content }))
				)
			);

			try {
				const response = await fetch("/api", {
					method: "POST",
					body: formData,
				});

				if (!response.ok) {
					if (response.status === 429) {
						toast.error("We're experiencing high traffic. Please try again in a moment.");
					} else {
						toast.error((await response.text()) || "We couldn't process your request. Please try again.");
					}
					return;
				}

				const audioBlob = await response.blob();
				const latency = Date.now() - submittedAt;
				const transcript = decodeURIComponent(response.headers.get("X-Transcript") || "");
				const text = decodeURIComponent(response.headers.get("X-Response") || "");

				if (!transcript || !text) {
					toast.error("We couldn't understand the response. Please try again.");
					return;
				}

				if (typeof data === "string") {
					setInput("");
				}

				const contentType = response.headers.get("Content-Type");

				// Play audio and handle browser-specific behavior
				try {
					player.play(audioBlob, () => {
						const isFirefox = navigator.userAgent.includes("Firefox");
						if (isFirefox && vad) vad.start();
					}, contentType || undefined);
				} catch (audioError) {
					console.error("Audio playback error:", audioError);
					toast.error("We couldn't play the audio response. Please check your sound settings.");
				}

				// Update messages with new content
				setMessages(messages => [
					...messages,
					{ role: "user", content: transcript || (typeof data === "string" ? data : "Voice Message"), latency },
					{ role: "assistant", content: text, latency },
				]);

			} catch (error) {
				console.error(error);
				toast.error("Failed to send message");
			} finally {
				setIsPending(false);
			}
		} catch (error) {
			console.error(error);
			toast.error("Failed to send message");
		} finally {
			setIsPending(false);
		}
	}, [isPending, messages, player]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	useEffect(() => {
		if (!manualListening) {
			setIsListening(vad.userSpeaking);
		}
	}, [vad.userSpeaking, manualListening]);

	useEffect(() => {
		function keyDown(e: KeyboardEvent) {
			if (e.key === "Enter") return inputRef.current?.focus();
			if (e.key === "Escape") return setInput("");
		}

		window.addEventListener("keydown", keyDown);
		return () => window.removeEventListener("keydown", keyDown);
	}, []);

	return (
		<div className="w-full max-w-4xl mx-auto flex flex-col items-center relative z-10 space-y-8">
			<motion.div 
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="mb-8 text-center"
			>
				<div className="flex flex-col items-center gap-2">
					<h1 className="text-4xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#FFB800] via-[#FFC933] to-[#FFB800]">
						CelcomDigi <span className="font-light">Assistant</span>
					</h1>
					<p className="text-sm font-medium tracking-wider uppercase text-white letter-spacing-2">
						Innovation · Intelligence · Integration
					</p>
				</div>
			</motion.div>

			<div className="flex-1 overflow-y-auto px-4 pb-24 pt-4 space-y-6 w-full max-w-3xl mx-auto">
				<AnimatePresence>
					{messages.map((message, i) => (
						<motion.div
							key={i}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3 }}
						>
							<Card 
							className={clsx(
								"backdrop-blur-md shadow-lg transition-all duration-300 hover:shadow-xl",
								message.role === "assistant" 
									? "bg-[#002B49]/60 border border-[#002B49]/60 hover:bg-[#002B49]/70" 
									: "bg-[#FFB800]/40 border border-[#FFB800]/40 hover:bg-[#FFB800]/50"
							)}>
								<CardHeader className="pb-2">
									<CardTitle className="text-sm font-medium">
										{message.role === "assistant" ? "Assistant" : "You"}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<p className="whitespace-pre-wrap" style={{ 
								color: message.role === "assistant" ? "#FFFFFF" : "#FFFFFF",
								lineHeight: '1.6',
								fontSize: '1rem'
							}}>{message.content}</p>
								</CardContent>
							</Card>
						</motion.div>
					))}
				</AnimatePresence>
				<div ref={messagesEndRef} />
			</div>

			<div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto">
				{isListening && (
					<div className="mb-4 text-sm font-medium animate-pulse" style={{ color: brandColors.secondary }}>
						Listening...
					</div>
				)}
				
				<form
					className="flex items-center w-full max-w-3xl mx-4 gap-3"
					onSubmit={(e) => {
						e.preventDefault();
						handleSubmit(input);
					}}
				>
					<Input
						type="text"
						placeholder="Ask me about CelcomDigi services..."
						value={input}
						onChange={(e) => setInput(e.target.value)}
						ref={inputRef}
						disabled={isPending}
						className="flex-1 bg-[#001F35]/50 border border-white/20 rounded-xl focus:ring-2 focus:ring-[#FFB800]/50 transition-all duration-300 text-white placeholder:text-white/70"
					/>
					<Button
						type="submit"
						disabled={isPending || !input.trim()}
						className="bg-[#FFB800] hover:bg-[#FFA200] text-[#002B49] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:hover:bg-[#FFB800]"
					>
						{isPending ? (
							<LoadingIcon className="w-6 h-6 animate-spin" />
						) : (
							<EnterIcon className="w-6 h-6" />
						)}
					</Button>
				</form>


				<div className="pt-6 text-center max-w-xl text-balance min-h-16 mx-4" style={{ color: '#FFFFFF', fontSize: '0.95rem' }}>
					{messages.length === 0 && (
						<AnimatePresence>
							{vad.loading ? (
								<motion.p
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									className="flex items-center justify-center gap-2"
								>
									<LoadingIcon className="w-4 h-4" />
									Loading speech detection...
								</motion.p>
							) : vad.errored ? (
								<motion.p
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									style={{ color: '#FF6B6B' }}
								>
									Failed to load speech detection.
								</motion.p>
							) : (
								<motion.p
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
								>
									Start talking or type your message
								</motion.p>
							)}
						</AnimatePresence>
					)}
				</div>
			</div>

			<motion.div
				className="fixed w-48 h-48 blur-3xl rounded-full bg-gradient-to-b from-[#002B49] to-[#FFB800] opacity-20 -z-10"
				initial={{ opacity: 0 }}
				animate={{ 
					opacity: vad.loading || vad.errored ? 0 : vad.userSpeaking ? 0.4 : 0.2,
					scale: vad.userSpeaking ? 1.25 : 1
				}}
				transition={{ duration: 0.3 }}
			/>
		</div>
	);
}

function A(props: any) {
	return (
		<a
			{...props}
			className="text-primary hover:underline font-medium"
		/>
	);
}

import { useEffect, useRef, useState } from "react";

export function usePlayer() {
	const [isPlaying, setIsPlaying] = useState(false);
	const audioContext = useRef<AudioContext | null>(null);
	const source = useRef<AudioBufferSourceNode | null>(null);
	const audioElement = useRef<HTMLAudioElement | null>(null);

	async function play(stream: ReadableStream, callback: () => void, contentType?: string) {
		stop();
		
		// If the content type is MP3 (from ElevenLabs), use the Audio element
		if (contentType === 'audio/mpeg') {
			try {
				// Create a MediaSource from the stream
				const response = new Response(stream);
				const blob = await response.blob();
				const url = URL.createObjectURL(blob);
				
				// Create an audio element
				audioElement.current = new Audio(url);
				audioElement.current.onended = () => {
					stop();
					callback();
				};
				
				audioElement.current.onerror = (error) => {
					console.error('Audio playback error:', error);
					stop();
					callback();
				};
				
				// Play the audio
				setIsPlaying(true);
				audioElement.current.play();
				
				return;
			} catch (error) {
				console.error('Error playing MP3 stream:', error);
				// Fall back to PCM processing if MP3 fails
			}
		}
		
		// Default PCM processing for Cartesia
		audioContext.current = new AudioContext({ sampleRate: 24000 });

		let nextStartTime = audioContext.current.currentTime;
		const reader = stream.getReader();
		let leftover = new Uint8Array();
		let result = await reader.read();
		setIsPlaying(true);

		while (!result.done && audioContext.current) {
			const data = new Uint8Array(leftover.length + result.value.length);
			data.set(leftover);
			data.set(result.value, leftover.length);

			const length = Math.floor(data.length / 4) * 4;
			const remainder = data.length % 4;
			const buffer = new Float32Array(data.buffer, 0, length / 4);

			leftover = new Uint8Array(data.buffer, length, remainder);

			const audioBuffer = audioContext.current.createBuffer(
				1,
				buffer.length,
				audioContext.current.sampleRate
			);
			audioBuffer.copyToChannel(buffer, 0);

			source.current = audioContext.current.createBufferSource();
			source.current.buffer = audioBuffer;
			source.current.connect(audioContext.current.destination);
			source.current.start(nextStartTime);

			nextStartTime += audioBuffer.duration;

			result = await reader.read();
			if (result.done) {
				source.current.onended = () => {
					stop();
					callback();
				};
			}
		}
	}

	function stop() {
		if (audioContext.current) {
			audioContext.current.close();
			audioContext.current = null;
		}
		
		if (audioElement.current) {
			audioElement.current.pause();
			audioElement.current.src = '';
			audioElement.current = null;
		}
		
		setIsPlaying(false);
	}

	return {
		isPlaying,
		play,
		stop,
	};
}

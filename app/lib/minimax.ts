import { sendDigitalHumanBinaryData, sendDigitalHumanMessage, Protocol } from './digitalHumanService';
import { stopStreamRef } from './digitalHumanService';

const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID!;
const MINIMAX_API_KEY   = process.env.MINIMAX_API_KEY!;
const MINIMAX_TTS_URL   = `https://api.minimax.io/v1/t2a_v2?GroupId=${MINIMAX_GROUP_ID}`;

/** 
 * Stream TTS from MiniMax and forward to the digital-avatar websocket.
 * - Sends DAT_PCM_START at the beginning
 * - Frames audio into 1280-byte / 40 ms chunks (16 kHz·2 bytes·0.04 s)
 * - Respects stopStreamRef for user interrupts
 * - Sends CTL_END_OF_STREAM on clean finish
 */
export async function generateSpeechMinimax(
  sessionId: string,
  text: string,
  voice_id: string = 'English_radiant_girl'
): Promise<void> {
  // strip bracketed text if desired
  text = text.replace(/\(.*?\)/g, '');

  // build request payload
  const body = {
    model: 'speech-02-hd',
    text,
    stream: true,
    voice_setting: { voice_id, speed: 1.0, vol: 1.0, pitch: 0 },
    audio_setting: { sample_rate: 16000, bitrate: 128000, format: 'pcm', channel: 1 }
  };

  try {
    console.log(`[MinimaxTTS] start stream: "${text.slice(0, 30)}…"`);
    const res = await fetch(MINIMAX_TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Accept':        'application/json, text/event-stream',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`
      },
      body: JSON.stringify(body),
      // duplex for streaming in Node.js
      // @ts-ignore
      duplex: 'half'
    });

    if (!res.ok || !res.body) {
      const errText = await res.text();
      throw new Error(`Minimax TTS failed ${res.status}: ${errText}`);
    }

    // tell avatar: incoming PCM stream
    sendDigitalHumanMessage(sessionId, Protocol.DAT_PCM_START);
    stopStreamRef.current = false;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = '';

    // To accumulate leftover bytes between SSE events
    let binaryLeftover = new Uint8Array(0);

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      console.log('[MinimaxTTS] raw chunk bytes →', value.length, 'bytes');
      const chunkText = decoder.decode(value, { stream: true });
      console.log('[MinimaxTTS] chunk as text →', JSON.stringify(chunkText.slice(0,200)));

      // decode SSE text
      sseBuffer += decoder.decode(value, { stream: true });
      sseBuffer = sseBuffer.replace(/\r/g, '');    // strip stray CRs
      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop()!; // incomplete line stays

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;

        let msg;
        try { 
            msg = JSON.parse(payload);
            console.log('[MinimaxTTS] audio payload length =', msg.data.audio.length);
        } catch (e) { 
            console.error('[MinimaxTTS] error parsing SSE payload:', e);
            continue; 
        }

        if (msg.data?.audio) {
          // hex-encoded PCM
          const chunkBuf = Buffer.from(msg.data.audio, 'hex');
          // prepend any leftover
          const inBuf = new Uint8Array(binaryLeftover.length + chunkBuf.length);
          inBuf.set(binaryLeftover, 0);
          inBuf.set(chunkBuf, binaryLeftover.length);

          // frame into 1280-byte / 40 ms slices
          const FRAME = 1280;
          let offset = 0;
          while (inBuf.byteLength - offset >= FRAME) {
            const slice = inBuf.slice(offset, offset + FRAME);
            console.log('[MinimaxTTS] sending frame:', slice.byteLength, 'bytes');
            await sendDigitalHumanBinaryData(sessionId, slice);
            offset += FRAME;
            // pace at 40 ms
            await new Promise(r => setTimeout(r, 40));
            if (stopStreamRef.current) break;
          }
          // save leftover
          binaryLeftover = inBuf.slice(offset);

          if (stopStreamRef.current) break;
        }
      }
      if (stopStreamRef.current) break;
    }

    // send final padded frame if any
    if (binaryLeftover.byteLength > 0 && !stopStreamRef.current) {
      const FRAME = 1280;
      const padded = new Uint8Array(FRAME);
      padded.set(binaryLeftover, 0);
      sendDigitalHumanBinaryData(sessionId, padded);
    }

    // finish if not interrupted
    if (!stopStreamRef.current) {
      sendDigitalHumanMessage(sessionId, Protocol.CTL_END_OF_STREAM);
      console.log('[MinimaxTTS] stream complete');
    } else {
      console.log('[MinimaxTTS] stream aborted by user');
    }

    reader.releaseLock();
  } catch (err) {
    console.error('[MinimaxTTS] error:', err);
    // ensure avatar side knows stream ended on error
    try {
      sendDigitalHumanMessage(sessionId, Protocol.CTL_END_OF_STREAM);
    } catch {}
    throw err;
  }
}

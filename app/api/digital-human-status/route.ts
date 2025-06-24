import { NextResponse } from 'next/server';
import { addClient, removeClient } from '@/lib/statusService';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) {
    return new NextResponse('sessionId required', { status: 400 });
  }

  let streamController: ReadableStreamDefaultController;

  // Create a stream that will push SSE events
  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
      addClient(sessionId, controller);
    },
    cancel() {
      removeClient(sessionId, streamController);
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
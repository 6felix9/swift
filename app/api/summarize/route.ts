import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateCallSummary } from '../../lib/summarizationService';

// Zod schema for the request body
const SummarizeRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    })
  ).min(1, { message: "Conversation history cannot be empty." }),
});

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-vercel-id") || Date.now().toString();
  console.log(`[${requestId}] /api/summarize: Received summarization request.`);

  try {
    const reqJson = await request.json();
    const validationResult = SummarizeRequestSchema.safeParse(reqJson);

    if (!validationResult.success) {
      console.error(`[${requestId}] /api/summarize: Invalid request body:`, validationResult.error.flatten());
      return NextResponse.json({ error: 'Invalid request body', details: validationResult.error.flatten() }, { status: 400 });
    }

    const { messages } = validationResult.data;
    
    console.log(`[${requestId}] /api/summarize: Calling summarization service...`);
    const summaryText = await generateCallSummary(messages);
    console.log(`[${requestId}] /api/summarize: Summary received from service.`);

    return NextResponse.json({ summary: summaryText });

  } catch (error: any) {
    console.error(`[${requestId}] /api/summarize: Error processing summarization request:`, error);
    // The service might throw an error, catch it here
    return NextResponse.json({ error: 'Failed to generate summary', details: error.message || 'Unknown error' }, { status: 500 });
  }
}
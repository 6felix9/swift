import { NextRequest, NextResponse } from 'next/server';
import { calculateConversationEffectiveness } from '@/lib/scoringService';
import { Message } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { conversationHistory, turnNumber } = await request.json();

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return NextResponse.json(
        { error: 'Conversation history array is required' },
        { status: 400 }
      );
    }

    if (typeof turnNumber !== 'number' || turnNumber < 1) {
      return NextResponse.json(
        { error: 'Valid turn number is required' },
        { status: 400 }
      );
    }

    const score = await calculateConversationEffectiveness(
      conversationHistory as Message[],
      turnNumber
    );

    return NextResponse.json(score);
  } catch (error: any) {
    console.error('[ScoreTurnAPI] Error:', error.message);
    
    return NextResponse.json(
      { error: 'Failed to calculate conversation effectiveness' },
      { status: 500 }
    );
  }
}
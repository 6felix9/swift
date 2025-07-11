// app/api/suggestion/route.ts

import { NextResponse } from "next/server";
import { generateNextTurnSuggestions } from "@/lib/suggestionService";
import type { Message } from "@/lib/suggestionService";

export interface SuggestionRequest {
  conversationHistory: Message[];
  requestId: string;
  scenarioId?: string;
}

export interface SuggestionResponse {
  suggestions: string[];
}

export async function POST(request: Request) {
  try {
    const { conversationHistory, requestId, scenarioId } =
      (await request.json()) as SuggestionRequest;

    if (
      !Array.isArray(conversationHistory) ||
      typeof requestId !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const suggestions = await generateNextTurnSuggestions(
      conversationHistory,
      requestId,
      scenarioId
    );

    return NextResponse.json<SuggestionResponse>({ suggestions });
  } catch (error) {
    console.error("[/api/suggestion] Error generating suggestions:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}

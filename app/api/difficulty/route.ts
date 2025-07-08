import { generateDifficultyProfile } from "@/lib/difficultyService";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`\n--- [${requestId}] Received POST /api/route ---`);

  try {
    const { difficulty, scenarioId } = await request.json();
    console.log(
      `[${requestId}] Received request to generate difficulty profile for scenario ${scenarioId} at difficulty=${difficulty}`
    );

    // Validate inputs
    if (!difficulty || !scenarioId) {
      return new Response(
        JSON.stringify({
          error: "Missing required parameters: difficulty, scenarioId, or requestId",
        }),
        { status: 400 }
      );
    }

    // Generate the difficulty profile
    const profile = await generateDifficultyProfile(
      difficulty,
      scenarioId,
      requestId
    );

    return new Response(JSON.stringify({ profile }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in POST /api/difficulty:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate difficulty profile" }),
      { status: 500 }
    );
  }
}
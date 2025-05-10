import { anthropic } from "@ai-sdk/anthropic";
import { convertToCoreMessages, streamText } from "ai";
import { apiLimiter } from '@/lib/middleware/rateLimit';

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await apiLimiter(req);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const { messages } = await req.json();
    const result = await streamText({
      model: anthropic("claude-3-5-sonnet-20240620"),
      messages: convertToCoreMessages(messages),
      system: "You are a helpful AI assistant",
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Error in Anthropic chat route:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to process chat request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

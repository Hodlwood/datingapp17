import { NextResponse } from "next/server";
import { apiLimiter } from '@/lib/middleware/rateLimit';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await apiLimiter(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    return NextResponse.json({
      key: process.env.DEEPGRAM_API_KEY ?? "",
    });
  } catch (error) {
    console.error("Error in Deepgram route:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get Deepgram API key' },
      { status: 500 }
    );
  }
}

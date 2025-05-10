import { NextResponse } from "next/server";
import Replicate from "replicate";
import { apiLimiter } from '@/lib/middleware/rateLimit';
import { validateRequest, imageGenerationSchema } from '@/lib/utils/validation';
import { corsMiddleware } from '@/lib/middleware/cors';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: Request) {
  try {
    // Apply CORS middleware
    const corsResponse = corsMiddleware(request);
    if (corsResponse) {
      return corsResponse;
    }

    // Apply rate limiting
    const rateLimitResult = await apiLimiter(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Validate request body
    const validationResult = await validateRequest(request, imageGenerationSchema);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error(
        "The REPLICATE_API_TOKEN environment variable is not set. See README.md for instructions on how to set it."
      );
    }

    const output = await replicate.run(
      "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
      {
        input: {
          prompt: validationResult.data.prompt,
          image_dimensions: "512x512",
          num_outputs: 1,
          num_inference_steps: 50,
          guidance_scale: 7.5,
          scheduler: "DPMSolverMultistep",
        },
      }
    );

    return NextResponse.json({ output }, { status: 200 });
  } catch (error) {
    console.error("Error from Replicate API:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

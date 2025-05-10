import { z } from 'zod';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Email validation schema
export const emailSchema = z.string().email('Invalid email address');

// Base message schema
const baseMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Message content cannot be empty')
});

// OpenAI message schema
export const openaiMessageSchema = z.object({
  messages: z.array(baseMessageSchema.extend({
    name: z.string().optional(),
    function_call: z.any().optional()
  })) as z.ZodType<ChatCompletionMessageParam[]>
});

// Anthropic message schema
export const anthropicMessageSchema = z.object({
  messages: z.array(baseMessageSchema)
});

// Image generation validation schema
export const imageGenerationSchema = z.object({
  prompt: z.string()
    .min(1, 'Prompt cannot be empty')
    .max(500, 'Prompt must be less than 500 characters')
});

// Email notification validation schema
export const emailNotificationSchema = z.object({
  to: emailSchema,
  subject: z.string()
    .min(1, 'Subject cannot be empty')
    .max(100, 'Subject must be less than 100 characters'),
  html: z.string()
    .min(1, 'HTML content cannot be empty')
    .max(10000, 'HTML content must be less than 10000 characters')
});

// Validation helper function
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json();
    const validatedData = schema.parse(body);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => e.message).join(', ')
      };
    }
    return {
      success: false,
      error: 'Invalid request format'
    };
  }
} 
import { z } from 'zod';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Base schemas
const baseUserSchema = z.object({
  displayName: z.string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be less than 50 characters'),
  email: z.string().email('Invalid email address'),
  photoURL: z.string().url('Invalid photo URL').optional(),
  bio: z.string()
    .max(500, 'Bio must be less than 500 characters')
    .optional(),
  location: z.object({
    city: z.string().optional(),
    country: z.string().optional(),
    coordinates: z.object({
      latitude: z.number().optional(),
      longitude: z.number().optional()
    }).optional()
  }).optional(),
  interests: z.array(z.string())
    .max(10, 'Maximum 10 interests allowed')
    .optional(),
  age: z.number()
    .min(18, 'Must be at least 18 years old')
    .max(100, 'Invalid age')
    .optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say'])
    .optional(),
  lookingFor: z.array(z.enum(['male', 'female', 'other']))
    .min(1, 'Must specify at least one preference')
    .max(3, 'Maximum 3 preferences allowed')
    .optional(),
  ageRange: z.object({
    min: z.number().min(18).max(100),
    max: z.number().min(18).max(100)
  }).optional()
});

// Message validation schema
const baseMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Message content cannot be empty')
});

// OpenAI message schema
export const openaiMessageSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1, 'Message content cannot be empty'),
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
  to: z.string().email('Invalid email address'),
  subject: z.string()
    .min(1, 'Subject cannot be empty')
    .max(100, 'Subject must be less than 100 characters'),
  html: z.string()
    .min(1, 'HTML content cannot be empty')
    .max(10000, 'HTML content must be less than 10000 characters')
});

// Profile update schema
export const profileUpdateSchema = baseUserSchema.partial();

// User registration schema
export const userRegistrationSchema = baseUserSchema.extend({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
});

// Message schema
export const messageSchema = z.object({
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message must be less than 1000 characters'),
  recipientId: z.string().min(1, 'Recipient ID is required'),
  type: z.enum(['text', 'image']).default('text'),
  imageUrl: z.string().url('Invalid image URL').optional()
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
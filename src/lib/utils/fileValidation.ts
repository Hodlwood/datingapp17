import { logger } from './logger';

// Define allowed file types and their MIME types
export const ALLOWED_FILE_TYPES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  // Text
  'text/plain': ['.txt'],
} as const;

// Maximum file sizes in bytes
export const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024, // 5MB for images
  DOCUMENT: 10 * 1024 * 1024, // 10MB for documents
  TEXT: 1 * 1024 * 1024, // 1MB for text files
} as const;

// Helper to get file extension
function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
}

// Helper to get file size limit based on type
function getFileSizeLimit(mimeType: string): number {
  if (mimeType.startsWith('image/')) {
    return FILE_SIZE_LIMITS.IMAGE;
  }
  if (mimeType.startsWith('application/')) {
    return FILE_SIZE_LIMITS.DOCUMENT;
  }
  if (mimeType.startsWith('text/')) {
    return FILE_SIZE_LIMITS.TEXT;
  }
  return FILE_SIZE_LIMITS.DOCUMENT; // Default to document size limit
}

// Validate file type
export function validateFileType(file: File): { valid: boolean; error?: string } {
  const mimeType = file.type;
  const extension = getFileExtension(file.name);

  // Check if MIME type is allowed
  if (!ALLOWED_FILE_TYPES[mimeType as keyof typeof ALLOWED_FILE_TYPES]) {
    return {
      valid: false,
      error: `File type ${mimeType} is not allowed. Allowed types: ${Object.keys(ALLOWED_FILE_TYPES).join(', ')}`
    };
  }

  // Check if file extension matches MIME type
  const allowedExtensions = ALLOWED_FILE_TYPES[mimeType as keyof typeof ALLOWED_FILE_TYPES];
  if (!allowedExtensions.includes(`.${extension}`)) {
    return {
      valid: false,
      error: `File extension .${extension} does not match the file type ${mimeType}`
    };
  }

  return { valid: true };
}

// Validate file size
export function validateFileSize(file: File): { valid: boolean; error?: string } {
  const sizeLimit = getFileSizeLimit(file.type);
  
  if (file.size > sizeLimit) {
    return {
      valid: false,
      error: `File size exceeds the limit of ${sizeLimit / (1024 * 1024)}MB`
    };
  }

  return { valid: true };
}

// Sanitize filename
export function sanitizeFilename(filename: string): string {
  // Remove any path components
  const name = filename.split('/').pop() || filename;
  
  // Remove any non-alphanumeric characters except for dots and hyphens
  const sanitized = name.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  // Ensure the filename isn't too long
  const maxLength = 100;
  if (sanitized.length > maxLength) {
    const ext = getFileExtension(sanitized);
    const nameWithoutExt = sanitized.slice(0, -(ext.length + 1));
    return `${nameWithoutExt.slice(0, maxLength - ext.length - 1)}.${ext}`;
  }
  
  return sanitized;
}

// Main validation function
export async function validateFile(file: File): Promise<{ valid: boolean; error?: string }> {
  try {
    // Validate file type
    const typeValidation = validateFileType(file);
    if (!typeValidation.valid) {
      return typeValidation;
    }

    // Validate file size
    const sizeValidation = validateFileSize(file);
    if (!sizeValidation.valid) {
      return sizeValidation;
    }

    // Additional validation for images
    if (file.type.startsWith('image/')) {
      // Check if the file is actually an image
      try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Check for image magic numbers
        const isJPEG = uint8Array[0] === 0xFF && uint8Array[1] === 0xD8;
        const isPNG = uint8Array[0] === 0x89 && uint8Array[1] === 0x50;
        const isGIF = uint8Array[0] === 0x47 && uint8Array[1] === 0x49;
        const isWEBP = uint8Array[8] === 0x57 && uint8Array[9] === 0x45;

        if (!(isJPEG || isPNG || isGIF || isWEBP)) {
          return {
            valid: false,
            error: 'Invalid image file: File content does not match the declared image type'
          };
        }
      } catch (error) {
        logger.error('Error validating image file', { error, filename: file.name });
        return {
          valid: false,
          error: 'Error validating image file'
        };
      }
    }

    return { valid: true };
  } catch (error) {
    logger.error('Error in file validation', { error, filename: file.name });
    return {
      valid: false,
      error: 'Error validating file'
    };
  }
} 
import DOMPurify from 'dompurify';

// HTML sanitization options
const sanitizeOptions = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'target'],
  ALLOWED_ATTR_VALUES: {
    'a': {
      'href': /^(https?:\/\/)?(www\.)?[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}(\.[a-zA-Z]{2,})?(\/[^\s]*)?$/,
      'target': /^(_blank|_self)$/
    }
  }
};

// Sanitize HTML content
export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, sanitizeOptions);
}

// Sanitize plain text (remove HTML tags and special characters)
export function sanitizeText(text: string): string {
  // Remove HTML tags
  const withoutTags = text.replace(/<[^>]*>/g, '');
  // Remove special characters but keep basic punctuation
  return withoutTags.replace(/[^\w\s.,!?-]/g, '');
}

// Sanitize email address
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Sanitize URL
export function sanitizeURL(url: string): string {
  try {
    const sanitized = url.trim();
    // Add https:// if no protocol is specified
    if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://')) {
      return `https://${sanitized}`;
    }
    return sanitized;
  } catch {
    return '';
  }
}

// Sanitize object with string values
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

// Sanitize array of strings
export function sanitizeArray(arr: string[]): string[] {
  return arr.map(item => sanitizeText(item));
} 
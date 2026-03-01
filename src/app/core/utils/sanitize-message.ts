/**
 * Maximum allowed message length (similar to a tweet).
 */
export const MAX_MESSAGE_LENGTH = 280;

/**
 * Patterns that indicate potentially malicious content.
 * Checks for script tags, event handlers, SQL injection, etc.
 */
const MALICIOUS_PATTERNS: RegExp[] = [
  /<script[\s>]/i,
  /<\/script>/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,           // onerror=, onclick=, etc.
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /<link/i,
  /<img[^>]+onerror/i,
  /eval\s*\(/i,
  /document\s*\./i,
  /window\s*\./i,
  /\balert\s*\(/i,
  /\bprompt\s*\(/i,
  /\bconfirm\s*\(/i,
  /union\s+select/i,      // SQL injection
  /drop\s+table/i,
  /insert\s+into/i,
  /delete\s+from/i,
  /--\s*$/m,              // SQL comment
  /;\s*drop\b/i,
  /'\s*or\s+'1'\s*=\s*'1/i,
  /data\s*:\s*text\/html/i,
  /<svg[\s>]/i,
  /<math[\s>]/i,
];

export interface SanitizeResult {
  valid: boolean;
  error: string | null;
  sanitized: string;
}

/**
 * Validates and sanitizes a user message.
 * Returns the cleaned text or an error.
 */
export function sanitizeMessage(raw: string): SanitizeResult {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { valid: false, error: 'El mensaje no puede estar vacío.', sanitized: '' };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `El mensaje no puede exceder ${MAX_MESSAGE_LENGTH} caracteres.`,
      sanitized: '',
    };
  }

  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        error: 'El mensaje contiene contenido no permitido.',
        sanitized: '',
      };
    }
  }

  // Strip any remaining HTML tags as a safety net
  const sanitized = trimmed.replace(/<[^>]*>/g, '');

  return { valid: true, error: null, sanitized };
}

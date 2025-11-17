/**
 * Input sanitization utilities
 *
 * Provides XSS protection and input validation for user-submitted data
 * Use these functions on all user inputs before sending to API or displaying
 */

/**
 * Remove HTML tags and potentially dangerous characters from input
 * Use for text inputs, names, descriptions, etc.
 */
export const sanitizeInput = (input: string | undefined | null): string => {
  if (!input) return '';

  // Convert to string if not already
  const str = String(input);

  // Remove HTML tags
  let sanitized = str.replace(/<[^>]*>/g, '');

  // Remove potentially dangerous characters
  sanitized = sanitized
    .replace(/[<>]/g, '') // Remove remaining angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick=, onload=, etc.)
    .replace(/data:text\/html/gi, ''); // Remove data URIs

  // Trim whitespace
  return sanitized.trim();
};

/**
 * Sanitize email input
 * Validates and normalizes email addresses
 */
export const sanitizeEmail = (email: string | undefined | null): string => {
  if (!email) return '';

  // Basic sanitization
  let sanitized = sanitizeInput(email);

  // Convert to lowercase
  sanitized = sanitized.toLowerCase();

  // Remove spaces
  sanitized = sanitized.replace(/\s/g, '');

  return sanitized;
};

/**
 * Sanitize phone number
 * Removes non-numeric characters except + and -
 */
export const sanitizePhoneNumber = (phone: string | undefined | null): string => {
  if (!phone) return '';

  // Keep only digits, +, -, (, ), and spaces
  return phone.replace(/[^\d+\-() ]/g, '');
};

/**
 * Sanitize URL
 * Ensures URL is safe and valid
 */
export const sanitizeURL = (url: string | undefined | null): string => {
  if (!url) return '';

  const sanitized = sanitizeInput(url);

  // Check for safe protocols
  const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:'];

  try {
    const urlObj = new URL(sanitized);
    if (!safeProtocols.includes(urlObj.protocol)) {
      return ''; // Reject unsafe protocols
    }
    return urlObj.toString();
  } catch {
    // If URL parsing fails, check if it's a relative URL
    if (sanitized.startsWith('/')) {
      return sanitized;
    }
    // Otherwise, reject
    return '';
  }
};

/**
 * Sanitize numeric input
 * Ensures input is a valid number
 */
export const sanitizeNumber = (
  value: string | number | undefined | null,
  options?: {
    min?: number;
    max?: number;
    decimals?: number;
  }
): number | null => {
  if (value === undefined || value === null || value === '') return null;

  // Convert to number
  let num = typeof value === 'number' ? value : parseFloat(String(value));

  // Check if valid number
  if (isNaN(num)) return null;

  // Apply constraints
  if (options) {
    if (options.min !== undefined && num < options.min) {
      num = options.min;
    }
    if (options.max !== undefined && num > options.max) {
      num = options.max;
    }
    if (options.decimals !== undefined) {
      num = parseFloat(num.toFixed(options.decimals));
    }
  }

  return num;
};

/**
 * Sanitize date input
 * Ensures date is valid and in correct format
 */
export const sanitizeDate = (date: string | Date | undefined | null): string | null => {
  if (!date) return null;

  try {
    const dateObj = date instanceof Date ? date : new Date(date);

    // Check if valid date
    if (isNaN(dateObj.getTime())) {
      return null;
    }

    // Return ISO string
    return dateObj.toISOString();
  } catch {
    return null;
  }
};

/**
 * Sanitize object by applying sanitization to all string properties
 * Useful for sanitizing entire form data objects
 */
export const sanitizeObject = <T extends Record<string, any>>(
  obj: T,
  options?: {
    excludeKeys?: string[];
    emailKeys?: string[];
    urlKeys?: string[];
    numberKeys?: string[];
  }
): T => {
  const sanitized = { ...obj };
  const excludeKeys = options?.excludeKeys || [];
  const emailKeys = options?.emailKeys || ['email'];
  const urlKeys = options?.urlKeys || ['url', 'website', 'link'];
  const numberKeys = options?.numberKeys || [];

  for (const key in sanitized) {
    if (excludeKeys.includes(key)) {
      continue; // Skip excluded keys
    }

    const value = sanitized[key];

    if (typeof value === 'string') {
      // Apply appropriate sanitization based on key name
      if (emailKeys.some(k => key.toLowerCase().includes(k))) {
        sanitized[key] = sanitizeEmail(value) as any;
      } else if (urlKeys.some(k => key.toLowerCase().includes(k))) {
        sanitized[key] = sanitizeURL(value) as any;
      } else {
        sanitized[key] = sanitizeInput(value) as any;
      }
    } else if (typeof value === 'number' || numberKeys.includes(key)) {
      sanitized[key] = sanitizeNumber(value) as any;
    } else if (value instanceof Date || (typeof value === 'string' && key.toLowerCase().includes('date'))) {
      sanitized[key] = sanitizeDate(value) as any;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value, options) as any;
    }
  }

  return sanitized;
};

/**
 * Validate and sanitize form data
 * Returns sanitized data and validation errors
 */
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  sanitizedData: Record<string, any>;
}

export const validateAndSanitize = (
  data: Record<string, any>,
  rules: Record<string, ValidationRule>
): ValidationResult => {
  const errors: Record<string, string> = {};
  const sanitizedData = sanitizeObject(data);

  for (const field in rules) {
    const rule = rules[field];
    const value = sanitizedData[field];

    // Required validation
    if (rule.required && (!value || value === '')) {
      errors[field] = rule.message || `${field} is required`;
      continue;
    }

    // Skip further validation if field is empty and not required
    if (!value && !rule.required) {
      continue;
    }

    // String validations
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors[field] = rule.message || `${field} must be at least ${rule.minLength} characters`;
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors[field] = rule.message || `${field} must be at most ${rule.maxLength} characters`;
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors[field] = rule.message || `${field} is invalid`;
      }
    }

    // Custom validation
    if (rule.custom && !rule.custom(value)) {
      errors[field] = rule.message || `${field} is invalid`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData,
  };
};

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d+\-() ]{10,}$/,
  url: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alpha: /^[a-zA-Z]+$/,
  numeric: /^\d+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/, // Min 8 chars, 1 uppercase, 1 lowercase, 1 number
};

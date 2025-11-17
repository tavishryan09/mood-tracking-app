import {
  sanitizeInput,
  sanitizeEmail,
  sanitizePhoneNumber,
  sanitizeURL,
  sanitizeNumber,
  sanitizeDate,
  sanitizeObject,
  validateAndSanitize,
  ValidationPatterns,
} from '../sanitize';

describe('Sanitization Utilities', () => {
  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('');
      expect(sanitizeInput('Hello <b>World</b>')).toBe('Hello World');
      expect(sanitizeInput('<div>Test</div>')).toBe('Test');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)');
      expect(sanitizeInput('onclick=alert(1)')).toBe('alert(1)');
      expect(sanitizeInput('data:text/html,<script>alert(1)</script>')).toBe(',alert(1)');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeInput(null)).toBe('');
      expect(sanitizeInput(undefined)).toBe('');
    });

    it('should preserve safe text', () => {
      expect(sanitizeInput('Hello World')).toBe('Hello World');
      expect(sanitizeInput('Test 123')).toBe('Test 123');
    });
  });

  describe('sanitizeEmail', () => {
    it('should convert to lowercase', () => {
      expect(sanitizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
    });

    it('should remove spaces', () => {
      expect(sanitizeEmail('test @example.com')).toBe('test@example.com');
    });

    it('should remove HTML tags', () => {
      expect(sanitizeEmail('<script>test@example.com</script>')).toBe('test@example.com');
    });
  });

  describe('sanitizePhoneNumber', () => {
    it('should keep valid phone characters', () => {
      expect(sanitizePhoneNumber('+1 (234) 567-8900')).toBe('+1 (234) 567-8900');
    });

    it('should remove letters', () => {
      expect(sanitizePhoneNumber('123-456-7890 ext')).toBe('123-456-7890 ');
    });

    it('should handle null', () => {
      expect(sanitizePhoneNumber(null)).toBe('');
    });
  });

  describe('sanitizeURL', () => {
    it('should allow safe protocols', () => {
      expect(sanitizeURL('https://example.com')).toBe('https://example.com/');
      expect(sanitizeURL('http://example.com')).toBe('http://example.com/');
    });

    it('should reject javascript protocol', () => {
      expect(sanitizeURL('javascript:alert(1)')).toBe('');
    });

    it('should allow relative URLs', () => {
      expect(sanitizeURL('/path/to/page')).toBe('/path/to/page');
    });

    it('should reject invalid URLs', () => {
      expect(sanitizeURL('not a url')).toBe('');
    });
  });

  describe('sanitizeNumber', () => {
    it('should parse string numbers', () => {
      expect(sanitizeNumber('123')).toBe(123);
      expect(sanitizeNumber('123.45')).toBe(123.45);
    });

    it('should pass through numbers', () => {
      expect(sanitizeNumber(123)).toBe(123);
    });

    it('should return null for invalid numbers', () => {
      expect(sanitizeNumber('not a number')).toBeNull();
      expect(sanitizeNumber('')).toBeNull();
      expect(sanitizeNumber(null)).toBeNull();
    });

    it('should apply min constraint', () => {
      expect(sanitizeNumber(5, { min: 10 })).toBe(10);
    });

    it('should apply max constraint', () => {
      expect(sanitizeNumber(100, { max: 50 })).toBe(50);
    });

    it('should apply decimal constraint', () => {
      expect(sanitizeNumber(123.456, { decimals: 2 })).toBe(123.46);
    });
  });

  describe('sanitizeDate', () => {
    it('should convert string to ISO date', () => {
      const result = sanitizeDate('2024-01-15');
      expect(result).toMatch(/2024-01-15T/);
    });

    it('should convert Date object to ISO string', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      expect(sanitizeDate(date)).toBe(date.toISOString());
    });

    it('should return null for invalid dates', () => {
      expect(sanitizeDate('not a date')).toBeNull();
      expect(sanitizeDate(null)).toBeNull();
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string properties', () => {
      const input = {
        name: '<script>test</script>',
        description: 'Hello <b>World</b>',
      };

      const result = sanitizeObject(input);

      expect(result.name).toBe('test');
      expect(result.description).toBe('Hello World');
    });

    it('should sanitize email fields', () => {
      const input = {
        email: 'TEST@EXAMPLE.COM',
      };

      const result = sanitizeObject(input);
      expect(result.email).toBe('test@example.com');
    });

    it('should sanitize URL fields', () => {
      const input = {
        website: 'javascript:alert(1)',
      };

      const result = sanitizeObject(input);
      expect(result.website).toBe('');
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: '<script>test</script>',
        },
      };

      const result = sanitizeObject(input);
      expect(result.user.name).toBe('test');
    });

    it('should exclude specified keys', () => {
      const input = {
        name: '<script>test</script>',
        html: '<b>Keep this</b>',
      };

      const result = sanitizeObject(input, { excludeKeys: ['html'] });

      expect(result.name).toBe('test');
      expect(result.html).toBe('<b>Keep this</b>');
    });
  });

  describe('validateAndSanitize', () => {
    it('should validate required fields', () => {
      const data = { name: '' };
      const rules = { name: { required: true } };

      const result = validateAndSanitize(data, rules);

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('name is required');
    });

    it('should validate min length', () => {
      const data = { password: '123' };
      const rules = { password: { minLength: 8 } };

      const result = validateAndSanitize(data, rules);

      expect(result.isValid).toBe(false);
      expect(result.errors.password).toContain('at least 8 characters');
    });

    it('should validate max length', () => {
      const data = { name: 'a'.repeat(100) };
      const rules = { name: { maxLength: 50 } };

      const result = validateAndSanitize(data, rules);

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toContain('at most 50 characters');
    });

    it('should validate pattern', () => {
      const data = { email: 'invalid-email' };
      const rules = { email: { pattern: ValidationPatterns.email } };

      const result = validateAndSanitize(data, rules);

      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('email is invalid');
    });

    it('should use custom validator', () => {
      const data = { age: 15 };
      const rules = {
        age: {
          custom: (value: number) => value >= 18,
          message: 'Must be 18 or older',
        },
      };

      const result = validateAndSanitize(data, rules);

      expect(result.isValid).toBe(false);
      expect(result.errors.age).toBe('Must be 18 or older');
    });

    it('should return sanitized data on success', () => {
      const data = {
        name: '<script>Test</script>',
        email: 'TEST@EXAMPLE.COM',
      };
      const rules = {
        name: { required: true },
        email: { required: true, pattern: ValidationPatterns.email },
      };

      const result = validateAndSanitize(data, rules);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
      expect(result.sanitizedData.name).toBe('Test');
      expect(result.sanitizedData.email).toBe('test@example.com');
    });
  });

  describe('ValidationPatterns', () => {
    it('should validate email', () => {
      expect(ValidationPatterns.email.test('test@example.com')).toBe(true);
      expect(ValidationPatterns.email.test('invalid')).toBe(false);
    });

    it('should validate password', () => {
      expect(ValidationPatterns.password.test('Password1')).toBe(true);
      expect(ValidationPatterns.password.test('weak')).toBe(false);
    });

    it('should validate alphanumeric', () => {
      expect(ValidationPatterns.alphanumeric.test('abc123')).toBe(true);
      expect(ValidationPatterns.alphanumeric.test('abc-123')).toBe(false);
    });
  });
});

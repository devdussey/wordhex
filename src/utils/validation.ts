import { ValidationError } from '../types/errors';

export interface ValidationRule<T = unknown> {
  validate: (value: T) => boolean;
  message: string;
}

export interface ValidationSchema {
  [field: string]: ValidationRule[];
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateField(
  value: unknown,
  rules: ValidationRule[]
): string | null {
  for (const rule of rules) {
    if (!rule.validate(value)) {
      return rule.message;
    }
  }
  return null;
}

export function validateSchema(
  data: Record<string, unknown>,
  schema: ValidationSchema
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    const error = validateField(value, rules);
    if (error) {
      errors[field] = error;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export function throwIfInvalid(
  data: Record<string, unknown>,
  schema: ValidationSchema
): void {
  const result = validateSchema(data, schema);
  if (!result.valid) {
    throw new ValidationError('Validation failed', result.errors);
  }
}

export const ValidationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined;
    },
    message
  }),

  minLength: (length: number, message?: string): ValidationRule<string> => ({
    validate: (value) => !value || value.length >= length,
    message: message || `Must be at least ${length} characters`
  }),

  maxLength: (length: number, message?: string): ValidationRule<string> => ({
    validate: (value) => !value || value.length <= length,
    message: message || `Must be at most ${length} characters`
  }),

  email: (message = 'Must be a valid email address'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message
  }),

  min: (min: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value === null || value === undefined || value >= min,
    message: message || `Must be at least ${min}`
  }),

  max: (max: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value === null || value === undefined || value <= max,
    message: message || `Must be at most ${max}`
  }),

  pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule<string> => ({
    validate: (value) => !value || regex.test(value),
    message
  }),

  custom: (
    validator: (value: unknown) => boolean,
    message: string
  ): ValidationRule => ({
    validate: validator,
    message
  }),

  url: (message = 'Must be a valid URL'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message
  }),

  alphanumeric: (message = 'Must contain only letters and numbers'): ValidationRule<string> => ({
    validate: (value) => !value || /^[a-zA-Z0-9]+$/.test(value),
    message
  }),

  username: (message = 'Username must be 3-20 characters and contain only letters, numbers, and underscores'): ValidationRule<string> => ({
    validate: (value) => !value || /^[a-zA-Z0-9_]{3,20}$/.test(value),
    message
  }),

  notEmpty: (message = 'Cannot be empty'): ValidationRule<string> => ({
    validate: (value) => {
      if (typeof value !== 'string') return false;
      return value.trim().length > 0;
    },
    message
  })
};

export function createValidationError(
  field: string,
  message: string
): ValidationError {
  return new ValidationError(message, { [field]: message });
}

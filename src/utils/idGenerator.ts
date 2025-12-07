/**
 * ID Generator utility
 * Generates unique identifiers
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a unique UUID v4 identifier
 * @returns A UUID string
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Generates a unique ID with a prefix
 * @param prefix - Prefix for the ID
 * @returns Prefixed UUID string
 */
export function generatePrefixedId(prefix: string): string {
  return `${prefix}_${uuidv4()}`;
}

/**
 * Validates if a string is a valid UUID
 * @param id - String to validate
 * @returns true if valid UUID
 */
export function isValidUuid(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

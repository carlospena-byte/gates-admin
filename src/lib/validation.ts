// ============================================================================
// Validation Error Types
// ============================================================================

export class ValidationError extends Error {
  field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; errors: ValidationError[] };

// ============================================================================
// Sanitization Functions
// ============================================================================

/**
 * Sanitize string input by trimming whitespace and removing null bytes
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/\0/g, "");
}

/**
 * Sanitize email by converting to lowercase and trimming
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Remove potentially dangerous characters for SQL/script injection
 */
export function sanitizeInput(input: string): string {
  return sanitizeString(input)
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/[\u0000-\u001F\u007F]/g, ""); // Remove control characters
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate email and return sanitized version or throw error
 */
export function validateEmail(email: string): string {
  const sanitized = sanitizeEmail(email);

  if (!sanitized) {
    throw new ValidationError("Email is required", "email");
  }

  if (!isValidEmail(sanitized)) {
    throw new ValidationError("Invalid email format", "email");
  }

  if (sanitized.length > 255) {
    throw new ValidationError("Email is too long (max 255 characters)", "email");
  }

  return sanitized;
}

/**
 * Validate OTP token (6 digits)
 */
export function validateOtp(otp: string): string {
  const sanitized = sanitizeString(otp);

  if (!sanitized) {
    throw new ValidationError("OTP is required", "otp");
  }

  if (!/^\d{6}$/.test(sanitized)) {
    throw new ValidationError("OTP must be 6 digits", "otp");
  }

  return sanitized;
}

/**
 * Validate required string field
 */
export function validateRequiredString(
  value: string | null | undefined,
  fieldName: string,
  minLength = 1,
  maxLength = 255,
): string {
  if (!value) {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }

  const sanitized = sanitizeInput(value);

  if (sanitized.length < minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${minLength} characters`,
      fieldName,
    );
  }

  if (sanitized.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must be at most ${maxLength} characters`,
      fieldName,
    );
  }

  return sanitized;
}

/**
 * Validate optional string field
 */
export function validateOptionalString(
  value: string | null | undefined,
  fieldName: string,
  maxLength = 255,
): string | null {
  if (!value) {
    return null;
  }

  const sanitized = sanitizeInput(value);

  if (sanitized.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must be at most ${maxLength} characters`,
      fieldName,
    );
  }

  return sanitized;
}

/**
 * Validate phone number (basic validation, adjust for your needs)
 */
export function validatePhone(phone: string | null | undefined): string | null {
  if (!phone) {
    return null;
  }

  const sanitized = sanitizeString(phone);

  // Remove common phone formatting characters
  const digitsOnly = sanitized.replace(/[\s()+-]/g, "");

  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    throw new ValidationError("Invalid phone number format", "phone");
  }

  if (!/^\d+$/.test(digitsOnly)) {
    throw new ValidationError("Phone number must contain only digits", "phone");
  }

  return sanitized;
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate UUID
 */
export function validateUuid(uuid: string, fieldName = "id"): string {
  const sanitized = sanitizeString(uuid);

  if (!sanitized) {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }

  if (!isValidUuid(sanitized)) {
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName);
  }

  return sanitized;
}

/**
 * Validate latitude (-90 to 90)
 */
export function validateLatitude(lat: number | null | undefined): number | null {
  if (lat === null || lat === undefined) {
    return null;
  }

  if (typeof lat !== "number" || isNaN(lat)) {
    throw new ValidationError("Invalid latitude format", "latitude");
  }

  if (lat < -90 || lat > 90) {
    throw new ValidationError("Latitude must be between -90 and 90", "latitude");
  }

  return lat;
}

/**
 * Validate longitude (-180 to 180)
 */
export function validateLongitude(lng: number | null | undefined): number | null {
  if (lng === null || lng === undefined) {
    return null;
  }

  if (typeof lng !== "number" || isNaN(lng)) {
    throw new ValidationError("Invalid longitude format", "longitude");
  }

  if (lng < -180 || lng > 180) {
    throw new ValidationError("Longitude must be between -180 and 180", "longitude");
  }

  return lng;
}

/**
 * Validate coordinates (both lat and lng together)
 */
export function validateCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined,
): { lat: number; lng: number } | null {
  // Both must be present or both must be absent
  if ((lat === null || lat === undefined) && (lng === null || lng === undefined)) {
    return null;
  }

  if ((lat === null || lat === undefined) || (lng === null || lng === undefined)) {
    throw new ValidationError("Both latitude and longitude must be provided", "coordinates");
  }

  return {
    lat: validateLatitude(lat)!,
    lng: validateLongitude(lng)!,
  };
}

/**
 * Validate residential role
 */
export function validateResidentialRole(role: string): "admin" | "member" {
  const sanitized = sanitizeString(role);

  if (sanitized !== "admin" && sanitized !== "member") {
    throw new ValidationError('Role must be either "admin" or "member"', "role");
  }

  return sanitized;
}

// ============================================================================
// Object Validators
// ============================================================================

export interface ResidentialInput {
  name: string;
  address?: string | null;
  plan_type?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
}

export interface ValidatedResidential {
  name: string;
  address: string | null;
  plan_type: string | null;
  location_lat: number | null;
  location_lng: number | null;
}

/**
 * Validate residential creation/update data
 */
export function validateResidentialData(input: ResidentialInput): ValidatedResidential {
  const errors: ValidationError[] = [];

  let name: string;
  let address: string | null = null;
  let plan_type: string | null = null;
  let coordinates: { lat: number; lng: number } | null = null;

  // Validate name
  try {
    name = validateRequiredString(input.name, "name", 1, 255);
  } catch (error) {
    errors.push(error as ValidationError);
    name = ""; // Fallback to prevent undefined
  }

  // Validate address
  try {
    address = validateOptionalString(input.address, "address", 500);
  } catch (error) {
    errors.push(error as ValidationError);
  }

  // Validate plan_type
  try {
    plan_type = validateOptionalString(input.plan_type, "plan_type", 100);
  } catch (error) {
    errors.push(error as ValidationError);
  }

  // Validate coordinates
  try {
    coordinates = validateCoordinates(input.location_lat, input.location_lng);
  } catch (error) {
    errors.push(error as ValidationError);
  }

  if (errors.length > 0) {
    throw errors[0]; // Throw the first error for now
  }

  return {
    name,
    address,
    plan_type,
    location_lat: coordinates?.lat ?? null,
    location_lng: coordinates?.lng ?? null,
  };
}

export interface UnitInput {
  name: string;
  residential_id: string;
}

export interface ValidatedUnit {
  name: string;
  residential_id: string;
}

/**
 * Validate unit creation/update data
 */
export function validateUnitData(input: UnitInput): ValidatedUnit {
  const name = validateRequiredString(input.name, "name", 1, 255);
  const residential_id = validateUuid(input.residential_id, "residential_id");

  return { name, residential_id };
}

export interface UserProfileInput {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
}

export interface ValidatedUserProfile {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

/**
 * Validate user profile data
 */
export function validateUserProfileData(input: UserProfileInput): ValidatedUserProfile {
  const first_name = validateOptionalString(input.first_name, "first_name", 100);
  const last_name = validateOptionalString(input.last_name, "last_name", 100);
  const phone = validatePhone(input.phone);

  return { first_name, last_name, phone };
}

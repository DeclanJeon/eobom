import { allocateWebUserSlug } from "@/lib/seats";

/**
 * Personal journal slug for general Google signup.
 *
 * - Keyring QR: e01–e10000 (reserved, claim only via /j/eNN)
 * - Web signup: u + 8 random chars, e.g. /j/u3k9m2x7a
 */
export async function generateUniquePersonalSlug(
  _email?: string,
): Promise<string> {
  return allocateWebUserSlug();
}

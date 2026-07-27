import { allocateNextNumberedSlug } from "@/lib/seats";

/**
 * Personal journal slug for new users.
 * Web Google signup: next free eNN starting at e14 (e14, e15, …).
 * Keyring QR seats e01–e13 stay reserved until claimed via /j/eNN.
 */
export async function generateUniquePersonalSlug(
  _email?: string,
): Promise<string> {
  return allocateNextNumberedSlug();
}

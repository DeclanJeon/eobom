import { allocateNextNumberedSlug } from "@/lib/seats";

/**
 * Personal journal slug for new users.
 * Sequential short numbers: e01, e02, … e14, e15, …
 * Keyring seats e01–e13 are pre-provisioned; web signups continue the sequence.
 */
export async function generateUniquePersonalSlug(
  _email?: string,
): Promise<string> {
  return allocateNextNumberedSlug();
}

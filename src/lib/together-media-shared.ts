export const TOGETHER_MEDIA_MAX_COUNT = 4;
export const TOGETHER_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const TOGETHER_MEDIA_NAME_RE = /^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/;

export function communityMediaUrl(filename: string) {
  return `/api/together/media/${filename}`;
}

/** Accept only same-origin community media URLs produced by our upload route. */
export function sanitizeCommunityImageUrls(
  urls: unknown,
  max = TOGETHER_MEDIA_MAX_COUNT,
): string[] {
  if (!Array.isArray(urls)) return [];
  const out: string[] = [];
  for (const raw of urls) {
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    const match = value.match(
      /^\/api\/together\/media\/([0-9a-f-]{36}\.(?:jpg|png|webp|gif))$/i,
    );
    if (!match) continue;
    const filename = match[1].toLowerCase();
    const url = communityMediaUrl(filename);
    if (!out.includes(url)) out.push(url);
    if (out.length >= max) break;
  }
  return out;
}

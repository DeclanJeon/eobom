import path from "node:path";
import {
  TOGETHER_MEDIA_MAX_BYTES,
  TOGETHER_MEDIA_MAX_COUNT,
  TOGETHER_MEDIA_NAME_RE,
  communityMediaUrl,
  sanitizeCommunityImageUrls,
} from "@/lib/together-media-shared";

export {
  TOGETHER_MEDIA_MAX_BYTES,
  TOGETHER_MEDIA_MAX_COUNT,
  TOGETHER_MEDIA_NAME_RE,
  communityMediaUrl,
  sanitizeCommunityImageUrls,
};

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export function uploadRoot() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), ".data", "uploads");
}

export function communityMediaDir() {
  return path.join(uploadRoot(), "community");
}

export function extensionForMime(mime: string) {
  return MIME_EXTENSIONS[mime] ?? null;
}

export function contentTypeForName(name: string) {
  const extension = name.split(".").pop() || "";
  return CONTENT_TYPES[extension] || "application/octet-stream";
}

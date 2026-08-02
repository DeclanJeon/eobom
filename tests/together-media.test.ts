import { describe, expect, test } from "bun:test";
import {
  communityMediaUrl,
  sanitizeCommunityImageUrls,
} from "../src/lib/together-media-shared";

describe("together media", () => {
  test("accepts community media urls only", () => {
    const ok = communityMediaUrl("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg");
    expect(
      sanitizeCommunityImageUrls([
        ok,
        "/api/uploads/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg",
        "https://evil.example/a.jpg",
        ok,
      ]),
    ).toEqual([ok]);
  });

  test("caps at four images", () => {
    const urls = Array.from({ length: 6 }, (_, i) =>
      communityMediaUrl(`aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa${i}.jpg`),
    );
    expect(sanitizeCommunityImageUrls(urls)).toHaveLength(4);
  });
});

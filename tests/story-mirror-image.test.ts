import { describe, it, expect } from "bun:test";
import { buildVisualizationPrompt } from "../src/lib/story-mirror/image-gen";

describe("image-gen prompts (v4.2: summary only)", () => {
  it("generates summary prompt", () => {
    const prompt = buildVisualizationPrompt("summary", "5 entries");
    expect(prompt).toContain("summary");
    expect(prompt.toLowerCase()).toContain("no text");
    expect(prompt).toContain("square");
    expect(prompt).toContain("watercolor");
    expect(prompt.length).toBeGreaterThan(100);
  });
});

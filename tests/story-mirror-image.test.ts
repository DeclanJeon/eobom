import { describe, it, expect } from "bun:test";
import { buildVisualizationPrompt } from "../src/lib/story-mirror/image-gen";

describe("image-gen prompts", () => {
  it("generates timeline prompt", () => {
    const prompt = buildVisualizationPrompt("timeline", "5 entries");
    expect(prompt).toContain("timeline");
    expect(prompt).toContain("No text");
    expect(prompt).toContain("square");
    expect(prompt.length).toBeGreaterThan(100);
  });

  it("generates network prompt", () => {
    const prompt = buildVisualizationPrompt("network", "3 nodes");
    expect(prompt).toContain("node");
    expect(prompt).toContain("No text");
  });

  it("generates emotion prompt", () => {
    const prompt = buildVisualizationPrompt("emotion", "4 emotions");
    expect(prompt).toContain("watercolor");
    expect(prompt.toLowerCase()).toContain("no text");
  });

  it("generates story-match prompt", () => {
    const prompt = buildVisualizationPrompt("story-match", "2 connections");
    expect(prompt).toContain("bipartite");
    expect(prompt.toLowerCase()).toContain("no text");
  });
});

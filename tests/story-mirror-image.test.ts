import { describe, it, expect } from "bun:test";
import {
  buildVisualizationPrompt,
  driveUploadCommand,
  generateImage,
} from "../src/lib/story-mirror/image-gen";

describe("image-gen prompts (review-driven brief)", () => {
  it("puts the review imageBrief first and keeps guardrails", () => {
    const brief =
      "A quiet clay vessel on wet linen paper, gold light at the rim, forest-green wash for communal belonging and debt-of-grace.";
    const prompt = buildVisualizationPrompt("summary", brief);
    expect(prompt).toContain(brief);
    expect(prompt.toLowerCase()).toContain("no text");
    expect(prompt).toContain("square");
    expect(prompt).toContain("watercolor");
    expect(prompt).toContain("THIS person's reflection season");
    expect(prompt.length).toBeGreaterThan(100);
  });

  it("falls back safely when brief is empty", () => {
    const prompt = buildVisualizationPrompt("summary", "   ");
    expect(prompt.toLowerCase()).toContain("watercolor");
    expect(prompt.toLowerCase()).toContain("no faces");
  });
});

describe("generateImage path safety", () => {
  it("rejects path-bearing filenames before creating output paths", () => {
    expect(generateImage("ignored", "../escape.png")).toEqual({
      success: false,
      error: "invalid filename",
    });
  });
});

describe("driveUploadCommand", () => {
  it("builds rclone copy to the default gdrive folder", () => {
    const cmd = driveUploadCommand("/tmp/summary-x.png", "summary-x.png");
    expect(cmd.bin).toBe("/usr/local/bin/rclone");
    expect(cmd.args[0]).toBe("copy");
    expect(cmd.args[1]).toBe("/tmp/summary-x.png");
    expect(cmd.args[2]).toBe("gdrive:13_bible/eobom");
    expect(cmd.args).toContain("--log-level");
  });

  it("honors STORY_MIRROR_DRIVE_FOLDER override", () => {
    const prev = process.env.STORY_MIRROR_DRIVE_FOLDER;
    process.env.STORY_MIRROR_DRIVE_FOLDER = "08_Private/eobom";
    try {
      const cmd = driveUploadCommand("/tmp/summary-x.png", "summary-x.png");
      expect(cmd.args[2]).toBe("gdrive:08_Private/eobom");
    } finally {
      if (prev === undefined) delete process.env.STORY_MIRROR_DRIVE_FOLDER;
      else process.env.STORY_MIRROR_DRIVE_FOLDER = prev;
    }
  });

  it("keeps the original filename in the rclone log path", () => {
    const cmd = driveUploadCommand("/tmp/summary-x.png", "summary-x.png");
    const logArg = cmd.args[cmd.args.indexOf("--log-file") + 1];
    expect(logArg).toContain("rclone-summary-x.png.log");
  });
});

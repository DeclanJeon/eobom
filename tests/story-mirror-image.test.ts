import { describe, it, expect } from "bun:test";
import {
  buildVisualizationPrompt,
  driveUploadCommand,
} from "../src/lib/story-mirror/image-gen";

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
      if ( prev === undefined) delete process.env.STORY_MIRROR_DRIVE_FOLDER;
      else process.env.STORY_MIRROR_DRIVE_FOLDER = prev;
    }
  });

  it("keeps the original filename in the rclone log path", () => {
    const cmd = driveUploadCommand("/tmp/summary-x.png", "summary-x.png");
    const logArg = cmd.args[cmd.args.indexOf("--log-file") + 1];
    expect(logArg).toContain("rclone-summary-x.png.log");
  });
});

/**
 * Story Mirror — Image Generation via codex-imagen
 *
 * 운영 서버의 codex-imagen을 로컬에서 호출해 이미지를 생성하고,
 * 생성된 결과를 n8n이 사용하는 동일 Google Drive(gdrive 원격)에 백업한다.
 */

import { execFileSync, execSync, spawn } from "child_process";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
const CODEX_IMAGEN = "/home/declan/bin/codex-imagen";
export const VISUALIZATION_OUTPUT_DIR = "/home/declan/output/story-mirror-vis";
const LOCAL_OUTPUT_DIR = "public/story-mirror/vis";
const TIMEOUT = 120;

// 생성된 이미지를 n8n이 사용하는 동일 Google Drive에 백업한다 (rclone gdrive 원격).
const RCLONE_BIN = process.env.RCLONE_BIN || "/usr/local/bin/rclone";
const DRIVE_REMOTE = "gdrive:";
const DRIVE_FOLDER_DEFAULT = "13_bible/eobom";

export type ImageGenResult = {
  success: boolean;
  localPath?: string;
  remotePath?: string;
  error?: string;
};

/** 운영 서버에서 이미지를 생성하고 로컬로 복사한다 */
export function generateImage(
  prompt: string,
  filename: string,
): ImageGenResult {
  const remotePath = `${VISUALIZATION_OUTPUT_DIR}/${filename}`;
  const localDir = join(process.cwd(), LOCAL_OUTPUT_DIR);
  const localPath = join(localDir, filename);
  const runsLocally = existsSync(CODEX_IMAGEN);

  if (!existsSync(localDir)) {
    mkdirSync(localDir, { recursive: true });
  }

  // 운영 앱은 이미지 생성기와 같은 서버에서 실행되므로 SSH를 거치지 않는다.
  if (runsLocally) {
    try {
      mkdirSync(VISUALIZATION_OUTPUT_DIR, { recursive: true });
      execFileSync(
        CODEX_IMAGEN,
        [prompt, "-o", remotePath, "--timeout", String(TIMEOUT)],
        {
          timeout: (TIMEOUT + 30) * 1000,
          encoding: "utf-8",
          stdio: "pipe",
        },
      );
      copyFileSync(remotePath, localPath);
      uploadToDrive(remotePath, filename);
      return {
        success: true,
        localPath: `/api/story-mirror/visualize?file=${encodeURIComponent(filename)}`,
        remotePath,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  try {
    // 로컬 개발 환경에서는 기존 원격 생성기를 사용한다.
    execSync(`ssh ponslink "mkdir -p ${VISUALIZATION_OUTPUT_DIR}"`, {
      timeout: 10000,
      encoding: "utf-8",
    });

    const escapedPrompt = prompt.replace(/'/g, "'\\''");
    execSync(
      `ssh ponslink "${CODEX_IMAGEN} '${escapedPrompt}' -o ${remotePath} --timeout ${TIMEOUT}"`,
      {
        timeout: (TIMEOUT + 30) * 1000,
        encoding: "utf-8",
        stdio: "pipe",
      },
    );

    execSync(`scp ponslink:${remotePath} ${localPath}`, {
      timeout: 30000,
      encoding: "utf-8",
    });

    uploadToDrive(remotePath, filename);
    return {
      success: true,
      localPath: `/api/story-mirror/visualize?file=${encodeURIComponent(filename)}`,
      remotePath,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * 생성된 이미지를 Google Drive(gdrive 원격)에 업로드할 rclone 명령을 구성한다.
 * n8n이 동일한 Drive를 사용하므로 운영 서버의 rclone gdrive 원격 구성을 그대로 활용한다.
 */
export type DriveUploadCommand = { bin: string; args: string[] };

export function driveUploadCommand(
  filePath: string,
  filename: string,
  folder: string = process.env.STORY_MIRROR_DRIVE_FOLDER || DRIVE_FOLDER_DEFAULT,
): DriveUploadCommand {
  const dest = `${DRIVE_REMOTE}${folder}`;
  const logFile = join(VISUALIZATION_OUTPUT_DIR, `rclone-${filename}.log`);
  return {
    bin: RCLONE_BIN,
    args: ["copy", filePath, dest, "--log-file", logFile, "--log-level", "INFO"],
  };
}

/**
 * 생성된 이미지를 Google Drive(gdrive 원격)에 비차단으로 업로드한다.
 * 실패하더라도 이미지 생성 결과에는 영향을 주지 않도록 best-effort로 동작한다.
 */
export function uploadToDrive(filePath: string, filename: string): void {
  if (process.env.STORY_MIRROR_DRIVE_ENABLED === "0") return;
  const folder = process.env.STORY_MIRROR_DRIVE_FOLDER || DRIVE_FOLDER_DEFAULT;
  const { bin, args } = driveUploadCommand(filePath, filename);
  try {
    const child = spawn(bin, args, {
      detached: true,
      stdio: "ignore",
      env: process.env,
    });
    child.on("error", (err) =>
      console.error(`[story-mirror] drive upload spawn failed (${filename}):`, err),
    );
    child.on("exit", (code) => {
      if (code) console.error(`[story-mirror] drive upload exited ${code} (${filename})`);
    });
    child.unref();
  } catch (err) {
    console.error(`[story-mirror] drive upload failed (${filename}):`, err);
  }
}

/**
 * 시각화 프롬프트 생성 (v4.2: summary 단일 종류).
 * 사용자의 묵상 한 계절을 하나의 조용한 통찰로 담는 추상 수채화.
 */
export function buildVisualizationPrompt(kind: "summary", _dataSummary: string): string {
  const base = `Warm, calm, contemplative mood. Korean minimal aesthetics. Palette: linen (#fbf9f6), forest (#061b0e), gold (#c5a059), clay (#b36a5e). No faces, no people, no text, no UI elements. Handmade watercolor paper texture. Square format.`;
  if (kind === "summary") {
    return `Create a single square summary illustration, an editorial-quality abstract watercolor image that gently encapsulates a season of personal spiritual reflection as one quiet insight. No text, labels, numbers, or recognizable figures. Suggest a calm inner landscape: a soft horizon, a single vessel or seed, gentle light, layered translucent washes that breathe. Emphasize stillness, warmth, and quiet hope. Handmade watercolor paper texture, soft bleeding pigments, delicate brush edges. ${base}`;
  }
  return base;
}

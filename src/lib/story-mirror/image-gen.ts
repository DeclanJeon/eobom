/**
 * Story Mirror — Image Generation via codex-imagen
 *
 * 운영 서버의 codex-imagen을 로컬에서 호출해 이미지를 생성하고,
 * 생성된 결과를 n8n이 사용하는 동일 Google Drive(gdrive 원격)에 백업한다.
 */

import { execFileSync, spawn } from "child_process";
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
    // execFileSync 배열 인자 — 셸 문자열 해석이 없어 인자 주입이 불가능하다.
    execFileSync("ssh", ["ponslink", `mkdir -p ${VISUALIZATION_OUTPUT_DIR}`], {
      timeout: 10000,
      encoding: "utf-8",
    });

    // prompt는 base64로 전달 — 원격 셸에서 해석될 수 있는 문자가 없도록 한다.
    // remotePath는 상수 디렉터리 + filename이며, filename은 호출부에서
    // kind(화이트리스트)+hex fingerprint로 제한되지만 방어 계층으로 인용한다.
    if (!/^[a-z0-9-]+\.png$/.test(filename)) {
      return { success: false, error: "invalid filename" };
    }
    const promptB64 = Buffer.from(prompt, "utf-8").toString("base64");
    execFileSync(
      "ssh",
      [
        "ponslink",
        `${CODEX_IMAGEN} "$(printf '%s' '${promptB64}' | base64 -d)" -o '${remotePath}' --timeout ${TIMEOUT}`,
      ],
      {
        timeout: (TIMEOUT + 30) * 1000,
        encoding: "utf-8",
        stdio: "pipe",
      },
    );

    execFileSync("scp", ["ponslink:" + remotePath, localPath], {
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
 * 회고 기반 imageBrief를 받아 이미지 생성 프롬프트를 구성한다.
 * 장면의 주 내용은 imageBrief에서 오고, 미학 제약은 최소 가드레일로만 유지한다.
 */
export function buildVisualizationPrompt(
  kind: "summary",
  imageBrief: string,
): string {
  const guardrails =
    "Style constraints: warm contemplative Korean minimal aesthetics; palette linen (#fbf9f6), forest (#061b0e), gold (#c5a059), clay (#b36a5e); handmade watercolor paper texture; square format; no faces, no people, no text, no UI, no numbers, no labels.";
  const brief = imageBrief.trim();
  if (kind === "summary") {
    if (!brief) {
      return `Create a single square abstract watercolor summarizing a personal spiritual reflection season as one quiet insight. Soft horizon, single vessel or seed, gentle light, layered translucent washes. ${guardrails}`;
    }
    return `Create a single square abstract watercolor illustration that visualizes THIS person's reflection season. Primary scene brief (follow faithfully, still abstract, never literal portraiture or readable text): ${brief} Render as editorial-quality watercolor with stillness, warmth, and quiet hope. ${guardrails}`;
  }
  return `${brief} ${guardrails}`.trim();
}

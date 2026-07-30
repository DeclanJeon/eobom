/**
 * Story Mirror — Image Generation via codex-imagen
 *
 * ponslink 서버의 codex-imagen을 SSH로 호출하여 이미지를 생성한다.
 */

import { execFileSync, execSync } from "child_process";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
const CODEX_IMAGEN = "/home/declan/bin/codex-imagen";
const REMOTE_OUTPUT_DIR = "/home/declan/output/story-mirror-vis";
const LOCAL_OUTPUT_DIR = "public/story-mirror/vis";
const TIMEOUT = 120;

export type ImageGenResult = {
  success: boolean;
  localPath?: string;
  remotePath?: string;
  error?: string;
};

/** 원격 서버에서 이미지를 생성하고 로컬로 복사한다 */
export function generateImage(
  prompt: string,
  filename: string,
): ImageGenResult {
  const remotePath = `${REMOTE_OUTPUT_DIR}/${filename}`;
  const localDir = join(process.cwd(), LOCAL_OUTPUT_DIR);
  const localPath = join(localDir, filename);
  const runsLocally = existsSync(CODEX_IMAGEN);

  if (!existsSync(localDir)) {
    mkdirSync(localDir, { recursive: true });
  }

  // 운영 앱은 이미지 생성기와 같은 서버에서 실행되므로 SSH를 거치지 않는다.
  if (runsLocally) {
    try {
      mkdirSync(REMOTE_OUTPUT_DIR, { recursive: true });
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
      return {
        success: true,
        localPath: `/${LOCAL_OUTPUT_DIR}/${filename}`,
        remotePath,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  try {
    // 로컬 개발 환경에서는 기존 원격 생성기를 사용한다.
    execSync(`ssh ponslink "mkdir -p ${REMOTE_OUTPUT_DIR}"`, {
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

    return {
      success: true,
      localPath: `/${LOCAL_OUTPUT_DIR}/${filename}`,
      remotePath,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
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

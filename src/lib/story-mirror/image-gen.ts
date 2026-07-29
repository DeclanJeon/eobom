/**
 * Story Mirror — Image Generation via codex-imagen
 *
 * ponslink 서버의 codex-imagen을 SSH로 호출하여 이미지를 생성한다.
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
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

  if (!existsSync(localDir)) {
    mkdirSync(localDir, { recursive: true });
  }

  // 이미지가 이미 존재하면 건너뜀
  if (existsSync(localPath)) {
    return { success: true, localPath: `/${LOCAL_OUTPUT_DIR}/${filename}`, remotePath };
  }

  try {
    // 원격 디렉토리 생성
    execSync(`ssh ponslink "mkdir -p ${REMOTE_OUTPUT_DIR}"`, {
      timeout: 10000,
      encoding: "utf-8",
    });

    // codex-imagen 호출 (SSH)
    const escapedPrompt = prompt.replace(/'/g, "'\\''");
    execSync(
      `ssh ponslink "${CODEX_IMAGEN} '${escapedPrompt}' -o ${remotePath} --timeout ${TIMEOUT}"`,
      {
        timeout: (TIMEOUT + 30) * 1000,
        encoding: "utf-8",
        stdio: "pipe",
      },
    );

    // 로컬로 복사
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

/** 시각화 종류별 프롬프트 생성 */
export function buildVisualizationPrompt(
  kind: "timeline" | "network" | "emotion" | "story-match",
  _dataSummary: string,
): string {
  const base = `Warm, calm, contemplative mood. Korean minimal aesthetics. Palette: linen (#fbf9f6), forest (#061b0e), gold (#c5a059), clay (#b36a5e). No faces, no people, no text, no UI elements. Handmade watercolor paper texture. Square format.`;

  switch (kind) {
    case "timeline":
      return `Create a square, editorial-quality infographic illustration visualizing a personal spiritual journey as an abstract timeline. No text, labels, numbers, icons with meaning, or typography. Represent the passage of time with a flowing horizontal path that gently curves through a serene watercolor landscape. Along the path, vary the density of soft organic marks, stones, leaves, or glowing brushstroke clusters to indicate changing entry frequency. Introduce subtle color transitions and symbolic natural motifs to suggest evolving meditation themes without explicit symbols. Use layered translucent watercolor washes, handmade paper texture, soft bleeding pigments, and delicate brush edges. ${base}`;

    case "network":
      return `Create a square abstract visualization of interconnected meditation themes as a graceful node network. No text, labels, numbers, or recognizable diagrams with captions. Depict softly glowing watercolor circles connected by flowing ink-like lines, resembling roots, mycelium, river branches, or constellations. Clusters naturally emerge with varying densities to imply frequently co-occurring reflections. Balance complexity with generous breathing room, emphasizing harmony over technical precision. Handmade watercolor paper texture, layered transparent pigments, gentle blooms, subtle granulation, and soft feathered edges. ${base}`;

    case "emotion":
      return `Create a square abstract stacked-area composition expressing emotional balance across time without using charts, axes, labels, or text. Multiple translucent watercolor bands gently flow across the canvas like layered hills, rivers, mist, or rolling fabric, expanding and contracting to suggest changing emotional proportions. Smooth organic transitions, overlapping transparent washes, soft gradients, subtle pigment blooms, and visible watercolor texture create depth and serenity. ${base}`;

    case "story-match":
      return `Create a square abstract bipartite-style composition visualizing meaningful connections between personal reflections and timeless narrative archetypes without text or recognizable characters. Two balanced columns of organic watercolor forms face one another across an open center, connected by elegant flowing brushstroke threads of varying thickness and transparency. The left side consists of unique abstract journal-like organic shapes; the right side contains distinct symbolic natural forms such as trees, mountains, vessels, stars, seeds, or pathways that suggest enduring stories without depicting people or explicit religious figures. Connections create a harmonious woven pattern emphasizing discovery and resonance. Handmade watercolor texture, soft bleeding pigments, layered washes, and delicate brushwork. ${base}`;
  }
}

/**
 * Story Mirror — Image Generation via codex-imagen
 *
 * 운영 서버의 codex-imagen을 로컬에서 호출해 이미지를 생성하고,
 * 생성된 결과를 n8n이 사용하는 동일 Google Drive(gdrive 원격)에 백업한다.
 */

import { execFile, execFileSync, spawn } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { promisify } from "util";
import { join } from "path";
const CODEX_IMAGEN = "/home/declan/bin/codex-imagen";
export const VISUALIZATION_OUTPUT_DIR = "/home/declan/output/story-mirror-vis";
const TIMEOUT = 120;
const execFileAsync = promisify(execFile);

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
  if (!/^[a-z0-9-]+\.png$/i.test(filename)) {
    return { success: false, error: "invalid filename" };
  }

  const remotePath = `${VISUALIZATION_OUTPUT_DIR}/${filename}`;
  const localPath = join(VISUALIZATION_OUTPUT_DIR, filename);
  const runsLocally = existsSync(CODEX_IMAGEN);

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
    // filename은 함수 진입 시 화이트리스트 검증을 통과했다.
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

    mkdirSync(VISUALIZATION_OUTPUT_DIR, { recursive: true });
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

/** 비동기 이미지 생성 — 요청 처리 이벤트 루프를 차단하지 않는다. */
export async function generateImageAsync(
  prompt: string,
  filename: string,
): Promise<ImageGenResult> {
  if (!/^[a-z0-9-]+\.png$/i.test(filename)) {
    return { success: false, error: "invalid filename" };
  }

  const remotePath = `${VISUALIZATION_OUTPUT_DIR}/${filename}`;
  const localPath = join(VISUALIZATION_OUTPUT_DIR, filename);
  const runsLocally = existsSync(CODEX_IMAGEN);
  const options = {
    timeout: (TIMEOUT + 30) * 1000,
    encoding: "utf-8" as const,
    stdio: "pipe" as const,
  };

  try {
    mkdirSync(VISUALIZATION_OUTPUT_DIR, { recursive: true });
    if (runsLocally) {
      await execFileAsync(
        CODEX_IMAGEN,
        [prompt, "-o", remotePath, "--timeout", String(TIMEOUT)],
        options,
      );
    } else {
      const promptB64 = Buffer.from(prompt, "utf-8").toString("base64");
      await execFileAsync(
        "ssh",
        ["ponslink", `mkdir -p '${VISUALIZATION_OUTPUT_DIR}'`],
        { ...options, timeout: 10000 },
      );
      await execFileAsync(
        "ssh",
        [
          "ponslink",
          `${CODEX_IMAGEN} "$(printf '%s' '${promptB64}' | base64 -d)" -o '${remotePath}' --timeout ${TIMEOUT}`,
        ],
        options,
      );
      await execFileAsync("scp", [`ponslink:${remotePath}`, localPath], {
        ...options,
        timeout: 30000,
      });
    }

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
  if (!/^[a-zA-Z0-9/_\-]{1,64}$/.test(folder) || folder.includes("..") || folder.startsWith("/"))
    throw new Error("invalid drive folder");
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
 * 이야기 카드의 시각적 브리프 (텍스트 모델이 생성)
 *
 * 이야기의 줄거리가 아니라 감정 구조를 상징적 장면으로 번역한다.
 * - subject: 장면의 중심 사물 (인물 초상 금지)
 * - setting: 시간/공간 맥락
 * - visibleAction: 보이는 움직임
 * - innerTension: 감정적 긴장
 * - visualMetaphor: 시각적 은유
 * - turningPoint: 변화의 씨앗
 * - composition: 구도 지시
 * - palette: 색상 팔레트 (linen/gold/forest/clay 권장)
 * - mood: 전체 분위기
 * - avoid: 피해야 할 요소
 * - altText: 화면 낭독용 설명
 */
export type StoryVisualBrief = {
  subject: string;
  setting: string;
  visibleAction: string;
  innerTension: string;
  visualMetaphor: string;
  turningPoint: string | null;
  composition: string;
  palette: string[];
  mood: string;
  avoid: string[];
  altText: string;
};

/**
 * 이야기 연결 정보를 받아 시각 브리프를 생성하는 프롬프트를 만든다.
 *
 * 이 프롬프트는 텍스트 모델(회고 생성 단계)이 실행하며,
 * 이미지 모델(Codex Imagen)에는 전달되지 않는다.
 *
 * 목표: 원문 기록의 개인정보와 구체적 사건을 제거하고,
 * 감정 구조만을 상징적 장면으로 번역한다.
 */
export function buildStoryVisualBriefPrompt(opts: {
  story: string;
  source: string;
  connection: string;
  differentPerspective?: string | null;
}): string {
  const { story, source, connection, differentPerspective } = opts;

  return `당신은 이어봄의 시각 편집자입니다.

목표:
사용자의 기록과 연결된 이야깃거리를 직접 재현하지 말고,
그 이야기가 가진 감정적 구조를 하나의 상징적 장면으로 번역하세요.

입력:
- 이야기 제목: ${story}
- 출처: ${source}
- 연결 설명: ${connection}
${differentPerspective ? `- 다른 관점: ${differentPerspective}` : ''}

규칙:
1. 사용자의 원문 기록이나 개인 식별 정보를 이미지 브리프에 포함하지 마세요.
2. 인물의 얼굴, 특정 실존 인물의 외모, 유명 캐릭터의 초상을 만들지 마세요.
3. 이야기의 줄거리를 그대로 장면화하지 말고 감정과 관계를 시각적 은유로 바꾸세요.
4. 한 장면, 하나의 중심 사물, 하나의 감정적 긴장만 사용하세요.
5. 이미지 안에는 글자, 숫자, 로고, UI, 표지판을 넣지 마세요.
6. 종교적 이야기는 특정 교리의 정답처럼 보이지 않도록 상징적이고 절제된 이미지로 표현하세요.
7. 폭력, 자극적인 절망, 공포, 선정적 연출은 피하세요.
8. 결과는 반드시 아래 JSON 구조로만 반환하세요.

{
  "subject": "...",
  "setting": "...",
  "visibleAction": "...",
  "innerTension": "...",
  "visualMetaphor": "...",
  "turningPoint": "...",
  "composition": "...",
  "palette": ["...", "...", "..."],
  "mood": "...",
  "avoid": ["...", "..."],
  "altText": "..."
}`;
}

/**
 * StoryVisualBrief를 받아 Codex Imagen용 이미지 프롬프트를 구성한다.
 *
 * buildVisualizationPrompt()의 guardrail을 재사용하되,
 * 이야기 카드의 감정 구조를 강조한다.
 */
export function buildStoryVisualPrompt(
  brief: StoryVisualBrief,
  opts?: { locale?: string }
): string {
  const guardrails =
    "Style constraints: warm contemplative Korean minimal aesthetics; palette linen (#fbf9f6), forest (#061b0e), gold (#c5a059), clay (#b36a5e); handmade watercolor paper texture; square format; no faces, no people, no text, no UI, no numbers, no labels, no recognizable portraits.";

  const palette = brief.palette.length > 0
    ? `Use palette: ${brief.palette.join(', ')}.`
    : '';

  const avoid = brief.avoid.length > 0
    ? `Do not include: ${brief.avoid.join(', ')}.`
    : '';

  const scene = `Scene: ${brief.subject} in ${brief.setting}. ${brief.visibleAction}.`;
  const emotion = `Emotional structure: ${brief.innerTension}. ${brief.visualMetaphor}.`;
  const turning = brief.turningPoint
    ? `Turning point: ${brief.turningPoint}.`
    : '';
  const composition = `Composition: ${brief.composition}.`;
  const mood = `Mood: ${brief.mood}.`;

  return `Create a single editorial watercolor illustration for a quiet personal reflection story.

${scene}
${emotion}
${turning}
${composition}
${mood}
${palette}
${avoid}

${guardrails}`;
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

/**
 * MiMo API를 사용하여 이야기 카드의 시각 브리프를 생성합니다.
 *
 * @param story 연결 정보 (story, source, connection, differentPerspective)
 * @returns 시각 브리프 또는 null (API 실패 시)
 */
export async function generateStoryVisualBrief(story: {
  story: string;
  source: string;
  connection: string;
  differentPerspective?: string | null;
}): Promise<StoryVisualBrief | null> {
  const apiKey = process.env.MIMO_API_KEY?.trim();
  const baseURL = (process.env.MIMO_BASE_URL || "https://api.xiaomimimo.com/v1").replace(
    /\/$/,
    ""
  );
  const model = process.env.MIMO_MODEL || "mimo-v2.5";

  if (!apiKey) {
    console.warn("[story-visual] MiMo API key not configured, skipping visual brief generation");
    return null;
  }

  const prompt = buildStoryVisualBriefPrompt(story);

  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "당신은 시각 편집자입니다. 이야기의 감정 구조를 상징적 장면으로 번역합니다. JSON만 출력하세요.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      console.error(`[story-visual] MiMo API error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      console.error("[story-visual] Empty response from MiMo");
      return null;
    }

    // JSON 파싱
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[story-visual] No JSON found in response");
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // 필수 필드 검증
    if (
      !parsed.subject ||
      !parsed.setting ||
      !parsed.visibleAction ||
      !parsed.innerTension ||
      !parsed.visualMetaphor ||
      !parsed.composition ||
      !parsed.mood ||
      !parsed.altText
    ) {
      console.error("[story-visual] Missing required fields in visual brief");
      return null;
    }

    return {
      subject: parsed.subject,
      setting: parsed.setting,
      visibleAction: parsed.visibleAction,
      innerTension: parsed.innerTension,
      visualMetaphor: parsed.visualMetaphor,
      turningPoint: parsed.turningPoint || null,
      composition: parsed.composition,
      palette: Array.isArray(parsed.palette) ? parsed.palette : [],
      mood: parsed.mood,
      avoid: Array.isArray(parsed.avoid) ? parsed.avoid : [],
      altText: parsed.altText,
    };
  } catch (error) {
    console.error("[story-visual] Failed to generate visual brief:", error);
    return null;
  }
}

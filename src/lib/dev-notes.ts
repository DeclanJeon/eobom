import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type DevNoteSection = {
  title: string;
  items: string[];
};

export type DevNote = {
  version: string;
  date: string | null;
  title: string;
  slug: string;
  sections: DevNoteSection[];
  /** 카드용 짧은 하이라이트 (기능·개선 위주) */
  highlights: string[];
};

function notesRoots(): string[] {
  const cwd = process.cwd();
  return [
    join(cwd, "docs/dev-notes"),
    join(cwd, "../docs/dev-notes"),
    join(cwd, "../../docs/dev-notes"),
  ];
}

export function resolveDevNotesDir(): string | null {
  for (const dir of notesRoots()) {
    if (existsSync(dir)) return dir;
  }
  return null;
}

function parseNoteMarkdown(filename: string, raw: string): DevNote | null {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const h1 = lines.find((l) => l.startsWith("# "));
  if (!h1) return null;

  const title = h1.replace(/^#\s+/, "").trim();
  const versionMatch =
    title.match(/v(\d+\.\d+\.\d+)/i) ||
    filename.match(/v(\d+\.\d+\.\d+)/i);
  const version = versionMatch?.[1] || "0.0.0";

  let date: string | null = null;
  for (const line of lines) {
    const m = line.match(/^-?\s*날짜:\s*(\d{4}-\d{2}-\d{2})/);
    if (m) {
      date = m[1];
      break;
    }
  }
  if (!date) {
    const fm = filename.match(/(\d{4}-\d{2}-\d{2})/);
    date = fm?.[1] || null;
  }

  const sections: DevNoteSection[] = [];
  let current: DevNoteSection | null = null;
  for (const line of lines) {
    const h3 = line.match(/^###\s+(.+)\s*$/);
    if (h3) {
      current = { title: h3[1].trim(), items: [] };
      sections.push(current);
      continue;
    }
    if (!current) continue;
    const bullet = line.match(/^-\s+(.+)\s*$/);
    if (bullet) current.items.push(bullet[1].trim());
  }

  const preferred = ["기능", "개선", "수정"];
  const highlights: string[] = [];
  for (const name of preferred) {
    const sec = sections.find((s) => s.title.includes(name));
    if (!sec) continue;
    for (const item of sec.items) {
      if (highlights.length >= 6) break;
      highlights.push(item);
    }
    if (highlights.length >= 6) break;
  }
  if (!highlights.length) {
    for (const sec of sections) {
      for (const item of sec.items) {
        if (highlights.length >= 6) break;
        highlights.push(item);
      }
    }
  }

  const slug =
    filename.replace(/\.md$/i, "") === "LATEST"
      ? `v${version}`
      : filename.replace(/\.md$/i, "");

  return {
    version,
    date,
    title,
    slug,
    sections: sections.filter((s) => s.items.length > 0),
    highlights,
  };
}

function versionKey(v: string): number[] {
  return v.split(".").map((n) => Number(n) || 0);
}

function cmpVersion(a: string, b: string): number {
  const aa = versionKey(a);
  const bb = versionKey(b);
  for (let i = 0; i < 3; i++) {
    const d = (aa[i] || 0) - (bb[i] || 0);
    if (d) return d;
  }
  return 0;
}

/** 버전별 개발노트 목록 (최신 먼저). LATEST.md는 중복 제거용으로만 사용. */
export function listDevNotes(): DevNote[] {
  const dir = resolveDevNotesDir();
  if (!dir) return [];

  const files = readdirSync(dir).filter(
    (f) => f.endsWith(".md") && f !== "LATEST.md",
  );
  const notes: DevNote[] = [];
  for (const file of files) {
    try {
      const raw = readFileSync(join(dir, file), "utf8");
      const note = parseNoteMarkdown(file, raw);
      if (note) notes.push(note);
    } catch {
      // skip unreadable
    }
  }

  notes.sort((a, b) => {
    const byV = cmpVersion(b.version, a.version);
    if (byV) return byV;
    return (b.date || "").localeCompare(a.date || "");
  });
  return notes;
}

export function getLatestDevNote(): DevNote | null {
  const listed = listDevNotes();
  if (listed[0]) return listed[0];

  const dir = resolveDevNotesDir();
  if (!dir) return null;
  const latestPath = join(dir, "LATEST.md");
  if (!existsSync(latestPath)) return null;
  try {
    return parseNoteMarkdown("LATEST.md", readFileSync(latestPath, "utf8"));
  } catch {
export function getDevNoteBySlug(slug: string): DevNote | null {
  const all = listDevNotes();
  const direct = all.find((n) => n.slug === slug);
  if (direct) return direct;
  if (slug.startsWith("v")) {
    return all.find((n) => n.version === slug.slice(1)) || null;
  }
  return all.find((n) => n.version === slug || n.slug === `v${slug}`) || null;
}
    return all.find((n) => n.version === slug.slice(1)) || null;
  }
  return all.find((n) => n.version === slug) || null;
}

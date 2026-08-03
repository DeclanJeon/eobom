#!/usr/bin/env bun
/**
 * package.json 버전을 올리고, 직전 태그/버전 이후 커밋으로
 * docs/dev-notes/ 개발노트와 CHANGELOG.md 상단을 갱신한다.
 *
 * 사용:
 *   bun scripts/release-note.ts              # patch 기본
 *   bun scripts/release-note.ts --bump minor
 *   bun scripts/release-note.ts --bump major
 *   bun scripts/release-note.ts --from <sha> # 범위 지정
 *   bun scripts/release-note.ts --dry-run
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Bump = "major" | "minor" | "patch" | "none";

const ROOT = process.cwd();
const PKG_PATH = join(ROOT, "package.json");
const NOTES_DIR = join(ROOT, "docs/dev-notes");
const CHANGELOG_PATH = join(ROOT, "CHANGELOG.md");
const LATEST_PATH = join(NOTES_DIR, "LATEST.md");

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i < 0) return undefined;
  return process.argv[i + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function parseBump(raw: string | undefined, commits: string[]): Bump {
  if (raw === "major" || raw === "minor" || raw === "patch" || raw === "none") {
    return raw;
  }
  const body = commits.join("\n");
  if (/\[major\]|BREAKING CHANGE|!:/i.test(body)) return "major";
  if (
    /\[minor\]|^feat(\(.+\))?:|전면|재설계|추가한다|확장한다|신설/i.test(body)
  ) {
    return "minor";
  }
  if (/^chore\(release\)/i.test(body) && commits.length <= 2) return "none";
  return "patch";
}

function bumpVersion(version: string, bump: Bump): string {
  if (bump === "none") return version;
  const m = version.trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-.*)?$/);
  if (!m) throw new Error(`Invalid version: ${version}`);
  let major = Number(m[1]);
  let minor = Number(m[2]);
  let patch = Number(m[3]);
  if (bump === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bump === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

function classify(subject: string): "feature" | "fix" | "improve" | "other" {
  if (/fix|고친다|수정|버그|차단|복구|실패/i.test(subject)) return "fix";
  if (/개선|다듬|정리|단순|성능|접근성|ux|ui/i.test(subject)) return "improve";
  if (
    /추가|확장|신설|도입|재설계|구현|넣는다|세운다|담는다|받는다/i.test(
      subject,
    )
  ) {
    return "feature";
  }
  return "other";
}

function cleanSubject(subject: string): string {
  return subject
    .replace(
      /^(feat|fix|docs|chore|refactor|test|style|perf|build|ci)(\(.+\))?:\s*/i,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

async function git(args: string[]): Promise<string> {
  const proc = Bun.spawn(["git", ...args], {
    cwd: ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0) throw new Error(err || `git ${args.join(" ")} failed`);
  return out.trim();
}

async function resolveFrom(explicit?: string): Promise<string> {
  if (explicit) return explicit;
  try {
    const tag = await git(["describe", "--tags", "--abbrev=0"]);
    if (tag) return tag;
  } catch {
    // no tags
  }
  // first parent of HEAD if shallow history allows, else empty tree
  try {
    const count = Number(await git(["rev-list", "--count", "HEAD"]));
    if (count > 1) return "HEAD~1";
  } catch {
    // ignore
  }
  return "";
}

async function commitSubjects(from: string): Promise<string[]> {
  const range = from ? `${from}..HEAD` : "HEAD";
  const raw = await git([
    "log",
    range,
    "--pretty=format:%s",
    "--no-merges",
  ]);
  if (!raw) return [];
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !/^chore\(release\)/i.test(s))
    .filter((s) => !/\[skip (ci|release)\]/i.test(s));
}

function renderNote(opts: {
  version: string;
  date: string;
  subjects: string[];
  sha: string;
}): string {
  const groups: Record<string, string[]> = {
    feature: [],
    improve: [],
    fix: [],
    other: [],
  };
  for (const s of opts.subjects) {
    const cleaned = cleanSubject(s);
    if (!cleaned) continue;
    groups[classify(cleaned)].push(cleaned);
  }

  const section = (title: string, items: string[]) => {
    if (!items.length) return "";
    const uniq = [...new Set(items)].slice(0, 20);
    return `### ${title}\n\n${uniq.map((i) => `- ${i}`).join("\n")}\n`;
  };

  const body = [
    section("기능", groups.feature),
    section("개선", groups.improve),
    section("수정", groups.fix),
    section("기타", groups.other),
  ]
    .filter(Boolean)
    .join("\n");

  return `# 이어봄 v${opts.version}

- 날짜: ${opts.date}
- 커밋: \`${opts.sha.slice(0, 7)}\`
- 반영 커밋 수: ${opts.subjects.length}

${body || "### 기타\n\n- 유지보수 및 내부 정리\n"}
`;
}

function upsertChangelog(version: string, date: string, noteBody: string) {
  const header = `# 변경 기록 (CHANGELOG)

이 파일은 CI가 main 푸시마다 자동으로 갱신합니다. 상세 개발노트는 \`docs/dev-notes/\`를 보세요.

`;
  const entryTitle = `## v${version} — ${date}`;
  // strip H1 from note body for changelog entry
  const entryBody = noteBody
    .replace(/^# .+\n+/, "")
    .replace(/^- 날짜:.*\n/gm, "")
    .replace(/^- 커밋:.*\n/gm, "")
    .replace(/^- 반영 커밋 수:.*\n/gm, "")
    .trim();

  const block = `${entryTitle}\n\n${entryBody}\n`;
  let existing = existsSync(CHANGELOG_PATH)
    ? readFileSync(CHANGELOG_PATH, "utf8")
    : header;
  if (!existing.startsWith("# 변경 기록")) {
    existing = header + existing;
  }
  if (existing.includes(entryTitle)) {
    // replace existing section until next ## or EOF
    const re = new RegExp(
      `## v${version.replace(/\./g, "\\.")} — [^\n]+\\n[\\s\\S]*?(?=\\n## v|$)`,
    );
    existing = existing.replace(re, `${block}\n`);
    writeFileSync(CHANGELOG_PATH, existing);
    return;
  }
  const inserted = existing.replace(header, `${header}${block}\n`);
  writeFileSync(CHANGELOG_PATH, inserted.startsWith("#") ? inserted : header + block);
}

async function main() {
  const dryRun = hasFlag("--dry-run");
  const bumpArg = argValue("--bump");
  const fromArg = argValue("--from");
  const pkg = JSON.parse(readFileSync(PKG_PATH, "utf8")) as {
    version: string;
    name?: string;
  };
  const from = await resolveFrom(fromArg);
  const subjects = await commitSubjects(from);
  const bump = parseBump(bumpArg, subjects);
  if (bump === "none" || subjects.length === 0) {
    console.log(
      JSON.stringify(
        {
          skipped: true,
          reason: bump === "none" ? "bump=none" : "no commits",
          from,
          version: pkg.version,
        },
        null,
        2,
      ),
    );
    return;
  }

  const next = bumpVersion(pkg.version, bump);
  const date = new Date().toISOString().slice(0, 10);
  const sha = await git(["rev-parse", "HEAD"]);
  const note = renderNote({
    version: next,
    date,
    subjects,
    sha,
  });
  const notePath = join(NOTES_DIR, `${date}-v${next}.md`);

  console.log(
    JSON.stringify(
      {
        from,
        bump,
        previous: pkg.version,
        next,
        commits: subjects.length,
        notePath: `docs/dev-notes/${date}-v${next}.md`,
        dryRun,
      },
      null,
      2,
    ),
  );

  if (dryRun) {
    console.log("\n----- note preview -----\n" + note);
    return;
  }

  if (!existsSync(NOTES_DIR)) mkdirSync(NOTES_DIR, { recursive: true });
  pkg.version = next;
  writeFileSync(PKG_PATH, `${JSON.stringify(pkg, null, 2)}\n`);
  writeFileSync(notePath, note);
  writeFileSync(LATEST_PATH, note);
  upsertChangelog(next, date, note);

  // lightweight version stamp for runtime without importing package.json in edge cases
  writeFileSync(
    join(ROOT, "src/lib/version.ts"),
    `/** 앱 표기용 버전. package.json / CI release-note가 단일 소스. */\nexport const APP_VERSION = ${JSON.stringify(next)};\n\nexport function appVersionLabel(prefix = "v") {\n  return \`\${prefix}\${APP_VERSION}\`;\n}\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

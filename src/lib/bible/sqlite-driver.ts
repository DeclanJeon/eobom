// 런타임 SQLite 드라이버 선택 모듈.
// 프로덕션 데몬은 bun이므로 bun:sqlite를 우선 사용하고, 로컬 node 테스트/도구는 node:sqlite로 폴백한다.
// node:sqlite를 정적 import로 남기면 bundler(Turbopack)가 이를 external로 처리해 데몬에서 resolve 실패하므로,
// 절대 정적 import하지 말고 이 모듈을 통해서만 열어야 한다.

export type ReadonlyStatement = {
  all: (...params: unknown[]) => unknown[];
  get: (...params: unknown[]) => unknown;
};

export type ReadonlyDb = {
  prepare: (sql: string) => ReadonlyStatement;
  exec: (sql: string) => void;
  close: () => void;
};

type Driver = {
  name: "bun" | "node";
  open: (path: string) => ReadonlyDb;
};

// 캐시된 드라이버는 프로세스당 1회 로드된다. DB 파일을 교체한 뒤에는 프로세스 재시작이 필요하다.
let cachedDriver: Driver | null | undefined;

type NodeDatabaseCtor = new (path: string, opts?: { readOnly?: boolean }) => NodeDatabase;
type BunDatabaseCtor = new (path: string, opts?: { readonly?: boolean }) => BunDatabase;

function isNodeSqliteModule(mod: unknown): mod is { DatabaseSync: NodeDatabaseCtor } {
  if (typeof mod !== "object" || mod === null || !("DatabaseSync" in mod)) return false;
  // 구조 확인용 1회 참조 — narrowing 후 생성자로만 사용된다.
  const ctor = (mod as { DatabaseSync: unknown }).DatabaseSync;
  return typeof ctor === "function";
}

function isBunSqliteModule(mod: unknown): mod is { Database: BunDatabaseCtor } {
  if (typeof mod !== "object" || mod === null || !("Database" in mod)) return false;
  // 구조 확인용 1회 참조 — narrowing 후 생성자로만 사용된다.
  const ctor = (mod as { Database: unknown }).Database;
  return typeof ctor === "function";
}


function loadDriver(): Driver | null {
  if (cachedDriver !== undefined) return cachedDriver;
  cachedDriver = null;

  // 번들러(Turbopack)는 문자열 리터럴 require()를 external 참조로 치환해 런타임에
  // 실패하게 만든다. 그래서 실패해도 다음 후보로 넘어가는 폴백 사슬이 필요하다.
  const processWithBuiltins = process as typeof process & {
    getBuiltinModule?: (id: string) => unknown;
  };

  const tryRequire = (id: string): unknown => {
    try {
      const r = eval("require") as (id: string) => unknown;
      return r(id);
    } catch {
      return undefined;
    }
  };

  const bunMod = [tryRequire("bun:sqlite")].find((m): m is { Database: BunDatabaseCtor } => isBunSqliteModule(m));
  if (bunMod) {
    cachedDriver = { name: "bun", open: (path) => adaptBun(new bunMod.Database(path, { readonly: true })) };
    return cachedDriver;
  }

  let builtinRaw: unknown;
  try {
    builtinRaw = processWithBuiltins.getBuiltinModule?.("node:sqlite");
  } catch {
    builtinRaw = undefined;
  }

  let evaledRequireRaw: unknown;
  let evaledNodeRequire: ((id: string) => unknown) | null = null;
  try {
    const req = eval("require");
    if (typeof req === "function") evaledNodeRequire = req as (id: string) => unknown;
  } catch {
    /* ESM 전용 컨텍스트 */
  }
  if (evaledNodeRequire) {
    try {
      evaledRequireRaw = evaledNodeRequire("node:sqlite");
    } catch {
      evaledRequireRaw = undefined;
    }
  }

  const nodeMod = [builtinRaw, evaledRequireRaw].find((m): m is { DatabaseSync: NodeDatabaseCtor } => isNodeSqliteModule(m));
  if (nodeMod) {
    cachedDriver = { name: "node", open: (path) => adaptNode(new nodeMod.DatabaseSync(path, { readOnly: true })) };
    return cachedDriver;
  }

  return cachedDriver;
}
// bun:sqlite — query()가 statement, exec()는 db에 존재
type BunStatement = { all: (...p: unknown[]) => unknown[]; get: (...p: unknown[]) => unknown; run: (...p: unknown[]) => unknown };
type BunDatabase = { query: (sql: string) => BunStatement; exec: (sql: string) => void; close: () => void };

function adaptBun(d: BunDatabase): ReadonlyDb {
  d.exec("PRAGMA query_only=ON");
  return {
    prepare: (sql) => d.query(sql) as unknown as ReadonlyStatement,
    exec: (sql) => d.exec(sql),
    close: () => d.close(),
  };
}

// node:sqlite — prepare()가 statement
type NodeStatement = { all: (...p: unknown[]) => unknown[]; get: (...p: unknown[]) => unknown };
type NodeDatabase = { prepare: (sql: string) => NodeStatement; exec: (sql: string) => void; close: () => void };

function adaptNode(d: NodeDatabase): ReadonlyDb {
  d.exec("PRAGMA query_only=ON");
  return {
    prepare: (sql) => d.prepare(sql) as unknown as ReadonlyStatement,
    exec: (sql) => d.exec(sql),
    close: () => d.close(),
  };
}

export function openReadonlySqlite(path: string): ReadonlyDb | null {
  const driver = loadDriver();
  if (!driver) return null;
  try {
    return driver.open(path);
  } catch {
    return null;
  }
}

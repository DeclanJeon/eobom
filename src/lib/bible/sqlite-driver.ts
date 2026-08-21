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

let cachedDriver: Driver | null | undefined;

function loadDriver(): Driver | null {
  if (cachedDriver !== undefined) return cachedDriver;
  cachedDriver = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bunMod = require("bun:sqlite") as { Database: new (path: string, opts?: { readonly?: boolean }) => BunDatabase };
    cachedDriver = { name: "bun", open: (path) => adaptBun(new bunMod.Database(path, { readonly: true })) };
  } catch {
    /* fall through to node */
  }
  if (!cachedDriver) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodeMod = require("node:sqlite") as { DatabaseSync: new (path: string, opts?: { readOnly?: boolean }) => NodeDatabase };
      cachedDriver = { name: "node", open: (path) => adaptNode(new nodeMod.DatabaseSync(path, { readOnly: true })) };
    } catch {
      cachedDriver = null;
    }
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

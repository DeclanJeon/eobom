import { PrismaClient } from "@prisma/client";

// 스키마는 env("DATABASE_URL")이지만 runtime에서는 DATABASE_URL_TEST 우선 사용 (테스트 격리)
const url = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(url ? { datasourceUrl: url } : {}),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export default db;

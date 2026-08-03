"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, type ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

const floatWords = ["잇다", "모으다", "다시 보다", "동행", "오늘"];

export function LandingHero({
  isAuthenticated = false,
  displayName = null,
  children,
}: {
  isAuthenticated?: boolean;
  displayName?: string | null;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();

  const orbs = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        id: i,
        size: 120 + i * 36,
        x: `${8 + i * 14}%`,
        y: `${12 + (i % 3) * 22}%`,
        delay: i * 0.4,
        duration: 10 + i * 1.5,
      })),
    [],
  );

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      {/* Ambient paper field */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(197,160,89,0.14),transparent_45%),radial-gradient(ellipse_at_80%_80%,rgba(6,27,14,0.08),transparent_50%)]" />
        {!reduce
          ? orbs.map((o) => (
              <motion.div
                key={o.id}
                className="absolute rounded-full blur-3xl"
                style={{
                  width: o.size,
                  height: o.size,
                  left: o.x,
                  top: o.y,
                  background:
                    o.id % 2 === 0
                      ? "rgba(197,160,89,0.12)"
                      : "rgba(27,48,34,0.10)",
                }}
                animate={{
                  y: [0, -18, 0, 12, 0],
                  x: [0, 10, 0, -8, 0],
                  scale: [1, 1.06, 1, 0.97, 1],
                }}
                transition={{
                  duration: o.duration,
                  delay: o.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))
          : null}

        {/* Soft grid lines like notebook margin */}
        <div className="absolute inset-y-0 left-[12%] hidden w-px bg-gradient-to-b from-transparent via-accent-gold-soft/35 to-transparent md:block" />
        <div className="absolute inset-x-0 top-[18%] h-px bg-gradient-to-r from-transparent via-border-subtle to-transparent" />
      </div>

      {/* Floating micro copy */}
      {!reduce
        ? floatWords.map((word, i) => (
            <motion.span
              key={word}
              className="pointer-events-none absolute hidden select-none font-journal text-body-sm text-primary/30 md:block"
              style={{
                left: `${12 + i * 16}%`,
                top: `${22 + (i % 2) * 48}%`,
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={{
                opacity: [0.2, 0.35, 0.2],
                y: [0, -14, 0],
              }}
              transition={{
                duration: 7 + i,
                delay: 1.2 + i * 0.35,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {word}
            </motion.span>
          ))
        : null}

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 pb-10 pt-8 md:px-8">
        {/* Top bar */}
        <motion.header
          className="flex items-center justify-between"
          initial={reduce ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <Link href="/" className="group flex min-h-11 items-center gap-3">
            <img
              src="/logo.svg"
              alt="이어봄"
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl shadow-sm transition duration-300 group-hover:scale-105"
            />
            <span className="font-journal text-title-journal text-primary">
              이어봄
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-label-md">
            <Link
              href="/updates"
              className="hidden min-h-11 items-center rounded-full px-3 py-2 text-text-muted transition hover:text-primary md:inline-flex"
            >
              개발노트
            </Link>
            <Link
              href="/suggest"
              className="hidden min-h-11 items-center rounded-full px-3 py-2 text-text-muted transition hover:text-primary md:inline-flex"
            >
              제안하기
            </Link>
            <Link
              href="/contact"
              className="hidden min-h-11 items-center rounded-full px-3 py-2 text-text-muted transition hover:text-primary md:inline-flex"
            >
              문의
            </Link>
            {isAuthenticated ? (
              <Link
                href="/today"
                className="inline-flex min-h-11 items-center rounded-full border border-border bg-white/70 px-4 py-2 text-primary backdrop-blur transition hover:border-accent-gold/50 hover:bg-white"
              >
                {displayName ? `${displayName}의 오늘` : "내 기록으로"}
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center rounded-full border border-border bg-white/70 px-4 py-2 text-primary backdrop-blur transition hover:border-accent-gold/50 hover:bg-white"
              >
                로그인
              </Link>
            )}
          </nav>
        </motion.header>

        {/* Hero */}
        <main className="flex flex-1 flex-col justify-center py-12 md:py-16">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <motion.p
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-white/60 px-3 py-1.5 text-label-sm text-text-muted backdrop-blur"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.05, ease }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent-gold" />
                모이고 · 다시 보이고 · 함께 가벼워집니다
              </motion.p>

              <h1 className="text-primary">
                <span className="sr-only">이어봄 — 흩어진 묵상을 잇다</span>
                <span aria-hidden className="block overflow-hidden">
                  <motion.span
                    className="block font-journal text-[clamp(2.75rem,8vw,4.75rem)] font-semibold leading-[1.05] tracking-[-0.03em]"
                    initial={reduce ? false : { y: "110%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    transition={{ duration: 0.85, delay: 0.12, ease }}
                  >
                    이어봄
                  </motion.span>
                </span>
                <span className="mt-3 block overflow-hidden">
                  <motion.span
                    className="block text-[clamp(1.35rem,3.6vw,2rem)] font-medium leading-snug text-primary"
                    initial={reduce ? false : { y: "110%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.28, ease }}
                  >
                    흩어진 묵상을 잇다
                  </motion.span>
                </span>
              </h1>

              <motion.p
                className="mt-6 max-w-md text-body-md text-text-muted"
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.42, ease }}
              >
                어제의 믿음이 오늘의 방향이 되도록.
                <br />
                성구와 기도, 결단을 한곳에 남기고 필요할 때 다시 만납니다.
              </motion.p>

              {/* Animated keyword line */}
              <motion.div
                className="mt-8 flex flex-wrap items-center gap-2"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.6 }}
              >
                {["모으다", "잇다", "나누다"].map((label, i) => (
                  <motion.span
                    key={label}
                    className="rounded-full border border-border bg-white/80 px-3 py-1.5 text-label-sm text-primary"
                    initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + i * 0.08, duration: 0.4, ease }}
                    whileHover={reduce ? undefined : { y: -2, borderColor: "rgba(197,160,89,0.55)" }}
                  >
                    {label}
                  </motion.span>
                ))}
              </motion.div>

              <motion.div
                className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.7, ease }}
              >
                <motion.div
                  whileHover={reduce ? undefined : { scale: 1.02 }}
                  whileTap={reduce ? undefined : { scale: 0.98 }}
                >
                  <Link
                    href={isAuthenticated ? "/today" : "/login"}
                    className="cta-primary relative inline-flex min-h-[44px] overflow-hidden px-8 py-3 text-label-md shadow-[0_16px_40px_-24px_rgba(6,27,14,0.65)]"
                  >
                    {!reduce ? (
                      <motion.span
                        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                        initial={{ x: "-120%" }}
                        animate={{ x: "120%" }}
                        transition={{
                          duration: 2.8,
                          repeat: Infinity,
                          repeatDelay: 2.2,
                          ease: "easeInOut",
                        }}
                      />
                    ) : null}
                    <span className="relative">
                      {isAuthenticated ? "오늘의 기록" : "Google로 시작하기"}
                    </span>
                  </Link>
                </motion.div>
                {isAuthenticated ? (
                  <Link
                    href="/entries/new"
                    className="cta-secondary min-h-[44px] px-6 py-3 text-label-md"
                  >
                    묵상 기록하기
                  </Link>
                ) : (
                  <Link
                    href="/contact"
                    className="cta-secondary min-h-[44px] px-6 py-3 text-label-md"
                  >
                    문의하기
                  </Link>
                )}
              </motion.div>

              <motion.p
                className="mt-5 text-label-sm text-text-muted"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.95, duration: 0.5 }}
              >
                기록은 기본 비공개 · AI는 평가하지 않는 성찰 초안만 돕습니다
              </motion.p>
            </div>

            {/* Interactive card stack */}
            <motion.div
              className="relative mx-auto w-full max-w-md"
              initial={reduce ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.85, delay: 0.35, ease }}
            >
              <motion.div
                className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-accent-gold/15 via-transparent to-primary/10 blur-2xl"
                animate={
                  reduce
                    ? undefined
                    : { opacity: [0.45, 0.75, 0.45], scale: [0.98, 1.02, 0.98] }
                }
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />

              <motion.div
                className="relative paper-card overflow-hidden p-7 md:p-8"
                whileHover={reduce ? undefined : { y: -4 }}
                transition={{ type: "spring", stiffness: 220, damping: 22 }}
              >
                <div className="writing-margin">
                  <p className="text-eyebrow">오늘의 한 줄</p>
                  <TypeLine
                    text="모이고, 다시 보이고, 함께 가벼워집니다."
                    reduce={!!reduce}
                  />
                </div>

                <div className="mt-8 space-y-3">
                  {[
                    { k: "성구를 고르고", d: "책 · 장 · 절로 바인딩" },
                    { k: "마음을 남기고", d: "기도 · 결단 · 질문" },
                    { k: "다시 이어보고", d: "필요할 때 AI 회고" },
                  ].map((row, i) => (
                    <motion.div
                      key={row.k}
                      className="flex items-start gap-3 rounded-2xl border border-border/80 bg-surface-low/70 px-4 py-3"
                      initial={reduce ? false : { opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.75 + i * 0.12, duration: 0.45, ease }}
                      whileHover={
                        reduce
                          ? undefined
                          : { x: 4, borderColor: "rgba(197,160,89,0.45)" }
                      }
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-label-md text-primary">{row.k}</p>
                        <p className="text-label-sm text-text-muted">{row.d}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  className="mt-7 flex items-center justify-between border-t border-border pt-5"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.15 }}
                >
                  <p className="font-journal text-body-sm text-primary">이어봄</p>
                  <motion.span
                    className="text-label-sm text-text-muted"
                    animate={reduce ? undefined : { opacity: [0.45, 1, 0.45] }}
                    transition={{ duration: 3.2, repeat: Infinity }}
                  >
                    이어서, 다시 보다
                  </motion.span>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </main>

        {/* Product story: clear use cases below the first impression */}
        <section className="border-t border-border/70 py-20 md:py-28">
          <motion.div
            className="max-w-2xl"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.65, ease }}
          >
            <h2 className="text-headline-md font-semibold tracking-tight text-primary md:text-display-lg">
              세 걸음이면 충분합니다
            </h2>
            <p className="mt-4 text-body-md text-text-muted">
              모으고, 잇고, 나눕니다. 거창한 계획보다 오늘의 한 줄부터.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "모으다",
                body: "흩어진 성구와 기도, 결단을 한 기록지에 남깁니다.",
                tone: "bg-surface-shared",
              },
              {
                title: "잇다",
                body: "어제의 기록이 오늘의 방향을 비추도록 회고로 다시 만납니다.",
                tone: "bg-bg-warm",
              },
              {
                title: "나누다",
                body: "원할 때만 한 문장을 익명으로 나눠 공감과 기도를 나눕니다.",
                tone: "bg-bg-warm",
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                className={`min-h-[190px] rounded-2xl border border-border p-6 ${item.tone}`}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.55, delay: index * 0.08, ease }}
              >
                <span className="font-mono text-label-xs font-semibold text-primary/60">
                  0{index + 1}
                </span>
                <h3 className="mt-12 text-headline-md font-semibold text-primary">
                  {item.title}
                </h3>
                <p className="mt-2 text-body-sm leading-relaxed text-text-muted">
                  {item.body}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-t border-border/70 py-20 md:grid-cols-[1fr_0.8fr] md:items-center md:py-28">
          <motion.div
            initial={reduce ? false : { opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.65, ease }}
          >
            <h2 className="max-w-xl text-headline-md font-semibold tracking-tight text-primary md:text-display-lg">
              기록은 기본적으로 나만 봅니다
            </h2>
            <p className="mt-4 max-w-xl text-body-md text-text-muted">
              개인 묵상 원문은 공개되지 않습니다. 함께 나눌 때도 원하는 문장만 별도의 익명 공유본으로 올립니다.
            </p>
          </motion.div>
          <motion.div
            className="border-l-2 border-accent-gold pl-6"
            initial={reduce ? false : { opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.65, delay: 0.1, ease }}
          >
            <p className="font-journal text-title-journal leading-relaxed text-primary">
              AI는 신앙을 평가하지 않습니다.
            </p>
            <p className="mt-3 text-label-md text-text-muted">
              회고를 위한 성찰 초안만 돕습니다.
            </p>
          </motion.div>
        </section>

        {children}

        <motion.section
          className="border-t border-border/70 py-20 text-center md:py-28"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.65, ease }}
        >
          <h2 className="text-headline-md font-semibold tracking-tight text-primary md:text-display-lg">
            오늘의 한 줄부터
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-body-md text-text-muted">
            쌓임의 시작은 거창하지 않습니다. 마음에 남은 말씀 하나면 됩니다.
          </p>
          <Link
            href={isAuthenticated ? "/entries/new" : "/login"}
            className="cta-primary mt-8 min-h-[44px] px-7 py-3"
          >
            {isAuthenticated ? "묵상 기록하기" : "Google로 시작하기"}
          </Link>
        </motion.section>

        <motion.footer
          className="flex flex-col items-start justify-between gap-3 border-t border-border/70 pt-5 text-label-sm text-text-muted md:flex-row md:items-center"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
        >
          <p>© {new Date().getFullYear()} 이어봄 · PonsLink</p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/updates"
              className="inline-flex min-h-11 items-center hover:text-primary"
            >
              개발노트
            </Link>
            <Link
              href="/suggest"
              className="inline-flex min-h-11 items-center hover:text-primary"
            >
              제안하기
            </Link>
            <Link
              href={isAuthenticated ? "/today" : "/login"}
              className="inline-flex min-h-11 items-center hover:text-primary"
            >
              {isAuthenticated ? "내 기록" : "시작하기"}
            </Link>
          </div>
        </motion.footer>
      </div>
    </div>
  );
}

function TypeLine({ text, reduce }: { text: string; reduce: boolean }) {
  if (reduce) {
    return (
      <p className="mt-3 font-journal text-[clamp(1.25rem,3vw,1.65rem)] leading-relaxed text-primary">
        {text}
      </p>
    );
  }

  const chars = Array.from(text);
  return (
    <p className="mt-3 font-journal text-[clamp(1.25rem,3vw,1.65rem)] leading-relaxed text-primary">
      {chars.map((ch, i) => (
        <motion.span
          key={`${ch}-${i}`}
          className="inline-block whitespace-pre"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 + i * 0.028, duration: 0.28, ease }}
        >
          {ch}
        </motion.span>
      ))}
      <motion.span
        className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.15em] bg-accent-gold align-middle"
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 1.05, repeat: Infinity, ease: "linear" }}
      />
    </p>
  );
}

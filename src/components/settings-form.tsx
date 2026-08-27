"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SettingsForm({
  initial,
}: {
  initial: {
    accountEmail: string | null;
    linkStatus?: "linked" | "email_in_use" | "account_in_use" | "stale_intent" | null;
    displayName: string;
    preferredBibleTranslation: string;
    aiProcessingConsent: boolean;
    communityEnabled: boolean;
    pastTodayEnabled: boolean;
    storyMirrorEnabled: boolean;
    storyMirrorExternalConsent: boolean;
  };
}) {
  const router = useRouter();
  const { accountEmail, linkStatus, ...settingsInitial } = initial;
  const [values, setValues] = useState(settingsInitial);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [isError, setIsError] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        setIsError(true);
        setMessage("저장에 실패했습니다.");
        return;
      }
      setMessage("저장되었습니다.");
      router.refresh();
    } catch {
      setIsError(true);
      setMessage("저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function linkGoogleAccount() {
    setLinking(true);
    setLinkError("");
    try {
      const response = await fetch("/api/account/link-intent", { method: "POST" });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setLinkError(data?.error ?? "Google 계정을 연결할 수 없습니다.");
        return;
      }
      window.location.assign(
        "/api/auth/signin/google?callbackUrl=%2Fme%2Fsettings%3Flinked%3D1",
      );
    } catch {
      setLinkError("Google 계정 연결을 시작할 수 없습니다.");
    } finally {
      setLinking(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <section
        className="rounded-2xl border border-border bg-surface-low p-4"
        aria-labelledby="account-link-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="account-link-title" className="text-label-lg font-semibold text-primary">
              기억 보관 계정
            </h2>
            <p className="mt-1 text-body-sm text-text-muted">
              휴대폰을 바꾸거나 키링을 잃어도 지금까지의 기록을 보관합니다.
            </p>
          </div>
          <span aria-hidden="true" className="text-xl">🔒</span>
        </div>
        {accountEmail ? (
          <p className="mt-3 rounded-xl bg-white px-3 py-2 text-label-md text-leaf">
            Google 연결됨 · {accountEmail}
          </p>
        ) : (
          <button
            type="button"
            onClick={() => void linkGoogleAccount()}
            disabled={linking}
            className="cta-secondary mt-4 w-full justify-center"
          >
            {linking ? "Google 연결 준비 중…" : "Google 계정 연결"}
          </button>
        )}
        {linkStatus === "linked" ? (
          <p className="mt-2 text-label-md text-leaf" role="status">
            Google 계정이 연결되었습니다.
          </p>
        ) : null}
        {linkStatus === "email_in_use" || linkStatus === "account_in_use" ? (
          <p className="mt-2 text-label-md text-destructive" role="alert">
            이 Google 계정은 이미 다른 이어봄에 연결되어 있습니다.
          </p>
        ) : null}
        {linkError ? (
          <p className="mt-2 text-label-md text-destructive" role="alert">
            {linkError}
          </p>
        ) : null}
        {linkStatus === "stale_intent" ? (
          <p className="mt-2 text-label-md text-destructive" role="alert">
            연결 요청이 만료되었습니다. Google 계정 연결을 다시 시작해 주세요.
          </p>
        ) : null}
      </section>
      <label className="block text-label-md">
        <span className="text-primary">표시 이름</span>
        <input
          value={values.displayName}
          onChange={(e) => setValues((v) => ({ ...v, displayName: e.target.value }))}
          className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-3 text-label-md outline-none ring-accent-gold/30 focus:ring-2"
        />
      </label>
      <label className="block text-label-md">
        <span className="text-primary">성경 본문 출처</span>
        <input
          value={values.preferredBibleTranslation}
          onChange={(e) =>
            setValues((v) => ({
              ...v,
              preferredBibleTranslation: e.target.value,
            }))
          }
          className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-3 text-label-md outline-none ring-accent-gold/30 focus:ring-2"
        />
        <span className="mt-1 block text-label-sm text-text-muted">
          앱 내 선택 본문은 Open Bibles 한국어입니다. 개역개정이 아닙니다.
        </span>
      </label>

      {(
        [
          ["aiProcessingConsent", "AI 회고를 위해 기록 일부를 외부 모델에 전송 허용"],
          ["communityEnabled", "익명 묵상 피드 참여"],
          ["pastTodayEnabled", "과거의 오늘 기능"],
          ["storyMirrorEnabled", "이야기 거울 사용 (묵상 기록 연결)"],
          ["storyMirrorExternalConsent", "이야기 거울 이미지 생성 허용 (codex-imagen)"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="flex min-h-11 items-start gap-3 text-label-md">
          <input
            type="checkbox"
            checked={values[key]}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.checked }))}
            className="mt-1 h-5 w-5 rounded border-border accent-primary"
          />
          <span>{label}</span>
        </label>
      ))}

      {message ? (
        <p
          className={isError ? "text-label-md text-destructive" : "text-label-md text-leaf"}
          role={isError ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}

      <button type="submit" disabled={loading} className="cta-primary">
        {loading ? "저장 중…" : "설정 저장"}
      </button>
    </form>
  );
}

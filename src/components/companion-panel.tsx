"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Profile = {
  enabled: boolean;
  acceptsRequests: boolean;
  scopeKey: string;
  role: string | null;
  topicTags: string[];
  helpModes: string[];
  intro: string | null;
  availability: string | null;
};

type Candidate = {
  id: string;
  reasonSummary: string | null;
  signalLabels: string[];
  profile: {
    displayName: string;
    role: string | null;
    topicTags: string[];
    helpModes: string[];
    intro: string | null;
    availability: string | null;
  };
};

export function CompanionPanel() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [consent, setConsent] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [tags, setTags] = useState("");
  const [helpModes, setHelpModes] = useState("");
  const [intro, setIntro] = useState("");
  const [availability, setAvailability] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/companions/profile")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return (await response.json()) as { profile: Profile; companionConsent: boolean };
      })
      .then((data) => {
        setProfile(data.profile);
        setConsent(data.companionConsent);
        setTags(data.profile.topicTags.join(", "));
        setHelpModes(data.profile.helpModes.join(", "));
        setIntro(data.profile.intro ?? "");
        setAvailability(data.profile.availability ?? "");
        return fetch("/api/companions/match");
      })
      .then(async (response) => {
        if (!response || !response.ok) return;
        const data = (await response.json()) as { candidates?: Candidate[] };
        setCandidates(data.candidates ?? []);
      })
      .catch(() => setMessage("동행 설정을 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/companions/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companionConsent: consent,
        enabled: profile?.enabled ?? false,
        acceptsRequests: profile?.acceptsRequests ?? false,
        scopeKey: profile?.scopeKey ?? "private",
        role: profile?.role ?? "peer",
        topicTags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        helpModes: helpModes.split(",").map((mode) => mode.trim()).filter(Boolean),
        intro: intro.trim() || null,
        availability: availability.trim() || null,
      }),
    });
    if (!response.ok) {
      setMessage("저장하지 못했어요.");
      return;
    }
    const data = (await response.json()) as { profile: Profile };
    setProfile(data.profile);
    setMessage("동행 설정을 저장했어요.");
  }

  async function findCompanions() {
    setMatching(true);
    setMessage("");
    try {
      const response = await fetch("/api/companions/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = (await response.json()) as { candidates?: Candidate[] };
      if (!response.ok) throw new Error();
      setCandidates(data.candidates ?? []);
      setMessage(data.candidates?.length ? "함께할 수 있는 사람을 찾아봤어요." : "아직 연결할 사람을 찾지 못했어요.");
    } catch {
      setMessage("지금은 연결 후보를 찾지 못했어요.");
    } finally {
      setMatching(false);
    }
  }

  async function decide(candidateId: string, decision: "accepted" | "rejected" | "snoozed") {
    setDeciding(candidateId);
    try {
      const response = await fetch(`/api/companions/candidates/${candidateId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!response.ok) throw new Error();
      setCandidates((items) => decision === "rejected" || decision === "snoozed"
        ? items.filter((item) => item.id !== candidateId)
        : items);
      setMessage(decision === "accepted" ? "연결 요청을 보냈어요. 상대의 수락을 기다립니다." : "이번 후보는 보류했어요.");
    } catch {
      setMessage("결정을 저장하지 못했어요.");
    } finally {
      setDeciding(null);
    }
  }

  if (loading) return <p className="text-body-sm text-text-muted">동행 설정을 불러오는 중…</p>;

  return (
    <div className="space-y-6">
      <p className="text-body-sm leading-relaxed text-text-muted">
        별도 동의 없이는 기록 원문과 연락처가 공개되지 않아요.
      </p>
      <form onSubmit={saveProfile} className="space-y-4">
        <label className="flex min-h-11 items-start gap-3 text-label-md">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-5 w-5 accent-primary" />
          <span>내 기록의 최소 신호를 사용해 동행 후보를 찾는 데 동의합니다.</span>
        </label>
        <label className="block text-label-md">
          <span>동행 후보 범위</span>
          <select
            value={profile?.scopeKey ?? "private"}
            onChange={(event) => setProfile((value) => value ? { ...value, scopeKey: event.target.value } : value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-3"
          >
            <option value="private">동의한 후보 안에서만</option>
          </select>
        </label>
        <label className="flex min-h-11 items-start gap-3 text-label-md">
          <input type="checkbox" checked={profile?.enabled ?? false} onChange={(event) => setProfile((value) => value ? { ...value, enabled: event.target.checked } : value)} className="mt-1 h-5 w-5 accent-primary" />
          <span>내가 도움을 줄 수 있는 사람으로 공개하기</span>
        </label>
        <label className="flex min-h-11 items-start gap-3 text-label-md">
          <input type="checkbox" checked={profile?.acceptsRequests ?? false} onChange={(event) => setProfile((value) => value ? { ...value, acceptsRequests: event.target.checked } : value)} className="mt-1 h-5 w-5 accent-primary" />
          <span>다른 사람의 동행 요청 받기</span>
        </label>
        <label className="block text-label-md">
          <span>동행 역할</span>
          <select
            value={profile?.role ?? "peer"}
            onChange={(event) => setProfile((value) => value ? { ...value, role: event.target.value } : value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-3"
          >
            <option value="peer">비슷한 길을 걷는 동행자</option>
            <option value="mentor">경험을 나누는 동행자</option>
            <option value="prayer_partner">기도로 함께하는 동행자</option>
          </select>
        </label>
        <label className="block text-label-md">
          <span>함께할 수 있는 주제</span>
          <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="예: 관계, 기다림, 기도" className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-3" />
        </label>
        <label className="block text-label-md">
          <span>동행 소개 (선택)</span>
          <textarea value={intro} onChange={(event) => setIntro(event.target.value)} maxLength={300} rows={3} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-3" />
        </label>
        <label className="block text-label-md">
          <span>도움 방식</span>
          <input
            value={helpModes}
            onChange={(event) => setHelpModes(event.target.value)}
            placeholder="예: 들어주기, 함께 기도하기"
            className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-3"
          />
        </label>
        <label className="block text-label-md">
          <span>가능한 시간 (선택)</span>
          <input
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
            maxLength={100}
            placeholder="예: 평일 저녁"
            className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-3"
          />
        </label>
        <div className="rounded-xl border border-border/70 bg-surface-low px-4 py-3">
          <p className="text-label-sm font-medium text-primary">공개 미리보기</p>
          <p className="mt-2 text-body-sm text-text-muted">
            {profile?.role === "mentor" ? "경험을 나누는 동행자" : profile?.role === "prayer_partner" ? "기도로 함께하는 동행자" : "비슷한 길을 걷는 동행자"}
          </p>
          <p className="mt-1 text-body-sm text-text-muted">{tags || "주제 태그 없음"}</p>
          <p className="mt-1 text-body-sm text-text-muted">{helpModes || "도움 방식 없음"}</p>
          {intro.trim() ? <p className="mt-1 text-body-sm text-text-muted">{intro.trim()}</p> : null}
          <p className="mt-2 text-caption text-text-muted">원문 기록과 연락처는 공개되지 않습니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="cta-secondary min-h-11 px-4">설정 저장</button>
          <button type="button" onClick={() => void findCompanions()} disabled={!consent || matching} className="cta-primary min-h-11 px-4">
            {matching ? "찾아보는 중…" : "도움이 될 사람 찾아보기"}
          </button>
        </div>
      </form>
      {message ? <p className="text-label-md text-text-muted" role="status">{message}</p> : null}
      <Link href="/together/companions/connections" className="inline-flex min-h-11 items-center text-label-sm text-leaf hover:text-primary">
        연결된 동행 보기 →
      </Link>
      {candidates.length ? (
        <section aria-labelledby="companion-candidates-title" className="space-y-3">
          <h2 id="companion-candidates-title" className="text-headline-sm text-primary">이 사람이 도움이 될 수 있는 이유</h2>
          {candidates.map((candidate) => (
            <article key={candidate.id} className="rounded-2xl border border-border bg-surface-low p-4">
              <h3 className="text-label-lg font-semibold text-primary">{candidate.profile.displayName}</h3>
              {candidate.profile.intro ? <p className="mt-1 text-body-sm text-text-muted">{candidate.profile.intro}</p> : null}
              <p className="mt-3 text-body-sm leading-relaxed text-primary">{candidate.reasonSummary}</p>
              <div className="mt-3 flex flex-wrap gap-2">{candidate.signalLabels.map((label) => <span key={label} className="chip">{label}</span>)}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={deciding === candidate.id} onClick={() => void decide(candidate.id, "accepted")} className="cta-primary min-h-11 px-4">
                  수락
                </button>
                <button type="button" disabled={deciding === candidate.id} onClick={() => void decide(candidate.id, "snoozed")} className="cta-secondary min-h-11 px-4">
                  나중에 보기
                </button>
                <button type="button" disabled={deciding === candidate.id} onClick={() => void decide(candidate.id, "rejected")} className="min-h-11 px-3 text-label-sm text-text-muted">
                  이번에는 아니에요
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

interface StoryVisualProps {
  storyId: string;
  story: string;
  source?: string;
  connection: string;
  differentPerspective?: string;
  alt: string;
  className?: string;
}

interface VisualData {
  id: string;
  imageUrl?: string;
  imageAlt?: string;
  cached?: boolean;
  status?: string;
}

export function StoryVisual({
  storyId,
  story,
  source,
  connection,
  differentPerspective,
  alt,
  className = "",
}: StoryVisualProps) {
  const [visual, setVisual] = useState<VisualData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: NodeJS.Timeout | undefined;
    let pollAttempts = 0;
    const MAX_POLL_ATTEMPTS = 40;

    const schedulePoll = () => {
      if (pollAttempts >= MAX_POLL_ATTEMPTS) {
        if (!cancelled) {
          setError("이미지 생성 시간이 초과되었습니다");
          setLoading(false);
        }
        return;
      }

      pollAttempts += 1;
      pollTimer = setTimeout(async () => {
        if (cancelled) return;
        try {
          const res = await fetch(
            `/api/story-mirror/story-visual?storyId=${encodeURIComponent(storyId)}`
          );
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) {
              setVisual(data);
              setLoading(false);
            }
            return;
          }
          if (res.status === 202) {
            schedulePoll();
            return;
          }
          if (!cancelled) {
            setError("이미지를 불러올 수 없습니다");
            setLoading(false);
          }
        } catch {
          if (!cancelled) {
            setError("이미지를 불러올 수 없습니다");
            setLoading(false);
          }
        }
      }, 3000);
    };

    const fetchVisual = async () => {
      try {
        const cachedRes = await fetch(
          `/api/story-mirror/story-visual?storyId=${encodeURIComponent(storyId)}`
        );

        if (cachedRes.ok) {
          const data = await cachedRes.json();
          if (!cancelled) {
            setVisual(data);
            setLoading(false);
          }
          return;
        }

        if (cachedRes.status === 202) {
          if (!cancelled) {
            setLoading(true);
            schedulePoll();
          }
          return;
        }

        if (!cancelled) setLoading(true);
        const generateRes = await fetch("/api/story-mirror/story-visual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storyId,
            story,
            source,
            connection,
            differentPerspective,
          }),
        });

        if (generateRes.status === 202) {
          if (!cancelled) {
            setLoading(true);
            schedulePoll();
          }
          return;
        }

        if (!generateRes.ok) {
          throw new Error("Failed to generate visual");
        }

        const data = await generateRes.json();
        if (!cancelled) {
          setVisual(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[StoryVisual] Error:", err);
          setError("이미지를 불러올 수 없습니다");
          setLoading(false);
        }
      }
    };

    fetchVisual();
    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
      pollTimer = undefined;
    };
  }, [storyId, story, source, connection, differentPerspective]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-48 bg-gray-50 rounded-lg ${className}`}>
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !visual?.imageUrl) {
    // 이미지 실패 시에는 아무것도 표시하지 않음 (텍스트만 유지)
    return null;
  }

  return (
    <div className={`relative w-full aspect-[4/3] rounded-lg overflow-hidden mb-4 ${className}`}>
      <Image
        src={visual.imageUrl}
        alt={visual.imageAlt || alt}
        fill
        unoptimized
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={false}
      />
    </div>
  );
}

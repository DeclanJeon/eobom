import { requireUser } from "@/lib/session";
import { getLatestRagRun, getRagRuns } from "@/lib/story-mirror/db";
import StoryMirrorRag from "@/components/story-mirror-rag";

export const dynamic = "force-dynamic";

export default async function ReflectPage() {
  const user = await requireUser();
  const [latestRun, recentRuns] = await Promise.all([getLatestRagRun(user.id), getRagRuns(user.id, 5)]);
  const initialRun = latestRun
    ? {
        id: latestRun.id,
        createdAt: latestRun.createdAt.toISOString(),
        summary: latestRun.summary ?? "",
        connections: latestRun.matches.map((m) => ({
          chunkId: m.chunkId,
          title: m.chunk.title,
          workTitle: m.chunk.work.title,
          locator: m.chunk.locator,
          connection: m.connection ?? "",
          differentPerspective: m.differentPerspective ?? null,
        })),
      }
    : null;
  const initialList = recentRuns.map((r) => ({
    id: r.id,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    summary: r.summary,
    connectionCount: r.connectionCount,
    corpusVersion: r.corpusVersion,
  }));
  return <StoryMirrorRag initialRun={initialRun} initialList={initialList} consented={true} />;
}

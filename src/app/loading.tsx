import { AppShell } from "@/components/app-shell";
import { getOptionalUser } from "@/lib/session";

// Instant navigation feedback: App Router swaps this in the moment a <Link> is
// clicked, before the destination route's server components finish. The nav shell
// stays put so the screen never freezes during the (now fast) RSC round-trip.
export default async function Loading() {
  const user = await getOptionalUser();
  return (
    <AppShell bare publicLogo={!user}>
      <div className="mx-auto w-full max-w-3xl px-5 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-9 w-2/3 rounded-xl bg-black/[0.06]" />
          <div className="h-4 w-1/2 rounded bg-black/[0.06]" />
          <div className="mt-8 h-44 w-full rounded-2xl bg-black/[0.06]" />
          <div className="h-28 w-full rounded-2xl bg-black/[0.06]" />
          <div className="h-28 w-5/6 rounded-2xl bg-black/[0.06]" />
        </div>
      </div>
    </AppShell>
  );
}

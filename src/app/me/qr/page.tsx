import { AppShell } from "@/components/app-shell";
import { SurfaceCard } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";
import { appUrl } from "@/lib/utils";
import QRCode from "qrcode";

export const metadata = { title: "내 QR" };

export default async function QrPage() {
  const user = await requireUser();
  const url = appUrl(`/j/${user.personalSlug}`);
  const qrDataUrl = await QRCode.toDataURL(url, {
    margin: 1,
    width: 320,
    color: {
      dark: "#2f3d32",
      light: "#fffdf8",
    },
  });

  return (
    <AppShell title="내 QR">
      <SurfaceCard className="flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt="개인 묵상기록지 QR 코드"
          className="h-64 w-64 rounded-2xl border border-border bg-white p-3"
        />
        <p className="mt-4 break-all font-mono text-xs text-muted-foreground">
          {url}
        </p>
        <a
          href={qrDataUrl}
          download={`eobom-${user.personalSlug}.png`}
          className="mt-5 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background"
        >
          저장
        </a>
      </SurfaceCard>
    </AppShell>
  );
}

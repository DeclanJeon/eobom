import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import { db } from "../src/lib/db";
import { appUrl } from "../src/lib/utils";

const outDir =
  process.argv.find((a) => a.startsWith("--out="))?.split("=")[1] ||
  "artifacts/keyring-qr";

mkdirSync(outDir, { recursive: true });

const seats = await db.journalSeat.findMany({ orderBy: { slug: "asc" } });
const rows = ["seatCode,slug,url,status,label"];

for (const seat of seats) {
  const url = appUrl(`/j/${seat.slug}`);
  const png = await QRCode.toBuffer(url, {
    type: "png",
    width: 512,
    margin: 2,
    color: { dark: "#061b0e", light: "#fbf9f6" },
  });
  const file = path.join(outDir, `${seat.seatCode}-${seat.slug}.png`);
  writeFileSync(file, png);
  rows.push(
    [
      seat.seatCode,
      seat.slug,
      url,
      seat.status,
      JSON.stringify(seat.label || ""),
    ].join(","),
  );
  console.log("wrote", file, url);
}

writeFileSync(path.join(outDir, "seats.csv"), rows.join("\n") + "\n");
console.log("csv", path.join(outDir, "seats.csv"));
await db.$disconnect();

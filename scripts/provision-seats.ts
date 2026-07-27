import { provisionSeats } from "../src/lib/seats";
import { db } from "../src/lib/db";

const count = Number(process.argv.find((a) => a.startsWith("--count="))?.split("=")[1] || 13);
const prefix = process.argv.find((a) => a.startsWith("--prefix="))?.split("=")[1] || "e";

const result = await provisionSeats({ count, prefix });
console.log(JSON.stringify(result, null, 2));
const all = await db.journalSeat.findMany({ orderBy: { slug: "asc" } });
console.log(
  "seats",
  all.map((s) => `${s.slug}:${s.status}`).join(", "),
);
await db.$disconnect();

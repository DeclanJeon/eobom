import { randomBytes } from "node:crypto";
import { db } from "../src/lib/db";

const user = await db.user.findFirst({ where: { email: "qa-scripture@eobom.local" } });
if (!user) throw new Error("user missing");
const token = randomBytes(32).toString("hex");
const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000);
await db.session.create({
  data: { sessionToken: token, userId: user.id, expires },
});
console.log(token);
await db.$disconnect();

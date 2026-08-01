import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { getOptionalUser } from "@/lib/session";

export const metadata = { title: "문의" };

export default async function ContactPage() {
  const user = await getOptionalUser();

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href={user ? "/today" : "/"}
            className="inline-flex min-h-11 items-center font-journal text-title-journal text-primary"
          >
            이어봄
          </Link>
          <h1 className="mt-6 text-display-lg text-primary">문의</h1>
        </div>
        <ContactForm
          defaultName={user?.displayName || user?.name || ""}
          defaultEmail={user?.email || ""}
        />
      </div>
    </div>
  );
}

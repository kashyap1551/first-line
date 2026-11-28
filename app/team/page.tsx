import type { Metadata } from "next";
import { INBOX } from "@/lib/team-inbox";
import { SiteNav } from "../components/site-nav";
import { TeamInbox } from "./team-inbox";

export const metadata: Metadata = {
  title: "Support team inbox · FirstLine demo",
  description: INBOX.subtitle,
};

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <SiteNav current="/team" />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold">{INBOX.title}</h1>
        <p className="mt-1 mb-6 text-sm text-zinc-600">{INBOX.subtitle}</p>
        <TeamInbox />
      </main>
    </div>
  );
}

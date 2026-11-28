import type { Metadata } from "next";
import { BILLING } from "@/lib/billing";
import { SiteNav } from "../../components/site-nav";
import { BillingView } from "./billing-view";

export const metadata: Metadata = {
  title: "Billing · FirstLine demo",
  description: BILLING.subtitle,
};

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <SiteNav current="/team/billing" />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold">{BILLING.title}</h1>
        <p className="mt-1 mb-6 text-sm text-zinc-600">{BILLING.subtitle}</p>
        <BillingView />
      </main>
    </div>
  );
}

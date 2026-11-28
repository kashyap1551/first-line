import type { Metadata } from "next";
import { articles } from "@/lib/help-centre";
import { groupByCategory, titlesById } from "@/lib/help-page";
import { SiteNav } from "../components/site-nav";
import { ChatWidget } from "./chat-widget";

export const metadata: Metadata = {
  title: "Tallyfox Help Centre · FirstLine demo",
  description: "A fictional help centre with the FirstLine AI support widget.",
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <SiteNav current="/demo" />
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-4">
          <h1 className="text-xl font-semibold">Tallyfox Help Centre</h1>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
            Fictional company: demo for FirstLine
          </span>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <main className="flex flex-col gap-6">
          {groupByCategory(articles).map((group) => (
            <section key={group.category} aria-labelledby={`cat-${group.category}`}>
              <h2 id={`cat-${group.category}`} className="mb-2 text-lg font-semibold">
                {group.category}
              </h2>
              <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
                {group.articles.map((article) => (
                  <details key={article.id} id={article.id} className="group scroll-mt-4">
                    <summary className="cursor-pointer list-none px-4 py-3 font-medium hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-indigo-600">
                      <span aria-hidden className="mr-2 inline-block text-zinc-400 transition-transform group-open:rotate-90">
                        ›
                      </span>
                      {article.title}
                    </summary>
                    <p className="px-4 pb-4 pl-9 text-sm leading-6 whitespace-pre-line text-zinc-700">
                      {article.body}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </main>

        <aside className="order-first lg:sticky lg:top-6 lg:order-none lg:self-start">
          <ChatWidget titles={titlesById(articles)} />
        </aside>
      </div>
    </div>
  );
}

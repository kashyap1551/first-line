import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-24 text-zinc-900">
      <div className="max-w-xl">
        <h1 className="text-4xl font-semibold tracking-tight">FirstLine</h1>
        <p className="mt-4 text-lg leading-8 text-zinc-700">
          An AI support agent that answers from your help articles, hands over when unsure, and
          bills only when a customer confirms it helped.
        </p>
        <p className="mt-3 text-base text-zinc-600">
          Built as a product-management portfolio project with a fictional company, Tallyfox.
        </p>
        <Link
          href="/demo"
          className="mt-8 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Try the demo
        </Link>
      </div>
    </main>
  );
}

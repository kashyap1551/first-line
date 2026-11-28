import Link from "next/link";

const LINKS = [
  { href: "/demo", label: "Customer view" },
  { href: "/team", label: "Team inbox" },
  { href: "/team/billing", label: "Billing" },
] as const;

export function SiteNav({ current }: { current: (typeof LINKS)[number]["href"] }) {
  return (
    <nav aria-label="Demo pages" className="bg-zinc-900 text-sm text-zinc-300">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 gap-y-1 px-4 py-2">
        {LINKS.map((link, i) => (
          <span key={link.href} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden>·</span>}
            <Link
              href={link.href}
              aria-current={link.href === current ? "page" : undefined}
              className={`rounded px-2 py-1 hover:text-white focus-visible:outline-2 focus-visible:outline-white ${
                link.href === current ? "font-semibold text-white underline underline-offset-4" : ""
              }`}
            >
              {link.label}
            </Link>
          </span>
        ))}
        <Link
          href="/"
          className="ml-auto rounded px-2 py-1 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
        >
          About FirstLine
        </Link>
      </div>
    </nav>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col items-start gap-4 px-12 py-16">
      <h1 className="font-display text-[48px] leading-none font-extrabold uppercase">Not found</h1>
      <p className="text-muted">That page doesn&apos;t exist, or the game isn&apos;t public.</p>
      <Link href="/games" className="rounded-full border-[1.5px] border-line-3 px-4 py-2 text-sm font-semibold text-ink hover:bg-paper">
        Back to games
      </Link>
    </main>
  );
}

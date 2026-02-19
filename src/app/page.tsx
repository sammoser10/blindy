import Link from "next/link";
import { Wine, Users, Eye, Star } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-dvh flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-wine-900 flex items-center justify-center">
            <Wine className="w-7 h-7 text-cream-100" />
          </div>
          <h1 className="text-4xl font-bold text-wine-950 tracking-tight">
            blindy
          </h1>
        </div>

        <p className="text-lg text-wine-800/70 max-w-sm mb-10">
          The social app for blind wine tastings. Taste, guess, rate, and reveal
          together.
        </p>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4 max-w-sm w-full mb-10">
          <div className="rounded-2xl p-4 bg-wine-50/50">
            <Users className="w-5 h-5 text-wine-400 mb-2" />
            <p className="text-sm font-medium text-wine-900">Join together</p>
            <p className="text-xs text-wine-600/70">
              Everyone joins with a code
            </p>
          </div>
          <div className="rounded-2xl p-4 bg-wine-50/50">
            <Wine className="w-5 h-5 text-wine-400 mb-2" />
            <p className="text-sm font-medium text-wine-900">Taste blind</p>
            <p className="text-xs text-wine-600/70">
              Notes, guesses, ratings
            </p>
          </div>
          <div className="rounded-2xl p-4 bg-wine-50/50">
            <Star className="w-5 h-5 text-wine-400 mb-2" />
            <p className="text-sm font-medium text-wine-900">Rate & rank</p>
            <p className="text-xs text-wine-600/70">Score each wine 1-10</p>
          </div>
          <div className="rounded-2xl p-4 bg-wine-50/50">
            <Eye className="w-5 h-5 text-wine-400 mb-2" />
            <p className="text-sm font-medium text-wine-900">Reveal</p>
            <p className="text-xs text-wine-600/70">
              See everyone&apos;s picks
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <Link
            href="/session/create"
            className="w-full py-3.5 rounded-xl bg-wine-900 text-cream-50 font-semibold text-center hover:bg-wine-800 active:bg-wine-950 transition-colors"
          >
            Host a tasting
          </Link>
          <Link
            href="/session/join"
            className="w-full py-3.5 rounded-xl bg-white text-wine-900 font-semibold text-center border border-wine-200 hover:bg-wine-50 active:bg-wine-100 transition-colors"
          >
            Join a tasting
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-wine-400">
        Blindy &mdash; Taste together
      </footer>
    </main>
  );
}

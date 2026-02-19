"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, LogIn } from "lucide-react";

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      setError("Enter a join code");
      return;
    }

    setError("");
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login?mode=join");
      return;
    }

    // Find session by code
    const { data: session, error: findError } = await supabase
      .from("sessions")
      .select("*")
      .eq("join_code", trimmedCode)
      .single();

    if (findError || !session) {
      setError("No tasting found with that code. Check and try again.");
      setLoading(false);
      return;
    }

    if (session.status === "revealed") {
      setError("This tasting has already been revealed.");
      setLoading(false);
      return;
    }

    // Check if already a participant
    const { data: existing } = await supabase
      .from("session_participants")
      .select("id")
      .eq("session_id", session.id)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      const { error: joinError } = await supabase
        .from("session_participants")
        .insert({
          session_id: session.id,
          user_id: user.id,
        });

      if (joinError) {
        setError("Failed to join. Try again.");
        setLoading(false);
        return;
      }
    }

    router.push(`/session/${session.id}`);
  }

  return (
    <form onSubmit={handleJoin} className="w-full space-y-6">
      <div>
        <label
          htmlFor="code"
          className="block text-sm font-medium text-wine-800 mb-1.5"
        >
          Join code
        </label>
        <input
          id="code"
          type="text"
          required
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={6}
          className="w-full px-4 py-4 rounded-xl border border-wine-200 bg-white text-wine-950 text-center text-2xl font-mono font-bold tracking-[0.3em] placeholder:text-wine-200 placeholder:tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent uppercase"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || code.length < 1}
        className="w-full py-3.5 rounded-xl bg-wine-900 text-cream-50 font-semibold hover:bg-wine-800 active:bg-wine-950 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <LogIn className="w-5 h-5" />
        {loading ? "Joining..." : "Join tasting"}
      </button>
    </form>
  );
}

export default function JoinSessionPage() {
  return (
    <main className="min-h-dvh flex flex-col px-6 py-6 max-w-lg mx-auto">
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 text-wine-600 hover:text-wine-800 mb-6 w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Dashboard</span>
      </Link>

      <h1 className="text-2xl font-bold text-wine-950 mb-1">Join a tasting</h1>
      <p className="text-sm text-wine-600/70 mb-8">
        Enter the code shared by your host
      </p>

      <Suspense
        fallback={<div className="text-wine-400 text-sm">Loading...</div>}
      >
        <JoinForm />
      </Suspense>
    </main>
  );
}

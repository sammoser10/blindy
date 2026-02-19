"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signInOrSignUp } from "@/lib/auth";
import Link from "next/link";
import { ArrowLeft, LogIn, User } from "lucide-react";

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingUser, setExistingUser] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setExistingUser(true);
    });
  }, []);

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

    // Auth: use existing session or sign in/up
    let userId: string | null = null;

    if (existingUser) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    }

    if (!userId) {
      if (!username.trim()) {
        setError("Enter a username");
        setLoading(false);
        return;
      }
      if (!password) {
        setError("Enter a password");
        setLoading(false);
        return;
      }

      const result = await signInOrSignUp(supabase, username, password);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      userId = result.userId;
    }

    if (!userId) {
      setError("Authentication failed. Try again.");
      setLoading(false);
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
      .eq("user_id", userId)
      .single();

    if (!existing) {
      const { error: joinError } = await supabase
        .from("session_participants")
        .insert({
          session_id: session.id,
          user_id: userId,
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

      {/* Auth fields - only show if not already logged in */}
      {!existingUser && (
        <>
          <div className="border-t border-wine-100 pt-6">
            <p className="text-xs font-medium text-wine-500 uppercase tracking-wider mb-4">
              Your identity
            </p>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-wine-800 mb-1.5"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  required={!existingUser}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your display name"
                  className="w-full px-4 py-3 rounded-xl border border-wine-200 bg-white text-wine-950 placeholder:text-wine-300 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-wine-800 mb-1.5"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required={!existingUser}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="To reclaim your name later"
                  minLength={6}
                  className="w-full px-4 py-3 rounded-xl border border-wine-200 bg-white text-wine-950 placeholder:text-wine-300 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {existingUser && (
        <div className="flex items-center gap-2 text-sm text-wine-600 bg-wine-50 rounded-xl px-4 py-3">
          <User className="w-4 h-4" />
          <span>Joining as your current account</span>
          <button
            type="button"
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              setExistingUser(false);
            }}
            className="ml-auto text-wine-800 font-medium hover:underline"
          >
            Switch
          </button>
        </div>
      )}

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
        href="/"
        className="flex items-center gap-1.5 text-wine-600 hover:text-wine-800 mb-6 w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Home</span>
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

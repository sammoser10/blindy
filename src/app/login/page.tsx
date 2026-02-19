"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Wine, ArrowLeft } from "lucide-react";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTo =
    searchParams.get("mode") === "join" ? "/session/join" : "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || email.split("@")[0] },
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-wine-900 mb-6">
        {isSignUp ? "Create your account" : "Welcome back"}
      </h2>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {isSignUp && (
          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-wine-800 mb-1.5"
            >
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What should we call you?"
              className="w-full px-4 py-3 rounded-xl border border-wine-200 bg-white text-wine-950 placeholder:text-wine-300 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent"
            />
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-wine-800 mb-1.5"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
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
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            className="w-full px-4 py-3 rounded-xl border border-wine-200 bg-white text-wine-950 placeholder:text-wine-300 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-wine-900 text-cream-50 font-semibold hover:bg-wine-800 active:bg-wine-950 transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>

      <button
        onClick={() => {
          setIsSignUp(!isSignUp);
          setError("");
        }}
        className="mt-6 text-sm text-wine-600 hover:text-wine-800"
      >
        {isSignUp
          ? "Already have an account? Sign in"
          : "Don't have an account? Sign up"}
      </button>
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-dvh flex flex-col px-6 py-8">
      <Link
        href="/"
        className="flex items-center gap-1.5 text-wine-600 hover:text-wine-800 mb-8 w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back</span>
      </Link>

      <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-wine-900 flex items-center justify-center">
            <Wine className="w-6 h-6 text-cream-100" />
          </div>
          <h1 className="text-2xl font-bold text-wine-950">blindy</h1>
        </div>

        <Suspense
          fallback={
            <div className="text-wine-400 text-sm">Loading...</div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}

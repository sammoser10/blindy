"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signInOrSignUp } from "@/lib/auth";
import { generateJoinCode } from "@/lib/utils";
import { GuessField, GUESS_FIELD_LABELS } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, Wine, Minus, Plus, Check, User } from "lucide-react";

const ALL_GUESS_FIELDS: GuessField[] = [
  "grape",
  "wine_type",
  "region",
  "producer",
  "vintage",
];

export default function CreateSessionPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [wineCount, setWineCount] = useState(4);
  const [guessFields, setGuessFields] = useState<GuessField[]>([
    "grape",
    "wine_type",
    "region",
    "vintage",
  ]);
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

  function toggleField(field: GuessField) {
    setGuessFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Give your tasting a name");
      return;
    }
    if (guessFields.length === 0) {
      setError("Select at least one guess field");
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

    // Generate a unique join code
    let joinCode = generateJoinCode();
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from("sessions")
        .select("id")
        .eq("join_code", joinCode)
        .single();
      if (!existing) break;
      joinCode = generateJoinCode();
      attempts++;
    }

    const { data: session, error: createError } = await supabase
      .from("sessions")
      .insert({
        host_id: userId,
        name: name.trim(),
        join_code: joinCode,
        wine_count: wineCount,
        guess_fields: guessFields,
        status: "lobby",
      })
      .select()
      .single();

    if (createError) {
      setError(createError.message);
      setLoading(false);
      return;
    }

    // Host also joins as participant
    await supabase.from("session_participants").insert({
      session_id: session.id,
      user_id: userId,
    });

    // Pre-create wine entries
    const wineInserts = Array.from({ length: wineCount }, (_, i) => ({
      session_id: session.id,
      wine_number: i + 1,
    }));
    await supabase.from("wines").insert(wineInserts);

    router.push(`/session/${session.id}`);
    router.refresh();
  }

  return (
    <main className="min-h-dvh flex flex-col px-6 py-6 max-w-lg mx-auto">
      <Link
        href="/"
        className="flex items-center gap-1.5 text-wine-600 hover:text-wine-800 mb-6 w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Home</span>
      </Link>

      <h1 className="text-2xl font-bold text-wine-950 mb-1">New tasting</h1>
      <p className="text-sm text-wine-600/70 mb-8">
        Set up your blind tasting session
      </p>

      <form onSubmit={handleCreate} className="space-y-6">
        {/* Session name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-wine-800 mb-1.5"
          >
            Tasting name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g., "Friday Night Reds" or "Napa Cab Showdown"'
            className="w-full px-4 py-3 rounded-xl border border-wine-200 bg-white text-wine-950 placeholder:text-wine-300 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent"
          />
        </div>

        {/* Wine count */}
        <div>
          <label className="block text-sm font-medium text-wine-800 mb-3">
            How many wines?
          </label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setWineCount(Math.max(1, wineCount - 1))}
              className="w-12 h-12 rounded-xl border border-wine-200 bg-white flex items-center justify-center text-wine-700 hover:bg-wine-50 active:bg-wine-100 transition-colors"
            >
              <Minus className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Wine className="w-5 h-5 text-wine-400" />
              <span className="text-3xl font-bold text-wine-950 tabular-nums min-w-[2ch] text-center">
                {wineCount}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setWineCount(Math.min(20, wineCount + 1))}
              className="w-12 h-12 rounded-xl border border-wine-200 bg-white flex items-center justify-center text-wine-700 hover:bg-wine-50 active:bg-wine-100 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Guess fields */}
        <div>
          <label className="block text-sm font-medium text-wine-800 mb-3">
            What should tasters guess?
          </label>
          <div className="space-y-2">
            {ALL_GUESS_FIELDS.map((field) => {
              const isSelected = guessFields.includes(field);
              return (
                <button
                  key={field}
                  type="button"
                  onClick={() => toggleField(field)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                    isSelected
                      ? "border-wine-600 bg-wine-50 text-wine-900"
                      : "border-wine-200 bg-white text-wine-500"
                  }`}
                >
                  <span className="font-medium text-sm">
                    {GUESS_FIELD_LABELS[field]}
                  </span>
                  {isSelected && <Check className="w-5 h-5 text-wine-700" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Auth fields - only show if not already logged in */}
        {!existingUser && (
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
        )}

        {existingUser && (
          <div className="flex items-center gap-2 text-sm text-wine-600 bg-wine-50 rounded-xl px-4 py-3">
            <User className="w-4 h-4" />
            <span>Creating as your current account</span>
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
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-wine-900 text-cream-50 font-semibold hover:bg-wine-800 active:bg-wine-950 transition-colors disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create tasting"}
        </button>
      </form>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateJoinCode } from "@/lib/utils";
import { GuessField, GUESS_FIELD_LABELS } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, Wine, Minus, Plus, Check } from "lucide-react";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
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
        host_id: user.id,
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
      user_id: user.id,
    });

    // Pre-create wine entries
    const wineInserts = Array.from({ length: wineCount }, (_, i) => ({
      session_id: session.id,
      wine_number: i + 1,
    }));
    await supabase.from("wines").insert(wineInserts);

    router.push(`/session/${session.id}`);
  }

  return (
    <main className="min-h-dvh flex flex-col px-6 py-6 max-w-lg mx-auto">
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 text-wine-600 hover:text-wine-800 mb-6 w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Dashboard</span>
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

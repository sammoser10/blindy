"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Session,
  Wine,
  TastingEntry,
  Profile,
  SessionParticipant,
  GuessField,
  GUESS_FIELD_LABELS,
} from "@/lib/types";
import { getWineLabel, cn } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft,
  Wine as WineIcon,
  Eye,
  Notebook,
  Target,
  Star,
  ChevronLeft,
  ChevronRight,
  Check,
  Trophy,
} from "lucide-react";

interface TastingViewProps {
  session: Session;
  wines: Wine[];
  entries: TastingEntry[];
  participants: (SessionParticipant & { profiles: Profile })[];
  currentUserId: string;
  isHost: boolean;
  onReveal: () => void;
}

type Tab = "notes" | "guesses" | "rating";

export function TastingView({
  session,
  wines,
  entries,
  participants,
  currentUserId,
  isHost,
  onReveal,
}: TastingViewProps) {
  const [currentWine, setCurrentWine] = useState(1);
  const [activeTab, setActiveTab] = useState<Tab>("notes");
  const [saving, setSaving] = useState(false);

  const myEntry = entries.find(
    (e) => e.user_id === currentUserId && e.wine_number === currentWine
  );

  const myEntries = entries.filter((e) => e.user_id === currentUserId);
  const completedWines = myEntries.filter(
    (e) => e.rating !== null || e.appearance_notes || e.nose_notes || e.palate_notes
  ).length;

  async function saveEntry(updates: Partial<TastingEntry>) {
    setSaving(true);
    const supabase = createClient();

    if (myEntry) {
      await supabase
        .from("tasting_entries")
        .update(updates)
        .eq("id", myEntry.id);
    } else {
      await supabase.from("tasting_entries").insert({
        session_id: session.id,
        user_id: currentUserId,
        wine_number: currentWine,
        ...updates,
      });
    }
    setSaving(false);
  }

  return (
    <main className="min-h-dvh flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-3">
        <div className="flex items-center justify-between mb-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-wine-600 hover:text-wine-800 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Link>
          {isHost && (
            <button
              onClick={onReveal}
              className="flex items-center gap-1.5 text-sm font-medium text-wine-700 bg-wine-50 px-3 py-1.5 rounded-lg hover:bg-wine-100 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Reveal wines
            </button>
          )}
        </div>
        <h1 className="text-lg font-bold text-wine-950">{session.name}</h1>
        <p className="text-xs text-wine-500">
          {completedWines}/{session.wine_count} wines tasted
        </p>
      </div>

      {/* Wine selector */}
      <div className="px-6 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentWine(Math.max(1, currentWine - 1))}
            disabled={currentWine === 1}
            className="p-1.5 rounded-lg hover:bg-wine-50 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-wine-700" />
          </button>

          <div className="flex-1 flex gap-1.5 overflow-x-auto py-1 scrollbar-hide">
            {Array.from({ length: session.wine_count }, (_, i) => {
              const num = i + 1;
              const hasEntry = myEntries.some(
                (e) => e.wine_number === num && (e.rating !== null || e.appearance_notes)
              );
              return (
                <button
                  key={num}
                  onClick={() => setCurrentWine(num)}
                  className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-xl font-semibold text-sm transition-colors relative",
                    currentWine === num
                      ? "bg-wine-900 text-cream-50"
                      : hasEntry
                        ? "bg-wine-100 text-wine-800"
                        : "bg-white border border-wine-200 text-wine-500"
                  )}
                >
                  {num}
                  {hasEntry && currentWine !== num && (
                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() =>
              setCurrentWine(Math.min(session.wine_count, currentWine + 1))
            }
            disabled={currentWine === session.wine_count}
            className="p-1.5 rounded-lg hover:bg-wine-50 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-wine-700" />
          </button>
        </div>
      </div>

      {/* Current wine header */}
      <div className="px-6 py-2">
        <div className="flex items-center gap-2">
          <WineIcon className="w-5 h-5 text-wine-600" />
          <h2 className="text-xl font-bold text-wine-950">
            {getWineLabel(currentWine)}
          </h2>
          {saving && (
            <span className="text-xs text-wine-400 ml-auto">Saving...</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-2">
        <div className="flex bg-wine-50 rounded-xl p-1">
          {(
            [
              { id: "notes" as Tab, label: "Notes", icon: Notebook },
              { id: "guesses" as Tab, label: "Guesses", icon: Target },
              { id: "rating" as Tab, label: "Rating", icon: Star },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                activeTab === id
                  ? "bg-white text-wine-900 shadow-sm"
                  : "text-wine-500 hover:text-wine-700"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 px-6 py-4">
        {activeTab === "notes" && (
          <NotesTab key={currentWine} entry={myEntry} onSave={saveEntry} />
        )}
        {activeTab === "guesses" && (
          <GuessesTab
            key={currentWine}
            entry={myEntry}
            guessFields={session.guess_fields as GuessField[]}
            onSave={saveEntry}
          />
        )}
        {activeTab === "rating" && (
          <RatingTab
            key={currentWine}
            entry={myEntry}
            wineCount={session.wine_count}
            currentWine={currentWine}
            allEntries={myEntries}
            onSave={saveEntry}
          />
        )}
      </div>
    </main>
  );
}

/* ===================== Notes Tab ===================== */

function NotesTab({
  entry,
  onSave,
}: {
  entry?: TastingEntry;
  onSave: (u: Partial<TastingEntry>) => void;
}) {
  const [appearance, setAppearance] = useState(entry?.appearance_notes ?? "");
  const [nose, setNose] = useState(entry?.nose_notes ?? "");
  const [palate, setPalate] = useState(entry?.palate_notes ?? "");
  const [overall, setOverall] = useState(entry?.overall_notes ?? "");

  function handleBlur(field: string, value: string) {
    onSave({ [field]: value });
  }

  return (
    <div className="space-y-4">
      <NoteField
        label="Appearance"
        placeholder="Color, clarity, viscosity..."
        value={appearance}
        onChange={setAppearance}
        onBlur={() => handleBlur("appearance_notes", appearance)}
      />
      <NoteField
        label="Nose"
        placeholder="Aromas, intensity, fruit, oak..."
        value={nose}
        onChange={setNose}
        onBlur={() => handleBlur("nose_notes", nose)}
      />
      <NoteField
        label="Palate"
        placeholder="Body, tannins, acidity, flavors..."
        value={palate}
        onChange={setPalate}
        onBlur={() => handleBlur("palate_notes", palate)}
      />
      <NoteField
        label="Overall"
        placeholder="General impressions, finish..."
        value={overall}
        onChange={setOverall}
        onBlur={() => handleBlur("overall_notes", overall)}
      />
    </div>
  );
}

function NoteField({
  label,
  placeholder,
  value,
  onChange,
  onBlur,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-wine-800 mb-1.5">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={2}
        className="w-full px-4 py-3 rounded-xl border border-wine-200 bg-white text-wine-950 placeholder:text-wine-300 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent resize-none text-sm"
      />
    </div>
  );
}

/* ===================== Guesses Tab ===================== */

function GuessesTab({
  entry,
  guessFields,
  onSave,
}: {
  entry?: TastingEntry;
  guessFields: GuessField[];
  onSave: (u: Partial<TastingEntry>) => void;
}) {
  const [guesses, setGuesses] = useState({
    guess_grape: entry?.guess_grape ?? "",
    guess_wine_type: entry?.guess_wine_type ?? "",
    guess_region: entry?.guess_region ?? "",
    guess_producer: entry?.guess_producer ?? "",
    guess_vintage: entry?.guess_vintage ?? null,
  });

  function handleChange(field: string, value: string | number | null) {
    setGuesses((prev) => ({ ...prev, [field]: value }));
  }

  function handleBlur(field: string) {
    onSave({ [field]: guesses[field as keyof typeof guesses] });
  }

  return (
    <div className="space-y-4">
      {guessFields.includes("grape") && (
        <GuessInput
          label="Grape / Varietal"
          placeholder="e.g., Cabernet Sauvignon, Pinot Noir"
          value={guesses.guess_grape}
          onChange={(v) => handleChange("guess_grape", v)}
          onBlur={() => handleBlur("guess_grape")}
        />
      )}
      {guessFields.includes("wine_type") && (
        <GuessInput
          label="Wine Type"
          placeholder="e.g., Brunello, Barolo, Sancerre, Cava"
          value={guesses.guess_wine_type}
          onChange={(v) => handleChange("guess_wine_type", v)}
          onBlur={() => handleBlur("guess_wine_type")}
        />
      )}
      {guessFields.includes("region") && (
        <GuessInput
          label="Region"
          placeholder="e.g., Napa Valley, Bordeaux, Tuscany"
          value={guesses.guess_region}
          onChange={(v) => handleChange("guess_region", v)}
          onBlur={() => handleBlur("guess_region")}
        />
      )}
      {guessFields.includes("producer") && (
        <GuessInput
          label="Producer"
          placeholder="e.g., Opus One, Château Margaux"
          value={guesses.guess_producer}
          onChange={(v) => handleChange("guess_producer", v)}
          onBlur={() => handleBlur("guess_producer")}
        />
      )}
      {guessFields.includes("vintage") && (
        <div>
          <label className="block text-sm font-medium text-wine-800 mb-1.5">
            Vintage
          </label>
          <input
            type="number"
            min={1900}
            max={2030}
            value={guesses.guess_vintage ?? ""}
            onChange={(e) =>
              handleChange(
                "guess_vintage",
                e.target.value ? parseInt(e.target.value) : null
              )
            }
            onBlur={() => handleBlur("guess_vintage")}
            placeholder="e.g., 2019"
            className="w-full px-4 py-3 rounded-xl border border-wine-200 bg-white text-wine-950 placeholder:text-wine-300 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent text-sm"
          />
        </div>
      )}
    </div>
  );
}

function GuessInput({
  label,
  placeholder,
  value,
  onChange,
  onBlur,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-wine-800 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-wine-200 bg-white text-wine-950 placeholder:text-wine-300 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent text-sm"
      />
    </div>
  );
}

/* ===================== Rating Tab ===================== */

function RatingTab({
  entry,
  wineCount,
  currentWine,
  allEntries,
  onSave,
}: {
  entry?: TastingEntry;
  wineCount: number;
  currentWine: number;
  allEntries: TastingEntry[];
  onSave: (u: Partial<TastingEntry>) => void;
}) {
  // DB column is numeric(3,1) with CHECK 1–10, so we store displayValue/10
  const [rating, setRating] = useState<string>(
    entry?.rating !== null && entry?.rating !== undefined
      ? String(Math.round(entry.rating * 10))
      : ""
  );
  const [ranking, setRanking] = useState(entry?.ranking ?? null);

  function handleRatingChange(value: string) {
    setRating(value);
    const num = parseFloat(value);
    if (value && !isNaN(num) && num >= 50 && num <= 100) {
      onSave({ rating: num / 10 });
    }
  }

  return (
    <div className="space-y-8">
      {/* Rating */}
      <div>
        <label className="block text-sm font-medium text-wine-800 mb-1">
          Rating
        </label>
        <p className="text-xs text-wine-500 mb-3">
          100-point wine scale (50–100)
        </p>
        <div className="flex items-baseline gap-3">
          <input
            type="number"
            inputMode="numeric"
            min={50}
            max={100}
            step={1}
            value={rating}
            onChange={(e) => handleRatingChange(e.target.value)}
            placeholder="e.g., 92"
            className="w-28 text-center text-4xl font-bold text-wine-950 px-4 py-3 rounded-xl border border-wine-200 bg-white placeholder:text-wine-200 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent"
          />
          <span className="text-lg text-wine-400">/ 100</span>
        </div>
      </div>

      {/* Ranking */}
      <div>
        <label className="block text-sm font-medium text-wine-800 mb-1">
          Ranking
        </label>
        <p className="text-xs text-wine-500 mb-3">
          Where does this wine rank? (1 = your favorite)
        </p>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: wineCount }, (_, i) => {
            const rank = i + 1;
            const isUsedElsewhere = allEntries.some(
              (e) =>
                e.wine_number !== currentWine && e.ranking === rank
            );
            return (
              <button
                key={rank}
                onClick={() => {
                  setRanking(rank);
                  onSave({ ranking: rank });
                }}
                disabled={isUsedElsewhere}
                className={cn(
                  "w-11 h-11 rounded-xl font-semibold text-sm transition-colors relative",
                  ranking === rank
                    ? "bg-gold-500 text-white"
                    : isUsedElsewhere
                      ? "bg-gray-50 text-gray-300 border border-gray-200 cursor-not-allowed"
                      : "bg-white border border-wine-200 text-wine-600 hover:bg-wine-50"
                )}
              >
                {rank === 1 && ranking === rank && (
                  <Trophy className="w-3.5 h-3.5 absolute -top-1 -right-1 text-gold-500" />
                )}
                {rank}
              </button>
            );
          })}
        </div>
        {ranking && (
          <p className="text-xs text-wine-400 mt-2">
            Ranked #{ranking} of {wineCount}
          </p>
        )}
      </div>
    </div>
  );
}

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
  ChevronDown,
  ChevronUp,
  Trophy,
  Star,
  Users,
  Target,
  Edit3,
  Check,
} from "lucide-react";

interface ResultsViewProps {
  session: Session;
  wines: Wine[];
  entries: TastingEntry[];
  participants: (SessionParticipant & { profiles: Profile })[];
  currentUserId: string;
}

export function ResultsView({
  session,
  wines,
  entries,
  participants,
  currentUserId,
}: ResultsViewProps) {
  const isHost = currentUserId === session.host_id;
  const [expandedWine, setExpandedWine] = useState<number | null>(1);
  const [editingWine, setEditingWine] = useState<number | null>(null);

  const guessFields = session.guess_fields as GuessField[];

  // Compute leaderboard: average rating for each wine
  // DB stores ratings as 1–10 (100pt scale / 10), so multiply back for display
  const wineStats = wines.map((wine) => {
    const wineEntries = entries.filter((e) => e.wine_number === wine.wine_number);
    const ratings = wineEntries.filter((e) => e.rating !== null).map((e) => e.rating! * 10);
    const avgRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : null;

    // Compute average ranking
    const rankings = wineEntries.filter((e) => e.ranking !== null).map((e) => e.ranking!);
    const avgRanking = rankings.length > 0
      ? rankings.reduce((a, b) => a + b, 0) / rankings.length
      : null;

    return { wine, wineEntries, avgRating, avgRanking };
  });

  // Sort by average rating descending for leaderboard
  const leaderboard = [...wineStats]
    .filter((s) => s.avgRating !== null)
    .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));

  // Sort by average ranking ascending (1 = favorite) for preference ranking
  const preferenceBoard = [...wineStats]
    .filter((s) => s.avgRanking !== null)
    .sort((a, b) => (a.avgRanking ?? 999) - (b.avgRanking ?? 999));

  // Compute who is closest to the group consensus preference ranking
  // Consensus position = index in preferenceBoard (1-indexed)
  const consensusMap = new Map<number, number>(); // wine_number → consensus position
  preferenceBoard.forEach((stat, idx) => {
    consensusMap.set(stat.wine.wine_number, idx + 1);
  });

  const consensusScores = participants
    .map((p) => {
      const userEntries = entries.filter(
        (e) => e.user_id === p.user_id && e.ranking !== null
      );
      if (userEntries.length === 0) return null;

      let totalDiff = 0;
      let rankedCount = 0;
      for (const e of userEntries) {
        const consensusPos = consensusMap.get(e.wine_number);
        if (consensusPos !== undefined && e.ranking !== null) {
          totalDiff += Math.abs(e.ranking - consensusPos);
          rankedCount++;
        }
      }

      return {
        participant: p,
        name: p.profiles?.display_name ?? "Unknown",
        totalDiff,
        rankedCount,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null && s.rankedCount > 0)
    .sort((a, b) => a.totalDiff - b.totalDiff);

  function getParticipantName(userId: string): string {
    const p = participants.find((p) => p.user_id === userId);
    return p?.profiles?.display_name ?? "Unknown";
  }

  return (
    <main className="min-h-dvh flex flex-col max-w-lg mx-auto px-6 py-6">
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 text-wine-600 hover:text-wine-800 mb-6 w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Dashboard</span>
      </Link>

      <h1 className="text-2xl font-bold text-wine-950 mb-1">{session.name}</h1>
      <p className="text-sm text-wine-600/70 mb-6">Results revealed</p>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-wine-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Trophy className="w-4 h-4" />
            Leaderboard
          </h2>
          <div className="space-y-2">
            {leaderboard.map((stat, idx) => (
              <div
                key={stat.wine.wine_number}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border",
                  idx === 0
                    ? "bg-amber-50 border-amber-200"
                    : idx === 1
                      ? "bg-gray-50 border-gray-200"
                      : idx === 2
                        ? "bg-orange-50 border-orange-200"
                        : "bg-white border-wine-100"
                )}
              >
                <span
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                    idx === 0
                      ? "bg-amber-500 text-white"
                      : idx === 1
                        ? "bg-gray-400 text-white"
                        : idx === 2
                          ? "bg-orange-400 text-white"
                          : "bg-wine-100 text-wine-600"
                  )}
                >
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-wine-950">
                    {stat.wine.name ?? getWineLabel(stat.wine.wine_number)}
                  </p>
                  {stat.wine.grape && (
                    <p className="text-xs text-wine-500">
                      {stat.wine.grape}
                      {stat.wine.vintage ? ` ${stat.wine.vintage}` : ""}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-wine-950">
                    {stat.avgRating?.toFixed(0)}
                  </p>
                  <p className="text-xs text-wine-400">avg pts</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Group preference ranking */}
      {preferenceBoard.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-wine-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            Group preference
          </h2>
          <p className="text-xs text-wine-400 mb-3">
            Based on how everyone ranked the wines in their lineup
          </p>
          <div className="space-y-2">
            {preferenceBoard.map((stat, idx) => (
              <div
                key={stat.wine.wine_number}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border",
                  idx === 0
                    ? "bg-amber-50 border-amber-200"
                    : idx === 1
                      ? "bg-gray-50 border-gray-200"
                      : idx === 2
                        ? "bg-orange-50 border-orange-200"
                        : "bg-white border-wine-100"
                )}
              >
                <span
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                    idx === 0
                      ? "bg-amber-500 text-white"
                      : idx === 1
                        ? "bg-gray-400 text-white"
                        : idx === 2
                          ? "bg-orange-400 text-white"
                          : "bg-wine-100 text-wine-600"
                  )}
                >
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-wine-950">
                    {stat.wine.name ?? getWineLabel(stat.wine.wine_number)}
                  </p>
                  {stat.wine.grape && (
                    <p className="text-xs text-wine-500">
                      {stat.wine.grape}
                      {stat.wine.vintage ? ` ${stat.wine.vintage}` : ""}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-wine-950">
                    #{stat.avgRanking?.toFixed(1)}
                  </p>
                  <p className="text-xs text-wine-400">avg rank</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consensus match */}
      {consensusScores.length > 0 && preferenceBoard.length >= 2 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-wine-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Target className="w-4 h-4" />
            Closest to consensus
          </h2>
          <p className="text-xs text-wine-400 mb-3">
            Whose preference ranking best matched the group?
          </p>
          <div className="space-y-2">
            {consensusScores.map((score, idx) => (
              <div
                key={score.participant.user_id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border",
                  idx === 0
                    ? "bg-amber-50 border-amber-200"
                    : "bg-white border-wine-100"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                    idx === 0
                      ? "bg-amber-500 text-white"
                      : "bg-wine-100 text-wine-600"
                  )}
                >
                  {score.name[0].toUpperCase()}
                </div>
                <span className="flex-1 font-semibold text-sm text-wine-950">
                  {score.name}
                  {idx === 0 && (
                    <span className="ml-2 text-xs font-normal text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Group palate
                    </span>
                  )}
                </span>
                <div className="text-right">
                  <p className="text-sm font-bold text-wine-950">
                    {score.totalDiff === 0 ? "Perfect" : `${score.totalDiff} off`}
                  </p>
                  <p className="text-xs text-wine-400">
                    {score.rankedCount} ranked
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wine details */}
      <h2 className="text-sm font-semibold text-wine-700 uppercase tracking-wider mb-3">
        Wine details
      </h2>
      <div className="space-y-3">
        {wines.map((wine) => {
          const isExpanded = expandedWine === wine.wine_number;
          const wineEntries = entries.filter(
            (e) => e.wine_number === wine.wine_number
          );

          return (
            <div
              key={wine.wine_number}
              className="bg-white rounded-2xl border border-wine-100 overflow-hidden"
            >
              {/* Wine header */}
              <button
                onClick={() =>
                  setExpandedWine(isExpanded ? null : wine.wine_number)
                }
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-wine-100 flex items-center justify-center">
                  <WineIcon className="w-5 h-5 text-wine-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-wine-950">
                    {wine.name
                      ? `${getWineLabel(wine.wine_number)}: ${wine.name}`
                      : getWineLabel(wine.wine_number)}
                  </p>
                  {wine.grape && (
                    <p className="text-xs text-wine-500">
                      {[wine.grape, wine.region, wine.vintage]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-wine-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-wine-400" />
                )}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-wine-50">
                  {/* Actual wine info (editable by host) */}
                  {isHost && (
                    <WineInfoEditor
                      wine={wine}
                      isEditing={editingWine === wine.wine_number}
                      onToggleEdit={() =>
                        setEditingWine(
                          editingWine === wine.wine_number
                            ? null
                            : wine.wine_number
                        )
                      }
                    />
                  )}

                  {/* Everyone's entries — sorted by ranking */}
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-wine-600 uppercase tracking-wider mb-3">
                      Tasters
                    </p>
                    <div className="space-y-3">
                      {participants
                        .map((p) => ({
                          participant: p,
                          entry: wineEntries.find((e) => e.user_id === p.user_id),
                        }))
                        .sort((a, b) => {
                          // Sort by ranking (lowest first), unranked at end
                          const ra = a.entry?.ranking ?? 999;
                          const rb = b.entry?.ranking ?? 999;
                          return ra - rb;
                        })
                        .map(({ participant, entry }) => (
                          <div
                            key={participant.user_id}
                            className="bg-cream-50 rounded-xl p-3"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-wine-100 flex items-center justify-center text-xs font-bold text-wine-700">
                                {(participant.profiles?.display_name ?? "?")[0].toUpperCase()}
                              </div>
                              <span className="text-sm font-semibold text-wine-900 flex-1">
                                {participant.profiles?.display_name ?? "Unknown"}
                              </span>
                              {entry?.ranking !== null && entry?.ranking !== undefined && (
                                <span className="text-xs font-semibold bg-wine-100 text-wine-700 px-2 py-0.5 rounded-full">
                                  Ranked #{entry.ranking}
                                </span>
                              )}
                              {entry?.rating !== null && entry?.rating !== undefined && (
                                <span className="flex items-center gap-1 text-sm font-bold text-wine-800">
                                  <Star className="w-3.5 h-3.5 text-gold-500 fill-gold-500" />
                                  {Math.round(entry.rating * 10)}
                                </span>
                              )}
                            </div>

                            {entry ? (
                              <>
                                {/* Guesses */}
                                {guessFields.some(
                                  (f) => entry[`guess_${f}` as keyof TastingEntry]
                                ) && (
                                  <div className="ml-9 mt-2 space-y-1">
                                    {guessFields.map((field) => {
                                      const guessKey =
                                        `guess_${field}` as keyof TastingEntry;
                                      const guessValue = entry[guessKey];
                                      const actualKey = field as keyof Wine;
                                      const actualValue = wine[actualKey];

                                      if (!guessValue) return null;

                                      const isCorrect =
                                        actualValue &&
                                        String(guessValue).toLowerCase() ===
                                          String(actualValue).toLowerCase();

                                      return (
                                        <div
                                          key={field}
                                          className="flex items-center gap-2 text-xs"
                                        >
                                          <span className="text-wine-400 w-20">
                                            {GUESS_FIELD_LABELS[field]}:
                                          </span>
                                          <span
                                            className={cn(
                                              "font-medium",
                                              isCorrect
                                                ? "text-green-700"
                                                : "text-wine-700"
                                            )}
                                          >
                                            {String(guessValue)}
                                          </span>
                                          {isCorrect && (
                                            <Check className="w-3.5 h-3.5 text-green-600" />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Notes */}
                                {(entry.appearance_notes ||
                                  entry.nose_notes ||
                                  entry.palate_notes ||
                                  entry.overall_notes) && (
                                  <div className="ml-9 text-xs text-wine-500 space-y-0.5 mt-2">
                                    {entry.appearance_notes && (
                                      <p>
                                        <span className="font-medium">Appearance:</span>{" "}
                                        {entry.appearance_notes}
                                      </p>
                                    )}
                                    {entry.nose_notes && (
                                      <p>
                                        <span className="font-medium">Nose:</span>{" "}
                                        {entry.nose_notes}
                                      </p>
                                    )}
                                    {entry.palate_notes && (
                                      <p>
                                        <span className="font-medium">Palate:</span>{" "}
                                        {entry.palate_notes}
                                      </p>
                                    )}
                                    {entry.overall_notes && (
                                      <p>
                                        <span className="font-medium">Overall:</span>{" "}
                                        {entry.overall_notes}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="ml-9 mt-1 text-xs text-wine-300 italic">
                                No tasting notes
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

/* ===================== Wine Info Editor ===================== */

function WineInfoEditor({
  wine,
  isEditing,
  onToggleEdit,
}: {
  wine: Wine;
  isEditing: boolean;
  onToggleEdit: () => void;
}) {
  const [name, setName] = useState(wine.name ?? "");
  const [grape, setGrape] = useState(wine.grape ?? "");
  const [wineType, setWineType] = useState(wine.wine_type ?? "");
  const [region, setRegion] = useState(wine.region ?? "");
  const [producer, setProducer] = useState(wine.producer ?? "");
  const [vintage, setVintage] = useState(wine.vintage?.toString() ?? "");

  async function handleSave() {
    const supabase = createClient();
    await supabase
      .from("wines")
      .update({
        name: name || null,
        grape: grape || null,
        wine_type: wineType || null,
        region: region || null,
        producer: producer || null,
        vintage: vintage ? parseInt(vintage) : null,
      })
      .eq("id", wine.id);
    onToggleEdit();
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-wine-600 uppercase tracking-wider">
          Actual wine
        </p>
        <button
          onClick={isEditing ? handleSave : onToggleEdit}
          className="flex items-center gap-1 text-xs text-wine-600 hover:text-wine-800"
        >
          {isEditing ? (
            <>
              <Check className="w-3.5 h-3.5" /> Save
            </>
          ) : (
            <>
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </>
          )}
        </button>
      </div>

      {isEditing ? (
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="Wine name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="col-span-2 px-3 py-2 rounded-lg border border-wine-200 text-sm text-wine-950 placeholder:text-wine-300 focus:outline-none focus:ring-1 focus:ring-wine-500"
          />
          <input
            placeholder="Grape"
            value={grape}
            onChange={(e) => setGrape(e.target.value)}
            className="px-3 py-2 rounded-lg border border-wine-200 text-sm text-wine-950 placeholder:text-wine-300 focus:outline-none focus:ring-1 focus:ring-wine-500"
          />
          <input
            placeholder="Type"
            value={wineType}
            onChange={(e) => setWineType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-wine-200 text-sm text-wine-950 placeholder:text-wine-300 focus:outline-none focus:ring-1 focus:ring-wine-500"
          />
          <input
            placeholder="Region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="px-3 py-2 rounded-lg border border-wine-200 text-sm text-wine-950 placeholder:text-wine-300 focus:outline-none focus:ring-1 focus:ring-wine-500"
          />
          <input
            placeholder="Producer"
            value={producer}
            onChange={(e) => setProducer(e.target.value)}
            className="px-3 py-2 rounded-lg border border-wine-200 text-sm text-wine-950 placeholder:text-wine-300 focus:outline-none focus:ring-1 focus:ring-wine-500"
          />
          <input
            placeholder="Vintage"
            type="number"
            value={vintage}
            onChange={(e) => setVintage(e.target.value)}
            className="px-3 py-2 rounded-lg border border-wine-200 text-sm text-wine-950 placeholder:text-wine-300 focus:outline-none focus:ring-1 focus:ring-wine-500"
          />
        </div>
      ) : (
        <div className="text-sm text-wine-700">
          {wine.name ? (
            <p className="font-medium">{wine.name}</p>
          ) : (
            <p className="text-wine-300 italic">
              Tap edit to enter wine details
            </p>
          )}
          {(wine.grape || wine.region || wine.vintage) && (
            <p className="text-xs text-wine-500 mt-0.5">
              {[wine.grape, wine.wine_type, wine.region, wine.producer, wine.vintage]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

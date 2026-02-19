"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Session,
  Profile,
  SessionParticipant,
  Wine,
  TastingEntry,
  GuessField,
} from "@/lib/types";
import { Lobby } from "./Lobby";
import { TastingView } from "./TastingView";
import { ResultsView } from "./ResultsView";

interface SessionViewProps {
  session: Session;
  participants: (SessionParticipant & { profiles: Profile })[];
  hostProfile: Profile;
  wines: Wine[];
  entries: TastingEntry[];
  currentUserId: string;
}

export function SessionView({
  session: initialSession,
  participants: initialParticipants,
  hostProfile,
  wines: initialWines,
  entries: initialEntries,
  currentUserId,
}: SessionViewProps) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [participants, setParticipants] = useState(initialParticipants);
  const [wines, setWines] = useState(initialWines);
  const [entries, setEntries] = useState(initialEntries);

  const isHost = currentUserId === session.host_id;

  // Poll for fresh data every 3s
  useEffect(() => {
    const supabase = createClient();

    async function refetch() {
      // Verify we have an auth session before querying — if not,
      // skip and keep the server-rendered data intact.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: pData }, { data: wData }, { data: eData }, { data: sData }] =
        await Promise.all([
          supabase
            .from("session_participants")
            .select("*, profiles(*)")
            .eq("session_id", session.id),
          supabase
            .from("wines")
            .select("*")
            .eq("session_id", session.id)
            .order("wine_number"),
          supabase
            .from("tasting_entries")
            .select("*")
            .eq("session_id", session.id),
          supabase
            .from("sessions")
            .select("*")
            .eq("id", session.id)
            .single(),
        ]);
      // Only update if we got real data — empty arrays from RLS failures
      // should not overwrite the server-rendered state.
      if (pData && pData.length > 0) setParticipants(pData as typeof participants);
      if (wData) setWines(wData);
      if (eData) setEntries(eData);
      if (sData) setSession(sData as Session);
    }

    const interval = setInterval(refetch, 3000);
    return () => clearInterval(interval);
  }, [session.id]);

  const handleStartTasting = useCallback(async () => {
    const supabase = createClient();
    await supabase
      .from("sessions")
      .update({ status: "tasting" })
      .eq("id", session.id);
  }, [session.id]);

  const handleReveal = useCallback(async () => {
    const supabase = createClient();
    await supabase
      .from("sessions")
      .update({ status: "revealed" })
      .eq("id", session.id);
  }, [session.id]);

  if (session.status === "lobby") {
    return (
      <Lobby
        session={session}
        participants={participants}
        hostProfile={hostProfile}
        isHost={isHost}
        onStartTasting={handleStartTasting}
      />
    );
  }

  if (session.status === "tasting") {
    return (
      <TastingView
        session={session}
        wines={wines}
        entries={entries}
        participants={participants}
        currentUserId={currentUserId}
        isHost={isHost}
        onReveal={handleReveal}
      />
    );
  }

  return (
    <ResultsView
      session={session}
      wines={wines}
      entries={entries}
      participants={participants}
      currentUserId={currentUserId}
    />
  );
}

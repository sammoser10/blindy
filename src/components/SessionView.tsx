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

  // Real-time subscriptions
  useEffect(() => {
    const supabase = createClient();

    const sessionChannel = supabase
      .channel(`session-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          if (payload.new) {
            setSession(payload.new as Session);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_participants",
          filter: `session_id=eq.${session.id}`,
        },
        async () => {
          // Re-fetch participants to get profile data
          const { data } = await supabase
            .from("session_participants")
            .select("*, profiles(*)")
            .eq("session_id", session.id);
          if (data) setParticipants(data as typeof participants);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wines",
          filter: `session_id=eq.${session.id}`,
        },
        async () => {
          const { data } = await supabase
            .from("wines")
            .select("*")
            .eq("session_id", session.id)
            .order("wine_number");
          if (data) setWines(data);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasting_entries",
          filter: `session_id=eq.${session.id}`,
        },
        async () => {
          const { data } = await supabase
            .from("tasting_entries")
            .select("*")
            .eq("session_id", session.id);
          if (data) setEntries(data);
        }
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Refetch all data to catch any changes that happened
          // between the server render and the subscription going live
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
          if (pData) setParticipants(pData as typeof participants);
          if (wData) setWines(wData);
          if (eData) setEntries(eData);
          if (sData) setSession(sData as Session);
        }
      });

    return () => {
      supabase.removeChannel(sessionChannel);
    };
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

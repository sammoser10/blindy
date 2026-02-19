import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SessionView } from "@/components/SessionView";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (!session) redirect("/dashboard");

  const { data: participants } = await supabase
    .from("session_participants")
    .select("*, profiles(*)")
    .eq("session_id", id);

  const { data: hostProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.host_id)
    .single();

  const { data: wines } = await supabase
    .from("wines")
    .select("*")
    .eq("session_id", id)
    .order("wine_number");

  const { data: entries } = await supabase
    .from("tasting_entries")
    .select("*")
    .eq("session_id", id);

  return (
    <SessionView
      session={session}
      participants={participants ?? []}
      hostProfile={hostProfile!}
      wines={wines ?? []}
      entries={entries ?? []}
      currentUserId={user.id}
    />
  );
}

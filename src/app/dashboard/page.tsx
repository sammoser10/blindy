import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Session } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Plus, LogIn, Wine, Clock } from "lucide-react";
import { SignOutButton } from "@/components/SignOutButton";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get sessions where user is host or participant
  const { data: hostedSessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("host_id", user.id)
    .order("created_at", { ascending: false });

  const { data: participations } = await supabase
    .from("session_participants")
    .select("session_id, sessions(*)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  const joinedSessions = (participations ?? [])
    .map((p) => p.sessions as unknown as Session)
    .filter((s) => s && s.host_id !== user.id);

  const allSessions = [
    ...(hostedSessions ?? []).map((s) => ({ ...s, isHost: true })),
    ...joinedSessions.map((s) => ({ ...s, isHost: false })),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <main className="min-h-dvh flex flex-col px-6 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-wine-950">
            Hey, {profile?.display_name ?? "there"}
          </h1>
          <p className="text-sm text-wine-600/70">Ready to taste?</p>
        </div>
        <SignOutButton />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link
          href="/session/create"
          className="flex items-center gap-2.5 p-4 rounded-2xl bg-wine-900 text-cream-50 hover:bg-wine-800 active:bg-wine-950 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <div>
            <p className="font-semibold text-sm">New tasting</p>
            <p className="text-xs text-cream-200/70">Host a session</p>
          </div>
        </Link>
        <Link
          href="/session/join"
          className="flex items-center gap-2.5 p-4 rounded-2xl bg-white text-wine-900 border border-wine-200 hover:bg-wine-50 active:bg-wine-100 transition-colors"
        >
          <LogIn className="w-5 h-5" />
          <div>
            <p className="font-semibold text-sm">Join tasting</p>
            <p className="text-xs text-wine-600/60">Enter a code</p>
          </div>
        </Link>
      </div>

      {/* Sessions list */}
      <div className="flex-1">
        <h2 className="text-sm font-semibold text-wine-700 uppercase tracking-wider mb-3">
          Your tastings
        </h2>

        {allSessions.length === 0 ? (
          <div className="text-center py-12">
            <Wine className="w-12 h-12 text-wine-200 mx-auto mb-3" />
            <p className="text-wine-400 text-sm">No tastings yet</p>
            <p className="text-wine-300 text-xs mt-1">
              Create or join one to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {allSessions.map((session) => (
              <Link
                key={session.id}
                href={`/session/${session.id}`}
                className="block p-4 rounded-2xl bg-white border border-wine-100 hover:border-wine-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-wine-950">
                    {session.name}
                  </h3>
                  <StatusBadge status={session.status} />
                </div>
                <div className="flex items-center gap-4 text-xs text-wine-500">
                  <span className="flex items-center gap-1">
                    <Wine className="w-3.5 h-3.5" />
                    {session.wine_count} wines
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(session.created_at)}
                  </span>
                  {session.isHost && (
                    <span className="text-gold-600 font-medium">Host</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    {
      lobby: "bg-blue-50 text-blue-700",
      tasting: "bg-amber-50 text-amber-700",
      revealed: "bg-green-50 text-green-700",
    }[status] ?? "bg-gray-50 text-gray-700";

  const labels =
    {
      lobby: "Lobby",
      tasting: "Tasting",
      revealed: "Revealed",
    }[status] ?? status;

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles}`}>
      {labels}
    </span>
  );
}

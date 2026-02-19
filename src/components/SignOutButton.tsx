"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="p-2 rounded-xl text-wine-400 hover:text-wine-700 hover:bg-wine-50 transition-colors"
      title="Sign out"
    >
      <LogOut className="w-5 h-5" />
    </button>
  );
}

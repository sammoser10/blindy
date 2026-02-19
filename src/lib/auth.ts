import { SupabaseClient } from "@supabase/supabase-js";

const EMAIL_DOMAIN = "blindy.app";

function toEmail(username: string): string {
  return `${username.toLowerCase().trim()}@${EMAIL_DOMAIN}`;
}

/**
 * Sign in with username/password, or create a new account if the username
 * doesn't exist yet. Returns the authenticated user or an error message.
 */
export async function signInOrSignUp(
  supabase: SupabaseClient,
  username: string,
  password: string
): Promise<{ userId: string | null; error: string | null }> {
  const email = toEmail(username);

  // Try signing in first (returning user)
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (signInData?.user) {
    return { userId: signInData.user.id, error: null };
  }

  // If "Invalid login credentials" it could mean the user doesn't exist
  // OR the password is wrong. Try signing up.
  if (signInError) {
    const { data: signUpData, error: signUpError } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: username.trim() },
        },
      });

    if (signUpData?.user) {
      return { userId: signUpData.user.id, error: null };
    }

    // If sign-up fails because user already exists, the password was wrong
    if (signUpError?.message?.includes("already")) {
      return { userId: null, error: "Wrong password for that username." };
    }

    return { userId: null, error: signUpError?.message ?? "Auth failed." };
  }

  return { userId: null, error: "Auth failed." };
}

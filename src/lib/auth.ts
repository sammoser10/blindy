import { SupabaseClient } from "@supabase/supabase-js";

const EMAIL_DOMAIN = "blindy.app";

function toEmail(username: string): string {
  return `${username.toLowerCase().trim()}@${EMAIL_DOMAIN}`;
}

/**
 * Sign in with username/password, or create a new account if the username
 * doesn't exist yet. Always ensures a valid session exists afterward.
 */
export async function signInOrSignUp(
  supabase: SupabaseClient,
  username: string,
  password: string
): Promise<{ userId: string | null; error: string | null }> {
  const email = toEmail(username);

  // Try signing in first (returning user)
  const { data: signInData } =
    await supabase.auth.signInWithPassword({ email, password });

  if (signInData?.session) {
    return { userId: signInData.user.id, error: null };
  }

  // Sign-in failed — try creating the account
  const { data: signUpData, error: signUpError } =
    await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: username.trim() },
      },
    });

  // If sign-up says user already exists, the password was wrong
  if (signUpError) {
    if (signUpError.message?.includes("already")) {
      return { userId: null, error: "Wrong password for that username." };
    }
    return { userId: null, error: signUpError.message };
  }

  // signUp may return a user but no session (if email confirmation is on).
  // In that case, immediately sign in to get a session.
  if (signUpData?.user && !signUpData.session) {
    const { data: retrySignIn, error: retryError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (retrySignIn?.session) {
      return { userId: retrySignIn.user.id, error: null };
    }
    return {
      userId: null,
      error: retryError?.message ?? "Account created but sign-in failed. Try again.",
    };
  }

  if (signUpData?.session && signUpData.user) {
    return { userId: signUpData.user.id, error: null };
  }

  return { userId: null, error: "Auth failed. Try again." };
}

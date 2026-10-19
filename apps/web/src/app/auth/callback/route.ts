import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // only same-site paths: "//host" or "/\host" would send the user to another site
  const requested = searchParams.get("next") ?? "";
  const next = /^\/(?![/\\])/.test(requested) ? requested : "/teams";
  let reason = searchParams.get("error_description") ?? "no code in the link";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    reason = error.message;
  }
  return NextResponse.redirect(`${origin}/login?error=callback&reason=${encodeURIComponent(reason)}`);
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";

/**
 * Links sent from the Supabase dashboard (password recovery, invites) come back to the site with the session in the
 * URL fragment, which the server never sees. Pick it up here, store the session and go to the right page.
 */
export function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) return;
    const type = params.get("type");
    void createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        if (error) return router.replace(`/login?error=callback&reason=${encodeURIComponent(error.message)}`);
        router.replace(type === "recovery" || type === "invite" ? "/account?set=1" : "/teams");
        router.refresh();
      });
  }, [router]);

  return null;
}

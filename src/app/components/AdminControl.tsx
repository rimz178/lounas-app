// src/app/components/AdminControls.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

async function fetchIsAdmin(user: User | null) {
  if (!user) return false;
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error) {
    console.warn("profiles error", error.message);
    return false;
  }
  return data?.role === "admin";
}

export default function AdminControls() {
  const [allowed, setAllowed] = useState<boolean | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setAllowed(await fetchIsAdmin(user ?? null));
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setAllowed(await fetchIsAdmin(session?.user ?? null));
    });

    return () => subscription.unsubscribe();
  }, []);

  if (allowed !== true) return null;

  async function handleRefresh() {
    setLoading(true);
    setError(null);

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      setError("Et ole kirjautunut");
      setLoading(false);
      return;
    }

    const res = await fetch("/api", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Päivitys epäonnistui");
    }

    setLoading(false);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleRefresh}
        disabled={loading}
        className="border rounded px-2 py-1 bg-blue-600 text-white disabled:opacity-60"
      >
        {loading ? "Päivitetään..." : "Päivitä lounaslistat nyt"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

export default function AuthStatus() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!error) {
          setUser(data.user ?? null);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (user === undefined) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        className="border rounded px-3 py-1 text-sm bg-black hover:bg-black-100"
      >
        Kirjaudu
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="border rounded px-3 py-1 text-sm bg-black hover:bg-black-100"
    >
      Kirjaudu ulos
    </button>
  );
}

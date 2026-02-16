"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export default function AuthStatus() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    async function fetchUser() {
      const response = await fetch(
        "https://clurtxpqwmekgicwusqs.supabase.co/functions/v1/refresh-lunches",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action: "getUser" }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        console.error("Failed to fetch user data");
      }
    }

    fetchUser();
  }, []);

  if (!user) {
    return <p>Ei kirjautunutta käyttäjää</p>;
  }

  return <p>Kirjautunut käyttäjä: {user.email}</p>;
}

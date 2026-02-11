// src/app/components/AdminControls.tsx
"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

type Props = {
  refreshMenus: () => Promise<void>;
};

const ALLOWED_EMAILS = ["riku.mikkonen5@gmail.com"];

function isAllowed(user: User | null) {
  if (!user) return false;
  const email = user.email ?? "";
  return ALLOWED_EMAILS.includes(email);
}

export default function AdminControls({ refreshMenus }: Props) {
  const [allowed, setAllowed] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setAllowed(isAllowed(data.user ?? null)))
      .catch(() => setAllowed(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAllowed(isAllowed(session?.user ?? null));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Latausvaiheessa ei näytetä mitään
  if (allowed !== true) return null;

  return (
    <div className="space-y-2">
      <form action={refreshMenus}>
        <button
          type="submit"
          className="border rounded px-2 py-1 bg-blue-600 text-white"
        >
          Päivitä lounaslistat nyt
        </button>
      </form>
    </div>
  );
}

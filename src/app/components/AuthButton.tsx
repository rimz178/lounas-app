"use client";

import { useEffect, useState } from "react";
import { supabase } from "../service/supabaseClient";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert("Kirjautuminen ulos epäonnistui.");
    } else {
      setUser(null);
      alert("Olet kirjautunut ulos.");
    }
  };

  return (
    <div className="flex items-center space-x-4">
      {user ? (
        <>
          <p className="text-sm">Kirjautunut: {user.email}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="border rounded px-3 py-1 bg-red-600 text-white"
          >
            Kirjaudu ulos
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="border rounded px-3 py-1 bg-blue-600 text-white"
        >
          Kirjaudu sisään
        </button>
      )}
    </div>
  );
}

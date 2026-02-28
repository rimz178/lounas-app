"use client";

import { useRouter } from "next/navigation";
import { supabase } from "../service/supabaseClient";
import { useAuth } from "./AuthContext";

export default function AuthButton() {
  const { user, isLoggedIn } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert("Kirjautuminen ulos epäonnistui.");
    } else {
      router.replace("/");
      router.refresh();
      alert("Olet kirjautunut ulos.");
    }
  };

  return (
    <div className="flex items-center space-x-4">
      {isLoggedIn ? (
        <>
          <p className="text-sm">Kirjautunut: {user?.email}</p>
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

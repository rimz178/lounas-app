"use client";

import { useRouter } from "next/navigation";
import { supabase } from "../service/supabaseClient";
import { useAuth } from "./AuthContext";

/**
 * Näyttää kirjautumis- tai uloskirjautumispainikkeen riippuen käyttäjän kirjautumistilasta
 * @returns {JSX.Element} JSX-elementti, joka sisältää kirjautumis- tai uloskirjautumispainikkeen
 */

export default function AuthButton() {
  const { isLoggedIn } = useAuth();
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
        <button
          type="button"
          onClick={handleLogout}
          className="bg-transparent border-none text-white text-lg font-normal hover:text-red-500 transition shadow-none px-0 py-0"
        >
          Kirjaudu ulos
        </button>
      ) : (
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="bg-transparent border-none text-white text-lg font-normal hover:text-red-500 transition shadow-none px-0 py-0"
        >
          Kirjaudu sisään
        </button>
      )}
    </div>
  );
}

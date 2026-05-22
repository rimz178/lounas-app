import { useEffect, useState } from "react";
import { useAuth } from "../components/AuthContext";
import { supabase } from "./supabaseClient";

type Profile = {
  id: string;
  role: "admin" | "user";
};
/**
 *  Hakee ja palauttaa kirjautuneen käyttäjän profiilitiedot Supabasesta.
 *
 */
export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to fetch profile:", error);
          setProfile(null);
          setProfileLoading(false);
          return;
        }
        setProfile(data as Profile | null);
        setProfileLoading(false);
      });
  }, [user]);

  return { profile, profileLoading };
}

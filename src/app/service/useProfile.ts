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
    let cancelled = false;

    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const userId = user.id;

    async function loadProfile() {
      setProfileLoading(true);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", userId)
          .single();

        if (cancelled) return;

        if (error) {
          console.error("Failed to fetch profile:", error);
          setProfile(null);
          return;
        }

        setProfile(data as Profile | null);

      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch profile:", error);
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { profile, profileLoading };
}

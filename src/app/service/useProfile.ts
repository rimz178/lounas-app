import { useEffect, useState } from "react";
import { useAuth } from "../components/AuthContext";
import { supabase } from "./supabaseClient";

type Profile = {
  id: string;
  role: "admin" | "user";
};

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to fetch profile:", error);
          setProfile(null);
          return;
        }
        setProfile(data as Profile | null);
      });
  }, [user]);

  return profile;
}
